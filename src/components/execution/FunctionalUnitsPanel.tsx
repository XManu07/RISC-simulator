'use client'
import type { ExecutionSnapshot } from '@core/index'
import { CLASS_COLOR } from './utils'

const CLASSES = ['ALU', 'MUL', 'LDST', 'JMP'] as const

function unitsFor(exec: ExecutionSnapshot, cls: string): Array<{ busy: boolean; remaining: number; op: string }> {
  if (exec.mode === 'scoreboard' && exec.fuStatus) {
    return exec.fuStatus
      .filter(f => f.class === cls)
      .map(f => ({ busy: f.busy, remaining: f.remaining, op: f.op }))
  }
  return exec.units
    .filter(u => u.class === cls)
    .map(u => ({
      busy: u.busy,
      remaining: u.remaining,
      op: u.busy && u.robTag !== null
        ? exec.rob.entries.find(e => e.index === u.robTag)?.opcode ?? ''
        : '',
    }))
}

export function FunctionalUnitsPanel({ exec }: { exec: ExecutionSnapshot }) {
  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">Unități funcţionale</div>
      <div className="grid grid-cols-4 gap-2">
        {CLASSES.map(cls => {
          const units = unitsFor(exec, cls)
          return (
            <div key={cls}>
              <div className={`text-[10px] font-semibold mb-1 ${CLASS_COLOR[cls]}`}>{cls}</div>
              <div className="flex flex-col gap-1">
                {units.map((u, i) => (
                  <div
                    key={i}
                    className={`rounded px-1.5 py-1 border text-[9px] ${
                      u.busy
                        ? 'border-cyan-800 bg-cyan-950 text-cyan-200'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-600'
                    }`}
                  >
                    <div>{cls}-{i} · {u.busy ? `busy (${u.remaining})` : 'idle'}</div>
                    {u.busy && <div className="text-zinc-400 truncate">{u.op || '—'}</div>}
                  </div>
                ))}
                {units.length === 0 && (
                  <div className="text-zinc-700 text-[9px] italic">(niciuna)</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
