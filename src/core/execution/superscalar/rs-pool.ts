import type { Opcode } from '@core/contracts/instruction'

export interface RSEntry {
  id: number
  busy: boolean
  op: Opcode
  Vj: number
  Vk: number
  Qj: number | null
  Qk: number | null
  destRob: number
}

export class RSPool {
  readonly entries: RSEntry[]

  constructor(size: number) {
    this.entries = Array.from({ length: size }, (_, i): RSEntry => ({
      id: i, busy: false, op: 'NOP',
      Vj: 0, Vk: 0, Qj: null, Qk: null, destRob: 0,
    }))
  }

  alloc(): number | null {
    const e = this.entries.find(e => !e.busy)
    return e ? e.id : null
  }

  set(id: number, fields: Omit<RSEntry, 'id'>): void {
    Object.assign(this.entries[id], fields)
  }

  free(id: number): void {
    this.entries[id].busy = false
  }

  snoopCDB(robTag: number, value: number): void {
    for (const e of this.entries) {
      if (!e.busy) continue
      if (e.Qj === robTag) { e.Vj = value; e.Qj = null }
      if (e.Qk === robTag) { e.Vk = value; e.Qk = null }
    }
  }

  getReady(): RSEntry[] {
    return this.entries.filter(e => e.busy && e.Qj === null && e.Qk === null)
  }

  reset(): void {
    for (const e of this.entries) {
      e.busy = false; e.Qj = null; e.Qk = null
    }
  }
}
