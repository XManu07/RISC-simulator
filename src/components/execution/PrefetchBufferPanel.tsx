'use client'
import type { ExecutionSnapshot } from '@core/index'
import { hex } from './utils'

export function PrefetchBufferPanel({ exec }: { exec: ExecutionSnapshot }) {
  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">
        Prefetch buffer (FIFO, cap fetch → coadă issue)
      </div>
      {exec.prefetchBuffer.length === 0 ? (
        <div className="text-zinc-700 text-[9px] italic">gol</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {exec.prefetchBuffer.map((e, i) => (
            <div
              key={i}
              className="flex justify-between bg-zinc-800/60 rounded px-2 py-0.5 text-[9px]"
            >
              <span className="text-zinc-500">#{i}</span>
              <span className="text-yellow-300">{hex(e.pc)}</span>
              <span className="text-zinc-300">{e.opcode}</span>
              <span className={e.predictedTaken ? 'text-cyan-300' : 'text-zinc-600'}>
                {e.predictedTaken ? 'pred T' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
