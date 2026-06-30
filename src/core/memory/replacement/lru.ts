import type { ReplacementPolicy } from './replacement-policy'

// Înlocuire LRU (Least Recently Used) — varianta cu CONTOR.
// Ideea: ține minte „când" a fost folosită ultima dată fiecare linie. Când setul e plin,
// dă afară linia cu cel mai vechi moment de folosire (cea neatinsă de cel mai mult timp).
//
// `clock` e un contor global care crește la fiecare acces. `lastUsed[set][way]` reține
// valoarea contorului la ultima atingere a acelei linii → cel mai mic = cel mai vechi.
export class LruReplacement implements ReplacementPolicy {
  private clock = 0
  private lastUsed: number[][]

  constructor(
    numSets: number,
    private associativity: number,
  ) {
    this.lastUsed = Array.from({ length: numSets }, () =>
      new Array<number>(associativity).fill(0),
    )
  }

  onAccess(setIndex: number, way: number): void {
    this.lastUsed[setIndex][way] = ++this.clock // marchează „folosit acum"
  }

  pickVictim(setIndex: number): number {
    const row = this.lastUsed[setIndex]
    let victim = 0
    for (let w = 1; w < this.associativity; w++) {
      if (row[w] < row[victim]) victim = w // cel mai mic timestamp = cel mai vechi
    }
    return victim
  }

  reset(): void {
    this.clock = 0
    this.lastUsed.forEach((row) => row.fill(0))
  }
}
