import type { MemorySystem } from '@core/contracts/memory-system'
import type { PipelineLatch } from '@core/contracts/snapshot'
import type { PipelineSlot } from '../latch'

export interface MemoryStageResult {
  latchUpdate: Partial<PipelineLatch>  // doar pentru afișaj
  mdr: number                          // valoare citită (LD); 0 pentru altele
  stall: boolean
  memPending: boolean
}

// MEM: folosește slot.b (adresă) și slot.a (valoare pentru ST).
// Returnează mdr pentru LD; pipeline.ts îl salvează în slot.mdr.
export function stageMemory(
  slot: PipelineSlot,
  dMem: MemorySystem,
  memPending: boolean,
): MemoryStageResult {
  const instr = slot.instr
  if (!instr) return { latchUpdate: {}, mdr: 0, stall: false, memPending: false }

  if (instr.opcode === 'LD') {
    const addr = slot.b   // adresa calculată de OF din imm
    if (!memPending) dMem.startAccess(addr)
    dMem.tick()

    if (!dMem.isReady()) {
      return { latchUpdate: { MAR: addr, addressBus: addr }, mdr: 0, stall: true, memPending: true }
    }
    const val = dMem.result()
    return { latchUpdate: { MDR: val, dataBus: val }, mdr: val, stall: false, memPending: false }
  }

  if (instr.opcode === 'ST') {
    const addr = slot.b   // adresa din imm (setată de OF)
    const val  = slot.a   // valoarea din registrul sursă (slot.a setat de OF pentru ST)
    if (!memPending) dMem.startAccess(addr, true, val)
    dMem.tick()

    if (!dMem.isReady()) {
      return { latchUpdate: { MAR: addr, addressBus: addr, dataBus: val }, mdr: 0, stall: true, memPending: true }
    }
    return { latchUpdate: {}, mdr: 0, stall: false, memPending: false }
  }

  // ALU / NOP / JMP — pass-through
  return { latchUpdate: {}, mdr: 0, stall: false, memPending: false }
}
