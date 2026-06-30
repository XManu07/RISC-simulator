import type { Tick } from './clock'
import type { MemoryAccessResult } from './memory-system'

export interface PipelineLatch {
  PC: number
  MAR: number        // Memory Address Register (vizibil pe bus adrese la IF)
  MDR: number        // Memory Data Register (vizibil pe bus date după latența memoriei)
  IR: number         // Instruction Register (raw 32 biți, după fetch)
  A: number          // operand sursă 1 (după OF)
  B: number          // operand sursă 2 sau imediat (după OF)
  C: number          // rezultat execuție (după EX)
  addressBus: number // valoarea curentă de pe busul de adrese
  dataBus: number    // valoarea curentă de pe busul de date
}

export interface RegisterSnapshot {
  value: number
  valid: boolean     // true = gata de citit, false = în zbor
}

// Starea completă a simulatorului la un tact dat — singurul lucru pe care UI-ul îl citește.
// Tipul compus: fiecare subsistem umple doar felia lui (câmpurile opționale).
export interface Snapshot {
  tick: Tick
  pc: number
  registers: RegisterSnapshot[]  // R0..R15
  latch: PipelineLatch
  stageOf: string[]              // text instrucțiune în fiecare stagiu: [IF, OF, EX, MEM, WB]
  stallReason: string | null     // descriere stall activ (hazard RAW, miss memorie etc.)
  iMemAccess: MemoryAccessResult // ultimul acces la memoria de instrucțiuni
  dMemAccess: MemoryAccessResult // ultimul acces la memoria de date

  // Felii opționale — populate de fiecare subsistem când e activ
  execution?: unknown  // P2 definește ExecutionSnapshot în execution/snapshot.ts
  memory?: unknown     // P3 definește MemorySnapshot în memory/snapshot.ts
  vm?: unknown         // P4 definește VmSnapshot în virtual-memory/snapshot.ts
}
