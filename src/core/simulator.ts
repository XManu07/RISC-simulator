import type { Snapshot } from '@core/contracts/snapshot'
import type { MemorySystem } from '@core/contracts/memory-system'
import type { SimConfig } from './config'
import { FlatMemory } from './memory/flat-memory'
import { MainMemory } from './memory/main-memory'
import { Cache } from './memory/cache/cache'
import { defaultMemoryConfig } from './memory/memory-config'
import { buildMemorySnapshot } from './memory/snapshot'
import { InOrderEngine } from './execution/in-order-engine'
import { ConcreteRegisterFile } from './pipeline/register-file'
import { Pipeline } from './pipeline/pipeline'
import { MMU } from './virtual-memory/mmu'

export class Simulator {
  private pipeline: Pipeline
  private iCache: Cache | null = null
  private dCache: Cache | null = null
  private dMmu: MMU | null = null

  constructor(program: Map<number, number>, private config: SimConfig) {
    let iMem: MemorySystem
    let dMem: MemorySystem

    if (config.cache) {
      const memCfg = config.memory ?? defaultMemoryConfig
      this.iCache = new Cache(new MainMemory(memCfg.mainMemoryLatency, program), memCfg, 'I-cache')
      this.dCache = new Cache(new MainMemory(memCfg.mainMemoryLatency), memCfg, 'D-cache')
      iMem = this.iCache
      dMem = this.dCache
    } else {
      iMem = new FlatMemory(program)
      dMem = new FlatMemory()
    }

    if (config.virtualMemory) {
      const iMmu = new MMU(iMem, config.vmConfig)
      this.dMmu = new MMU(dMem, config.vmConfig)
      iMem = iMmu
      dMem = this.dMmu
    }

    const engine = new InOrderEngine()
    const rf = new ConcreteRegisterFile()
    this.pipeline = new Pipeline(rf, engine, iMem, dMem)
  }

  setPC(pc: number): void {
    this.pipeline.setPC(pc)
  }

  step(): Snapshot {
    const snap = this.pipeline.tick_()
    if (this.iCache || this.dCache) {
      snap.memory = buildMemorySnapshot(this.iCache, this.dCache)
    }
    if (this.dMmu) snap.vm = this.dMmu.vmSnapshot()
    return snap
  }

  reset(): void {
    this.pipeline.reset()
  }
}
