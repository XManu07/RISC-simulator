import type { FunctionalUnit } from './functional-unit'
import type { Opcode } from '@core/contracts/instruction'

// Resolves branch targets and taken/not-taken outcomes.
//
// JMP (J format):  vj = unused, vk = imm (target) → always taken
// JZ  (RM format): vj = rf[rd] (condition),  vk = imm (target) → taken if vj === 0
// JNZ (RM format): vj = rf[rd] (condition),  vk = imm (target) → taken if vj !== 0
//
// result() = branch target; taken is exposed so the ROB commit stage can detect mispredicts.
export class JmpUnit implements FunctionalUnit {
  private _robTag: number | null = null
  private remaining = 0
  private _result = 0
  private _taken = false

  constructor(private readonly latency: number) {}

  get busy(): boolean { return this._robTag !== null }
  get robTag(): number | null { return this._robTag }
  get taken(): boolean { return this._taken }

  start(op: Opcode, vj: number, vk: number, robTag: number): void {
    this._robTag = robTag
    this.remaining = this.latency
    this._result = vk   // target for all JMP-class instructions
    switch (op) {
      case 'JMP': this._taken = true; break
      case 'JZ':  this._taken = vj === 0; break
      case 'JNZ': this._taken = vj !== 0; break
      default:    this._taken = false
    }
  }

  tick(): void { if (this.remaining > 0) this.remaining-- }
  isReady(): boolean { return this.remaining === 0 }
  result(): number { return this._result }

  reset(): void {
    this._robTag = null
    this.remaining = 0
    this._result = 0
    this._taken = false
  }
}
