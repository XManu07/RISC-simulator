'use client'
import { create } from 'zustand'
import { Simulator, assemble, defaultConfig } from '@core/index'
import type { Snapshot, SimConfig } from '@core/index'

interface SimulatorStore {
  simulator: Simulator | null
  snapshot: Snapshot | null
  history: Snapshot[]
  config: SimConfig
  startPC: number
  loadedProgram: Map<number, number> | null  // păstrat pentru replay la stepBack

  loadProgram(source: string): void
  step(): void
  stepBack(): void
  reset(): void
  setStartPC(pc: number): void
  setConfig(partial: Partial<SimConfig>): void
}

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  simulator: null,
  snapshot: null,
  history: [],
  config: defaultConfig,
  startPC: 0x100,
  loadedProgram: null,

  loadProgram(source: string) {
    const program = assemble(source)
    const sim = new Simulator(program, get().config)
    sim.setPC(get().startPC)
    set({ simulator: sim, snapshot: null, history: [], loadedProgram: program })
  },

  step() {
    const { simulator, history, snapshot } = get()
    if (!simulator) return
    const prev = snapshot
    const next = simulator.step()
    set({ snapshot: next, history: prev ? [...history, prev] : history })
  },

  stepBack() {
    const { history, loadedProgram, startPC, config } = get()
    if (history.length === 0 || !loadedProgram) return

    // Recreează simulatorul și redă targetTick pași pentru a restaura starea internă.
    const prevSnapshot = history[history.length - 1]
    const targetTick = prevSnapshot.tick

    const sim = new Simulator(loadedProgram, config)
    sim.setPC(startPC)
    for (let i = 0; i < targetTick; i++) sim.step()

    set({
      simulator: sim,
      snapshot: prevSnapshot,
      history: history.slice(0, -1),
    })
  },

  reset() {
    const { simulator } = get()
    simulator?.reset()
    set({ snapshot: null, history: [] })
  },

  setStartPC(pc: number) {
    set({ startPC: pc })
  },

  setConfig(partial: Partial<SimConfig>) {
    set(s => ({ config: { ...s.config, ...partial } }))
  },
}))
