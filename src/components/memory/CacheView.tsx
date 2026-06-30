'use client'
import { useSimulatorStore } from '@store/simulator-store'
import { defaultMemoryConfig } from '@core/memory/memory-config'
import type { MemorySnapshot, CacheSnapshot } from '@core/memory/snapshot'

function hex(v: number, pad = 0): string {
  return '0x' + (v >>> 0).toString(16).toUpperCase().padStart(pad, '0')
}

// Un cache (I-cache sau D-cache): badge cu ultimul hit/miss + grila de seturi/linii.
function CachePanel({ cache }: { cache: CacheSnapshot }) {
  const la = cache.lastAccess
  // cycles === 0 = stare inițială (încă niciun acces real) → badge neutru, nu „HIT" înșelător
  const accessed = la.cycles > 0
  const badge = !accessed
    ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
    : la.hit
      ? 'bg-green-900 text-green-300 border-green-700'
      : 'bg-red-900 text-red-300 border-red-700'

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-300 text-[11px] font-semibold">{cache.name}</span>
        {/* black box: ce a fost ultimul acces — hit sau miss + câte tacte a costat */}
        <span className={`rounded px-1.5 py-0.5 border text-[9px] ${badge}`}>
          {!accessed
            ? 'neaccesat'
            : `${la.hit ? 'HIT' : 'MISS'} · ${la.cycles} ${la.cycles === 1 ? 'tact' : 'tacte'}`}
        </span>
      </div>
      <div className="text-zinc-600 text-[9px] mb-1">
        {cache.geometry.numSets} seturi × {cache.geometry.associativity} blocuri/set ·{' '}
        {cache.geometry.wordsPerLine} cuv/bloc
      </div>
      <div className="space-y-0.5">
        {/* antet coloane: câte blocuri (căi) are fiecare set */}
        <div className="flex items-center gap-1">
          <span className="w-8 shrink-0" />
          {Array.from({ length: cache.geometry.associativity }, (_, b) => (
            <span key={b} className="text-zinc-600 text-[9px] min-w-[44px] text-center">
              bloc {b}
            </span>
          ))}
        </div>
        {cache.sets.map((set) => (
          <div key={set.index} className="flex items-center gap-1">
            <span className="text-zinc-500 w-8 shrink-0 text-[9px]">set {set.index}</span>
            {set.lines.map((line, w) => (
              <div
                key={w}
                className={`rounded px-1 py-0.5 border text-[9px] min-w-[44px] text-center ${
                  line.valid
                    ? 'border-cyan-800 bg-cyan-950 text-cyan-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-700'
                }`}
                title={
                  line.valid
                    ? `tag ${hex(line.tag)} · ${line.words.map((x) => hex(x)).join(' ')}`
                    : 'bloc gol'
                }
              >
                {line.valid ? `t${line.tag}${line.dirty ? '•' : ''}` : '—'}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CacheView() {
  const { snapshot, config, setConfig } = useSimulatorStore()
  const memory = snapshot?.memory as MemorySnapshot | undefined
  const mem = config.memory ?? defaultMemoryConfig
  const active = !!memory && (!!memory.iCache || !!memory.dCache)

  return (
    <div className="p-3 border-t border-zinc-700 font-mono text-xs">
      <div className="text-zinc-500 mb-1 text-[10px] uppercase tracking-wide">
        Cache — <span className="text-green-400">verde=hit</span> ·{' '}
        <span className="text-red-400">roşu=miss</span>
      </div>
      <div className="text-zinc-600 mb-2 text-[9px]">
        tN = tag · <span className="text-cyan-300">•</span> = dirty (modificat, nesalvat în MP — write-back)
      </div>

      {/* Parametri (au efect la următorul „Load Program") */}
      <div className="flex flex-col gap-1 mb-2 text-[10px]">
        <label
          className="flex items-center justify-between gap-2"
          title="Reîncarcă programul după ce schimbi"
        >
          <span className="text-zinc-500">Înlocuire</span>
          <select
            value={mem.replacement}
            onChange={e => setConfig({ memory: { ...mem, replacement: e.target.value as typeof mem.replacement } })}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200"
          >
            <option value="random">random</option>
            <option value="lru">LRU</option>
          </select>
        </label>
        <label
          className="flex items-center justify-between gap-2"
          title="Reîncarcă programul după ce schimbi"
        >
          <span className="text-zinc-500">Scriere</span>
          <select
            value={mem.writePolicy}
            onChange={e => setConfig({ memory: { ...mem, writePolicy: e.target.value as typeof mem.writePolicy } })}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200"
          >
            <option value="write-through">write-through</option>
            <option value="write-back">write-back</option>
          </select>
        </label>
        <div className="text-amber-500/80 text-[9px] italic">
          ⚠ schimbările au efect după „Load Program”
        </div>
      </div>

      {active ? (
        <>
          {memory!.iCache && <CachePanel cache={memory!.iCache} />}
          {memory!.dCache && <CachePanel cache={memory!.dCache} />}
        </>
      ) : (
        <div className="text-zinc-700 text-[10px] italic">
          bifează „Cache” în toolbar, apoi apasă „Load Program”
        </div>
      )}
    </div>
  )
}
