# Roadmap

Ordered for the main game (live 1/3 cash, 9 handed, on a phone) and so the core loop (learn, drill, review) works as early as possible.

## Phase 0: Foundation (done)

- [x] pnpm monorepo: `@felt/core`, `@felt/content`, `@felt/web`
- [x] Card model, 7 card hand evaluator, range notation parser, 169 hand grid
- [x] Equity: exact enumeration and Monte Carlo vs weighted ranges with card removal
- [x] Pot math: pot odds, MDF, alpha, bluff share, call/bet/bluff EV, outs, SPR
- [x] Decision grading by EV loss with mixed strategy awareness
- [x] FSRS scheduler wrapper graded from accuracy and speed
- [x] Web shell, Ranges viewer, Spot Lab demo, curriculum map
- [x] Unit tests and CI

## Phase 1: Range trainer, spaced repetition, settings (mostly done)

- [x] Game settings: cash or tournament, live or online, 2 to 10 handed, stakes, straddle, ante, rake, stack depth, money or bb display
- [x] Presets: live 1/3 and 2/5 full ring, online 6-max, tournament 9 handed
- [x] Seat names for every table size; charts fall back to the nearest table size that has charts
- [x] Starter 9 handed charts: every open from UTG to SB, BB vs BTN, BTN vs one limper (exploit)
- [x] Local persistence with IndexedDB (Dexie): cards and review logs
- [x] Quick recall drill: seat strip, real cards, timed, full mix and chart shown after
- [x] Range painting drill: drag to paint (touch friendly), scored per combo, misses outlined
- [x] Deck built from each chart's edge hands, then a full chart paint card
- [x] Daily review queue with FSRS and a new card limit; missed cards return in the same session
- [x] Today page: due, new, streak, accuracy, recall speed
- [x] Free practice mode that does not touch the schedule
- [x] Phone layout with a bottom tab bar; installable PWA that works offline
- [x] Liquid Glass redesign: iOS system colors, light and dark modes, glass tab bar and sidebar, large titles with a collapsing nav bar, inset grouped lists, a custom icon set
- [x] Brand identity: F mark painted in a 6x6 range grid, serif wordmark, Card room palette (spruce and brass), guidelines in BRAND.md, app icons, Home with a felt hero, up next hand preview, mastery map, key idea and chart progress, motion (card flip, diagonal grid wave, ink painting, liquid tab pill, count ups)
- [x] UI pass: press states on every control, haptics (Android vibration, iOS switch tick), thumb zone answer buttons, focus mode for review, animated verdicts and score rings, settings with segmented controls, steppers and toggles, keyboard shortcuts on laptops
- [x] Lesson player: one idea per screen (text, formulas, tables, charts, hands on felt, callouts, quick checks, takeaways), story style progress, swipe and keyboard navigation, resume where you left off, completion with practice links
- [x] 11 lessons: pot odds, MDF and alpha, combos and blockers, outs, equity realization, early and late position opens, small blind, big blind defense, live pool tendencies, punishing limpers (quiz answers tested against the charts)
- [x] Themes: Card room (brand default), Ink, Oxblood, Cobalt
- [x] 29 lessons across foundations (EV and indifference, implied odds, SPR and geometric sizing, range vs range, range and nut advantage, range shapes), postflop (textures, c-betting in position, sizing, defending c-bets, check raising, turn cards, bluff selection, bluff catching) and exploitation (node locking, stations, nits, sizing tells)
- [x] Accuracy pass: every lesson claim labelled exact math, solver pattern (approximate) or pool tendency; every math number recomputed in tests; range numbers computed from Felt's charts
- [x] Full curriculum: 70 lessons across foundations and game theory, preflop (including live preflop), postflop (river play, 3bet pots, multiway), exploitation, mental game and study, and tournaments; every lesson has at least two quiz questions
- [ ] Chart editor: enter or paste any chart (range notation) as a `custom` source

## Product: onboarding, placement and Felt Pro (done)

See [MONETIZATION.md](MONETIZATION.md).

- [x] Onboarding: goal, game, experience, focus, daily goal, placement, a personal plan and a hold to commit pledge
- [x] Placement test that walks the core path and marks known lessons as skipped
- [x] Test out of any module; a miss expands into the full lesson
- [x] Path ordering: in progress, then placement module, then focus areas
- [x] Daily goal ring and next lesson on Today
- [x] Felt Pro paywall with plan cards, trial timeline and honest fine print; free tier is the first module of every track
- [x] Developer switch for Pro, onboarding replay and progress reset
- [x] Saves: bookmark any lesson screen or solver hand; a Saved page with notes; every save becomes a review card (quizzes graded, other screens as self graded flashcards, solver hands graded against the solver's mix), plus a saved only review session
- [ ] Connect a store (App Store, Play, web checkout) to `purchase()`
- [ ] Reminder notifications and streak freeze

## Phase 2: Live game essentials

- [ ] Session tracker: one tap start and stop, stakes, buy ins, cash out, venue, notes
- [ ] Fast hand entry on a phone: card picker, seat chips, action shorthand parser, money amounts
- [ ] Hand replayer on the table component; flag a hand to open it in Spot Lab
- [ ] Results: profit in money and bb, bb/hour, profit graph, variance bands
- [ ] Live charts: iso raise and overlimp vs 1 and 2+ limpers from every seat, facing large live open sizes, straddled pots
- [ ] Live pool exploits track: lessons and drills on limpers, multiway, big river bets
- [ ] Rake aware preflop: show how the rake setting tightens calling ranges

## Phase 3: Solver data we generate ourselves

See [SOLVER_DATA.md](SOLVER_DATA.md).

- [x] Felt Solver: heads up postflop DCFR solver in `@felt/core`, per combo with exact card removal, measured exploitability, validated against an analytic river game
- [x] Solver screen: example spots free, custom spots with Pro, runs in a Web Worker, browse the tree with per hand class strategies
- [ ] Suit isomorphism and a WASM build for faster turn and flop solves

- [ ] Normalized node format and import validator
- [ ] Batch runner for Felt Solver on a laptop or cloud machine
- [ ] First postflop pack: single raised pots BTN vs BB and CO vs BB across a representative flop set
- [ ] Simplified preflop solver in `@felt/core` to regenerate charts for any table size, stack depth, open size and rake
- [ ] Data packs downloaded into the app, so the phone never runs a solve

## Phase 4: Math and the Spot Lab builder

- [ ] Math speed drills: pot odds, MDF, alpha, combos, outs
- [ ] Equity estimation drill (hand vs range) scored by error
- [ ] Spot Lab: build any spot (seats, stacks, actions), equity in a Web Worker
- [ ] Range vs range equity and equity distribution charts
- [x] Foundations track lessons

## Phase 5: Scenarios and challenges

- [ ] Scenario engine: walk a hand tree, grade each decision by EV loss
- [ ] Curated scenario packs per lesson; replay your own logged hands as scenarios
- [ ] Daily challenge, speed rounds, personal bests, module boss fights
- [ ] Skill stats: EV loss trend, accuracy by position and street, mastery levels

## Phase 6: Exploitation and tells

- [ ] Player archetypes and leak profiles
- [ ] Node locked comparisons: GTO vs best response to each archetype
- [ ] Opponent notes and tags from the logger, with pool stats over time
- [ ] Tells library with reliability ratings

## Phase 7: Tournaments, coach and sync

- [ ] Push/fold Nash charts and ICM calculator, computed in `@felt/core`
- [ ] Tournament track lessons (ICM, bubble, short stack play)
- [ ] AI hand review grounded in solver data and your leak history (Claude API)
- [ ] Voice note hand capture; online hand history import
- [ ] Optional cloud sync and backup
- [ ] Leak driven study plans

## Decisions

| Question | Answer |
| --- | --- |
| Formats | All, live cash first |
| Main game | 1/3 NL, 9 handed |
| Solver | None owned; we generate our own data (Phase 3) |
| Devices | Both, 80% phone, so phone first |
| Learning style | Confirmed (see CONCEPT.md) |
