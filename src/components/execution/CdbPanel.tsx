'use client'
import type { ExecutionSnapshot } from '@core/index'
import { hex } from './utils'

export function CdbPanel({ exec }: { exec: ExecutionSnapshot }) {
  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">
        CDB — broadcast-uri tactul curent
      </div>
      {exec.cdb.length === 0 ? (
        <div className="text-zinc-700 text-[9px] italic">niciun broadcast acest tact</div>
      ) : (
        <div className="flex flex-col gap-1">
          {exec.cdb.map((c, i) => (
            <div
              key={i}
              className="rounded px-1.5 py-1 border border-cyan-800 bg-cyan-950 text-cyan-200 text-[9px] flex justify-between"
            >
              <span>ROB#{c.robTag}</span>
              <span>{hex(c.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
