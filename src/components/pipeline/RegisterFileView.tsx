'use client'
import { useSimulatorStore } from '@store/simulator-store'

export function RegisterFileView() {
  const { snapshot } = useSimulatorStore()
  if (!snapshot) return null

  return (
    <div className="p-3 font-mono text-xs">
      <div className="text-zinc-500 mb-2 text-[10px] uppercase tracking-wide">
        Regiştri — <span className="text-green-500">verde=valid</span> · <span className="text-red-400">roşu=în zbor</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {snapshot.registers.map((reg, i) => (
          <div
            key={i}
            className={`rounded px-1.5 py-1 border text-center ${
              reg.valid
                ? 'border-green-800 bg-green-950 text-green-300'
                : 'border-red-800 bg-red-950 text-red-300'
            }`}
          >
            <div className="text-zinc-500 text-[9px]">R{i}</div>
            <div className="text-[10px] leading-tight">
              {(reg.value >>> 0).toString(16).toUpperCase().padStart(8, '0')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
