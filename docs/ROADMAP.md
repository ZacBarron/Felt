# Roadmap

Ordered so each phase is usable on its own and the core training loop (learn, drill, review) works as early as possible.

## Phase 0: Foundation (done)

- [x] pnpm monorepo: `@felt/core`, `@felt/content`, `@felt/web`
- [x] Card model, 7 card hand evaluator, range notation parser, 169 hand grid
- [x] Equity: exact enumeration and Monte Carlo vs weighted ranges with card removal
- [x] Pot math: pot odds, MDF, alpha, bluff share, call/bet/bluff EV, outs, SPR
- [x] Decision grading by EV loss with mixed strategy awareness
- [x] FSRS scheduler wrapper graded from accuracy and speed
- [x] Starter 6-max 100bb preflop charts (approximate, labelled)
- [x] Web shell, Ranges viewer, Spot Lab demo, curriculum map
- [x] Unit tests and CI

## Phase 1: Range trainer and spaced repetition (the core loop)

- [ ] Local persistence with IndexedDB (Dexie): cards, review logs, settings
- [ ] Range painting drill: paint the grid, scored per combo, with a diff view of misses
- [ ] Quick recall drill: "HJ, 100bb, KTo?" with a timer
- [ ] Daily review queue with FSRS, target times per card type
- [ ] Today page: reviews due, streak, time studied
- [ ] Lessons for Preflop RFI and BB defense, each generating drill cards
- [ ] PWA: installable, works offline

## Phase 2: Math and visual fluency

- [ ] Math speed drills: pot odds, MDF, alpha, combos, outs
- [ ] Equity estimation drill (hand vs range) scored by error
- [ ] Spot Lab: build any spot (positions, stacks, actions), equity in a Web Worker
- [ ] Range vs range equity and equity distribution charts
- [ ] Foundations track lessons

## Phase 3: Logging and results

- [ ] Session tracker: start/stop, stakes, buy ins, cash out, notes
- [ ] Fast hand entry: card picker, position chips, action shorthand parser
- [ ] Hand replayer on the table component
- [ ] Results stats: bb/100, bb/hour, profit graph, variance bands
- [ ] Flag hand -> opens in Spot Lab

## Phase 4: Scenarios and challenges

- [ ] Scenario engine: walk a hand tree, grade each decision by EV loss
- [ ] Curated scenario packs per lesson
- [ ] Daily challenge, speed rounds, personal bests, module boss fights
- [ ] Skill stats: EV loss trend, accuracy by position and street, mastery levels

## Phase 5: Solver library

- [ ] Import pipeline for solver exports into a normalized node format (see SOLVER_DATA.md)
- [ ] Replace starter preflop charts with solver exact charts (multiple stack depths)
- [ ] Postflop library: common single raised and 3bet pot flops, aggregate reports by texture
- [ ] Postflop GTO track lessons built on the library

## Phase 6: Exploitation and tells

- [ ] Player archetypes and leak profiles
- [ ] Node locked comparisons: GTO vs best response to each archetype
- [ ] Opponent notes and tags from the logger, with population stats over time
- [ ] Tells library with reliability ratings
- [ ] Exploitation track lessons

## Phase 7: Coach and sync

- [ ] AI hand review: explain a logged hand against solver data and your leak history (Claude API)
- [ ] Voice note hand capture, parsed into the hand format
- [ ] Online hand history import
- [ ] Optional cloud sync and backup
- [ ] Leak driven study plans: the app picks next week's lessons from your stats

## Open questions

1. Formats: cash, MTT, or both? Online, live, or both? (MTT adds ICM and push/fold tracks.)
2. Main stakes and table size (6-max vs full ring changes every chart).
3. Solver access: do you own PioSolver, GTO+, or a GTO Wizard subscription? This decides the Phase 5 import path.
4. Device: mostly phone, laptop, or both?
5. Learning style: confirm or correct the assumptions in CONCEPT.md.
