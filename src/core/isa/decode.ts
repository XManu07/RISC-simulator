import type { Instruction } from '@core/contracts/instruction'
import { ENCODING_OPCODE, OPCODE_FORMAT } from './opcodes'

export function decode(raw: number): Instruction {
  const opNum = (raw >>> 28) & 0xF
  const opcode = ENCODING_OPCODE[opNum] ?? 'NOP'
  const format = OPCODE_FORMAT[opcode]

  const rd  = (raw >>> 24) & 0xF
  const rs1 = (raw >>> 20) & 0xF
  const rs2 = (raw >>> 16) & 0xF
  const imm = raw & 0xFFFF

  switch (format) {
    case 'RRR': return { opcode, format, rd, rs1, rs2, raw }
    case 'RRI': return { opcode, format, rd, rs1, imm, raw }
    case 'RM':  return { opcode, format, rd, imm, raw }
    case 'J':   return { opcode, format, imm, raw }
  }
}
