'use client'
import { useSimulatorStore } from '@store/simulator-store'

export function Toolbar() {
  const { snapshot, step, stepBack, reset, startPC, setStartPC, history } = useSimulatorStore()

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800 text-white text-sm font-mono border-b border-zinc-700">
      <span className="font-bold text-zinc-300">RISC SIM</span>

      <label className="flex items-center gap-1 ml-4">
        <span className="text-zinc-400">PC:</span>
        <input
          type="text"
          defaultValue={`0x${startPC.toString(16).toUpperCase()}`}
          className="w-24 bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-yellow-300"
          onBlur={e => {
            const val = parseInt(e.target.value.replace(/^0x/i, ''), 16)
            if (!isNaN(val)) setStartPC(val)
          }}
        />
      </label>

      <button
        onClick={step}
        className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded font-bold"
      >
        ▶ Step
      </button>

      <button
        onClick={stepBack}
        disabled={history.length === 0}
        className="px-3 py-1 bg-zinc-600 hover:bg-zinc-500 rounded disabled:opacity-40"
      >
        ◀ Back
      </button>

      <button
        onClick={reset}
        className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded"
      >
        ↺ Reset
      </button>

      {snapshot && (
        <span className="ml-auto text-zinc-400">
          Tact: <span className="text-white font-bold">{snapshot.tick}</span>
          {snapshot.stallReason && (
            <span className="ml-3 text-orange-400">⚠ {snapshot.stallReason}</span>
          )}
        </span>
      )}
    </div>
  )
}
