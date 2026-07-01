'use client'
import { useSimulatorStore } from '@store/simulator-store'
import type { VmSnapshot } from '@core/virtual-memory/snapshot'
import { CASE_LABEL, CASE_COLOR } from '@core/virtual-memory/snapshot'
import { defaultVmConfig } from '@core/config'

function hex(n: number, width = 5) {
  return '0x' + n.toString(16).toUpperCase().padStart(width, '0')
}

function HitRate({ hits, misses }: { hits: number; misses: number }) {
  const total = hits + misses
  const pct = total === 0 ? 0 : Math.round((hits / total) * 100)
  return (
    <span className="text-zinc-400">
      <span className="text-green-400">{hits}H</span>
      {' / '}
      <span className="text-red-400">{misses}M</span>
      {' — '}
      <span className="text-white">{pct}%</span>
    </span>
  )
}

function TlbTable({ vm }: { vm: VmSnapshot }) {
  return (
    <table className="w-full text-[10px] border-collapse mb-2">
      <thead>
        <tr className="text-zinc-500">
          <th className="text-left pr-2 font-normal">#</th>
          <th className="text-left pr-2 font-normal">VPN</th>
          <th className="text-left pr-2 font-normal">PPN</th>
          <th className="text-left font-normal">V</th>
        </tr>
      </thead>
      <tbody>
        {vm.tlb.map((e, i) => (
          <tr key={i} className={e.valid ? 'text-zinc-200' : 'text-zinc-600'}>
            <td className="pr-2 text-zinc-500">{i}</td>
            <td className="pr-2 font-mono">{e.valid ? hex(e.vpn) : '—'}</td>
            <td className="pr-2 font-mono">{e.valid ? hex(e.ppn) : '—'}</td>
            <td className={e.valid ? 'text-green-400' : 'text-zinc-600'}>{e.valid ? '✓' : '✗'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LastTranslation({ vm }: { vm: VmSnapshot }) {
  const t = vm.lastTranslation
  if (!t) return <div className="text-zinc-600 text-[10px] italic">nicio traducere încă</div>

  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-[10px]">
        <span className="text-zinc-500">virt</span>
        <span className="text-yellow-300">{hex(t.virtualAddr, 8)}</span>
      </div>
      <div className="flex justify-between font-mono text-[10px]">
        <span className="text-zinc-500">fiz</span>
        <span className="text-cyan-300">{hex(t.physicalAddr, 8)}</span>
      </div>
      <div className={`text-[10px] font-semibold mt-1 ${CASE_COLOR[t.case]}`}>
        Cazul {t.case}: {CASE_LABEL[t.case]}
      </div>
    </div>
  )
}

function CaseMatrix({ active }: { active: number | null }) {
  const cases = [1, 2, 3, 4, 5, 6] as const
  return (
    <div className="grid grid-cols-2 gap-0.5 text-[9px]">
      {cases.map(c => (
        <div
          key={c}
          className={`rounded px-1.5 py-0.5 border ${
            active === c
              ? `border-current ${CASE_COLOR[c]} bg-zinc-800`
              : 'border-zinc-800 text-zinc-600'
          }`}
        >
          <span className="font-bold">C{c}</span> {CASE_LABEL[c]}
        </div>
      ))}
    </div>
  )
}

export function TlbView() {
  const { snapshot, config, setConfig, reload } = useSimulatorStore()
  const vm = snapshot?.vm as VmSnapshot | undefined

  return (
    <div className="p-3 border-t border-zinc-700 font-mono text-xs">
      {/* Header + toggle VM */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-500 text-[10px] uppercase tracking-wide">TLB / VM</span>
        <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.virtualMemory}
            onChange={e => setConfig({ virtualMemory: e.target.checked })}
            className="accent-emerald-500"
          />
          <span className={config.virtualMemory ? 'text-emerald-400' : 'text-zinc-500'}>
            {config.virtualMemory ? 'activ' : 'dezactivat'}
          </span>
        </label>
      </div>

      {!config.virtualMemory ? (
        <div className="text-zinc-600 text-[10px] italic">
          Activați VM, apoi re-încărcați programul.
        </div>
      ) : !vm ? (
        <div className="text-zinc-600 text-[10px] italic">Încărcați un program.</div>
      ) : (
        <>
          {/* PT location toggle (schimbă cazurile 3/4 ↔ 5/6) */}
          <label className="flex items-center gap-1 text-[10px] cursor-pointer mb-2 select-none">
            <input
              type="checkbox"
              checked={!!config.vmConfig?.pageTableInCache}
              onChange={e => {
                setConfig({ vmConfig: { ...defaultVmConfig, ...config.vmConfig, pageTableInCache: e.target.checked } })
                reload()
              }}
              className="accent-yellow-400"
            />
            <span className="text-zinc-400">Tabelă pagini în cache (cazuri 3/4)</span>
          </label>

          {/* Stats */}
          <div className="flex justify-between items-center mb-2 text-[10px]">
            <span className="text-zinc-500">hit rate</span>
            <HitRate hits={vm.hitCount} misses={vm.missCount} />
          </div>

          {/* TLB entries */}
          <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">Intrări TLB</div>
          <TlbTable vm={vm} />

          {/* Ultima traducere */}
          <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">Ultima traducere</div>
          <div className="bg-zinc-800/60 rounded p-2 mb-2">
            <LastTranslation vm={vm} />
          </div>

          {/* Matricea celor 6 cazuri */}
          <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">Cele 6 cazuri</div>
          <CaseMatrix active={vm.lastTranslation?.case ?? null} />
        </>
      )}
    </div>
  )
}
