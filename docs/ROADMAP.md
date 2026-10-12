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
- [ ] Lessons for 9 handed opens and BB defense, each linked to its drill cards
- [ ] Chart editor: enter or paste any chart (range notation) as a `custom` source

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

- [ ] Normalized node format and import validator
- [ ] Batch runner for an open source postflop solver on a laptop or cloud machine
- [ ] First postflop pack: single raised pots BTN vs BB and CO vs BB across a representative flop set
- [ ] Simplified preflop solver in `@felt/core` to regenerate charts for any table size, stack depth, open size and rake
- [ ] Data packs downloaded into the app, so the phone never runs a solve

## Phase 4: Math and the Spot Lab builder

- [ ] Math speed drills: pot odds, MDF, alpha, combos, outs
- [ ] Equity estimation drill (hand vs range) scored by error
- [ ] Spot Lab: build any spot (seats, stacks, actions), equity in a Web Worker
- [ ] Range vs range equity and equity distribution charts
- [ ] Foundations track lessons

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
