import type { RegisterFile } from '@core/contracts/register-file'

export class ConcreteRegisterFile implements RegisterFile {
  readonly count = 16
  private values: number[] = new Array(16).fill(0)
  private validBits: boolean[] = new Array(16).fill(true)

  read(reg: number): number {
    return this.values[reg] ?? 0
  }

  write(reg: number, value: number): void {
    this.values[reg] = value | 0
  }

  isValid(reg: number): boolean {
    return this.validBits[reg] ?? true
  }

  setValid(reg: number, valid: boolean): void {
    this.validBits[reg] = valid
  }

  reset(): void {
    this.values.fill(0)
    this.validBits.fill(true)
  }
}
