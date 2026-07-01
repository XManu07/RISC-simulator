export interface RSEntrySnapshot {
  id: number
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
  destReg: number | null
  value: number
  ready: boolean
  state: string
}

export interface CDBSnapshot {
  robTag: number
  value: number
}

export interface PrefetchEntrySnapshot {
  pc: number
  opcode: string
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
  cdb: CDBSnapshot | null
  prefetchBuffer: PrefetchEntrySnapshot[]
  predictor: PredictorSnapshot | null
  flushedThisTick: boolean
  instrStatus: RSEntrySnapshot[]
  fuStatus?: FUStatusSnapshot[]
}

export function buildExecutionSnapshot(tick: number): ExecutionSnapshot {
  return {
    mode: 'tomasulo',
    tick,
    reservationStations: [],
    units: [],
    registerStatus: [],
    rob: { head: 0, tail: 0, entries: [] },
    cdb: null,
    prefetchBuffer: [],
    predictor: null,
    flushedThisTick: false,
    instrStatus: [],
  }
}
