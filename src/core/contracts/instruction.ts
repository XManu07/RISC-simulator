export type Opcode = 'ADD' | 'SUB' | 'MUL' | 'LD' | 'ST' | 'JMP' | 'NOP'

export type InstructionClass = 'ALU' | 'LOAD' | 'STORE' | 'JMP'

export type InstructionFormat = 'RRR' | 'RRI' | 'RM' | 'J'

export interface Instruction {
  opcode: Opcode
  format: InstructionFormat
  rd?: number    // registru destinație (0–15)
  rs1?: number   // registru sursă 1
  rs2?: number   // registru sursă 2
  imm?: number   // valoare imediată sau adresă
  raw: number    // cuvântul de 32 biți original
}

export const INSTRUCTION_CLASS: Record<Opcode, InstructionClass> = {
  ADD: 'ALU',
  SUB: 'ALU',
  MUL: 'ALU',
  LD:  'LOAD',
  ST:  'STORE',
  JMP: 'JMP',
  NOP: 'ALU',
}
