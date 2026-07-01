import type { Instruction } from '@core/contracts/instruction'

export interface PrefetchEntry {
  instr: Instruction
  pc: number
  predictedTaken: boolean
}

export class PrefetchBuffer {
  private queue: PrefetchEntry[] = []

  constructor(private readonly capacity: number) {}

  get full(): boolean { return this.queue.length >= this.capacity }
  get empty(): boolean { return this.queue.length === 0 }
  get size(): number { return this.queue.length }

  push(e: PrefetchEntry): void { this.queue.push(e) }
  peek(): PrefetchEntry | null { return this.queue[0] ?? null }
  pop(): PrefetchEntry | null { return this.queue.shift() ?? null }
  flush(): void { this.queue = [] }

  snapshot(): PrefetchEntry[] { return this.queue.map(e => ({ ...e })) }
}
