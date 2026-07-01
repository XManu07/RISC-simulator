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
import { TomasuloCore } from './execution/superscalar/tomasulo-core'
import { ScoreboardCore } from './execution/superscalar/scoreboard-core'
import { defaultExecutionConfig } from './execution/execution-config'
import { MMU } from './virtual-memory/mmu'

export class Simulator {
  private pipeline: Pipeline
  private iCache: Cache | null = null
  private dCache: Cache | null = null
  private dMmu: MMU | null = null
  private core: TomasuloCore | null = null
  private scoreCore: ScoreboardCore | null = null

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

    if (config.superscalar) {
      const execCfg = config.execution ?? defaultExecutionConfig
      if (execCfg.schedulingMode === 'scoreboard') {
        this.scoreCore = new ScoreboardCore(rf, iMem, dMem, execCfg)
      } else {
        this.core = new TomasuloCore(rf, iMem, dMem, execCfg)
      }
    }
  }

  setPC(pc: number): void {
    if (this.scoreCore) { this.scoreCore.setPC(pc); return }
    if (this.core) { this.core.setPC(pc); return }
    this.pipeline.setPC(pc)
  }

  step(): Snapshot {
    let snap: Snapshot
    if (this.scoreCore) {
      snap = this.scoreCore.step()
      snap.execution = this.scoreCore.getExecutionSnapshot()
    } else if (this.core) {
      snap = this.core.step()
      snap.execution = this.core.getExecutionSnapshot()
    } else {
      snap = this.pipeline.tick_()
    }
    // P3 — felia `memory`, indiferent de engine
    if (this.iCache || this.dCache) {
      snap.memory = buildMemorySnapshot(this.iCache, this.dCache)
    }
    // P4 — felia `vm`, indiferent de engine
    if (this.dMmu) snap.vm = this.dMmu.vmSnapshot()
    return snap
  }

  reset(): void {
    if (this.scoreCore) { this.scoreCore.reset(); return }
    if (this.core) { this.core.reset(); return }
    this.pipeline.reset()
  }
}
