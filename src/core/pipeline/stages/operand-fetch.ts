import type { Instruction } from '@core/contracts/instruction'
import type { RegisterFile } from '@core/contracts/register-file'
import type { PipelineSlot } from '../latch'
import { detectHazard } from '../hazards'
import { tryForward } from '../forwarding'

export interface OperandFetchResult {
  a: number
  b: number
  stall: string | null
}

// Instrucțiuni care NU scriu un registru destinație:
const NO_WRITEBACK = new Set(['ST', 'NOP', 'JMP'])

export function stageOperandFetch(
  instr: Instruction,
  slots: PipelineSlot[],
  rf: RegisterFile,
  forwardingEnabled: boolean,
): OperandFetchResult {
  if (!forwardingEnabled) {
    const hazard = detectHazard(instr, rf)
    if (hazard) return { a: 0, b: 0, stall: hazard }
  } else {
    // Chiar cu forwarding, load-use hazard (LD în MEM → dependent în OF) nu poate fi rezolvat:
    // datele LD nu sunt disponibile până la sfârșitul MEM.
    const memSlot = slots[3]
    if (memSlot?.instr?.opcode === 'LD') {
      const ld = memSlot.instr
      const needsLd = (ld.rd === instr.rs1 && instr.rs1 !== undefined)
                   || (ld.rd === instr.rs2 && instr.rs2 !== undefined)
                   || (instr.opcode === 'ST' && ld.rd === instr.rd)
      if (needsLd) return { a: 0, b: 0, stall: `Load-use hazard: LD R${ld.rd} în MEM` }
    }
  }

  let a: number, b: number

  if (instr.opcode === 'ST') {
    // Format RM pentru ST: câmpul `rd` conține registrul sursă (valoarea de stocat).
    // `imm` este adresa de scriere.
    a = instr.rd !== undefined ? tryForward(instr.rd, slots, rf) : 0
    b = instr.imm ?? 0
    // ST nu marchează niciun registru ca in-flight (nu are destinație)
  } else {
    a = instr.rs1 !== undefined ? tryForward(instr.rs1, slots, rf) : 0
    b = instr.rs2 !== undefined ? tryForward(instr.rs2, slots, rf) : (instr.imm ?? 0)
    // Marchează registrul destinație ca în zbor (doar dacă instrucțiunea scrie)
    if (!NO_WRITEBACK.has(instr.opcode) && instr.rd !== undefined) {
      rf.setValid(instr.rd, false)
    }
  }

  return { a, b, stall: null }
}
