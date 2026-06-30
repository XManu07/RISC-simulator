'use client'
import { useSimulatorStore } from '@store/simulator-store'
import type { MemorySnapshot } from '@core/memory/snapshot'

function row(addr: number, val: number) {
  return (
    <div key={addr} className="flex justify-between bg-zinc-800/60 rounded px-2 py-0.5">
      <span className="text-zinc-500">
        0x{(addr >>> 0).toString(16).toUpperCase().padStart(4, '0')}
      </span>
      <span className="text-zinc-200">
        0x{(val >>> 0).toString(16).toUpperCase().padStart(8, '0')}
      </span>
    </div>
  )
}

export function MemoryView() {
  const { snapshot, loadedProgram } = useSimulatorStore()
  const memory = snapshot?.memory as MemorySnapshot | undefined

  // Când cache-ul e activ: arată memoria de DATE VIE (din spatele D-cache-ului).
  // Așa se vede direct: write-through o modifică imediat la ST; write-back doar la evacuare.
  if (memory?.dCache) {
    const data = memory.dCache.mainMemory
    return (
      <div className="p-3 border-t border-zinc-700 font-mono text-xs">
        <div className="text-zinc-500 mb-2 text-[10px] uppercase tracking-wide">
          Memorie de date (vie)
        </div>
        {data.length === 0 ? (
          <div className="text-zinc-700 text-[10px] italic">goală (încă nicio scriere ajunsă aici)</div>
        ) : (
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {data.map((e) => row(e.address, e.value))}
          </div>
        )}
      </div>
    )
  }

  // Fără cache: arată programul încărcat (memoria de instrucțiuni), ca până acum.
  if (!loadedProgram || loadedProgram.size === 0) return null
  const entries = [...loadedProgram.entries()].sort((a, b) => a[0] - b[0])
  return (
    <div className="p-3 border-t border-zinc-700 font-mono text-xs">
      <div className="text-zinc-500 mb-2 text-[10px] uppercase tracking-wide">Memorie principală</div>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {entries.map(([addr, val]) => row(addr, val))}
      </div>
    </div>
  )
}
