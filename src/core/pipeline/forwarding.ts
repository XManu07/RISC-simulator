import type { RegisterFile } from '@core/contracts/register-file'
import type { PipelineSlot } from './latch'

// Forwarding EX→OF: instrucțiunea din EX (slots[2]) a calculat rezultatul ÎN ACEST TACT
// (EX rulează înaintea OF în ordinea din tick_), deci slots[2].c e deja valid.
//
// Forwarding MEM→OF: instrucțiunile ALU din MEM (slots[3]) au results în slots[3].c
// (setat când au trecut prin EX). Pentru LD în MEM rezultatul nu e disponibil încă
// (mem-read se face ÎN ACEL TACT de MEM) — load-use hazard trebuie stall.
export function tryForward(
  reg: number,
  slots: PipelineSlot[],
  rf: RegisterFile,
): number {
  if (!rf.isValid(reg)) {
    // EX→OF: instrucțiunea din EX tocmai și-a calculat rezultatul
    const exSlot = slots[2]
    if (exSlot?.instr?.rd === reg
        && exSlot.instr.opcode !== 'ST'
        && exSlot.instr.opcode !== 'NOP'
        && exSlot.instr.opcode !== 'LD') {
      return exSlot.c
    }

    // MEM→OF: ALU în MEM are rezultatul în slot.c (de când a trecut prin EX)
    // LD în MEM NU poate forwarda (datele vin abia la finalul MEM)
    const memSlot = slots[3]
    if (memSlot?.instr?.rd === reg
        && memSlot.instr.opcode !== 'LD'
        && memSlot.instr.opcode !== 'ST'
        && memSlot.instr.opcode !== 'NOP') {
      return memSlot.c
    }
  }

  return rf.read(reg)
}
