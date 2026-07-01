export interface PredictorSnapshot {
  mode: 'always-taken' | 'one-bit' | 'two-bit'
  mispredictCount: number
  table: Array<{ pc: number; state: number }>
}

export class BranchPredictor {
  private table = new Map<number, number>()
  private mispredictCount_ = 0

  constructor(private readonly mode: 'always-taken' | 'one-bit' | 'two-bit') {}

  predict(pc: number): boolean {
    switch (this.mode) {
      case 'always-taken': return true
      case 'one-bit':      return (this.table.get(pc) ?? 0) === 1
      case 'two-bit':      return (this.table.get(pc) ?? 1) >= 2
    }
  }

  update(pc: number, actualTaken: boolean): void {
    switch (this.mode) {
      case 'always-taken': break
      case 'one-bit':
        this.table.set(pc, actualTaken ? 1 : 0)
        break
      case 'two-bit': {
        const s = this.table.get(pc) ?? 1
        this.table.set(pc, actualTaken ? Math.min(3, s + 1) : Math.max(0, s - 1))
        break
      }
    }
  }

  recordMispredict(): void { this.mispredictCount_++ }
  get mispredictCount(): number { return this.mispredictCount_ }

  snapshot(): PredictorSnapshot {
    return {
      mode: this.mode,
      mispredictCount: this.mispredictCount_,
      table: [...this.table.entries()].map(([pc, state]) => ({ pc, state })),
    }
  }

  reset(): void { this.table.clear(); this.mispredictCount_ = 0 }
}
