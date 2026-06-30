import type { Opcode, InstructionFormat } from '@core/contracts/instruction'

// Encoding pe 4 biți (biții 31–28 ai cuvântului de instrucțiune de 32 biți).
// Această tabelă e append-only: P2 adaugă opcode-urile noi fără să atingă rândurile existente.
export const OPCODE_ENCODING: Record<Opcode, number> = {
  ADD: 0x0,
  SUB: 0x1,
  MUL: 0x2,
  LD:  0x3,
  ST:  0x4,
  JMP: 0x5,
  NOP: 0xF,
}

export const ENCODING_OPCODE: Record<number, Opcode> = Object.fromEntries(
  Object.entries(OPCODE_ENCODING).map(([k, v]) => [v, k as Opcode])
)

export const OPCODE_FORMAT: Record<Opcode, InstructionFormat> = {
  ADD: 'RRR',
  SUB: 'RRI',   // SUB Rd, Rs1, imm (imediatul e al doilea operand)
  MUL: 'RRR',
  LD:  'RM',
  ST:  'RM',
  JMP: 'J',
  NOP: 'RRR',
}
