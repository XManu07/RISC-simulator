# Plan de lucru — 4 felii complet separate, zero conflicte

> Scope decis: **baseline solid (nota 5) + extensiile OBLIGATORII** ale fiecărei grupe.
> Extensiile opționale sunt în secțiunea „Dacă rămâne timp”, nu le începe nimeni până nu merge demo-ul end-to-end.

**Mod de lucru: fiecare felie e 100% separată, nu există fază „toți împreună”.**
Tot ce e partajat (contracte, glue, mock-uri, store, page, primitive UI) intră în **Pasul 0 —
scaffold înghețat**, pe care îl face **un singur om: cel care ține P1 (Nucleul)**. Restul (P2, P3,
P4) sunt subsisteme curate, fiecare un singur folder, fără nimic în comun unul cu altul.

Reguli de bază:
- **Nimeni nu combină două felii.** P1+scaffold = o persoană; P2, P3, P4 = câte o persoană fiecare, separat.
- Din clipa în care scaffold-ul e commit-uit, fiecare **citește contractele (read-only)** și scrie doar fișierele-frunză din folderul lui.
- **Dacă două persoane editează același fișier, ai greșit împărțirea.**

> **Notă de echilibru:** persoana P1 e cea mai încărcată (ține fundația pe care depind toți).
> P2/P3/P4 sunt fiecare un singur subsistem, deci mai ușoare și total independente. P4 (VM) e cea
> mai ușoară felie pură.

---

## PASUL 0 + P1 — Nucleu & scaffold înghețat *(un singur om)*

Acest om livrează întâi scaffold-ul (o singură dată, **frozen**), apoi își construiește pipeline-ul.
Tot ce e mai jos îi aparține; restul echipei doar îl consumă prin interfețe.

### A. Scaffold înghețat (commit unic — după el, fișierele astea nu se mai ating de NIMENI)
- [ ] **`core/contracts/`** — toate interfețele, înghețate (read-only pentru toți):
  - `instruction.ts` — `Instruction`, `InstructionClass` (ALU/LOAD/STORE/JMP), `Opcode`, formate R-R-R / R-R-I / R-M
  - `memory-system.ts` — interfața `MemorySystem` **cu stare, non-blocantă, multi-tact**. NU `access(addr) → rezultat` sincron (ăla întoarce pe loc și NU poate arăta latența cerută la nota 5). În schimb, cerere + polling:
    ```ts
    interface MemorySystem {
      startAccess(addr: number, write?: boolean, value?: number): void; // tact 1: emite cererea (MAR pe bus)
      isReady(): boolean;        // pipeline-ul întreabă la FIECARE tact; false cât timp accesul e în curs (stall)
      result(): number;          // valabil doar când isReady() === true (atunci MDR se umple)
      tick(): void;              // avansează un tact intern (consumă latența)
    }
    ```
    **De ce e obligatoriu (nota 5):** „adresa se trece în registrul de adrese ȘI DUPĂ numărul de tacte corespunzător instrucțiunea apare în registrul de date" — MAR pe bus la tactul 1, aștepți N tacte, apoi MDR se umple. Un `access()` care returnează pe loc nu poate arăta asta pas-cu-pas. **Trebuie fixat ACUM, în Pasul 0, înainte de a îngheța interfața** — altfel îl prind toți abia la integrare.
  - `execution-engine.ts` — interfața `ExecutionEngine`
  - `register-file.ts` — interfața `RegisterFile` + biți de validare
  - `clock.ts` — tipuri pentru tact (latențele se numără în TACTE, nu ns)
  - `snapshot.ts` — **doar tipul compus** (vezi mai jos)
- [ ] **Snapshot feliat** — tipul compus + 4 felii (fiecare felie e fișier propriu, în folderul subsistemului):
  ```ts
  interface Snapshot {
    core: CoreSnapshot;            // P1 — pipeline/snapshot.ts
    execution?: ExecutionSnapshot; // P2 — execution/snapshot.ts
    memory?: MemorySnapshot;       // P3 — memory/snapshot.ts
    vm?: VmSnapshot;               // P4 — virtual-memory/snapshot.ts
  }
  ```
  Tipul compus nu se mai atinge. Fiecare om umple doar felia lui.
- [ ] **Config feliat** — `Config { core; execution?; memory?; vm? }` + 4 sub-config, fiecare în folderul subsistemului.
- [ ] **`simulator.ts`** — scris **o singură dată**: cheamă 4 factory-uri prin barrel-urile subsistemelor; **nu se mai editează niciodată**.
- [ ] **Barrel per subsistem** — `execution/index.ts`, `memory/index.ts`, `virtual-memory/index.ts`; fiecare exportă un `createX(config, …)` care la început **întoarce mock-ul**. Omul respectiv îl înlocuiește cu implementarea lui (editează doar barrel-ul LUI).
- [ ] **Mock-uri FUNCȚIONALE** (nu placeholder): `memory/flat-memory.ts` (FlatMemory) + `execution/in-order-engine.ts` (InOrderEngine). Baseline care chiar merge, ca toți să poată rula din prima.
- [ ] **`store/simulator-store.ts`** — Zustand subțire (ține `Simulator`, expune `step()/reset()`, recalculează snapshot, array de snapshot-uri → undo/step-back). Scris o dată, nu se mai atinge.
- [ ] **`app/page.tsx`** — grid cu 4 sloturi, importă 4 panouri **stub** (`<div>TODO</div>`). Fiecare om umple doar panoul lui; `page.tsx` nu se mai editează.
- [ ] **`core/index.ts`** (barrel public) — exportă `Simulator` + tipuri; store-ul importă doar de aici. Nu se mai atinge.
- [ ] **`components/shared/*`** — primitive UI reutilizabile: `Bus`, `RegisterCell`, `Bit`, `HexValue`. Set de start; dacă cuiva îi mai trebuie una, o face **local în panoul lui**, nu editează `shared/`.
- [ ] **`lib/*`** — helperi generici (formatare hex etc.).
- [ ] **Granițe mecanice**: alias-uri `tsconfig.json` (`@core/*`, `@store/*`, `@components/*`, `@lib/*`) + regula ESLint `no-restricted-imports` (core nu importă din components/app).
- [ ] **Tabela de opcode = append-only**: baseline-ul (ALU/LOAD/STORE/JMP) intră în scaffold; P2 adaugă restul fără să atingă rândurile existente.

**„Gata cu scaffold-ul”:** `npm run dev` pornește, pagina arată 4 sloturi „TODO”, `Simulator`
se construiește cu FlatMemory + InOrderEngine și face `step()` fără să crape. Din acest punct,
**P2/P3/P4 pot porni simultan** și nimeni nu mai editează fișierele de mai sus.

### B. Pipeline + ISA (baseline nota 5)
**Fișiere proprii (motor):** `core/isa/*`, `core/pipeline/*` (inclusiv felia `CoreSnapshot` din `pipeline/snapshot.ts`).
**Fișiere proprii (UI):** `components/layout/Toolbar.tsx`, `components/editor/CodeEditor.tsx`, `components/pipeline/*`.

- [ ] `isa/opcodes.ts` — tabela de opcode (append-only, baseline ALU/LOAD/STORE/JMP)
- [ ] `isa/encode.ts` — `"ADD R9,R8,R7"` → cuvânt 32 biți
- [ ] `isa/decode.ts` — cuvânt 32 biți → `Instruction`
- [ ] `isa/assembler.ts` — parsează program + adrese asociate
- [ ] `pipeline/register-file.ts` — `RegisterFile` concret + biți de validare
- [ ] `pipeline/latch.ts` — MAR, MDR, IR, A, B, C + busuri adrese/date
- [ ] `pipeline/stages/fetch.ts` — IF: `MAR←PC`; read prin iMem; `MDR←…`; `IR←MDR`; `PC←PC+4`
- [ ] `pipeline/stages/operand-fetch.ts` — OF: decode + citire regiștri + check biți validare
- [ ] `pipeline/stages/execute.ts` — EX: deleagă către `ExecutionEngine`
- [ ] `pipeline/stages/memory.ts` — MEM: deleagă către `MemorySystem` (dMem)
- [ ] `pipeline/stages/writeback.ts` — WB / SR (Memorare Rezultat)
- [ ] `pipeline/hazards.ts` — detecție hazarduri prin biți de validare
- [ ] `pipeline/forwarding.ts` — logica de forwarding
- [ ] `pipeline/pipeline.ts` — orchestrează cele 5 stagii, deține latch-urile, produce `CoreSnapshot`
- [ ] **UI:** `Toolbar`, `CodeEditor`, `PipelineView`, `RegisterFileView`, `LatchView`

**Criteriu „gata”:** exemplul de la nota 5 (`ADD R9,R8,R7` la 100h) rulează pas-cu-pas; se vede pe UI: MAR→bus adrese, MDR→bus date după N tacte, IR←MDR, WB scrie R9.

---

## P2 — Superscalar (execuție) *(o persoană, separat)*

**Fișiere proprii (motor):** `core/execution/*` (mai puțin `in-order-engine.ts`, mock-ul din scaffold), felia `ExecutionSnapshot` + `ExecutionConfig`.
**Fișiere proprii (UI):** `components/execution/*`.

### Obligatoriu (cerut explicit de spec ca să iei punctele grupei)
- [ ] **Set de instrucțiuni complet** — extinde tabela append-only din scaffold (NU edita rândurile existente)
- [ ] `execution/units/functional-unit.ts` — interfața de bază (busy, latență, clasa deservită)
- [ ] `execution/units/alu-unit.ts` — ADD/SUB
- [ ] `execution/units/mul-unit.ts` — MUL
- [ ] `execution/units/ldst-unit.ts` — LD/ST (folosește `MemorySystem`/dMem prin interfață — singura ta legătură cu P3)
- [ ] `execution/units/jmp-unit.ts` — JMP
- [ ] **Superscalaritate la nivel de unități** — engine care ține N instanțe per clasă (ex. 2 sumatoare); implementează `ExecutionEngine`
- [ ] `execution/snapshot.ts` — `ExecutionSnapshot` (stare unități/instrucțiuni)
- [ ] Înlocuiește mock-ul în `execution/index.ts` (barrel-ul TĂU) cu engine-ul real
- [ ] **UI:** `ScoreboardView` / panou cu starea unităților funcționale

**Criteriu „gata”:** un program cu 2 ALU + 1 MUL emite în paralel pe unități separate; UI arată care unitate e busy.

---

## P3 — Cache (memorie) *(o persoană, separat)*

**Fișiere proprii (motor):** `core/memory/*` (mai puțin `flat-memory.ts`, mock-ul din scaffold), felia `MemorySnapshot` + `MemoryConfig`.
**Fișiere proprii (UI):** `components/memory/*`.

### Obligatoriu
- [ ] `memory/main-memory.ts` — memorie principală, latență fixă în tacte
- [ ] `memory/cache/cache.ts` — **cache set-asociativ parametrizabil** (o clasă reutilizabilă), implementează `MemorySystem`, se instanțiază de 2 ori (I-cache pentru IF, D-cache pentru MEM). **Hit = puține tacte, miss = latența MP (mai multe tacte)** — diferența de tacte între hit și miss e exact ce face hit/miss vizibil; un cache cu latență 0 nu demonstrează nimic.
- [ ] `memory/cache/cache-line.ts`, `memory/cache/cache-set.ts`
- [ ] `memory/replacement/replacement-policy.ts` (interfața) + `memory/replacement/random.ts` (înlocuirea minimă obligatorie)
- [ ] `memory/snapshot.ts` — `MemorySnapshot` (linii cache + **black box hit/miss**, obligatoriu)
- [ ] Înlocuiește mock-ul în `memory/index.ts` (barrel-ul TĂU) cu factory-ul real de cache
- [ ] **UI:** `CacheView` (hit/miss vizibil), `MemoryView`

**Criteriu „gata”:** I-cache și D-cache separate; o secvență LD repetată arată miss (mai multe tacte) apoi hit (mai puține tacte) pe UI — diferența de tacte trebuie să fie vizibilă pas-cu-pas.

---

## P4 — Memorie virtuală *(o persoană, separat — cea mai ușoară felie)*

**Fișiere proprii (motor):** `core/virtual-memory/*` (mai puțin barrel-ul stub din scaffold, pe care îl umpli), felia `VmSnapshot` + `VmConfig`.
**Fișiere proprii (UI):** `components/virtual-memory/*`.

### Memorie virtuală (1p)
- [ ] `virtual-memory/page-table.ts`, `virtual-memory/tlb.ts`
- [ ] `virtual-memory/mmu.ts` — compune ierarhia de memorie (`new MMU(memorySystem, tlb)`), implementează `MemorySystem`
- [ ] `virtual-memory/translation.ts` — **cele 6 cazuri** (TLB/cache/MP × cache/MP, vezi ARCHITECTURE.md). Nu 6 căi diferite: o singură cale + **etichetezi** în ce caz a căzut.
- [ ] `virtual-memory/snapshot.ts` — `VmSnapshot` (inclusiv care din cele 6 cazuri s-a întâmplat)
- [ ] Înlocuiește mock-ul în `virtual-memory/index.ts` (barrel-ul TĂU) cu `wrapWithVM` real
- [ ] **UI:** `TlbView` + indicator al cazului curent

**Criteriu „gata”:** un acces declanșează vizibil fiecare din cele 6 cazuri în funcție de starea TLB/cache (controlată din config la pornire).

---

## Ordinea de pornire

1. **Pasul 0:** omul de la P1 generează scaffold-ul înghețat și face commit.
2. Din acel commit, **P2/P3/P4 pleacă simultan**, fiecare pe felia lui, peste mock-urile/interfețele din scaffold. Nicio dependență de ordine între ei. P1 continuă cu pipeline-ul.
3. Fiecare își înlocuiește mock-ul din barrel-ul lui cu implementarea reală, când e gata. Integrarea e automată — nimeni nu editează `simulator.ts`.

## Fișiere partajate — cine le atinge după scaffold

| Fișier | Cine îl mai editează |
|---|---|
| `contracts/*`, `simulator.ts`, `store/*`, `app/page.tsx`, `core/index.ts`, `components/shared/*`, `lib/*`, mock-urile | **NIMENI** (proprietatea omului de scaffold/P1, frozen) |
| `isa/*`, `pipeline/*` + panourile pipeline | doar P1 |
| `execution/*` + `execution/index.ts` + felia lui + panourile lui | doar P2 |
| `memory/*` + `memory/index.ts` + felia lui + panourile lui | doar P3 |
| `virtual-memory/*` + `virtual-memory/index.ts` + felia lui + panourile lui | doar P4 |

## Reguli anti-conflict (citește înainte de fiecare commit)
- **Nu editezi niciodată un fișier din rândul „NIMENI”** de mai sus.
- Atingi doar fișierele din secțiunea ta. Vrei un câmp nou în snapshot/config → în **felia ta**, niciodată în tipul compus.
- Îți lipsește un câmp într-un contract? Adaugă-l **opțional** (`camp?: T`) — niciodată breaking. Fără ședință.
- Comunici cu alt subsistem **doar prin interfața din `contracts/`**, niciodată importând clasa lui concretă.
- `core/` nu importă niciodată din `components/` sau `app/` (ESLint te oprește).
- Branch per persoană (`p1-nucleu`, `p2-superscalar`, `p3-cache`, `p4-vm`); PR-uri mici și dese.

---

## Dacă rămâne timp (extensii opționale, abia după ce merge demo-ul end-to-end)
- **P2:** tabelă de marcaj (scoreboard), Tomasulo + stații de rezervare, common data bus, buffer de prefetch, execuție out-of-order.
- **P3:** write-through / write-back / write-buffer; LRU (contor/stivă/matrice — unul) + LRU aproximativ.
- **P4:** rafinări pe vizualizarea celor 6 cazuri.
