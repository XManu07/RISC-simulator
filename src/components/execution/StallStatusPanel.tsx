'use client'
import type { ExecutionSnapshot } from '@core/index'
import { hex } from './utils'

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 border text-[9px] ${
        active
          ? 'border-red-700 bg-red-950 text-red-300'
          : 'border-zinc-800 bg-zinc-900 text-zinc-600'
      }`}
    >
      {label}
    </span>
  )
}

export function StallStatusPanel({ exec }: { exec: ExecutionSnapshot }) {
  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">Stare fetch / stall</div>
      <div className="flex flex-wrap gap-1 mb-1">
        <Badge active={exec.branchInFlight} label="branch în zbor" />
        <Badge active={exec.fetchPending} label="fetch aşteaptă iMem" />
        <Badge active={exec.pendingLoad !== null} label={`LD în zbor${exec.pendingLoad ? ` (ROB#${exec.pendingLoad.robTag})` : ''}`} />
        <Badge active={exec.pendingStore} label="ST în zbor" />
        <Badge active={exec.flushedThisTick} label="flush (squash)" />
      </div>
      <div className="text-[9px] text-zinc-500">
        fetchPC: <span className="text-yellow-300">{hex(exec.fetchPC)}</span>
      </div>
    </div>
  )
}
