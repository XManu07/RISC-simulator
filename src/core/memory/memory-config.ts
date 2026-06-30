// Parametrii ierarhiei de memorie (felia P3).
// „Parametrizabil" e cerut explicit de specificație: toate dimensiunile și
// latențele cache-ului se reglează de aici, fără să umbli în logica din cache.ts.
//
// Model de adresare: o adresă = un cuvânt de 32 biți, aliniat la 4 (PC crește cu 4).
// O linie de cache ține `wordsPerLine` cuvinte consecutive → acoperă wordsPerLine*4 octeți.

export type ReplacementPolicy = 'random' | 'lru'
export type WritePolicy = 'write-through' | 'write-back'

export interface MemoryConfig {
  // --- geometria cache-ului ---
  numSets: number        // câte seturi (sertare); adresa alege setul după index
  associativity: number  // câte linii per set; 1 = mapare directă, >1 = set-asociativ
  wordsPerLine: number   // câte cuvinte încap pe o linie (cât aduci dintr-o dată la miss)

  // --- latențe, în TACTE abstracte (nu ns) ---
  hitLatency: number       // tacte pentru un acces care e HIT în cache (mic)
  mainMemoryLatency: number // tacte pentru a aduce o linie din memoria principală (mare)

  // --- politici ---
  replacement: ReplacementPolicy // cine e dat afară când setul e plin
  writePolicy: WritePolicy        // ce se întâmplă la scriere (store)
}

// Valori default: mici intenționat, ca hit/miss să se vadă ușor la demo.
// 4 seturi × 2 căi × 4 cuvinte/linie. Miss costă 10 tacte, hit costă 1.
export const defaultMemoryConfig: MemoryConfig = {
  numSets: 4,
  associativity: 2,
  wordsPerLine: 4,
  hitLatency: 1,
  mainMemoryLatency: 4,
  replacement: 'random',
  writePolicy: 'write-through',
}
