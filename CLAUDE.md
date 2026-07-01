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
- Only `InOrderEngine` exists; there is no `execution/superscalar` or `execution/units` yet (P2 not started).
- `virtual-memory/` (P4) is not implemented; `config.virtualMemory` is unused in `simulator.ts`.
- Cache (P3) is wired **directly in `simulator.ts`** guarded by `config.cache`, not through a `memory/index.ts` barrel/factory. The `memory` snapshot slice is attached in `Simulator.step()`.
- Implemented memory extensions: set-associative cache, write-through + write-back, LRU and random replacement (see `git log`).

## Ownership & branches

Work is split into 4 vertical slices (engine + matching UI). Touch only files in your slice; frozen shared files (`contracts/*`, `simulator.ts`, `store/*`, `app/page.tsx`, `core/index.ts`, mocks) are owned by P1. Add new contract fields as **optional** (`field?: T`) to avoid breaking others. See the ownership table in `ARCHITECTURE.md`/`TASKS.md`. Branch per person (`p1-nucleu`, `p2-superscalar`, `p3-cache`, `p4-vm`).

# Evidența progresului în TASKS.md

Când implementezi ceva din `TASKS.md`, **bifează imediat căsuța** corespunzătoare: `- [ ]` → `- [x]`, în același commit cu codul.

Reguli:
- Bifezi un item **doar când chiar e gata** (cod scris, merge, commit-uit) — nu „în lucru".
- Editezi **numai** căsuțele din felia ta (P1/P2/P3/P4); restul textului din `TASKS.md` rămâne neatins, ca să nu apară conflicte.
- Dacă un item e parțial, lasă-l `- [ ]` și adaugă o notă scurtă pe rând (ex. `(în lucru: X)`), nu-l bifa.
