import type { ExecutionEngine } from '@core/contracts/execution-engine'
import type { Instruction } from '@core/contracts/instruction'

// Mock baseline — execuție in-order cu latență 1 tact.
// P2 înlocuiește asta cu engine-ul superscalar + unități funcționale specializate.
export class InOrderEngine implements ExecutionEngine {
  execute(instr: Instruction, a: number, b: number): number | undefined {
    switch (instr.opcode) {
      case 'ADD': return (a + b) | 0
      case 'SUB': return (a - b) | 0
      case 'MUL': return Math.imul(a, b)
      case 'LD':  return b           // adresa e în b; pipeline-ul citește din dMem la stagiul MEM
      case 'ST':  return a           // valoarea de scris — stagiul MEM scrie efectiv în dMem
      case 'JMP': return instr.imm ?? 0
      case 'NOP': return 0
    }
  }

  tick(): void {}

  reset(): void {}
}
