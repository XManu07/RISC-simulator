import type { ReplacementPolicy } from './replacement-policy'

// Înlocuire RANDOM — minimul cerut de specificație.
// Nu ține minte nimic: când setul e plin, alege o linie la întâmplare.
// rng se poate injecta în teste ca să fie determinist (default: Math.random).
export class RandomReplacement implements ReplacementPolicy {
  constructor(
    private associativity: number,
    private rng: () => number = Math.random,
  ) {}

  onAccess(): void {
    // random nu reține istoricul accesărilor
  }

  pickVictim(): number {
    return Math.floor(this.rng() * this.associativity)
  }

  reset(): void {
    // nimic de resetat
  }
}
