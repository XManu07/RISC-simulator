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
  // P2 additions (nibbles 0x6–0xE)
  DIV: 0x6,
  AND: 0x7,
  OR:  0x8,
  XOR: 0x9,
  SHL: 0xA,
  SHR: 0xB,
  LDI: 0xC,
  JZ:  0xD,
  JNZ: 0xE,
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
  // P2 additions
  DIV: 'RRR',
  AND: 'RRR',
  OR:  'RRR',
  XOR: 'RRR',
  SHL: 'RRI',   // SHL Rd, Rs1, imm (shift left by immediate)
  SHR: 'RRI',   // SHR Rd, Rs1, imm (logical shift right by immediate)
  LDI: 'RM',    // LDI Rd, imm (load 16-bit immediate; rd=imm, no base register)
  JZ:  'RM',    // JZ Rd, addr — jump to addr if Rd==0 (rd field = condition register)
  JNZ: 'RM',    // JNZ Rd, addr — jump to addr if Rd!=0
}
