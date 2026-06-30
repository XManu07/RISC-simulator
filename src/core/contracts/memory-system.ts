export interface MemoryAccessResult {
  address: number
  hit: boolean    // true = cache hit (sau memorie plată); false = cache miss
  cycles: number  // tacte consumate pentru acest acces
}

// Interfața non-blocantă cu polling — permite vizualizarea fiecărui tact de acces.
// Fluxul pentru un READ:
//   tact 1:  startAccess(addr)           — MAR ← addr, adresa apare pe bus
//   tacte 2…N: tick(); isReady() → false  — pipeline stall-ează (memorie/cache latență)
//   tact N:  isReady() → true; result()  — MDR ← result(), datele apar pe bus
//
// Fluxul pentru un WRITE (store):
//   tact 1:  startAccess(addr, true, val)
//   tacte…:  tick(); isReady() → false
//   tact N:  isReady() → true → scriere confirmată
export interface MemorySystem {
  startAccess(address: number, write?: boolean, value?: number): void
  isReady(): boolean
  result(): number
  tick(): void
  readonly lastAccess: MemoryAccessResult
  reset(): void
}
