'use client'
import type { ExecutionSnapshot } from '@core/index'
import { CLASS_COLOR, hex } from './utils'

const CLASSES = ['ALU', 'MUL', 'LDST', 'JMP'] as const

function OperandCell({ value, tag }: { value: number; tag: number | null }) {
  if (tag !== null) return <span className="text-amber-400">ROB#{tag}</span>
  return <span className="text-green-400">{hex(value)}</span>
}

export function ReservationStationsPanel({ exec }: { exec: ExecutionSnapshot }) {
  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">
        Stații de rezervare — <span className="text-green-400">verde=gata</span> ·{' '}
        <span className="text-amber-400">amber=aşteaptă tag</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CLASSES.map(cls => {
          const entries = exec.reservationStations.filter(e => e.unitClass === cls && e.busy)
          return (
            <div key={cls}>
              <div className={`text-[10px] font-semibold mb-0.5 ${CLASS_COLOR[cls]}`}>{cls}</div>
              {entries.length === 0 ? (
                <div className="text-zinc-700 text-[9px] italic">(gol)</div>
              ) : (
                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr className="text-zinc-500">
                      <th className="text-left font-normal pr-1">#</th>
                      <th className="text-left font-normal pr-1">op</th>
                      <th className="text-left font-normal pr-1">Vj/Qj</th>
                      <th className="text-left font-normal pr-1">Vk/Qk</th>
                      <th className="text-left font-normal">dest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} className="text-zinc-300">
                        <td className="pr-1 text-zinc-500">{e.id}</td>
                        <td className="pr-1">{e.op}</td>
                        <td className="pr-1"><OperandCell value={e.Vj} tag={e.Qj} /></td>
                        <td className="pr-1"><OperandCell value={e.Vk} tag={e.Qk} /></td>
                        <td className="text-zinc-400">ROB#{e.destRob}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
