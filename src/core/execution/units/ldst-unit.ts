import type { FunctionalUnit } from './functional-unit'
import type { Opcode } from '@core/contracts/instruction'

// Computes the effective address for LD/ST.  The actual dMem access is driven by the
// Tomasulo core after this unit signals isReady().
//
// LD (RM format): vj = rf[rd] (unused), vk = imm (address) → result() = address
// ST (RM format): vj = rf[rd] (value to store),  vk = imm (address) → result() = address
//                 storeValue is exposed separately for the commit stage.
export class LdStUnit implements FunctionalUnit {
  private _robTag: number | null = null
  private remaining = 0
  private _address = 0
  private _storeValue = 0
  private _isStore = false

  constructor(private readonly latency: number) {}

  get busy(): boolean { return this._robTag !== null }
  get robTag(): number | null { return this._robTag }
  get storeValue(): number { return this._storeValue }
  get isStore(): boolean { return this._isStore }

  start(op: Opcode, vj: number, vk: number, robTag: number): void {
    this._robTag = robTag
    this.remaining = this.latency
    this._isStore = op === 'ST'
    this._storeValue = vj   // relevant only for ST
    this._address = vk       // effective address = imm (no base register in this ISA)
  }

  tick(): void { if (this.remaining > 0) this.remaining-- }
  isReady(): boolean { return this.remaining === 0 }
  result(): number { return this._address }

  reset(): void {
    this._robTag = null
    this.remaining = 0
    this._address = 0
    this._storeValue = 0
    this._isStore = false
  }
}
