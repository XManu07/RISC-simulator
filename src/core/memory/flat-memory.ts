import type { MemorySystem, MemoryAccessResult } from '@core/contracts/memory-system'

// Mock baseline — memorie plată fără latență (1 tact, mereu hit).
// P3 înlocuiește asta cu implementarea de cache.
export class FlatMemory implements MemorySystem {
  private data: Map<number, number>
  private _result = 0
  private _ready = false
  private _isWrite = false
  private _writeValue = 0
  private _lastAccess: MemoryAccessResult = { address: 0, hit: true, cycles: 1 }

  constructor(initial: Map<number, number> = new Map()) {
    this.data = new Map(initial)
  }

  startAccess(address: number, write = false, value = 0): void {
    this._lastAccess = { address, hit: true, cycles: 1 }
    this._isWrite = write
    this._writeValue = value
    if (!write) {
      this._result = this.data.get(address) ?? 0
    }
    this._ready = true  // latență 1 — gata imediat în același tact
  }

  isReady(): boolean {
    return this._ready
  }

  result(): number {
    return this._result
  }

  tick(): void {
    // Fără latență extra — nimic de făcut
  }

  get lastAccess(): MemoryAccessResult {
    return this._lastAccess
  }

  reset(): void {
    this._ready = false
    this._result = 0
    this._lastAccess = { address: 0, hit: true, cycles: 1 }
  }

  // Utilitar pentru încărcarea programului în memorie
  load(program: Map<number, number>): void {
    program.forEach((val, addr) => this.data.set(addr, val))
  }
}
