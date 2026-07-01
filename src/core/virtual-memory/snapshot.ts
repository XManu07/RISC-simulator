export type TranslationCase = 1 | 2 | 3 | 4 | 5 | 6

export const CASE_LABEL: Record<TranslationCase, string> = {
  1: 'TLB hit + cache hit',
  2: 'TLB hit + MP',
  3: 'TLB miss → PT cache + date cache',
  4: 'TLB miss → PT cache + date MP',
  5: 'TLB miss → PT MP + date cache',
  6: 'TLB miss → PT MP + date MP',
}

// Culoare Tailwind per caz (cel mai rapid → cel mai lent)
export const CASE_COLOR: Record<TranslationCase, string> = {
  1: 'text-emerald-400',
  2: 'text-green-400',
  3: 'text-yellow-300',
  4: 'text-orange-400',
  5: 'text-orange-500',
  6: 'text-red-400',
}

export interface TlbEntry {
  vpn: number
  ppn: number
  valid: boolean
}

export interface LastTranslation {
  virtualAddr: number
  physicalAddr: number
  case: TranslationCase
}

export interface VmSnapshot {
  enabled: boolean
  tlb: TlbEntry[]
  lastTranslation: LastTranslation | null
  hitCount: number
  missCount: number
}
