'use client'
import { useSimulatorStore } from '@store/simulator-store'

const STAGES = ['IF', 'OF', 'EX', 'MEM', 'WB'] as const

const COLORS: Record<string, { border: string; bg: string; label: string }> = {
  IF:  { border: 'border-blue-500',   bg: 'bg-blue-950',   label: 'text-blue-300' },
  OF:  { border: 'border-purple-500', bg: 'bg-purple-950', label: 'text-purple-300' },
  EX:  { border: 'border-yellow-500', bg: 'bg-yellow-950', label: 'text-yellow-300' },
  MEM: { border: 'border-orange-500', bg: 'bg-orange-950', label: 'text-orange-300' },
  WB:  { border: 'border-green-500',  bg: 'bg-green-950',  label: 'text-green-300' },
}

export function PipelineView() {
  const { snapshot } = useSimulatorStore()

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 font-mono text-sm gap-2">
        <div className="text-4xl">⚙</div>
        <div>Încarcă un program şi apasă Step</div>
      </div>
    )
  }

  const { latch, stageOf, stallReason, iMemAccess, dMemAccess } = snapshot

  return (
    <div className="flex flex-col gap-4 p-4 font-mono text-xs">

      {/* ── Bus IF: MAR / MDR / IR ── */}
      <div>
        <div className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Fetch — bus adrese / date</div>
        <div className="grid grid-cols-3 gap-2">
          <BusCell label="MAR / addressBus" value={latch.MAR} color="text-yellow-300"
            sub={`iMem: ${iMemAccess.hit ? '✓ hit' : '✗ miss'} (${iMemAccess.cycles} tact${iMemAccess.cycles !== 1 ? 'e' : ''})`}
            subColor={iMemAccess.hit ? 'text-green-500' : 'text-red-400'} />
          <BusCell label="MDR / dataBus" value={latch.MDR} color="text-cyan-300" />
          <BusCell label="IR" value={latch.IR} color="text-white" />
        </div>
      </div>

      {/* ── 5 stagii ── */}
      <div>
        <div className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Pipeline — 5 stagii</div>
        <div className="flex gap-1 items-stretch">
          {STAGES.map((stage, i) => {
            const c = COLORS[stage]
            const isStalling = stallReason?.includes(stage) ||
              (stage === 'IF' && stallReason?.startsWith('IF')) ||
              (stage === 'OF' && stallReason?.startsWith('Hazard'))
            return (
              <div key={stage} className="flex-1 flex items-center gap-0.5">
                <div className={`flex-1 border-2 rounded p-2 text-center min-h-[64px] flex flex-col justify-center ${c.border} ${c.bg} ${isStalling ? 'ring-2 ring-red-500 opacity-75' : ''}`}>
                  <div className={`font-bold text-sm mb-1 ${c.label}`}>{stage}</div>
                  <div className="text-white text-[11px] break-all leading-tight">{stageOf[i] || '---'}</div>
                  {isStalling && <div className="text-red-400 text-[9px] mt-1">STALL</div>}
                </div>
                {i < 4 && <div className="text-zinc-600 text-lg px-0.5">›</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Latch A / B / C ── */}
      <div>
        <div className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">Latch execuţie</div>
        <div className="grid grid-cols-3 gap-2">
          <BusCell label="A (Rs1)" value={latch.A} color="text-zinc-200" />
          <BusCell label="B (Rs2 / imm)" value={latch.B} color="text-zinc-200" />
          <BusCell label="C (result)" value={latch.C} color="text-green-300" />
        </div>
      </div>

      {/* ── D-cache access ── */}
      {dMemAccess.address !== 0 && (
        <div className="text-[10px] text-zinc-500">
          D-cache: addr=0x{dMemAccess.address.toString(16).toUpperCase()}
          {' '}{dMemAccess.hit ? '✓ hit' : '✗ miss'}
          {' '}({dMemAccess.cycles} tacte)
        </div>
      )}

      {/* ── Stall banner ── */}
      {stallReason && (
        <div className="bg-red-950 border border-red-700 rounded px-3 py-1.5 text-red-300 text-[11px]">
          ⚠ {stallReason}
        </div>
      )}
    </div>
  )
}

function BusCell({
  label, value, color, sub, subColor,
}: {
  label: string; value: number; color: string; sub?: string; subColor?: string
}) {
  return (
    <div className="bg-zinc-800 rounded px-2 py-1.5 border border-zinc-700">
      <div className="text-zinc-500 text-[9px] mb-0.5">{label}</div>
      <div className={`${color} text-[11px]`}>0x{(value >>> 0).toString(16).toUpperCase().padStart(8, '0')}</div>
      {sub && <div className={`${subColor ?? 'text-zinc-500'} text-[9px] mt-0.5`}>{sub}</div>}
    </div>
  )
}
