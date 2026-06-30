import type { MemorySystem } from '@core/contracts/memory-system'
import type { PipelineLatch } from '@core/contracts/snapshot'
import type { PipelineSlot } from '../latch'
import { emptySlot, instrToText } from '../latch'
import { decode } from '@core/isa/decode'

export interface FetchResult {
  slot: PipelineSlot            // instrucțiunea decodificată (sau emptySlot la stall)
  latchUpdate: Partial<PipelineLatch>
  newPC: number                 // PC+4 (valid doar când stall=false)
  stall: boolean
}

// IF: MAR←PC; emite cerere la iMem; tick; când gata: MDR←word; IR←word; slot←decode(word)
export function stageFetch(
  pc: number,
  iMem: MemorySystem,
  fetchPending: boolean,
): { result: FetchResult; fetchPending: boolean } {
  if (!fetchPending) {
    iMem.startAccess(pc)
  }
  iMem.tick()

  if (!iMem.isReady()) {
    return {
      result: {
        slot: emptySlot(),
        latchUpdate: { MAR: pc, addressBus: pc },
        newPC: pc,
        stall: true,
      },
      fetchPending: true,
    }
  }

  const word = iMem.result()
  const instr = decode(word)
  return {
    result: {
      slot: { instr, text: instrToText(instr), stallCycles: 0, a: 0, b: 0, c: 0, mdr: 0 },
      latchUpdate: { MAR: pc, MDR: word, IR: word, addressBus: pc, dataBus: word },
      newPC: pc + 4,
      stall: false,
    },
    fetchPending: false,
  }
}
