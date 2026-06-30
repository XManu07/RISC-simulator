import type { Snapshot } from '@core/contracts/snapshot'
import type { SimConfig } from './config'
import { FlatMemory } from './memory/flat-memory'
import { InOrderEngine } from './execution/in-order-engine'
import { ConcreteRegisterFile } from './pipeline/register-file'
import { Pipeline } from './pipeline/pipeline'

export class Simulator {
  private pipeline: Pipeline

  constructor(program: Map<number, number>, private config: SimConfig) {
    const iMem = new FlatMemory(program)
    const dMem = new FlatMemory()
    const engine = new InOrderEngine()
    const rf = new ConcreteRegisterFile()
    this.pipeline = new Pipeline(rf, engine, iMem, dMem)
  }

  setPC(pc: number): void {
    this.pipeline.setPC(pc)
  }

  step(): Snapshot {
    return this.pipeline.tick_()
  }

  reset(): void {
    this.pipeline.reset()
  }
}
