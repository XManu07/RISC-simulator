'use client'
import { Toolbar } from '@components/layout/Toolbar'
import { CodeEditor } from '@components/editor/CodeEditor'
import { PipelineView } from '@components/pipeline/PipelineView'
import { RegisterFileView } from '@components/pipeline/RegisterFileView'
import { LatchView } from '@components/pipeline/LatchView'
import { CacheView } from '@components/memory/CacheView'
import { MemoryView } from '@components/memory/MemoryView'
import { TlbView } from '@components/virtual-memory/TlbView'

export default function SimulatorPage() {
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Stânga — editor assembly */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r border-zinc-700">
          <CodeEditor />
        </div>

        {/* Centru — pipeline datapath */}
        <div className="flex-1 overflow-y-auto">
          <PipelineView />
        </div>

        {/* Dreapta — regiştri + latch + sloturi P2/P3/P4 */}
        <div className="w-80 flex-shrink-0 flex flex-col overflow-y-auto border-l border-zinc-700">
          <RegisterFileView />
          <LatchView />

          <div className="p-2 border-t border-zinc-800 text-zinc-700 text-[10px] font-mono italic">
            [P2] ScoreboardView — TODO
          </div>
          <CacheView />
          <MemoryView />
          <TlbView />
        </div>
      </div>
    </div>
  )
}
