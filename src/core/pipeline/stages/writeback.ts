import type { RegisterFile } from '@core/contracts/register-file'
import type { PipelineSlot } from '../latch'

const NO_WRITEBACK = new Set(['ST', 'NOP', 'JMP'])

// WB: folosește slot.mdr (LD) sau slot.c (ALU).
// ST, NOP, JMP nu scriu niciun registru.
export function stageWriteback(
  slot: PipelineSlot,
  rf: RegisterFile,
): void {
  const instr = slot.instr
  if (!instr || instr.rd === undefined) return
  if (NO_WRITEBACK.has(instr.opcode)) return

  const value = instr.opcode === 'LD' ? slot.mdr : slot.c
  rf.write(instr.rd, value)
  rf.setValid(instr.rd, true)
}
