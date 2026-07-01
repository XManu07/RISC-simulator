import type { MemoryConfig } from './memory/memory-config'

export interface VmConfig {
  pageOffsetBits: number     
  tlbSize: number             
  pageTableInCache: boolean  
  ptLookupCycles: number      
}

export const defaultVmConfig: VmConfig = {
  pageOffsetBits: 12,
  tlbSize: 4,
  pageTableInCache: false,
  ptLookupCycles: 4,
}

export interface SimConfig {
  memoryLatencyTicks: number  
  superscalar: boolean
  cache: boolean
  virtualMemory: boolean
  memory?: MemoryConfig       
  vmConfig?: VmConfig         
}

export const defaultConfig: SimConfig = {
  memoryLatencyTicks: 1,
  superscalar: false,
  cache: false,
  virtualMemory: false,
}
