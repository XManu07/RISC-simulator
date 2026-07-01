'use client'
import type { ExecutionSnapshot } from '@core/index'
import { hex } from './utils'

const TWO_BIT_LABEL = ['strong NT', 'weak NT', 'weak T', 'strong T']

function stateLabel(mode: string, state: number): string {
  if (mode === 'two-bit') return TWO_BIT_LABEL[state] ?? String(state)
  if (mode === 'one-bit') return state === 1 ? 'taken' : 'not-taken'
  return 'mereu taken'
}

export function BranchPredictorPanel({ exec }: { exec: ExecutionSnapshot }) {
  const p = exec.predictor
  if (!p) return null

  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">Branch predictor</div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-zinc-400">mod: {p.mode}</span>
        <span className={p.mispredictCount > 0 ? 'text-red-400' : 'text-zinc-500'}>
          {p.mispredictCount} mispredict
        </span>
      </div>
      {p.table.length === 0 ? (
        <div className="text-zinc-700 text-[9px] italic">tabel gol</div>
      ) : (
        <table className="w-full text-[9px] border-collapse max-h-40 overflow-y-auto">
          <thead>
            <tr className="text-zinc-500">
              <th className="text-left font-normal pr-2">pc</th>
              <th className="text-left font-normal">stare</th>
            </tr>
          </thead>
          <tbody>
            {p.table.map(row => (
              <tr key={row.pc} className="text-zinc-300">
                <td className="pr-2">{hex(row.pc)}</td>
                <td>{stateLabel(p.mode, row.state)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
