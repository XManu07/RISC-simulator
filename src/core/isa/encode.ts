import type { Instruction } from '@core/contracts/instruction'
import { OPCODE_ENCODING } from './opcodes'

// Format 32 biți:
//   [31:28] opcode (4b)  [27:24] Rd (4b)  [23:20] Rs1 (4b)  [19:16] Rs2 (4b)  [15:0] imm/addr (16b)
//
// RRR: opcode | Rd | Rs1 | Rs2 | 0
// RRI: opcode | Rd | Rs1 | 0   | imm(16)
// RM:  opcode | Rd | 0   | 0   | addr(16)   (LD: Rd = dest; ST: Rd = sursa de scris)
// J:   opcode | 0  | 0   | 0   | addr(16)

export function encode(instr: Omit<Instruction, 'raw'>): number {
  const op = OPCODE_ENCODING[instr.opcode]
  const rd  = (instr.rd  ?? 0) & 0xF
  const rs1 = (instr.rs1 ?? 0) & 0xF
  const rs2 = (instr.rs2 ?? 0) & 0xF
  const imm = (instr.imm ?? 0) & 0xFFFF

  switch (instr.format) {
    case 'RRR': return (op << 28) | (rd << 24) | (rs1 << 20) | (rs2 << 16)
    case 'RRI': return (op << 28) | (rd << 24) | (rs1 << 20) | imm
    case 'RM':  return (op << 28) | (rd << 24) | imm
    case 'J':   return (op << 28) | imm
  }
}
