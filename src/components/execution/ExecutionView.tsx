'use client'
import { useSimulatorStore } from '@store/simulator-store'
import type { ExecutionConfig, ExecutionSnapshot } from '@core/index'
import { defaultExecutionConfig } from '@core/index'
import { FunctionalUnitsPanel } from './FunctionalUnitsPanel'
import { ReservationStationsPanel } from './ReservationStationsPanel'
import { RobPanel } from './RobPanel'
import { CdbPanel } from './CdbPanel'
import { BranchPredictorPanel } from './BranchPredictorPanel'
import { PrefetchBufferPanel } from './PrefetchBufferPanel'
import { RegisterStatusPanel } from './RegisterStatusPanel'
import { StallStatusPanel } from './StallStatusPanel'

function NumberField({
  label, value, onChange, disabled,
}: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className={disabled ? 'text-zinc-700' : 'text-zinc-500'}>{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Math.max(1, Number(e.target.value) || 1))}
        className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 disabled:opacity-40 disabled:text-zinc-600"
      />
    </label>
  )
}

function ExecutionConfigForm({
  execCfg, onUpdate,
}: { execCfg: ExecutionConfig; onUpdate: (partial: Partial<ExecutionConfig>) => void }) {
  const isTomasulo = (execCfg.schedulingMode ?? 'tomasulo') === 'tomasulo'

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-2">
      <label className="flex items-center justify-between gap-2 col-span-2">
        <span className="text-zinc-500">Mod de programare (scheduling)</span>
        <select
          value={execCfg.schedulingMode ?? 'tomasulo'}
          onChange={e => onUpdate({ schedulingMode: e.target.value as ExecutionConfig['schedulingMode'] })}
          className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200"
        >
          <option value="tomasulo">Tomasulo</option>
          <option value="scoreboard">Scoreboard (CDC-6600)</option>
        </select>
      </label>

      <NumberField label="issue width" value={execCfg.issueWidth}
        onChange={v => onUpdate({ issueWidth: v })} disabled={!isTomasulo} />
      <NumberField label="RS per clasă" value={execCfg.rsPerClass}
        onChange={v => onUpdate({ rsPerClass: v })} disabled={!isTomasulo} />
      <NumberField label="ROB size" value={execCfg.robSize}
        onChange={v => onUpdate({ robSize: v })} disabled={!isTomasulo} />
      <NumberField label="prefetch buffer" value={execCfg.prefetchBufferSize}
        onChange={v => onUpdate({ prefetchBufferSize: v })} />
      <NumberField label="CDB count" value={execCfg.cdbCount}
        onChange={v => onUpdate({ cdbCount: v })} disabled={!isTomasulo} />

      <label className="flex items-center justify-between gap-2">
        <span className={isTomasulo ? 'text-zinc-500' : 'text-zinc-700'}>speculaţie</span>
        <input
          type="checkbox"
          checked={execCfg.speculation}
          disabled={!isTomasulo}
          onChange={e => onUpdate({ speculation: e.target.checked })}
          className="accent-emerald-500 disabled:opacity-40"
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span className={isTomasulo ? 'text-zinc-500' : 'text-zinc-700'}>branch predictor</span>
        <select
          value={execCfg.branchPredictor}
          disabled={!isTomasulo}
          onChange={e => onUpdate({ branchPredictor: e.target.value as ExecutionConfig['branchPredictor'] })}
          className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-200 disabled:opacity-40"
        >
          <option value="always-taken">always-taken</option>
          <option value="one-bit">one-bit</option>
          <option value="two-bit">two-bit</option>
        </select>
      </label>

      <div className="col-span-2 text-zinc-600 text-[9px] mt-1">
        Unităţi funcţionale (nr. instanţe per clasă):
      </div>
      <NumberField label="ALU" value={execCfg.units.alu}
        onChange={v => onUpdate({ units: { ...execCfg.units, alu: v } })} />
      <NumberField label="MUL" value={execCfg.units.mul}
        onChange={v => onUpdate({ units: { ...execCfg.units, mul: v } })} />
      <NumberField label="LD/ST" value={execCfg.units.ldst}
        onChange={v => onUpdate({ units: { ...execCfg.units, ldst: v } })} />
      <NumberField label="JMP" value={execCfg.units.jmp}
        onChange={v => onUpdate({ units: { ...execCfg.units, jmp: v } })} />

      <div className="col-span-2 text-zinc-600 text-[9px] mt-1">Latenţe (tacte per operaţie):</div>
      <NumberField label="ALU" value={execCfg.latencies.alu}
        onChange={v => onUpdate({ latencies: { ...execCfg.latencies, alu: v } })} />
      <NumberField label="MUL" value={execCfg.latencies.mul}
        onChange={v => onUpdate({ latencies: { ...execCfg.latencies, mul: v } })} />
      <NumberField label="LD/ST" value={execCfg.latencies.ldst}
        onChange={v => onUpdate({ latencies: { ...execCfg.latencies, ldst: v } })} />
      <NumberField label="JMP" value={execCfg.latencies.jmp}
        onChange={v => onUpdate({ latencies: { ...execCfg.latencies, jmp: v } })} />

      <div className="col-span-2 text-amber-500/80 italic mt-1">
        ⚠ schimbările au efect după „Load Program” · câmpurile gri sunt ignorate de Scoreboard
      </div>
    </div>
  )
}

export function ExecutionView() {
  const { snapshot, config, setConfig } = useSimulatorStore()
  const execCfg = config.execution ?? defaultExecutionConfig
  const exec = snapshot?.execution as ExecutionSnapshot | undefined

  const updateExecCfg = (partial: Partial<ExecutionConfig>) =>
    setConfig({ execution: { ...execCfg, ...partial } })

  return (
    <div className="p-4 font-mono text-xs h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-400 text-sm font-semibold">P2 — Execuţie superscalară</span>
        <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.superscalar}
            onChange={e => setConfig({ superscalar: e.target.checked })}
            className="accent-emerald-500"
          />
          <span className={config.superscalar ? 'text-emerald-400' : 'text-zinc-500'}>
            {config.superscalar ? 'activ' : 'dezactivat'}
          </span>
        </label>
      </div>

      <ExecutionConfigForm execCfg={execCfg} onUpdate={updateExecCfg} />

      {!config.superscalar ? (
        <div className="text-zinc-600 text-[10px] italic">
          Activaţi execuţia superscalară, apoi re-încărcaţi programul.
        </div>
      ) : !exec ? (
        <div className="text-zinc-600 text-[10px] italic">Încărcaţi un program.</div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
            <FunctionalUnitsPanel exec={exec} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
              <RegisterStatusPanel exec={exec} registers={snapshot!.registers} />
            </div>
            <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
              <PrefetchBufferPanel exec={exec} />
            </div>
          </div>
          <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
            <StallStatusPanel exec={exec} />
          </div>

          {exec.mode === 'tomasulo' && (
            <>
              <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
                <ReservationStationsPanel exec={exec} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
                  <RobPanel exec={exec} />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
                    <CdbPanel exec={exec} />
                  </div>
                  <div className="rounded border border-zinc-700 bg-zinc-900/40 p-2">
                    <BranchPredictorPanel exec={exec} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
