import type { FunctionalUnit } from './functional-unit'
import type { Opcode } from '@core/contracts/instruction'

// Multi-cycle unit for MUL and DIV.  latency comes from ExecutionConfig.latencies.mul (default 4).
export class MulUnit implements FunctionalUnit {
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
      case 'MUL': this._result = Math.imul(vj, vk); break
      case 'DIV': this._result = vk === 0 ? 0 : (vj / vk) | 0; break
      default:    this._result = 0
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
