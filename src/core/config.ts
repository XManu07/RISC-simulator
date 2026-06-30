export interface SimConfig {
  memoryLatencyTicks: number  // tacte pentru FlatMemory (default 1); cache-ul suprascrie asta
  superscalar: boolean
  cache: boolean
  virtualMemory: boolean
}

export const defaultConfig: SimConfig = {
  memoryLatencyTicks: 1,
  superscalar: false,
  cache: false,
  virtualMemory: false,
}
