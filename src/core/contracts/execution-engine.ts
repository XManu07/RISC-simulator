import type { Instruction } from './instruction'

export interface ExecutionEngine {
  // Pornește execuția unei instrucțiuni.
  // Returnează rezultatul dacă e gata în același tact (latență 1),
  // sau undefined dacă mai are nevoie de tacte (stall).
  execute(instr: Instruction, a: number, b: number): number | undefined

  // Avansează un tact intern (pentru unități cu latență > 1).
  tick(): void

  reset(): void
}
