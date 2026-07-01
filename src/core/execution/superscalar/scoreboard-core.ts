import type { Snapshot, PipelineLatch, RegisterSnapshot } from '@core/contracts/snapshot'
import type { MemorySystem, MemoryAccessResult } from '@core/contracts/memory-system'
import type { RegisterFile } from '@core/contracts/register-file'
import type { Instruction, Opcode } from '@core/contracts/instruction'
import { decode } from '@core/isa/decode'
import type { ExecutionConfig } from '../execution-config'
import type { ExecutionSnapshot, FUStatusSnapshot } from '../snapshot'
import { PrefetchBuffer } from './prefetch-buffer'
import { AluUnit } from '../units/alu-unit'
import { MulUnit } from '../units/mul-unit'
import { LdStUnit } from '../units/ldst-unit'
import { JmpUnit } from '../units/jmp-unit'
import type { FunctionalUnit } from '../units/functional-unit'

type FUState = 'idle' | 'issue' | 'read' | 'execute' | 'write' | 'memory'

const JMP_OPS = new Set<Opcode>(['JMP', 'JZ', 'JNZ'])
const MUL_OPS = new Set<Opcode>(['MUL', 'DIV'])
const LDST_OPS = new Set<Opcode>(['LD', 'ST'])

interface FUEntry {
  id: string
  class: string
  unit: FunctionalUnit
  busy: boolean
  op: Opcode | null
  Fi: number | null
  Fj: number | null
  Fk: number | null
  immVk: number
  vj: number
  vk: number
  Qj: string | null
  Qk: string | null
  Rj: boolean
  Rk: boolean
  state: FUState
}

export class ScoreboardCore {
  private tick_ = 0
  private pc_ = 0
  private fetchPC_ = 0
  private branchInFlight_ = false
  private fetchPending_ = false                    // true while an iMem access is in-flight
  private memState_: { entry: FUEntry } | null = null  // FU waiting for dMem (LD/ST cache miss)

  private readonly allUnits: FUEntry[]
  private readonly qi: (string | null)[] = Array(16).fill(null)
  private readonly prefetch: PrefetchBuffer

  constructor(
    private readonly rf: RegisterFile,
    private readonly iMem: MemorySystem,
    private readonly dMem: MemorySystem,
    private readonly config: ExecutionConfig,
  ) {
    this.prefetch = new PrefetchBuffer(config.prefetchBufferSize)
    this.allUnits = [
      ...this.makeEntries('ALU', config.units.alu, () => new AluUnit(config.latencies.alu)),
      ...this.makeEntries('MUL', config.units.mul, () => new MulUnit(config.latencies.mul)),
      ...this.makeEntries('LDST', config.units.ldst, () => new LdStUnit(config.latencies.ldst)),
      ...this.makeEntries('JMP', config.units.jmp, () => new JmpUnit(config.latencies.jmp)),
    ]
  }

  private makeEntries(cls: string, count: number, factory: () => FunctionalUnit): FUEntry[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `${cls}-${i}`, class: cls, unit: factory(),
      busy: false, op: null,
      Fi: null, Fj: null, Fk: null, immVk: 0,
      vj: 0, vk: 0,
      Qj: null, Qk: null, Rj: true, Rk: true,
      state: 'idle' as FUState,
    }))
  }

  setPC(pc: number): void { this.pc_ = pc; this.fetchPC_ = pc }
  get tick(): number { return this.tick_ }

  step(): Snapshot {
    this.tick_++
    this.doMemoryTick()   // advance pending LD/ST dMem access first
    this.doWriteResult()
    this.doExecuteTick()
    this.doReadOperands()
    this.doIssue()
    this.doFetch()
    return this.buildSnapshot()
  }

  getExecutionSnapshot(): ExecutionSnapshot {
    const qi = this.qi
    const regStatus = qi
      .map((id, reg) => ({ reg, robTag: id !== null ? 0 : null }))
      .filter(x => x.robTag !== null)

    const units = this.allUnits.map(e => ({
      class: e.class, id: 0, busy: e.busy,
      robTag: null, remaining: this.remainingOf(e.unit),
    }))

    const fuStatus: FUStatusSnapshot[] = this.allUnits.map(e => ({
      id: e.id, class: e.class, busy: e.busy,
      op: e.op ?? '', state: e.state,
      Fi: e.Fi, Fj: e.Fj, Fk: e.Fk,
      Qj: e.Qj, Qk: e.Qk,
      Rj: e.Rj, Rk: e.Rk,
      remaining: this.remainingOf(e.unit),
    }))

    const prefetchEntries = this.prefetch.snapshot().map(e => ({
      pc: e.pc, opcode: e.instr.opcode as string,
    }))

    return {
      mode: 'scoreboard',
      tick: this.tick_,
      reservationStations: [],
      instrStatus: [],
      units,
      fuStatus,
      registerStatus: regStatus,
      rob: { head: 0, tail: 0, entries: [] },
      cdb: null,
      prefetchBuffer: prefetchEntries,
      predictor: null,
      flushedThisTick: false,
    }
  }

  reset(): void {
    this.tick_ = 0; this.pc_ = 0; this.fetchPC_ = 0
    this.branchInFlight_ = false
    this.fetchPending_ = false; this.memState_ = null
    this.prefetch.flush()
    this.qi.fill(null)
    for (const e of this.allUnits) {
      e.busy = false; e.op = null; e.state = 'idle'
      e.Fi = null; e.Fj = null; e.Fk = null; e.immVk = 0
      e.vj = 0; e.vk = 0
      e.Qj = null; e.Qk = null; e.Rj = true; e.Rk = true
      e.unit.reset()
    }
    this.iMem.reset(); this.dMem.reset()
  }

  // ─── Stages ─────────────────────────────────────────────────────────────────

  private doMemoryTick(): void {
    if (this.memState_ === null) return
    this.dMem.tick()
    if (!this.dMem.isReady()) return

    const e = this.memState_.entry
    this.memState_ = null

    const fi = e.Fi
    if (e.op === 'LD' && fi !== null) {
      this.rf.write(fi, this.dMem.result())
      if (this.qi[fi] === e.id) this.qi[fi] = null
    }
    // ST: write already completed in dMem — just free the FU

    this.notifyWaiters(e.id)
    e.unit.reset()
    e.busy = false; e.op = null; e.state = 'idle'
    e.Fi = null; e.Fj = null; e.Fk = null
    e.Qj = null; e.Qk = null; e.Rj = true; e.Rk = true
  }

  private doWriteResult(): void {
    for (const e of this.allUnits) {
      if (e.state !== 'write') continue
      if (!this.warCheck(e)) continue

      const fi = e.Fi

      if (e.op === 'LD') {
        const addr = e.unit.result()
        this.dMem.startAccess(addr)
        this.dMem.tick()
        if (!this.dMem.isReady()) {
          e.state = 'memory'
          this.memState_ = { entry: e }
          continue  // FU stays busy; doMemoryTick() will complete it
        }
        if (fi !== null) {
          this.rf.write(fi, this.dMem.result())
          if (this.qi[fi] === e.id) this.qi[fi] = null
        }
      } else if (e.op === 'ST') {
        this.dMem.startAccess(e.unit.result(), true, e.vj)
        this.dMem.tick()
        if (!this.dMem.isReady()) {
          e.state = 'memory'
          this.memState_ = { entry: e }
          continue  // FU stays busy until write completes
        }
        // Write completed this tick — fall through to free the FU
      } else if (fi !== null && !JMP_OPS.has(e.op!)) {
        this.rf.write(fi, e.unit.result())
        if (this.qi[fi] === e.id) this.qi[fi] = null
      }

      if (JMP_OPS.has(e.op!)) {
        const jmpUnit = e.unit as InstanceType<typeof JmpUnit>
        if (jmpUnit.taken) {
          this.fetchPC_ = jmpUnit.result()
          this.fetchPending_ = false  // restart iMem fetch at branch target
          this.prefetch.flush()
        }
        this.pc_ = jmpUnit.taken ? jmpUnit.result() : this.pc_
        this.branchInFlight_ = false
      }

      this.notifyWaiters(e.id)
      e.unit.reset()
      e.busy = false; e.op = null; e.state = 'idle'
      e.Fi = null; e.Fj = null; e.Fk = null
      e.Qj = null; e.Qk = null; e.Rj = true; e.Rk = true
    }
  }

  private warCheck(e: FUEntry): boolean {
    const fi = e.Fi
    if (fi === null) return true
    for (const y of this.allUnits) {
      if (y === e || !y.busy) continue
      if (y.Fj === fi && y.Rj) return false
      if (y.Fk === fi && y.Rk) return false
    }
    return true
  }

  private notifyWaiters(unitId: string): void {
    for (const y of this.allUnits) {
      if (!y.busy) continue
      if (y.Qj === unitId) { y.Qj = null; y.Rj = true }
      if (y.Qk === unitId) { y.Qk = null; y.Rk = true }
    }
  }

  private doExecuteTick(): void {
    for (const e of this.allUnits) {
      if (e.state === 'execute') {
        e.unit.tick()
        if (e.unit.isReady()) e.state = 'write'
      }
    }
  }

  private doReadOperands(): void {
    for (const e of this.allUnits) {
      if (e.state !== 'issue') continue
      if (!e.Rj || !e.Rk) continue

      e.vj = e.Fj !== null ? this.rf.read(e.Fj) : 0
      e.vk = e.Fk !== null ? this.rf.read(e.Fk) : e.immVk
      e.unit.start(e.op!, e.vj, e.vk, 0)
      e.Rj = false; e.Rk = false
      e.state = 'execute'
    }
  }

  private doIssue(): void {
    if (this.prefetch.empty || this.branchInFlight_) return

    const entry = this.prefetch.peek()!
    const { instr, pc } = entry

    const fi = this.destRegOf(instr)
    const fj = this.srcARegOf(instr)
    const fk = this.srcBRegOf(instr)
    const immVk = instr.imm ?? 0

    // Structural hazard: no free unit of the right class
    const fu = this.allUnits.find(e => e.class === this.classFor(instr.opcode) && !e.busy)
    if (!fu) return

    // WAW hazard: some unit is already writing to fi
    if (fi !== null && this.qi[fi] !== null) return

    this.prefetch.pop()

    // Issue
    fu.busy = true
    fu.op = instr.opcode
    fu.Fi = fi
    fu.Fj = fj
    fu.Fk = fk
    fu.immVk = immVk
    fu.vj = 0; fu.vk = 0
    fu.Qj = fj !== null ? (this.qi[fj] ?? null) : null
    fu.Qk = fk !== null ? (this.qi[fk] ?? null) : null
    fu.Rj = fu.Qj === null
    fu.Rk = fu.Qk === null
    fu.state = 'issue'

    if (fi !== null) this.qi[fi] = fu.id

    if (JMP_OPS.has(instr.opcode)) this.branchInFlight_ = true

    this.pc_ = pc
  }

  private doFetch(): void {
    while (!this.prefetch.full) {
      if (!this.fetchPending_) this.iMem.startAccess(this.fetchPC_)
      this.iMem.tick()
      if (!this.iMem.isReady()) { this.fetchPending_ = true; break }
      this.fetchPending_ = false
      const pc = this.fetchPC_
      const instr = decode(this.iMem.result())
      this.prefetch.push({ instr, pc, predictedTaken: false })
      this.fetchPC_ += 4
      break
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private classFor(op: Opcode): string {
    if (MUL_OPS.has(op)) return 'MUL'
    if (LDST_OPS.has(op)) return 'LDST'
    if (JMP_OPS.has(op)) return 'JMP'
    return 'ALU'
  }

  private destRegOf(instr: Instruction): number | null {
    if (instr.opcode === 'ST' || JMP_OPS.has(instr.opcode) || instr.opcode === 'NOP') return null
    return instr.rd ?? null
  }

  private srcARegOf(instr: Instruction): number | null {
    switch (instr.format) {
      case 'RRR': return instr.rs1 ?? null
      case 'RRI': return instr.rs1 ?? null
      case 'RM':  return instr.rd  ?? null
      case 'J':   return null
    }
  }

  private srcBRegOf(instr: Instruction): number | null {
    if (instr.format === 'RRR') return instr.rs2 ?? null
    return null  // RRI/RM/J use immediates
  }

  private remainingOf(u: FunctionalUnit): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (u as any).remaining ?? 0
  }

  private buildSnapshot(): Snapshot {
    const registers: RegisterSnapshot[] = Array.from({ length: 16 }, (_, i) => ({
      value: this.rf.read(i), valid: this.rf.isValid(i),
    }))
    const latch: PipelineLatch = {
      PC: this.pc_, MAR: 0, MDR: 0, IR: 0, A: 0, B: 0, C: 0, addressBus: 0, dataBus: 0,
    }
    const noAccess: MemoryAccessResult = { address: 0, hit: false, cycles: 0 }
    return {
      tick: this.tick_, pc: this.pc_, registers, latch,
      stageOf: ['', '', '', '', ''], stallReason: null,
      iMemAccess: this.iMem.lastAccess ?? noAccess,
      dMemAccess: this.dMem.lastAccess ?? noAccess,
    }
  }
}
