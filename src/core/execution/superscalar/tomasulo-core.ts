import type { Snapshot, PipelineLatch, RegisterSnapshot } from '@core/contracts/snapshot'
import type { MemorySystem, MemoryAccessResult } from '@core/contracts/memory-system'
import type { RegisterFile } from '@core/contracts/register-file'
import type { Instruction, Opcode } from '@core/contracts/instruction'
import { decode } from '@core/isa/decode'
import type { ExecutionConfig } from '../execution-config'
import type { ExecutionSnapshot, CDBSnapshot, UnitClass } from '../snapshot'
import { RSPool } from './rs-pool'
import { RegisterStatus } from './register-status'
import { ReorderBuffer } from './reorder-buffer'
import { PrefetchBuffer } from './prefetch-buffer'
import { BranchPredictor } from './branch-predictor'
import { AluUnit } from '../units/alu-unit'
import { MulUnit } from '../units/mul-unit'
import { LdStUnit } from '../units/ldst-unit'
import { JmpUnit } from '../units/jmp-unit'
import type { FunctionalUnit } from '../units/functional-unit'

const JMP_OPS = new Set<Opcode>(['JMP', 'JZ', 'JNZ'])
const MUL_OPS = new Set<Opcode>(['MUL', 'DIV'])
const LDST_OPS = new Set<Opcode>(['LD', 'ST'])

export class TomasuloCore {
  private tick_ = 0
  private pc_ = 0
  private fetchPC_ = 0
  private branchInFlight_ = false
  private flushedThisTick_ = false
  private lastCDB_: CDBSnapshot[] = []
  private fetchPending_ = false                       // true while an iMem access is in-flight
  private ldState_: { robTag: number } | null = null  // pending LD dMem data access (cache miss)
  private stPending_ = false                          // true while a committing ST write is in-flight

  private readonly rob: ReorderBuffer
  private readonly regStatus: RegisterStatus
  private readonly prefetch: PrefetchBuffer
  private readonly predictor: BranchPredictor
  private readonly aluRS: RSPool
  private readonly mulRS: RSPool
  private readonly ldstRS: RSPool
  private readonly jmpRS: RSPool
  private readonly aluUnits: AluUnit[]
  private readonly mulUnits: MulUnit[]
  private readonly ldstUnits: LdStUnit[]
  private readonly jmpUnits: JmpUnit[]

  constructor(
    private readonly rf: RegisterFile,
    private readonly iMem: MemorySystem,
    private readonly dMem: MemorySystem,
    private readonly config: ExecutionConfig,
  ) {
    const rs = config.rsPerClass
    this.rob = new ReorderBuffer(config.robSize)
    this.regStatus = new RegisterStatus()
    this.prefetch = new PrefetchBuffer(config.prefetchBufferSize)
    this.predictor = new BranchPredictor(config.branchPredictor)
    this.aluRS = new RSPool(rs)
    this.mulRS = new RSPool(rs)
    this.ldstRS = new RSPool(rs)
    this.jmpRS = new RSPool(rs)
    this.aluUnits = Array.from({ length: config.units.alu }, () => new AluUnit(config.latencies.alu))
    this.mulUnits = Array.from({ length: config.units.mul }, () => new MulUnit(config.latencies.mul))
    this.ldstUnits = Array.from({ length: config.units.ldst }, () => new LdStUnit(config.latencies.ldst))
    this.jmpUnits = Array.from({ length: config.units.jmp }, () => new JmpUnit(config.latencies.jmp))
  }

  setPC(pc: number): void { this.pc_ = pc; this.fetchPC_ = pc }

  get tick(): number { return this.tick_ }

  step(): Snapshot {
    this.tick_++
    this.flushedThisTick_ = false
    this.lastCDB_ = []

    this.doLDMemory()   // advance pending LD dMem access first so result is visible to doCommit
    this.doCommit()
    this.doTickUnits()
    this.doCDB()
    this.doDispatch()
    this.doIssue()
    this.doFetch()

    return this.buildSnapshot()
  }

  getExecutionSnapshot(): ExecutionSnapshot {
    const poolsByClass: Array<[UnitClass, RSPool]> = [
      ['ALU', this.aluRS], ['MUL', this.mulRS], ['LDST', this.ldstRS], ['JMP', this.jmpRS],
    ]
    const rss = poolsByClass.flatMap(([unitClass, pool]) =>
      pool.entries.map(e => ({
        id: e.id, unitClass, busy: e.busy, op: e.op,
        Vj: e.Vj, Qj: e.Qj, Vk: e.Vk, Qk: e.Qk, destRob: e.destRob,
      }))
    )

    const allUnits: Array<[string, FunctionalUnit[]]> = [
      ['ALU', this.aluUnits], ['MUL', this.mulUnits],
      ['LDST', this.ldstUnits], ['JMP', this.jmpUnits],
    ]
    const units = allUnits.flatMap(([cls, arr]) =>
      arr.map((u, i) => ({
        class: cls, id: i, busy: u.busy,
        robTag: u.robTag,
        remaining: this.remainingOf(u),
      }))
    )

    const regStatus = this.regStatus.snapshot()
      .map((robTag, reg) => ({ reg, robTag }))
      .filter(x => x.robTag !== null)

    const robSnap = this.rob.snapshot()
    const robEntries = robSnap.entries.map(e => ({
      index: e.index, busy: e.busy, opcode: e.opcode as string, pc: e.pc,
      destReg: e.destReg, value: e.value, ready: e.ready, state: e.state as string,
      predictedTaken: JMP_OPS.has(e.opcode) ? e.predictedTaken : null,
      branchTaken: JMP_OPS.has(e.opcode) && e.ready ? e.branchTaken : null,
      branchTarget: JMP_OPS.has(e.opcode) ? e.branchTarget : null,
      isStore: e.isStore,
      storeAddr: e.isStore ? e.storeAddr : null,
      storeValue: e.isStore ? e.storeValue : null,
    }))

    const prefetchEntries = this.prefetch.snapshot().map(e => ({
      pc: e.pc, opcode: e.instr.opcode as string, predictedTaken: e.predictedTaken,
    }))

    return {
      mode: 'tomasulo',
      tick: this.tick_,
      reservationStations: rss,
      instrStatus: rss,
      units,
      registerStatus: regStatus,
      rob: { head: robSnap.head, tail: robSnap.tail, entries: robEntries },
      cdb: this.lastCDB_,
      prefetchBuffer: prefetchEntries,
      predictor: this.predictor.snapshot(),
      flushedThisTick: this.flushedThisTick_,
      fetchPC: this.fetchPC_,
      branchInFlight: this.branchInFlight_,
      fetchPending: this.fetchPending_,
      pendingLoad: this.ldState_,
      pendingStore: this.stPending_,
    }
  }

  reset(): void {
    this.tick_ = 0; this.pc_ = 0; this.fetchPC_ = 0
    this.branchInFlight_ = false; this.flushedThisTick_ = false; this.lastCDB_ = []
    this.fetchPending_ = false; this.ldState_ = null; this.stPending_ = false
    this.rob.reset(); this.regStatus.reset(); this.prefetch.flush()
    this.predictor.reset()
    this.aluRS.reset(); this.mulRS.reset(); this.ldstRS.reset(); this.jmpRS.reset()
    for (const u of [...this.aluUnits, ...this.mulUnits, ...this.ldstUnits, ...this.jmpUnits]) u.reset()
    this.iMem.reset(); this.dMem.reset()
  }

  // ─── Tick stages ────────────────────────────────────────────────────────────

  private doCommit(): void {
    // Drain a store write that started last tick and is still in progress
    if (this.stPending_) {
      this.dMem.tick()
      if (!this.dMem.isReady()) return
      this.stPending_ = false
      this.rob.commitHead()
      return
    }

    let committed = 0
    const maxCommit = this.config.issueWidth

    while (committed < maxCommit) {
      const entry = this.rob.headEntry
      if (!entry || !entry.ready) break

      if (entry.isStore) {
        this.dMem.startAccess(entry.storeAddr, true, entry.storeValue)
        this.dMem.tick()
        if (!this.dMem.isReady()) {
          this.stPending_ = true
          return  // wait; commitHead() will be called next tick once write completes
        }
        // Write completed this tick (FlatMemory or write-back hit) — fall through to commitHead()
      } else if (!JMP_OPS.has(entry.opcode)) {
        if (entry.destReg !== null) {
          this.rf.write(entry.destReg, entry.value)
          this.regStatus.clearIfOwner(entry.destReg, entry.index)
        }
      } else {
        // Branch commit
        const actualTaken = entry.branchTaken
        const actualTarget = entry.branchTarget
        const branchPC = entry.pc

        if (this.config.speculation) {
          this.predictor.update(branchPC, actualTaken)
          if (actualTaken !== entry.predictedTaken) {
            this.predictor.recordMispredict()
            this.rob.commitHead()
            this.squash(actualTaken ? actualTarget : branchPC + 4)
            return
          }
          // Correct prediction: fetch was already steered correctly
        } else {
          if (actualTaken) {
            this.fetchPC_ = actualTarget
            this.fetchPending_ = false  // restart fetch at correct target
            this.prefetch.flush()
            this.flushedThisTick_ = true
          }
          this.pc_ = actualTaken ? actualTarget : this.pc_
          this.branchInFlight_ = false
        }
      }

      this.rob.commitHead()
      committed++
    }
  }

  private doLDMemory(): void {
    if (this.ldState_ === null) return
    this.dMem.tick()
    if (!this.dMem.isReady()) return

    const { robTag } = this.ldState_
    const value = this.dMem.result()
    this.ldState_ = null

    // Broadcast on the memory result path — only one pending LD at a time so no arbitration needed
    const entry = this.rob.get(robTag)
    entry.value = value; entry.ready = true; entry.state = 'write'
    this.aluRS.snoopCDB(robTag, value)
    this.mulRS.snoopCDB(robTag, value)
    this.ldstRS.snoopCDB(robTag, value)
    this.jmpRS.snoopCDB(robTag, value)
    this.lastCDB_.push({ robTag, value })
  }

  private doTickUnits(): void {
    for (const u of [...this.aluUnits, ...this.mulUnits, ...this.ldstUnits, ...this.jmpUnits]) {
      if (u.busy) u.tick()
    }
  }

  private doCDB(): void {
    // Collect finished units WITHOUT resetting them yet — reset happens only for the
    // units that actually win CDB arbitration this tick.  Resetting early would silently
    // discard results that lost arbitration, leaving their ROB entries ready=false forever.
    const finished: Array<{ robTag: number; value: number; unit: FunctionalUnit }> = []

    for (const u of [...this.aluUnits, ...this.mulUnits]) {
      if (u.busy && u.isReady() && u.robTag !== null) {
        finished.push({ robTag: u.robTag, value: u.result(), unit: u })
      }
    }
    for (const u of this.jmpUnits) {
      if (u.busy && u.isReady() && u.robTag !== null) {
        // Write branch resolution into the ROB entry regardless of CDB win — the
        // ROB won't act on it (commit) until ready=true is set by the broadcast loop.
        const robEntry = this.rob.get(u.robTag)
        robEntry.branchTaken = u.taken
        robEntry.branchTarget = u.result()
        finished.push({ robTag: u.robTag, value: u.result(), unit: u })
      }
    }
    for (const u of this.ldstUnits) {
      if (u.busy && u.isReady() && u.robTag !== null) {
        const addr = u.result()
        if (u.isStore) {
          const robEntry = this.rob.get(u.robTag)
          robEntry.storeAddr = addr
          robEntry.storeValue = u.storeValue
          robEntry.isStore = true
          finished.push({ robTag: u.robTag, value: addr, unit: u })
        } else {
          // LD: start dMem data access; defer to doLDMemory() on cache miss
          if (this.ldState_ === null) {
            this.dMem.startAccess(addr)
            this.dMem.tick()
            if (this.dMem.isReady()) {
              // FlatMemory or cache hit — broadcast this tick via normal finished[] path
              const value = this.dMem.result()
              finished.push({ robTag: u.robTag, value, unit: u })
            } else {
              // Cache miss — free the LDST unit (address phase done) and wait
              this.ldState_ = { robTag: u.robTag }
              u.reset()
            }
          }
          // else: ldState_ already set (previous LD cache miss in progress) — skip; this
          // LDST unit stays busy+ready and will be retried once ldState_ is cleared
        }
      }
    }

    const tobroadcast = finished.slice(0, this.config.cdbCount)

    for (const { robTag, value, unit } of tobroadcast) {
      unit.reset()  // free the unit only after it wins the CDB
      const entry = this.rob.get(robTag)
      entry.value = value
      entry.ready = true
      entry.state = 'write'
      this.aluRS.snoopCDB(robTag, value)
      this.mulRS.snoopCDB(robTag, value)
      this.ldstRS.snoopCDB(robTag, value)
      this.jmpRS.snoopCDB(robTag, value)
      this.lastCDB_.push({ robTag, value })
    }
  }

  private doDispatch(): void {
    this.dispatchPool(this.aluRS, this.aluUnits)
    this.dispatchPool(this.mulRS, this.mulUnits)
    this.dispatchLdSt()
    this.dispatchPool(this.jmpRS, this.jmpUnits)
  }

  private dispatchPool(pool: RSPool, units: FunctionalUnit[]): void {
    for (const rs of pool.getReady()) {
      const unit = units.find(u => !u.busy)
      if (!unit) break
      unit.start(rs.op, rs.Vj, rs.Vk, rs.destRob)
      pool.free(rs.id)
      this.rob.get(rs.destRob).state = 'execute'
    }
  }

  // LD/ST gets its own dispatch loop: a load's actual memory read happens as soon as
  // its unit finishes (out of order), but a store's actual memory write only happens
  // later at commit (in order). Without a check here, a load could read memory before
  // an older, not-yet-ready store to the same address ever writes it. There's no address
  // disambiguation in this model, so the conservative fix is: a load may not dispatch
  // while ANY older store is still in-flight (busy) in the ROB, regardless of address.
  private dispatchLdSt(): void {
    for (const rs of this.ldstRS.getReady()) {
      if (rs.op === 'LD' && this.hasOlderPendingStore(rs.destRob)) continue
      const unit = this.ldstUnits.find(u => !u.busy)
      if (!unit) break
      unit.start(rs.op, rs.Vj, rs.Vk, rs.destRob)
      this.ldstRS.free(rs.id)
      this.rob.get(rs.destRob).state = 'execute'
    }
  }

  // True if some ROB entry strictly older than `targetIndex` (walking circularly back
  // to the ROB head) is still busy and is a store — i.e. issued earlier in program order
  // and not yet committed (committed entries have busy=false).
  private hasOlderPendingStore(targetIndex: number): boolean {
    const size = this.config.robSize
    let i = this.rob.head
    while (i !== targetIndex) {
      const e = this.rob.get(i)
      if (e.busy && e.isStore) return true
      i = (i + 1) % size
    }
    return false
  }

  private doIssue(): void {
    for (let i = 0; i < this.config.issueWidth; i++) {
      if (this.prefetch.empty || this.branchInFlight_) break

      const entry = this.prefetch.peek()!
      const { instr, pc, predictedTaken } = entry

      const pool = this.poolFor(instr.opcode)
      const rsId = pool.alloc()
      const robIdx = this.rob.alloc()

      if (rsId === null || robIdx === null) {
        if (robIdx !== null) this.rob.rollbackAlloc()
        if (rsId !== null) pool.free(rsId)
        break
      }

      this.prefetch.pop()

      const [Vj, Qj] = this.readOperandA(instr)
      const [Vk, Qk] = this.readOperandB(instr)

      pool.set(rsId, {
        busy: true, op: instr.opcode,
        Vj, Vk, Qj, Qk,
        destRob: robIdx,
      })

      const robEntry = this.rob.get(robIdx)
      robEntry.pc = pc
      robEntry.opcode = instr.opcode
      robEntry.destReg = this.destRegOf(instr)
      robEntry.isStore = instr.opcode === 'ST'
      robEntry.state = 'issue'
      robEntry.predictedTaken = predictedTaken

      const destReg = this.destRegOf(instr)
      if (destReg !== null) this.regStatus.set(destReg, robIdx)

      if (JMP_OPS.has(instr.opcode) && !this.config.speculation) {
        this.branchInFlight_ = true
      }

      this.pc_ = pc
    }
  }

  private doFetch(): void {
    while (!this.prefetch.full) {
      if (!this.fetchPending_) this.iMem.startAccess(this.fetchPC_)
      this.iMem.tick()
      if (!this.iMem.isReady()) { this.fetchPending_ = true; break }
      this.fetchPending_ = false

      const pc = this.fetchPC_
      const instr = decode(this.iMem.result())

      let predictedTaken = false
      if (instr.opcode === 'JMP') {
        predictedTaken = true
        this.fetchPC_ = instr.imm ?? pc + 4
      } else if ((instr.opcode === 'JZ' || instr.opcode === 'JNZ') && this.config.speculation) {
        predictedTaken = this.predictor.predict(pc)
        this.fetchPC_ = predictedTaken ? (instr.imm ?? pc + 4) : pc + 4
      } else {
        this.fetchPC_ = pc + 4
      }

      this.prefetch.push({ instr, pc, predictedTaken })
      break
    }
  }

  // ─── Operand helpers ────────────────────────────────────────────────────────

  private readOperandA(instr: Instruction): [number, number | null] {
    let reg: number | null = null
    switch (instr.format) {
      case 'RRR': reg = instr.rs1 ?? null; break
      case 'RRI': reg = instr.rs1 ?? null; break
      case 'RM':  reg = instr.rd  ?? null; break
      case 'J':   return [0, null]
    }
    if (reg === null) return [0, null]
    return this.readReg(reg)
  }

  private readOperandB(instr: Instruction): [number, number | null] {
    switch (instr.format) {
      case 'RRR': return this.readReg(instr.rs2 ?? 0)
      case 'RRI':
      case 'RM':
      case 'J':   return [instr.imm ?? 0, null]
    }
  }

  private readReg(reg: number): [number, number | null] {
    const qi = this.regStatus.get(reg)
    if (qi !== null) {
      const e = this.rob.get(qi)
      if (e.ready) return [e.value, null]
      return [0, qi]
    }
    return [this.rf.read(reg), null]
  }

  private destRegOf(instr: Instruction): number | null {
    if (instr.opcode === 'ST' || JMP_OPS.has(instr.opcode) || instr.opcode === 'NOP') return null
    return instr.rd ?? null
  }

  private poolFor(op: Opcode): RSPool {
    if (MUL_OPS.has(op)) return this.mulRS
    if (LDST_OPS.has(op)) return this.ldstRS
    if (JMP_OPS.has(op)) return this.jmpRS
    return this.aluRS
  }

  private squash(correctPC: number): void {
    this.rob.reset()
    this.regStatus.reset()
    this.aluRS.reset(); this.mulRS.reset(); this.ldstRS.reset(); this.jmpRS.reset()
    for (const u of [...this.aluUnits, ...this.mulUnits, ...this.ldstUnits, ...this.jmpUnits]) {
      if (u.busy) u.reset()
    }
    this.prefetch.flush()
    this.fetchPC_ = correctPC
    this.fetchPending_ = false  // restart iMem fetch at correctPC
    this.ldState_ = null        // abandon any in-flight LD cache miss
    this.flushedThisTick_ = true
  }

  private remainingOf(u: FunctionalUnit): number {
    // Read remaining via duck-typing; units expose it as a private field so we cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (u as any).remaining ?? 0
  }

  // ─── Base snapshot ──────────────────────────────────────────────────────────

  private buildSnapshot(): Snapshot {
    const registers: RegisterSnapshot[] = Array.from({ length: 16 }, (_, i) => ({
      value: this.rf.read(i),
      valid: this.rf.isValid(i),
    }))
    const latch: PipelineLatch = {
      PC: this.pc_, MAR: 0, MDR: 0, IR: 0, A: 0, B: 0, C: 0, addressBus: 0, dataBus: 0,
    }
    const noAccess: MemoryAccessResult = { address: 0, hit: false, cycles: 0 }
    return {
      tick: this.tick_,
      pc: this.pc_,
      registers,
      latch,
      stageOf: ['', '', '', '', ''],
      stallReason: null,
      iMemAccess: this.iMem.lastAccess ?? noAccess,
      dMemAccess: this.dMem.lastAccess ?? noAccess,
    }
  }
}
