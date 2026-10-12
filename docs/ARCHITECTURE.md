# Architecture

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript (strict) | One language for engine, content and UI |
| Monorepo | pnpm workspaces | Engine is testable and reusable outside the UI |
| UI | React 18 + Vite | Fast dev loop, simple static deploy |
| Routing | React Router | |
| Storage | IndexedDB via Dexie | Local first, offline at the table |
| Settings | localStorage | Small, read on every page |
| App shell | PWA (vite-plugin-pwa) | Installable on phone without app stores |
| Scheduling | ts-fsrs | Proven FSRS implementation |
| Heavy compute (Phase 4) | Web Workers | Equity sims off the main thread |
| Tests | Vitest | |
| Sync (Phase 7) | TBD (Supabase or similar) | Optional; local data stays the source of truth |
| AI coach (Phase 7) | Claude API | Hand explanations grounded in solver data |

## Packages

```
felt/
  packages/
    core/       @felt/core     Pure poker engine. No UI, no storage.
      cards       card encoding and parsing
      evaluator   7 card hand evaluator
      ranges      169 hand classes, range notation, combos
      equity      exact and Monte Carlo equity vs ranges
      odds        pot odds, MDF, alpha, EV formulas
      strategy    solver nodes, EV loss grading
      charts      preflop charts with mixed strategies
      srs         FSRS wrapper graded by accuracy and speed
      settings    game settings, seat names per table size, rake, money formatting
      drills      edge hands, recall and painting scores, deck and queue selection
    content/    @felt/content  Data: charts, curriculum, later lessons and scenarios
  apps/
    web/        @felt/web      The React app (phone first)
      state/      settings, IndexedDB, review queue
      drills/     quick recall and painting drills
  docs/                        Concept, roadmap, design notes
```

Rules:

- `core` has no dependencies on `content` or `web`, and no browser APIs. Everything in it is unit tested.
- `content` is data plus thin typed helpers. Charts and lessons live here, not in components.
- `web` owns persistence, UI state and presentation.

## Key design decisions

**Cards as integers.** `rank * 4 + suit`, 0..51. The evaluator and equity loops do no string work and allocate little.

**Ranges as frequency maps.** `Map<HandClass, number>` with values in [0, 1]. This is how solvers express mixed strategies, and it lets one structure serve charts, villain ranges and drills.

**Charts as prioritized action ranges.** Each action lists its range; later actions only take the frequency left over. Authors write `3bet A5s:0.6` and `call A2s-A5s` and get a 60/40 split without manual arithmetic. Fold is the remainder.

**Grading by EV loss, not by matching.** A decision is graded by EV lost as a share of the pot, and any action the solver takes at a meaningful frequency (default 10%+) counts as correct. This avoids punishing valid mixed plays.

**Objective SRS grades.** Drill results map to FSRS grades by accuracy and response time against a per card target. The learner never rates themself.

**Labelled data provenance.** Every chart and node carries a `source` (`starter-approx`, `solver-import`, `custom`) that the UI shows. Approximate data is never presented as solver output.

## Data flow

```
content (charts, lessons, scenarios)
        |
        v
core (parse, compute equity/EV, grade, schedule)
        |
        v
web (render, collect answers and logs)  <->  IndexedDB (cards, reviews, sessions, hands)
        |
        v
stats (derived views over reviews, attempts and logs)
```

See [DATA_MODEL.md](DATA_MODEL.md) for the stored entities.
