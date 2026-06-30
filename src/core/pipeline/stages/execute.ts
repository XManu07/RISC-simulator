import type { ExecutionEngine } from '@core/contracts/execution-engine'
import type { PipelineSlot } from '../latch'

export interface ExecuteResult {
  c: number
  stall: boolean
}

// EX: folosește slot.a și slot.b (setate de OF), salvează rezultatul în slot.c
export function stageExecute(
  slot: PipelineSlot,
  engine: ExecutionEngine,
): ExecuteResult {
  if (!slot.instr) return { c: 0, stall: false }

  const result = engine.execute(slot.instr, slot.a, slot.b)

  if (result === undefined) {
    return { c: 0, stall: true }
  }

  return { c: result, stall: false }
}
