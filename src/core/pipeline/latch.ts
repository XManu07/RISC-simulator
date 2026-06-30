import type { PipelineLatch } from '@core/contracts/snapshot'
import type { Instruction } from '@core/contracts/instruction'

export function instrToText(instr: Instruction): string {
  const { opcode, rd, rs1, rs2, imm } = instr
  if (rd !== undefined && rs1 !== undefined && rs2 !== undefined)
    return `${opcode} R${rd},R${rs1},R${rs2}`
  if (rd !== undefined && rs1 !== undefined && imm !== undefined)
    return `${opcode} R${rd},R${rs1},0x${imm.toString(16)}`
  if (rd !== undefined && imm !== undefined)
    return `${opcode} R${rd},0x${imm.toString(16)}`
  if (imm !== undefined)
    return `${opcode} 0x${imm.toString(16)}`
  return opcode
}

export function emptyLatch(): PipelineLatch {
  return { PC: 0, MAR: 0, MDR: 0, IR: 0, A: 0, B: 0, C: 0, addressBus: 0, dataBus: 0 }
}

// Fiecare slot cară propriile valori A/B/C/MDR prin pipeline.
// Latch-ul global (PipelineLatch) e folosit DOAR pentru afișaj în UI, nu pentru calcul.
export interface PipelineSlot {
  instr: Instruction | null  // null = bubble
  text: string               // text pentru UI
  stallCycles: number
  a: number    // operand Rs1 — setat de OF, purtat până la EX
  b: number    // operand Rs2 / imm / adresă — setat de OF, purtat până la MEM
  c: number    // rezultat EX (ALU / adresă JMP) — setat de EX, purtat până la WB
  mdr: number  // valoare citită din memorie (LD) — setat de MEM, purtat până la WB
}

export function emptySlot(): PipelineSlot {
  return { instr: null, text: '---', stallCycles: 0, a: 0, b: 0, c: 0, mdr: 0 }
}
