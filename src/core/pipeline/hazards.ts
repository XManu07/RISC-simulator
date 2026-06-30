import type { Instruction } from '@core/contracts/instruction'
import type { RegisterFile } from '@core/contracts/register-file'

export function detectHazard(instr: Instruction, rf: RegisterFile): string | null {
  const check = (reg: number | undefined, name: string): string | null => {
    if (reg === undefined) return null
    if (!rf.isValid(reg)) return `Hazard RAW: R${reg} în zbor (${name})`
    return null
  }

  // Pentru ST, câmpul `rd` este registrul sursă (valoarea de stocat), nu destinație.
  const stSourceCheck = instr.opcode === 'ST' ? check(instr.rd, 'sursă ST') : null

  return check(instr.rs1, 'Rs1') ?? check(instr.rs2, 'Rs2') ?? stSourceCheck
}
