import type { MemoryAccessResult } from '@core/contracts/memory-system'
import type { Cache } from './cache/cache'

// Felia P3 din Snapshot — DOAR ce vede UI-ul. Nu conține logică, doar stare „fotografiată"
// la fiecare tact. UI-ul (CacheView/MemoryView) citește exclusiv de aici.

export interface CacheLineSnapshot {
  valid: boolean
  tag: number
  dirty: boolean
  words: number[]
}

export interface CacheSetSnapshot {
  index: number
  lines: CacheLineSnapshot[]
}

export interface CacheSnapshot {
  name: string                    // 'I-cache' / 'D-cache'
  sets: CacheSetSnapshot[]
  lastAccess: MemoryAccessResult  // black box: ultimul hit/miss + tacte (obligatoriu de spec)
  mainMemory: { address: number; value: number }[] // conținutul VIU al memoriei principale din spate
  geometry: {
    numSets: number
    associativity: number
    wordsPerLine: number
    hitLatency: number
    mainMemoryLatency: number
  }
}

export interface MemorySnapshot {
  iCache?: CacheSnapshot   // cache-ul de instrucțiuni (folosit la IF)
  dCache?: CacheSnapshot   // cache-ul de date (folosit la MEM)
}

// „Fotografiază" un cache într-un obiect simplu, serializabil (fără referințe la clasele interne).
export function cacheSnapshot(cache: Cache): CacheSnapshot {
  return {
    name: cache.name,
    lastAccess: { ...cache.lastAccess },
    mainMemory: cache.mainMemoryEntries(),
    geometry: {
      numSets: cache.config.numSets,
      associativity: cache.config.associativity,
      wordsPerLine: cache.config.wordsPerLine,
      hitLatency: cache.config.hitLatency,
      mainMemoryLatency: cache.config.mainMemoryLatency,
    },
    sets: cache.sets.map((set, index) => ({
      index,
      lines: set.lines.map((line) => ({
        valid: line.valid,
        tag: line.tag,
        dirty: line.dirty,
        words: [...line.words],
      })),
    })),
  }
}

// Asamblează felia memory din cele două cache-uri (apelat la cablare — vezi Pasul 8).
export function buildMemorySnapshot(
  iCache: Cache | null,
  dCache: Cache | null,
): MemorySnapshot {
  return {
    iCache: iCache ? cacheSnapshot(iCache) : undefined,
    dCache: dCache ? cacheSnapshot(dCache) : undefined,
  }
}
