'use client'
import { useSimulatorStore } from '@store/simulator-store'

function HexVal({ v }: { v: number }) {
  return <span className="text-white font-mono">0x{v.toString(16).toUpperCase().padStart(8, '0')}</span>
}

export function LatchView() {
  const { snapshot } = useSimulatorStore()
  if (!snapshot) return null

  const { latch, pc } = snapshot

  const rows: [string, number, string][] = [
    ['PC',       pc,              'text-yellow-300'],
    ['MAR',      latch.MAR,       'text-yellow-300'],
    ['IR',       latch.IR,        'text-cyan-300'],
    ['MDR',      latch.MDR,       'text-cyan-300'],
    ['addrBus',  latch.addressBus,'text-orange-300'],
    ['dataBus',  latch.dataBus,   'text-orange-300'],
    ['A',        latch.A,         'text-zinc-200'],
    ['B',        latch.B,         'text-zinc-200'],
    ['C',        latch.C,         'text-green-300'],
  ]

  return (
    <div className="p-3 border-t border-zinc-700 font-mono text-xs">
      <div className="text-zinc-500 mb-2 text-[10px] uppercase tracking-wide">Latch inter-stagii</div>
      <div className="space-y-0.5">
        {rows.map(([name, val, cls]) => (
          <div key={name} className="flex justify-between items-center bg-zinc-800/60 rounded px-2 py-0.5">
            <span className="text-zinc-500 w-16 shrink-0">{name}</span>
            <span className={cls}>0x{(val >>> 0).toString(16).toUpperCase().padStart(8, '0')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
