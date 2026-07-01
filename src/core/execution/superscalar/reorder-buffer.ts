import type { Opcode } from '@core/contracts/instruction'

export type ROBState = 'issue' | 'execute' | 'write'

export interface ROBEntry {
  busy: boolean
  index: number
  pc: number
  opcode: Opcode
  destReg: number | null
  value: number
  ready: boolean
  state: ROBState
  predictedTaken: boolean
  branchTaken: boolean
  branchTarget: number
  isStore: boolean
  storeAddr: number
  storeValue: number
}

function makeBlankEntry(index: number): ROBEntry {
  return {
    busy: false, index, pc: 0, opcode: 'NOP', destReg: null,
    value: 0, ready: false, state: 'issue',
    predictedTaken: false, branchTaken: false, branchTarget: 0,
    isStore: false, storeAddr: 0, storeValue: 0,
  }
}

export class ReorderBuffer {
  private entries: ROBEntry[]
  private head_ = 0
  private tail_ = 0
  private count_ = 0

  constructor(private readonly size: number) {
    this.entries = Array.from({ length: size }, (_, i) => makeBlankEntry(i))
  }

  get full(): boolean { return this.count_ === this.size }
  get empty(): boolean { return this.count_ === 0 }
  get head(): number { return this.head_ }
  get tail(): number { return this.tail_ }

  get headEntry(): ROBEntry | null {
    return this.count_ > 0 ? this.entries[this.head_] : null
  }

  alloc(): number | null {
    if (this.full) return null
    const idx = this.tail_
    const e = this.entries[idx]
    Object.assign(e, makeBlankEntry(idx))
    e.busy = true
    this.tail_ = (this.tail_ + 1) % this.size
    this.count_++
    return idx
  }

  rollbackAlloc(): void {
    if (this.count_ === 0) return
    this.tail_ = (this.tail_ - 1 + this.size) % this.size
    this.entries[this.tail_].busy = false
    this.count_--
  }

  commitHead(): void {
    if (this.empty) return
    this.entries[this.head_].busy = false
    this.head_ = (this.head_ + 1) % this.size
    this.count_--
  }

  get(index: number): ROBEntry { return this.entries[index] }

  reset(): void {
    for (let i = 0; i < this.size; i++) {
      Object.assign(this.entries[i], makeBlankEntry(i))
    }
    this.head_ = 0; this.tail_ = 0; this.count_ = 0
  }

  snapshot(): { head: number; tail: number; entries: ROBEntry[] } {
    return {
      head: this.head_,
      tail: this.tail_,
      entries: this.entries.map(e => ({ ...e })),
    }
  }
}
