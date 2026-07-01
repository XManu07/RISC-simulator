import type { Opcode } from '@core/contracts/instruction'

export interface FunctionalUnit {
  readonly busy: boolean
  readonly robTag: number | null
  start(op: Opcode, vj: number, vk: number, robTag: number): void
  tick(): void
  isReady(): boolean
  result(): number
  reset(): void
}
