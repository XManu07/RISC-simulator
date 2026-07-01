'use client'
import { useSimulatorStore } from '@store/simulator-store'
import { Toolbar } from '@components/layout/Toolbar'
import { CodeEditor } from '@components/editor/CodeEditor'
import { PipelineView } from '@components/pipeline/PipelineView'
import { RegisterFileView } from '@components/pipeline/RegisterFileView'
import { LatchView } from '@components/pipeline/LatchView'
import { ExecutionView } from '@components/execution/ExecutionView'
import { CacheView } from '@components/memory/CacheView'
import { MemoryView } from '@components/memory/MemoryView'
import { TlbView } from '@components/virtual-memory/TlbView'

export default function SimulatorPage() {
  const superscalar = useSimulatorStore(s => s.config.superscalar)

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Stânga — editor assembly */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r border-zinc-700">
          <CodeEditor />
        </div>

        {/* Centru — pipeline datapath (P1) sau execuţie superscalară (P2), în funcţie de config.superscalar.
            PipelineView e gol/fără sens când motorul superscalar e activ (Tomasulo/Scoreboard nu populează
            latch-urile P1), deci panourile se exclud reciproc în loc să coexiste. */}
        <div className="flex-1 overflow-y-auto">
          {superscalar ? <ExecutionView /> : <PipelineView />}
        </div>

        {/* Dreapta — regiştri + latch (doar în mod P1) + cache/memorie/VM (cross-cutting) */}
        <div className="w-80 flex-shrink-0 flex flex-col overflow-y-auto border-l border-zinc-700">
          {!superscalar && (
            <>
              <RegisterFileView />
              <LatchView />
            </>
          )}
          <CacheView />
          <MemoryView />
          <TlbView />
        </div>
      </div>
    </div>
  )
}
