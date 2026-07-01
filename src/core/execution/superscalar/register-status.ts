export class RegisterStatus {
  private qi: (number | null)[] = Array(16).fill(null)

  get(reg: number): number | null { return this.qi[reg] }
  set(reg: number, robTag: number): void { this.qi[reg] = robTag }

  clearIfOwner(reg: number, robTag: number): void {
    if (this.qi[reg] === robTag) this.qi[reg] = null
  }

  reset(): void { this.qi.fill(null) }

  snapshot(): (number | null)[] { return [...this.qi] }
}
