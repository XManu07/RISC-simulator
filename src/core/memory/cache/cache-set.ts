import { CacheLine } from './cache-line'

// Un set (sertar) = un grup de linii. Câte linii? = asociativitatea (config.associativity).
// O adresă poate sta DOAR în setul ei (ales după index), dar în ORICARE linie din acel set.
//
// Setul e doar „depozit + căutare": știe să spună dacă o etichetă e deja aici (hit) și dacă
// mai are loc liber. PE CINE dăm afară când e plin NU decide setul — decide politica de
// înlocuire (vezi replacement/), orchestrată din cache.ts. Așa setul rămâne simplu și
// nu depinde de algoritmul de înlocuire ales.
export class CacheSet {
  lines: CacheLine[]

  constructor(associativity: number, wordsPerLine: number) {
    this.lines = Array.from({ length: associativity }, () => new CacheLine(wordsPerLine))
  }

  // caută o linie validă cu eticheta cerută → indicele ei (HIT), sau -1 dacă nu există (MISS)
  findWay(tag: number): number {
    return this.lines.findIndex((line) => line.valid && line.tag === tag)
  }

  // caută o linie liberă (încă nefolosită) → indicele ei, sau -1 dacă setul e plin
  findFreeWay(): number {
    return this.lines.findIndex((line) => !line.valid)
  }

  lineAt(way: number): CacheLine {
    return this.lines[way]
  }

  reset(): void {
    this.lines.forEach((line) => line.clear())
  }
}
