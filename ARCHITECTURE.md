# Arhitectura simulatorului RISC (Next.js + TypeScript)

## Principiul central

**Motorul de simulare (`src/core/`) este TypeScript pur — zero importuri de React/Next/DOM.**
Next.js este doar carcasa care îl desenează. Consecințe:

- întreaga simulare e testabilă fără să randezi nimic;
- fiecare din cei 4 lucrează pe mock-uri ale celorlalți;
- carcasa (Next.js) e înlocuibilă fără să atingi logica;
- bonusul „interfață web” vine gratis.

> **Notă echipă:** specificația presupune nominal echipe de **5 persoane** (punctajul pe
> extensii se împarte la 5). Echipa noastră are **4 persoane** — harta de proprietate de mai
> jos (P1–P4) reflectă această realitate; nu e o omisiune.

Regula de aur a importurilor: **dependențele curg într-o singură direcție.**

```
app/ ──► store/ ──► core/index.ts ──► core/contracts/
                                          ▲   ▲   ▲
        core/pipeline ───────────────────┘   │   │
        core/execution/* ────────────────────┘   │   (extensiile depind DOAR
        core/memory/* ───────────────────────────┘    de contracts, niciodată
        core/virtual-memory/* ───────────────────┘    una de cealaltă)
```

- `core/` nu importă NICIODATĂ din `components/` sau `app/`.
- Extensiile (`execution/superscalar`, `memory/cache`, `virtual-memory`) depind doar de `core/contracts/`, niciodată una de cealaltă.
- `core/contracts/` nu depinde de nimic. E ce înghețați în săptămâna 1.

---

## Structura de foldere

```
risc-sim/
├── src/
│   ├── app/                          # Next.js App Router — DOAR carcasa
│   │   ├── layout.tsx                #   server component (singurul)
│   │   ├── page.tsx                  #   "use client" — pagina simulatorului
│   │   └── globals.css
│   │
│   ├── core/                         # ★ MOTOR — TypeScript pur, fără React/Next
│   │   │
│   │   ├── contracts/                # ★ SEAM-urile: depind de nimic, depind toți de ele
│   │   │   ├── instruction.ts        #   Instruction, InstructionClass (ALU/LOAD/STORE/JMP), Opcode, formate R-R-R/R-R-I/R-M
│   │   │   ├── memory-system.ts      #   interfața MemorySystem (cusătura de memorie); o instanță = instrucțiuni, una = date
│   │   │   ├── execution-engine.ts   #   interfața ExecutionEngine (cusătura de execuție)
│   │   │   ├── register-file.ts      #   interfața RegisterFile (+ biți de validare)
│   │   │   ├── clock.ts              #   tipuri pentru tactul abstract (step/tick) — latențele se numără în TACTE, nu în ns
│   │   │   └── snapshot.ts           #   starea serializabilă citită de UI: PC, MAR, MDR, IR, busuri (adrese/date), regiștri+biți, latch-uri...
│   │   │
│   │   ├── isa/                       # set de instrucțiuni + asamblare (P1, partajat)
│   │   │   ├── opcodes.ts
│   │   │   ├── encode.ts             #   "ADD R9,R8,R7" → cuvânt pe 32 biți
│   │   │   ├── decode.ts             #   cuvânt 32 biți → Instruction
│   │   │   └── assembler.ts          #   parsează un program cu adrese asociate
│   │   │
│   │   ├── pipeline/                  # ★ P1 — coloana vertebrală (nota 5)
│   │   │   ├── pipeline.ts           #   orchestrează cele 5 stagii, deține latch-urile
│   │   │   ├── stages/
│   │   │   │   ├── fetch.ts          #   IF (MAR←PC; Read prin iMem; MDR←...; IR←MDR; PC←PC+4)
│   │   │   │   ├── operand-fetch.ts  #   OF (decode + citire regiștri + check biți validare)
│   │   │   │   ├── execute.ts        #   EX → deleagă către ExecutionEngine
│   │   │   │   ├── memory.ts         #   MEM → deleagă către MemorySystem (dMem) — stagiul separat de acces la memorie
│   │   │   │   └── writeback.ts      #   WB (≡ SR „Memorare Rezultat” din curs)
│   │   │   ├── latch.ts              #   regiștri inter-stagii: MAR, MDR, IR, A, B, C + busurile de adrese/date
│   │   │   ├── register-file.ts      #   RegisterFile concret + biți de validare
│   │   │   ├── hazards.ts            #   detecția hazardurilor prin biți de validare
│   │   │   └── forwarding.ts         #   logica de forwarding
│   │   │
│   │   ├── execution/                # ★ P2 — motoare de execuție (în spatele ExecutionEngine)
│   │   │   ├── in-order-engine.ts    #   baseline in-order, o unitate (default — poate sta la P1)
│   │   │   ├── superscalar/
│   │   │   │   ├── scoreboard.ts          #   tabela de marcaj: 3 tabele (stare instrucțiuni / stare unități funcționale / stare regiștri destinație)
│   │   │   │   ├── tomasulo.ts
│   │   │   │   ├── reservation-station.ts
│   │   │   │   ├── common-data-bus.ts
│   │   │   │   └── prefetch-buffer.ts
│   │   │   └── units/                #   unități funcționale specializate — superscalaritate „la nivel de unități”:
│   │   │       │                     #   ExecutionEngine poate ține N instanțe per clasă (ex. 2 sumatoare, vezi Curs 11 scoreboard)
│   │   │       ├── functional-unit.ts   # interfața de bază (busy, latență, clasa deservită)
│   │   │       ├── alu-unit.ts           # ADD/SUB
│   │   │       ├── mul-unit.ts           # MUL
│   │   │       ├── ldst-unit.ts          # LD/ST ← folosește și MemorySystem (dMem) (singura legătură cu P3)
│   │   │       └── jmp-unit.ts           # JMP
│   │   │
│   │   ├── memory/                   # ★ P3 — ierarhia de memorie (implementează MemorySystem)
│   │   │   ├── flat-memory.ts        #   baseline: memorie plată, latență fixă (default)
│   │   │   ├── main-memory.ts
│   │   │   ├── cache/
│   │   │   │   ├── cache.ts          #   cache set-asociativ, parametrizabil (o singură clasă reutilizabilă)
│   │   │   │   │                     #   se INSTANȚIAZĂ de două ori: I-cache (citit de IF) + D-cache (citit/scris de MEM)
│   │   │   │   ├── cache-line.ts
│   │   │   │   ├── cache-set.ts
│   │   │   │   └── write-policy/
│   │   │   │       ├── write-policy.ts   # interfața
│   │   │   │       ├── write-through.ts
│   │   │   │       ├── write-back.ts
│   │   │   │       └── write-buffer.ts
│   │   │   └── replacement/          #   algoritmi de înlocuire (plug-in)
│   │   │       ├── replacement-policy.ts # interfața
│   │   │       ├── random.ts
│   │   │       ├── lru-counter.ts
│   │   │       └── lru-approx.ts
│   │   │
│   │   ├── virtual-memory/           # ★ P4 — memorie virtuală (compune/implementează MemorySystem)
│   │   │   ├── mmu.ts                #   pune TLB + tabele în fața memoriei
│   │   │   ├── tlb.ts
│   │   │   ├── page-table.ts
│   │   │   └── translation.ts        #   logica celor 6 cazuri (Curs 7, pag. 16) — vezi tabelul de mai jos
│   │   │
│   │   ├── simulator.ts              # ★ TOP: alege + cablează engine + memory; expune step()/reset()
│   │   ├── config.ts                 #   parametrizare (dim. cache, asociativitate, latențe...)
│   │   └── index.ts                  #   barrel public — SINGURUL lucru pe care-l importă UI-ul
│   │
│   ├── store/                        # puntea motor pur ↔ React
│   │   └── simulator-store.ts        #   Zustand: ține instanța Simulator + expune step/reset + snapshot
│   │
│   ├── components/                   # ★ UI — oglindește motorul, un panou per subsistem
│   │   ├── layout/
│   │   │   ├── Toolbar.tsx           #   load program, step/next, reset, contor tact
│   │   │   └── ConfigPanel.tsx       #   controale de parametrizare
│   │   ├── editor/
│   │   │   └── CodeEditor.tsx        #   introducere cod + adrese
│   │   ├── pipeline/                 #   panourile P1
│   │   │   ├── PipelineView.tsx      #   datapath-ul / cele 5 stagii
│   │   │   ├── RegisterFileView.tsx  #   regiștri + biți de validare
│   │   │   └── LatchView.tsx
│   │   ├── execution/                #   panourile P2
│   │   │   ├── ReservationStations.tsx
│   │   │   └── ScoreboardView.tsx
│   │   ├── memory/                   #   panourile P3
│   │   │   ├── CacheView.tsx         #   vizualizare hit/miss
│   │   │   └── MemoryView.tsx
│   │   ├── virtual-memory/           #   panourile P4
│   │   │   └── TlbView.tsx
│   │   └── shared/                   #   primitive reutilizabile (Bus, RegisterCell, Bit...)
│   │
│   └── lib/                          # helperi generici (formatare hex etc.)
│
├── tests/                            # teste de motor (pure, fără UI)
│   ├── pipeline/
│   ├── memory/
│   └── virtual-memory/
│
├── tsconfig.json                     # alias-uri de cale + strict mode
├── package.json
└── eslint.config.mjs                 # reguli de graniță (core nu importă UI)
```

---

## Cele patru decizii de design care fac structura scalabilă

### 1. Injecție de dependență la vârf (`simulator.ts`)
Pipeline-ul ține o referință de tip **interfață** (`MemorySystem`, `ExecutionEngine`), nu o
implementare concretă. `simulator.ts` decide ce implementare se cablează, în funcție de `config.ts`:

```ts
// pseudo — se construiesc DOUĂ ierarhii de memorie: una pentru instrucțiuni (IF), una pentru date (MEM)
function buildMemory(kind: "instr" | "data"): MemorySystem {
  const main = new MainMemory();                                      // memorie principală partajată
  const cached = config.cache
    ? new Cache(main, config.cache)                                   // P3 — I-cache SAU D-cache (aceeași clasă, instanțe separate)
    : main;
  return config.virtualMemory
    ? new MMU(cached, config.tlb)                                     // P4 peste P3: tabelele pot fi în cache sau în MP
    : config.cache ? cached : new FlatMemory(config.memory);         // baseline plat dacă nu e nici cache, nici VM
}

const iMem: MemorySystem = buildMemory("instr");                      // citit de stagiul IF
const dMem: MemorySystem = buildMemory("data");                      // citit/scris de stagiul MEM

const engine: ExecutionEngine = config.superscalar
  ? new TomasuloEngine(units, dMem)                                   // P2 — unitățile LD/ST folosesc dMem
  : new InOrderEngine(dMem);                                          // baseline

const pipeline = new Pipeline(registerFile, engine, iMem, dMem);
```

Schimbarea unei extensii = o linie. Fiecare implementare se dezvoltă izolat, peste mock.

### 2. Tiparul `Snapshot` — tăietura curată motor ↔ UI
La fiecare tact, motorul expune starea ca obiect simplu serializabil (`Snapshot`):
PC, **MAR, MDR, IR**, **busurile de adrese/date**, regiștri + biți de validare, conținutul
latch-urilor, liniile de cache cu hit/miss, stațiile de rezervare etc. UI-ul **doar citește**
snapshot-ul; nu atinge niciodată internul motorului.

MAR/MDR/busurile sunt **de prim rang** în snapshot pentru că exact ele se cer vizualizate la
nota 5 (vezi exemplul de mai jos): adresa care trece pe bus în MAR, apoi instrucțiunea care
apare în MDR după tactele de acces la memorie, apoi transferul în IR.

Bonus: ținând un array de snapshot-uri obții **undo / step-back** gratis — aur curat pentru un demo pas-cu-pas.

#### Exemplul de la nota 5 (din specificație), pas cu pas
`PC ← 100h`, la adresa 100h e `ADD R9,R8,R7`, apăs **next**:
1. `MAR ← PC` (100h trece pe **busul de adrese**);
2. după *N* tacte de acces la memorie (N = latența lui `iMem`, în tacte), cuvântul instrucțiunii apare în `MDR` (pe **busul de date**);
3. `IR ← MDR` (registrul „de după fetch”); `PC ← PC + 4`;
4. OF decodifică `ADD`, citește R8/R7 (dacă biții lor de validare sunt setați), resetează bitul de validare al R9;
5. EX calculează în ALU; MEM e no-op pentru ALU; WB/SR scrie R9 și îi setează bitul de validare.

### 3. Store-ul Zustand, nu Context
Starea reală (instanța `Simulator`) e mutabilă și trăiește **în afara** React-ului. Zustand o ține
într-un store, iar la `step()` recalculează snapshot-ul și notifică doar componentele abonate.
Context-ul ar re-randa tot arborele la fiecare tact; Redux e prea mult boilerplate pentru asta.

### 4. Granițele se impun mecanic
- **Alias-uri de cale** în `tsconfig.json`: `@core/*`, `@store/*`, `@components/*`, `@lib/*`.
- **Regulă ESLint** (`no-restricted-imports`): `src/core/**` nu poate importa din `@components` sau `@/app`.
  Așa arhitectura nu putrezește când 4 oameni fac commit în paralel.

---

## Specific Next.js

> ⚠️ **Versiune neobișnuită.** Proiectul folosește Next.js **16.2.9** (vezi `AGENTS.md`):
> API-urile/convențiile pot diferi de ce știți. **Înainte** să scrieți carcasa, verificați
> ghidurile din `node_modules/next/dist/docs/` — afirmațiile de mai jos sunt ipoteza implicită,
> nu adevăr garantat pentru această versiune.

- Singurul **server component** e `app/layout.tsx`. Pagina simulatorului și toate panourile
  interactive sunt `"use client"` — normal, totul e interactiv.
- Motorul din `core/` nu e nici server, nici client: e cod TS care rulează în browser când îl
  importă o componentă client. Nu folosiți server actions / route handlers — nu aveți ce simula pe server.
- Nu vă bazați pe SSR pentru starea simulatorului: ea există doar în browser, după hidratare.

---

## Harta de proprietate (cine deține ce)

| Persoană | Motor (`core/`) | UI (`components/`) |
|---|---|---|
| **P1 — Nucleu** | `contracts/`, `isa/`, `pipeline/`, `simulator.ts`, `config.ts` | `layout/`, `editor/`, `pipeline/`, `shared/` |
| **P2 — Superscalar** | `execution/` (Tomasulo, scoreboard, units, prefetch) | `execution/` |
| **P3 — Cache** | `memory/` (I-cache + D-cache separate, write-policy, replacement) | `memory/` |
| **P4 — Memorie virtuală** | `virtual-memory/` (MMU, TLB, page-table) | `virtual-memory/` |

Fiecare deține o felie verticală (motor + UI) → poate prezenta partea lui demonstrabilă singură.

---

## Ordinea de pornire

1. **Săptămâna 1, toți împreună:** scrieți `core/contracts/` + mock-uri (`FlatMemory`, `InOrderEngine`). Înghețați interfețele.
2. P1 construiește pipeline-ul peste mock-uri → atinge nota 5.
3. P2/P3/P4 dezvoltă în paralel, fiecare peste mock-ul celuilalt.
4. `simulator.ts` le cablează pe rând, pe măsură ce sunt gata.

---

## Memorie virtuală — cele 6 cazuri (Curs 7, pag. 16)

`translation.ts` trebuie să poată evidenția cele **6 combinații** de acces. Ele rezultă din
*unde se găsește traducerea adresei* (intrarea din tabela de pagini: în TLB / în cache / în MP)
× *unde se găsesc datele* (în cache / în MP):

| # | Adresa (traducerea) | Datele | Comentariu |
|---|---|---|---|
| 1 | TLB | cache | calea cea mai rapidă (hit TLB + hit cache) |
| 2 | TLB | MP | hit TLB, miss cache |
| 3 | cache | cache | miss TLB → tabela de pagini citită din cache |
| 4 | cache | MP | tabela în cache, dar datele lipsesc din cache |
| 5 | MP | cache | miss TLB → tabela citită din MP |
| 6 | MP | MP | cazul cel mai lent (totul în MP) |

Cheia arhitecturală: **tabelele de pagini pot sta în cache sau în MP**, de aceea `MMU`
*compune* ierarhia P3 (`new MMU(cache_sau_MP, tlb)`) — la miss de TLB, citirea intrării de
tabelă trece ea însăși prin cache/MP. Latențele se exprimă în **tacte abstracte**, nu în ns
(cursul folosește ns doar pentru calculul timpului mediu de acces, care nu e cerut de simulator).

---

## Harta notelor (din specificație) — ce înseamnă „gata” per subsistem

| Nivel | Cerință | Punctaj |
|---|---|---|
| **Baseline (P1)** | pipeline 5 stagii + o instrucțiune generică / clasă (ALU, LOAD, STORE, JMP) + detecție hazarduri prin biți de validare + forwarding | toți iau **5** |
| **Extensii grupa 1 (P2)** | set de instrucțiuni complet *(obligatoriu)* + unități specializate ADD/MUL/LD-ST/JMP, superscalaritate la nivel de unități *(obligatoriu)*; apoi tabelă de marcaj, Tomasulo (stații de rezervare), buffer de prefetch + execuție out-of-order | **2p** / extensie, suma ÷ 5 |
| **Extensii grupa 2 (P3)** | cache I/D separate black box hit/miss *(obligatoriu)* + cache set-asociativ parametrizabil cu înlocuire random; write-through / write-back / write-buffer; LRU (contor/stivă/matrice — unul) + LRU aproximativ | **2p** / extensie, suma ÷ 5 |
| **Extensii grupa 3 (P4)** | memorie virtuală cu TLB + tabele (în cache sau MP), cele 6 cazuri | **1p** |
| **Bonus** | implementări ușor extensibile · parametrizare · interfață web | neobligatoriu |

> În fiecare grupă, **extensiile obligatorii** trebuie implementate pentru a primi punctele grupei.
