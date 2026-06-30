import type { MemoryConfig } from './memory/memory-config'

export interface SimConfig {
  memoryLatencyTicks: number  // tacte pentru FlatMemory (default 1); cache-ul suprascrie asta
  superscalar: boolean
  cache: boolean
  virtualMemory: boolean
  memory?: MemoryConfig       // P3 — parametrii cache-ului (folosiți când cache=true; altfel default)
}

export const defaultConfig: SimConfig = {
  memoryLatencyTicks: 1,
  superscalar: false,
  cache: false,
  virtualMemory: false,
}
