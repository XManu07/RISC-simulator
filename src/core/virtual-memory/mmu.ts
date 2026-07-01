import type { MemorySystem, MemoryAccessResult } from '@core/contracts/memory-system'
import type { VmSnapshot, LastTranslation } from './snapshot'
import { TLB } from './tlb'
import { PageTable } from './page-table'
import { resolveCase, translateAddress } from './translation'
import type { VmConfig } from '@core/config'
import { defaultVmConfig } from '@core/config'

type MMUState = 'idle' | 'pt_lookup' | 'mem_pending'

export class MMU implements MemorySystem {
  private tlb: TLB
  private pageTable: PageTable
  private cfg: VmConfig
  private state: MMUState = 'idle'
  private ptCyclesLeft = 0
  private pendingVAddr = 0
  private pendingWrite = false
  private pendingValue = 0
  private lastTlbHit = false
  private _lastAccess: MemoryAccessResult = { address: 0, hit: true, cycles: 1 }
  private _hitCount = 0
  private _missCount = 0
  private _lastTranslation: LastTranslation | null = null

  constructor(private underlying: MemorySystem, config?: VmConfig) {
    this.cfg = config ?? defaultVmConfig
    this.tlb = new TLB(this.cfg.tlbSize)
    this.pageTable = new PageTable()
  }

  startAccess(address: number, write = false, value = 0): void {
    this.pendingVAddr = address
    this.pendingWrite = write
    this.pendingValue = value

    const vpn = address >>> this.cfg.pageOffsetBits
    const ppn = this.tlb.lookup(vpn)

    if (ppn !== null) {
      this.lastTlbHit = true
      this._hitCount++
      const pAddr = translateAddress(address, ppn, this.cfg.pageOffsetBits)
      this.underlying.startAccess(pAddr, write, value)
      this.state = 'mem_pending'
    } else {
      this.lastTlbHit = false
      this._missCount++
      this.ptCyclesLeft = this.cfg.ptLookupCycles
      this.state = 'pt_lookup'
    }
  }

  tick(): void {
    if (this.state === 'pt_lookup') {
      this.ptCyclesLeft--
      if (this.ptCyclesLeft <= 0) {
        const vpn = this.pendingVAddr >>> this.cfg.pageOffsetBits
        const ppn = this.pageTable.lookup(vpn)
        this.tlb.install(vpn, ppn)
        const pAddr = translateAddress(this.pendingVAddr, ppn, this.cfg.pageOffsetBits)
        this.underlying.startAccess(pAddr, this.pendingWrite, this.pendingValue)
        this.state = 'mem_pending'
        if (this.underlying.isReady()) this._record()
      }
    } else if (this.state === 'mem_pending') {
      this.underlying.tick()
      if (this.underlying.isReady()) this._record()
    }
  }

  isReady(): boolean {
    if (this.state === 'mem_pending') return this.underlying.isReady()
    return false
  }

  result(): number {
    return this.underlying.result()
  }

  get lastAccess(): MemoryAccessResult {
    return this._lastAccess
  }

  reset(): void {
    this.state = 'idle'
    this.ptCyclesLeft = 0
    this.tlb.reset()
    this.pageTable.reset()
    this._hitCount = 0
    this._missCount = 0
    this._lastTranslation = null
    this._lastAccess = { address: 0, hit: true, cycles: 1 }
    this.underlying.reset()
  }

  vmSnapshot(): VmSnapshot {
    return {
      enabled: true,
      tlb: this.tlb.snapshot(),
      lastTranslation: this._lastTranslation,
      hitCount: this._hitCount,
      missCount: this._missCount,
    }
  }

  private _record(): void {
    const dataHit = this.underlying.lastAccess.hit
    const c = resolveCase(this.lastTlbHit, this.cfg.pageTableInCache, dataHit)
    this._lastTranslation = {
      virtualAddr: this.pendingVAddr,
      physicalAddr: this.underlying.lastAccess.address,
      case: c,
    }
    this._lastAccess = {
      address: this.pendingVAddr,
      hit: dataHit,
      cycles: (this.lastTlbHit ? 0 : this.cfg.ptLookupCycles) + this.underlying.lastAccess.cycles,
    }
  }
}
