export type UnitClass = 'ALU' | 'MUL' | 'LDST' | 'JMP'

export interface RSEntrySnapshot {
  id: number
  unitClass: UnitClass
  busy: boolean
  op: string
  Vj: number
  Qj: number | null
  Vk: number
  Qk: number | null
  destRob: number
}

export interface UnitSnapshot {
  class: string
  id: number
  busy: boolean
  robTag: number | null
  remaining: number
}

export interface ROBEntrySnapshot {
  index: number
  busy: boolean
  opcode: string
  pc: number
  destReg: number | null
  value: number
  ready: boolean
  state: string
  predictedTaken: boolean | null
  branchTaken: boolean | null
  branchTarget: number | null
  isStore: boolean
  storeAddr: number | null
  storeValue: number | null
}

export interface CDBSnapshot {
  robTag: number
  value: number
}

export interface PrefetchEntrySnapshot {
  pc: number
  opcode: string
  predictedTaken: boolean
}

import type { PredictorSnapshot } from './superscalar/branch-predictor'
export type { PredictorSnapshot }

export interface FUStatusSnapshot {
  id: string
  class: string
  busy: boolean
  op: string
  state: string
  Fi: number | null
  Fj: number | null
  Fk: number | null
  Qj: string | null
  Qk: string | null
  Rj: boolean
  Rk: boolean
  remaining: number
}

export interface ExecutionSnapshot {
  mode: 'tomasulo' | 'scoreboard'
  tick: number
  reservationStations: RSEntrySnapshot[]
  units: UnitSnapshot[]
  registerStatus: Array<{ reg: number; robTag: number | null }>
  rob: { head: number; tail: number; entries: ROBEntrySnapshot[] }
  cdb: CDBSnapshot[]
  prefetchBuffer: PrefetchEntrySnapshot[]
  predictor: PredictorSnapshot | null
  flushedThisTick: boolean
  instrStatus: RSEntrySnapshot[]
  fuStatus?: FUStatusSnapshot[]
  // Semnale de stall/în-zbor — vizibile indiferent de mod (P2)
  fetchPC: number                            // adresa curentă de prefetch (poate diverge de PC la speculație)
  branchInFlight: boolean                    // issue e blocat de un branch nerezolvat
  fetchPending: boolean                      // fetch așteaptă un acces iMem/I-cache în curs
  pendingLoad: { robTag: number } | null      // un LD are acces dMem în zbor (unitatea LD/ST poate fi deja liberă)
  pendingStore: boolean                      // un ST la commit are scrierea dMem în zbor
}

export function buildExecutionSnapshot(tick: number): ExecutionSnapshot {
  return {
    mode: 'tomasulo',
    tick,
    reservationStations: [],
    units: [],
    registerStatus: [],
    rob: { head: 0, tail: 0, entries: [] },
    cdb: [],
    prefetchBuffer: [],
    predictor: null,
    flushedThisTick: false,
    instrStatus: [],
    fetchPC: 0,
    branchInFlight: false,
    fetchPending: false,
    pendingLoad: null,
    pendingStore: false,
  }
}
