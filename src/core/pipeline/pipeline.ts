import type { MemorySystem } from '@core/contracts/memory-system'
import type { ExecutionEngine } from '@core/contracts/execution-engine'
import type { RegisterFile } from '@core/contracts/register-file'
import type { Snapshot, PipelineLatch } from '@core/contracts/snapshot'
import { emptyLatch, emptySlot, type PipelineSlot } from './latch'
import { stageFetch } from './stages/fetch'
import { stageOperandFetch } from './stages/operand-fetch'
import { stageExecute } from './stages/execute'
import { stageMemory } from './stages/memory'
import { stageWriteback } from './stages/writeback'

// slots[0]=IF  slots[1]=OF  slots[2]=EX  slots[3]=MEM  slots[4]=WB
//
// Latch-ul global e DOAR pentru afișaj (UI).
// Valorile reale A/B/C/MDR sunt transportate în câmpurile slot.a/b/c/mdr.
export class Pipeline {
  private tick = 0
  private pc = 0
  private latch: PipelineLatch = emptyLatch()
  private slots: PipelineSlot[] = Array.from({ length: 5 }, emptySlot)
  private fetchPending = false
  private memPending = false

  constructor(
    private rf: RegisterFile,
    private engine: ExecutionEngine,
    private iMem: MemorySystem,
    private dMem: MemorySystem,
    private forwardingEnabled = true,
  ) {}

  setPC(pc: number): void {
    this.pc = pc
    this.latch.PC = pc
  }

  tick_(): Snapshot {
    this.tick++
    let stallReason: string | null = null

    // Captează stageOf la ÎNCEPUTUL tactului (arată ce procesează fiecare stagiu ACUM).
    // stageOf[0] (IF) va fi actualizat după ce IF rulează.
    const stageOfLabels = this.slots.map(s => s.text)

    // ── WB ────────────────────────────────────────────────────────────────
    stageWriteback(this.slots[4], this.rf)
    // Actualizează latch-ul pentru afișaj
    if (this.slots[4].instr && this.slots[4].instr.rd !== undefined) {
      this.latch.C = this.slots[4].c
      if (this.slots[4].instr.opcode === 'LD') this.latch.MDR = this.slots[4].mdr
    }

    // ── MEM ───────────────────────────────────────────────────────────────
    const memRes = stageMemory(this.slots[3], this.dMem, this.memPending)
    this.memPending = memRes.memPending
    Object.assign(this.latch, memRes.latchUpdate)

    if (memRes.stall) {
      // Totul îngheață. WB a rulat deja; WB box → bubble pentru tacul următor.
      this.slots[4] = emptySlot()
      stageOfLabels[0] = `0x${this.pc.toString(16).toUpperCase()}`
      return this.buildSnapshot('MEM: aştept memorie de date', stageOfLabels)
    }

    // Salvează rezultatul MEM în slot (pentru LD: mdr)
    if (memRes.mdr !== 0 || this.slots[3].instr?.opcode === 'LD') {
      this.slots[3].mdr = memRes.mdr
    }

    // ── JMP flush ─────────────────────────────────────────────────────────
    if (this.slots[3].instr?.opcode === 'JMP') {
      this.pc = this.slots[3].c   // adresa țintă din slot.c (setat de EX)
      this.latch.PC = this.pc
      this.slots[0] = emptySlot()
      this.slots[1] = emptySlot()
      this.slots[2] = emptySlot()
      this.fetchPending = false
    }

    // ── EX ────────────────────────────────────────────────────────────────
    let exStall = false
    const exRes = stageExecute(this.slots[2], this.engine)
    if (exRes.stall) {
      exStall = true
      stallReason = 'EX: unitate funcţională ocupată'
    } else if (this.slots[2].instr) {
      this.slots[2].c = exRes.c
      this.latch.C = exRes.c   // afișaj
    }

    // ── OF ────────────────────────────────────────────────────────────────
    let ofStall = false
    const ofInstr = this.slots[1].instr
    if (ofInstr && !exStall) {
      const ofRes = stageOperandFetch(ofInstr, this.slots, this.rf, this.forwardingEnabled)
      if (ofRes.stall) {
        ofStall = true
        stallReason = ofRes.stall
      } else {
        this.slots[1].a = ofRes.a
        this.slots[1].b = ofRes.b
        this.latch.A = ofRes.a   // afișaj
        this.latch.B = ofRes.b   // afișaj
      }
    }

    // ── IF ────────────────────────────────────────────────────────────────
    const { result: ifRes, fetchPending: fp } = stageFetch(this.pc, this.iMem, this.fetchPending)
    this.fetchPending = fp
    Object.assign(this.latch, ifRes.latchUpdate)
    if (ifRes.stall) {
      stallReason = stallReason ?? 'IF: aştept memorie de instrucţiuni'
      stageOfLabels[0] = `0x${this.pc.toString(16).toUpperCase()} (...)`
    } else {
      stageOfLabels[0] = ifRes.slot.text
    }

    // ── AVANSARE SLOTURI ──────────────────────────────────────────────────
    this.slots[4] = this.slots[3]   // WB ← MEM

    if (exStall) {
      this.slots[3] = emptySlot()   // bubble în MEM; EX/OF/IF îngheaţă
    } else {
      this.slots[3] = this.slots[2]  // MEM ← EX

      if (ofStall) {
        this.slots[2] = emptySlot()  // bubble în EX; OF/IF îngheaţă
      } else {
        this.slots[2] = this.slots[1]  // EX ← OF

        if (ifRes.stall) {
          this.slots[1] = emptySlot()  // bubble în OF; IF îngheaţă
        } else {
          this.slots[1] = ifRes.slot   // OF ← instrucţiune nou fetchuită
          this.slots[0] = emptySlot()
          this.pc = ifRes.newPC
          this.latch.PC = ifRes.newPC
        }
      }
    }

    return this.buildSnapshot(stallReason, stageOfLabels)
  }

  private buildSnapshot(stallReason: string | null, stageOf: string[]): Snapshot {
    const registers = Array.from({ length: this.rf.count }, (_, i) => ({
      value: this.rf.read(i),
      valid: this.rf.isValid(i),
    }))

    return {
      tick: this.tick,
      pc: this.pc,
      registers,
      latch: { ...this.latch },
      stageOf,
      stallReason,
      iMemAccess: this.iMem.lastAccess,
      dMemAccess: this.dMem.lastAccess,
    }
  }

  reset(): void {
    this.tick = 0
    this.pc = 0
    this.latch = emptyLatch()
    this.slots = Array.from({ length: 5 }, emptySlot)
    this.fetchPending = false
    this.memPending = false
    this.rf.reset()
    this.engine.reset()
    this.iMem.reset()
    this.dMem.reset()
  }
}
