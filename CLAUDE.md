# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # dev server at http://localhost:3000 (Next.js 16.2.9)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (includes the core→UI import boundary rule)
```

There is **no test runner wired up yet** (`ARCHITECTURE.md` describes a `tests/` tree, but no test script/dependency exists in `package.json`). Do not assume `npm test` works; if you add tests, add the runner too.

## Architecture

`ARCHITECTURE.md` (in Romanian) is the authoritative design doc; `TASKS.md` is the live per-person progress checklist. Read both before non-trivial work. Key points:

**The simulation engine (`src/core/`) is pure TypeScript with zero React/Next/DOM imports.** Next.js is only the shell that draws it. This is enforced mechanically:
- ESLint (`eslint.config.mjs`): files under `src/core/**` cannot import from `@components/*` or `@/app/*`.
- Path aliases (`tsconfig.json`): `@core/*`, `@store/*`, `@components/*`, `@lib/*`, `@/*`.

**Dependencies flow one direction:** `app/` → `store/` → `core/index.ts` → `core/contracts/`. Subsystems (`execution/`, `memory/`, `virtual-memory/`) depend only on `core/contracts/`, never on each other. `core/index.ts` is the single public barrel the UI imports.

**Data flow at runtime:**
- `store/simulator-store.ts` (Zustand) owns the mutable `Simulator` instance *outside* React. `step()` calls `simulator.step()`, gets a serializable `Snapshot`, and pushes the previous one onto `history` — that history array is what makes `stepBack()` / step-back work (it replays the program up to the target tick).
- The UI (`src/components/`, all `"use client"`) only ever *reads* the `Snapshot`; it never touches engine internals. `app/layout.tsx` is the only server component.

**`src/core/simulator.ts` is the top-level wiring** (dependency injection): it builds `iMem`/`dMem` (`FlatMemory` baseline, or separate I-cache/D-cache when `config.cache`), an `ExecutionEngine`, a `RegisterFile`, and hands them to `Pipeline`. The 5 pipeline stages live in `core/pipeline/stages/` (fetch → operand-fetch → execute → memory → writeback).

**Latencies are counted in abstract clock ticks, not nanoseconds.** `MemorySystem` is intentionally a stateful, non-blocking, multi-tick interface (`startAccess`/`isReady`/`result`/`tick`), so the UI can show address→MAR then data→MDR after N stall ticks — that stepwise visibility is a hard requirement.

### Current state vs. the doc

The implementation is ahead of / diverges from parts of `ARCHITECTURE.md` and `TASKS.md` — trust the code:
- `virtual-memory/` (P4) is not implemented; `config.virtualMemory` is unused in `simulator.ts`.
- Cache (P3) is wired **directly in `simulator.ts`** guarded by `config.cache`, not through a `memory/index.ts` barrel/factory. The `memory` snapshot slice is attached in `Simulator.step()`.
- Implemented memory extensions: set-associative cache, write-through + write-back, LRU and random replacement (see `git log`).
- **P2 (execution) is implemented**, past the optional extensions: `execution/units/*` (alu/mul/ldst/jmp functional units with countdown latencies, N instances per class via `ExecutionConfig.units`), `execution/superscalar/tomasulo-core.ts` (RS pools, register renaming, CDB, circular ROB, speculative execution with branch predictor + prefetch buffer + squash-on-mispredict) and `execution/superscalar/scoreboard-core.ts` (CDC-6600 scoreboard, WAR/WAW stall). File names diverge from `ARCHITECTURE.md`'s proposed layout — no `reservation-station.ts`/`common-data-bus.ts`/`tomasulo.ts`; those live in `rs-pool.ts`/`tomasulo-core.ts` instead.
  - Same divergence pattern as cache: **no `execution/index.ts` barrel** — `Simulator` picks `TomasuloCore` or `ScoreboardCore` directly based on `config.superscalar` + `config.execution.schedulingMode`. The `execution` snapshot slice is attached by the engine itself (`getExecutionSnapshot()`), not by a barrel factory.
  - ISA extended (append-only): `DIV, AND, OR, XOR, SHL, SHR, LDI, JZ, JNZ` in `isa/opcodes.ts` / `contracts/instruction.ts`.
  - **UI done:** `components/execution/*` (`ExecutionView` + 8 sub-panels). `app/page.tsx` now swaps its center column between `PipelineView` and `ExecutionView` based on `config.superscalar` (P1's pipeline/latch view is factually empty once a superscalar engine runs — `TomasuloCore`/`ScoreboardCore` hardcode the base `Snapshot.latch` to zeros and never call `rf.setValid()`), and hides the now-misleading `RegisterFileView`/`LatchView` sidebar panels in that mode. The `config.superscalar` toggle lives in `Toolbar.tsx` (not just inside `ExecutionView`), since the center-column swap means there'd otherwise be no way to turn it on from the default view.
  - `ExecutionSnapshot` (`execution/snapshot.ts`) was extended beyond the original P2 commit: `RSEntrySnapshot.unitClass`, extra `ROBEntrySnapshot` fields (pc/branch/store info), `cdb` is now `CDBSnapshot[]` (was a single nullable value — `cdbCount > 1` can broadcast more than one per tick), `PrefetchEntrySnapshot.predictedTaken`, and new mode-agnostic stall fields (`fetchPC`, `branchInFlight`, `fetchPending`, `pendingLoad`, `pendingStore`).

## Ownership & branches

Work is split into 4 vertical slices (engine + matching UI). Touch only files in your slice; frozen shared files (`contracts/*`, `simulator.ts`, `store/*`, `app/page.tsx`, `core/index.ts`, mocks) are owned by P1. Add new contract fields as **optional** (`field?: T`) to avoid breaking others. See the ownership table in `ARCHITECTURE.md`/`TASKS.md`. Branch per person (`p1-nucleu`, `p2-superscalar`, `p3-cache`, `p4-vm`).

# Evidența progresului în TASKS.md

Când implementezi ceva din `TASKS.md`, **bifează imediat căsuța** corespunzătoare: `- [ ]` → `- [x]`, în același commit cu codul.

Reguli:
- Bifezi un item **doar când chiar e gata** (cod scris, merge, commit-uit) — nu „în lucru".
- Editezi **numai** căsuțele din felia ta (P1/P2/P3/P4); restul textului din `TASKS.md` rămâne neatins, ca să nu apară conflicte.
- Dacă un item e parțial, lasă-l `- [ ]` și adaugă o notă scurtă pe rând (ex. `(în lucru: X)`), nu-l bifa.
