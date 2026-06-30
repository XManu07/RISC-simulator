// O linie de cache — cea mai mică piesă. Ține un grup de cuvinte consecutive
// aduse împreună din memoria principală, plus „eticheta" care spune din ce zonă provin.
//
//   valid — linia conține ceva valabil? (la pornire e goală → false)
//   tag   — partea „de sus" a adresei; spune CĂREI zone de memorie îi aparțin cuvintele
//   words — cuvintele propriu-zise (lungimea = wordsPerLine din config)
//   dirty — a fost modificată în cache dar nu (încă) în memoria principală?
//           folosit doar de write-back; la write-through rămâne mereu false
export class CacheLine {
  valid = false
  tag = 0
  dirty = false
  words: number[]

  constructor(wordsPerLine: number) {
    this.words = new Array(wordsPerLine).fill(0)
  }

  // citește/scrie cuvântul de pe poziția `offset` din linie (0 .. wordsPerLine-1)
  readWord(offset: number): number {
    return this.words[offset] ?? 0
  }

  writeWord(offset: number, value: number): void {
    this.words[offset] = value
  }

  // golește linia (la reset)
  clear(): void {
    this.valid = false
    this.tag = 0
    this.dirty = false
    this.words.fill(0)
  }
}
