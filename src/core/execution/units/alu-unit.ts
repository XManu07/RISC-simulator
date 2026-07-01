import type { FunctionalUnit } from './functional-unit'
import type { Opcode } from '@core/contracts/instruction'

// Handles ADD, SUB, AND, OR, XOR, SHL, SHR, LDI, NOP — all ALU-class except MUL/DIV.
// MUL and DIV route to MulUnit even though INSTRUCTION_CLASS maps them to 'ALU'.
export class AluUnit implements FunctionalUnit {
  private _robTag: number | null = null
  private remaining = 0
  private _result = 0

  constructor(private readonly latency: number) {}

  get busy(): boolean { return this._robTag !== null }
  get robTag(): number | null { return this._robTag }

  start(op: Opcode, vj: number, vk: number, robTag: number): void {
    this._robTag = robTag
    this.remaining = this.latency
    switch (op) {
      case 'ADD': this._result = (vj + vk) | 0; break
      case 'SUB': this._result = (vj - vk) | 0; break
      case 'AND': this._result = (vj & vk) | 0; break
      case 'OR':  this._result = (vj | vk) | 0; break
      case 'XOR': this._result = (vj ^ vk) | 0; break
      case 'SHL': this._result = (vj << (vk & 31)) | 0; break
      case 'SHR': this._result = vj >>> (vk & 31); break
      case 'LDI': this._result = vk; break        // vk = imm (RM format: slot.b = imm)
      default:    this._result = 0                // NOP and any unrecognised op
    }
  }

  tick(): void { if (this.remaining > 0) this.remaining-- }
  isReady(): boolean { return this.remaining === 0 }
  result(): number { return this._result }

  reset(): void {
    this._robTag = null
    this.remaining = 0
    this._result = 0
  }
}
