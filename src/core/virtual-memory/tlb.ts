import type { TlbEntry } from './snapshot'

export class TLB {
  private entries: TlbEntry[]

  constructor(private size: number) {
    this.entries = Array.from({ length: size }, () => ({ vpn: 0, ppn: 0, valid: false }))
  }

  lookup(vpn: number): number | null {
    const idx = this.entries.findIndex(e => e.valid && e.vpn === vpn)
    if (idx === -1) return null
    const [hit] = this.entries.splice(idx, 1)
    this.entries.unshift(hit)   
    return hit.ppn
  }

  install(vpn: number, ppn: number): void {
    const freeIdx = this.entries.findIndex(e => !e.valid)
    const target = freeIdx !== -1 ? freeIdx : this.entries.length - 1
    this.entries[target] = { vpn, ppn, valid: true }
    const [entry] = this.entries.splice(target, 1)
    this.entries.unshift(entry)
  }

  snapshot(): TlbEntry[] {
    return this.entries.map(e => ({ ...e }))
  }

  reset(): void {
    this.entries = Array.from({ length: this.size }, () => ({ vpn: 0, ppn: 0, valid: false }))
  }
}
