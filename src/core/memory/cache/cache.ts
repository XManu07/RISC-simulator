import type { MemorySystem, MemoryAccessResult } from '@core/contracts/memory-system'
import type { MemoryConfig } from '../memory-config'
import type { ReplacementPolicy } from '../replacement/replacement-policy'
import { RandomReplacement } from '../replacement/random'
import { LruReplacement } from '../replacement/lru'
import { MainMemory } from '../main-memory'
import { CacheSet } from './cache-set'
import type { CacheLine } from './cache-line'

// alege algoritmul de înlocuire în funcție de config
function createPolicy(config: MemoryConfig): ReplacementPolicy {
  switch (config.replacement) {
    case 'lru':
      return new LruReplacement(config.numSets, config.associativity)
    case 'random':
    default:
      return new RandomReplacement(config.associativity)
  }
}

// Cache set-asociativ, parametrizabil — creierul P3. Implementează MemorySystem, deci
// pipeline-ul vorbește cu el exact ca și cu FlatMemory. Aceeași clasă se folosește de două
// ori: o instanță pentru instrucțiuni (I-cache), una pentru date (D-cache).
//
// La fiecare acces:
//   1. sparge adresa în set / tag / offset (vezi decompose);
//   2. caută în set → HIT (linia e acolo) sau MISS (nu e);
//   3. la MISS aduce linia întreagă din memoria principală și o instalează (eventual dă afară
//      o linie veche prin politica de înlocuire);
//   4. numără latența: HIT = ieftin (hitLatency), MISS = scump (mainMemoryLatency);
//   5. ține minte în lastAccess dacă a fost hit/miss și câte tacte — pentru „black box"-ul din UI.
//
// Scriere: write-through (write-allocate) — scrie și în cache, și în memoria principală.
export class Cache implements MemorySystem {
  readonly sets: CacheSet[]
  private policy: ReplacementPolicy

  // starea accesului curent (interfața cu polling)
  private remaining = 0
  private _result = 0
  private _lastAccess: MemoryAccessResult = { address: 0, hit: true, cycles: 0 }

  constructor(
    private main: MainMemory,
    readonly config: MemoryConfig,
    readonly name = 'cache',
  ) {
    this.sets = Array.from(
      { length: config.numSets },
      () => new CacheSet(config.associativity, config.wordsPerLine),
    )
    this.policy = createPolicy(config)
  }

  // sparge adresa în componentele cu care lucrează cache-ul
  private decompose(address: number) {
    const { wordsPerLine, numSets } = this.config
    const wordIndex = Math.floor(address / 4)        // o adresă = un cuvânt aliniat la 4
    const offset = wordIndex % wordsPerLine           // al câtelea cuvânt din linie
    const lineNumber = Math.floor(wordIndex / wordsPerLine)
    const setIndex = lineNumber % numSets             // în ce set (sertar) cade
    const tag = Math.floor(lineNumber / numSets)      // eticheta — restul adresei
    const lineBytes = wordsPerLine * 4
    const lineBaseByte = Math.floor(address / lineBytes) * lineBytes // adresa de start a liniei
    return { offset, setIndex, tag, lineBaseByte }
  }

  // scrie o linie murdară (modificată) înapoi în memoria principală (doar la write-back)
  private flushLine(setIndex: number, line: CacheLine): void {
    const lineNumber = line.tag * this.config.numSets + setIndex
    const baseByte = lineNumber * this.config.wordsPerLine * 4
    for (let i = 0; i < this.config.wordsPerLine; i++) {
      this.main.writeWord(baseByte + i * 4, line.words[i])
    }
  }

  // aduce o linie întreagă din memoria principală și o instalează în set; întoarce way-ul folosit
  private allocate(setIndex: number, tag: number, lineBaseByte: number): number {
    const set = this.sets[setIndex]
    const free = set.findFreeWay()
    const way = free !== -1 ? free : this.policy.pickVictim(setIndex)
    const line = set.lineAt(way)
    // write-back: dacă linia evacuată e murdară, salveaz-o în MP înainte s-o pierzi
    if (this.config.writePolicy === 'write-back' && line.valid && line.dirty) {
      this.flushLine(setIndex, line)
    }
    for (let i = 0; i < this.config.wordsPerLine; i++) {
      line.writeWord(i, this.main.readWord(lineBaseByte + i * 4))
    }
    line.valid = true
    line.tag = tag
    line.dirty = false
    return way
  }

  // --- interfața MemorySystem ---
  startAccess(address: number, write = false, value = 0): void {
    const { offset, setIndex, tag, lineBaseByte } = this.decompose(address)
    const set = this.sets[setIndex]

    let way = set.findWay(tag)
    const hit = way !== -1
    if (!hit) {
      way = this.allocate(setIndex, tag, lineBaseByte) // MISS → adu linia din MP
    }

    this.policy.onAccess(setIndex, way) // anunță politica (LRU reține; random ignoră)
    const line = set.lineAt(way)

    if (write) {
      line.writeWord(offset, value)
      if (this.config.writePolicy === 'write-back') {
        line.dirty = true // write-back: doar în cache; ajunge în MP la evacuare
      } else {
        this.main.writeWord(address, value) // write-through: și în memoria principală, imediat
      }
      this._result = value
    } else {
      this._result = line.readWord(offset)
    }

    // HIT = ieftin, MISS = scump. Diferența asta e exact ce face hit/miss vizibil pe UI.
    this.remaining = hit ? this.config.hitLatency : this.config.mainMemoryLatency
    this._lastAccess = { address, hit, cycles: this.remaining }
  }

  tick(): void {
    if (this.remaining > 0) this.remaining -= 1
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
    this.sets.forEach((set) => set.reset())
    this.policy.reset()
    this.remaining = 0
    this._result = 0
    this._lastAccess = { address: 0, hit: true, cycles: 0 }
  }

  // conținutul curent al memoriei principale din spatele cache-ului (pentru afișaj live)
  mainMemoryEntries(): { address: number; value: number }[] {
    return this.main.entries()
  }
}
