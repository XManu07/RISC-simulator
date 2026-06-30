'use client'
import { useState } from 'react'
import { useSimulatorStore } from '@store/simulator-store'

const DEFAULT_PROGRAM = `; Demo nota 5 — o instructiune din fiecare clasa
100h  ADD R9,R8,R7
104h  LD  R1,200h
108h  ST  R2,204h
10Ch  JMP 100h`

export function CodeEditor() {
  const [source, setSource] = useState(DEFAULT_PROGRAM)
  const { loadProgram } = useSimulatorStore()

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-700">
      <div className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-mono border-b border-zinc-700">
        Editor assembly
      </div>
      <textarea
        value={source}
        onChange={e => setSource(e.target.value)}
        className="flex-1 bg-zinc-900 text-green-300 font-mono text-sm p-3 resize-none outline-none"
        spellCheck={false}
      />
      <button
        onClick={() => loadProgram(source)}
        className="m-2 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold rounded font-mono"
      >
        ⬆ Load Program
      </button>
    </div>
  )
}
