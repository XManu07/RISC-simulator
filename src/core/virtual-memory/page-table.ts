export class PageTable {
  private table = new Map<number, number>()

  lookup(vpn: number): number {
    return this.table.get(vpn) ?? vpn
  }

  map(vpn: number, ppn: number): void {
    this.table.set(vpn, ppn)
  }

  reset(): void {
    this.table.clear()
  }
}
