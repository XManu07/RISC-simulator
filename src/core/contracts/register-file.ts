export interface RegisterFile {
  readonly count: number  // 16 regiștri (R0–R15)

  read(reg: number): number
  write(reg: number, value: number): void

  // Bit de validare: true = registrul e gata de citit, false = e în zbor (scris de o instrucțiune din pipeline)
  isValid(reg: number): boolean
  setValid(reg: number, valid: boolean): void

  reset(): void
}
