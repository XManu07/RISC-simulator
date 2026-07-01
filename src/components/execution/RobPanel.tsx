'use client'
import type { ExecutionSnapshot } from '@core/index'
import { hex } from './utils'

export function RobPanel({ exec }: { exec: ExecutionSnapshot }) {
  const { head, tail, entries } = exec.rob
  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">
        ROB (circular) — head=#{head} tail=#{tail}
      </div>
      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
        {entries.map(e => (
          <div
            key={e.index}
            className={`rounded px-1.5 py-1 border text-[9px] flex flex-col gap-0.5 ${
              !e.busy
                ? 'border-zinc-800 bg-zinc-900 text-zinc-700'
                : e.ready
                  ? 'border-green-800 bg-green-950 text-green-200'
                  : 'border-amber-800 bg-amber-950/40 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>
                #{e.index}{e.index === head ? ' (head)' : ''}{e.index === tail ? ' (tail)' : ''}
              </span>
              <span className="text-zinc-500">{e.busy ? e.state : '—'}</span>
            </div>
            {e.busy && (
              <div className="flex flex-wrap gap-x-2 text-zinc-400">
                <span>pc={hex(e.pc)}</span>
                <span>{e.opcode}</span>
                {e.destReg !== null && (
                  <span className={e.ready ? 'text-white font-bold' : 'text-zinc-600 italic'}>
                    R{e.destReg}={e.ready ? hex(e.value) : '(se calculează)'}
                  </span>
                )}
                {e.isStore && (
                  <span className={e.ready ? 'text-white font-bold' : 'text-zinc-600 italic'}>
                    st[{hex(e.storeAddr ?? 0)}]={e.ready ? hex(e.storeValue ?? 0) : '(se calculează)'}
                  </span>
                )}
                {e.predictedTaken !== null && (
                  <span>
                    pred={e.predictedTaken ? 'T' : 'NT'}
                    {e.branchTaken !== null
                      ? ` real=${e.branchTaken ? 'T' : 'NT'}${
                          e.branchTaken !== e.predictedTaken ? ' ✗mispred' : ''
                        }`
                      : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
