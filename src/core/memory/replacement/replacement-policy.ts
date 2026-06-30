// Politica de înlocuire: când un set e PLIN și vine o linie nouă, cineva trebuie dat afară.
// Algoritmul care decide CINE pleacă stă în spatele acestei interfețe, ca să-l poți schimba
// (random acum, LRU mai târziu) fără să atingi cache-ul sau setul.
//
// `setIndex` apare peste tot pentru că politicile inteligente (LRU) țin evidență SEPARAT
// pentru fiecare set. Random îl ignoră.
export interface ReplacementPolicy {
  // se cheamă de fiecare dată când o linie e accesată (hit sau după ce e adusă la miss).
  // LRU folosește asta ca să țină minte ordinea de folosire; random nu face nimic.
  onAccess(setIndex: number, way: number): void

  // alege ce linie (indicele „way" în set) se dă afară din setul plin.
  pickVictim(setIndex: number): number

  // readuce politica la starea inițială (la reset-ul simulatorului).
  reset(): void
}
