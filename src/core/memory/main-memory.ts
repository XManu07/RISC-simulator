import type { MemorySystem, MemoryAccessResult } from '@core/contracts/memory-system'

// Memoria principală: mare și lentă. Stă în spatele cache-ului — la MISS, cache-ul
// aduce de aici o linie întreagă; latența ei (în tacte) e „prețul" unui miss.
//
// Implementează MemorySystem ca să poată fi folosită și direct (fără cache), iar mai
// târziu de către MMU (P4). În plus, expune acces DIRECT (readWord/writeWord), fără
// latență, pe care cache-ul îl folosește ca să umple/scrie o linie — latența unui miss
// o numără cache-ul, nu o dublăm aici.
export class MainMemory implements MemorySystem {
  private data: Map<number, number>
  private latency: number

  // stare pentru accesul curent (interfața cu polling)
  private remaining = 0     // tacte rămase până e gata
  private _result = 0
  private _isWrite = false
  private _writeAddr = 0
  private _writeValue = 0
  private _lastAccess: MemoryAccessResult = { address: 0, hit: true, cycles: 0 }

  constructor(latency = 10, initial: Map<number, number> = new Map()) {
    this.latency = latency
    this.data = new Map(initial)
  }

  // --- acces DIRECT (fără latență) — folosit de cache pentru o linie întreagă ---
  readWord(address: number): number {
    return this.data.get(address) ?? 0
  }

  writeWord(address: number, value: number): void {
    this.data.set(address, value)
  }

  loadProgram(program: Map<number, number>): void {
    program.forEach((val, addr) => this.data.set(addr, val))
  }

  // conținutul curent al memoriei (sortat după adresă) — pentru afișaj live în UI
  entries(): { address: number; value: number }[] {
    return [...this.data.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([address, value]) => ({ address, value }))
  }

  // --- interfața MemorySystem (acces cu latență, prin polling) ---
  startAccess(address: number, write = false, value = 0): void {
    this._isWrite = write
    this._writeAddr = address
    this._writeValue = value
    this.remaining = this.latency
    if (!write) this._result = this.readWord(address)
    this._lastAccess = { address, hit: true, cycles: this.latency }
  }

  tick(): void {
    if (this.remaining > 0) this.remaining -= 1
    // scrierea se aplică efectiv la finalul accesului
    if (this.remaining === 0 && this._isWrite) {
      this.writeWord(this._writeAddr, this._writeValue)
      this._isWrite = false
    }
  }

  isReady(): boolean {
    return this.remaining === 0
  }

  result(): number {
    return this._result
  }

  get lastAccess(): MemoryAccessResult {
    return this._lastAccess
  }

  reset(): void {
    this.remaining = 0
    this._result = 0
    this._isWrite = false
    this._lastAccess = { address: 0, hit: true, cycles: 0 }
  }
}
