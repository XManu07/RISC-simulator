'use client'
import type { ExecutionSnapshot, RegisterSnapshot } from '@core/index'
import { hex } from './utils'

export function RegisterStatusPanel({
  exec, registers,
}: { exec: ExecutionSnapshot; registers: RegisterSnapshot[] }) {
  const pending = new Map<number, string>()
  if (exec.mode === 'tomasulo') {
    for (const r of exec.registerStatus) {
      if (r.robTag !== null) pending.set(r.reg, `ROB#${r.robTag}`)
    }
  } else if (exec.fuStatus) {
    for (const f of exec.fuStatus) {
      if (f.busy && f.Fi !== null) pending.set(f.Fi, f.id)
    }
  }

  return (
    <div>
      <div className="text-zinc-500 text-[9px] uppercase tracking-wide mb-1">
        Regiştri — valoare din register file + {exec.mode === 'tomasulo' ? 'tag ROB' : 'unitate proprietară'} dacă e în zbor
      </div>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 16 }, (_, i) => {
          const tag = pending.get(i)
          const value = registers[i]?.value ?? 0
          return (
            <div
              key={i}
              className={`rounded px-1 py-0.5 border text-center ${
                tag
                  ? 'border-amber-800 bg-amber-950/40'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
              title={tag
                ? `R${i}=${hex(value)} — valoarea afişată e cea veche, din zbor aşteaptă ${tag}`
                : `R${i}=${hex(value)} — gata`}
            >
              <div className="text-zinc-600 text-[9px]">R{i}</div>
              <div className={`text-[10px] leading-tight ${tag ? 'text-zinc-500' : 'text-cyan-300'}`}>
                {hex(value)}
              </div>
              {tag && <div className="text-amber-400 text-[8px] truncate">{tag}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
