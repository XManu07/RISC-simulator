import type { TranslationCase } from './snapshot'

export function resolveCase(
  tlbHit: boolean,
  pageTableInCache: boolean,
  dataHit: boolean,
): TranslationCase {
  if (tlbHit)           return dataHit ? 1 : 2
  if (pageTableInCache) return dataHit ? 3 : 4
  return                        dataHit ? 5 : 6
}

export function translateAddress(virtualAddr: number, ppn: number, pageOffsetBits: number): number {
  const offset = virtualAddr & ((1 << pageOffsetBits) - 1)
  return (ppn << pageOffsetBits) | offset
}
