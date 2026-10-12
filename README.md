# Felt

A personal poker training system for reaching an elite level in No Limit Hold'em: GTO fundamentals, solver charts, spaced repetition, scenario testing, exploitation, session logging, and stats that show real progress.

## What it does

- **Lessons** on core concepts, preflop and postflop GTO, exploitation, tells and mental game
- **Spaced repetition** (FSRS) graded automatically by accuracy and speed
- **Range trainer** for every position and common spot, with mixed strategies shown as frequencies
- **Scenarios** played street by street and graded by EV loss
- **Spot Lab**: table visual with pot, stacks and board, equity vs the opponent's range, pot odds, and the EV and GTO frequency of every action
- **Exploitation**: player archetypes, node locking concepts, a tells library
- **Fast logging** of sessions and hands with a one line action shorthand
- **Stats** for results (bb/100, bb/hour, variance) and skill (accuracy, EV loss, retention)

Read the full concept in [docs/CONCEPT.md](docs/CONCEPT.md) and the build plan in [docs/ROADMAP.md](docs/ROADMAP.md).

## Status

Phase 0 (foundation) is done: the poker engine, starter charts, curriculum map, and an app shell with a working Ranges viewer and Spot Lab demo. Next up is Phase 1, the range trainer and daily review queue.

## Getting started

Requires Node 20+ and pnpm 10.

```bash
pnpm install
pnpm dev         # app at http://localhost:5173
pnpm test        # unit tests
pnpm typecheck
pnpm build
```

## Layout

```
packages/core      poker engine: cards, evaluator, ranges, equity, pot math, grading, FSRS
packages/content   charts and curriculum data
apps/web           React app
docs/              concept, roadmap, architecture, data model, curriculum, solver data
```

## Docs

- [CONCEPT.md](docs/CONCEPT.md): product vision, learner profile, feature pillars
- [ROADMAP.md](docs/ROADMAP.md): phases, checklists, open questions
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): stack and key design decisions
- [DATA_MODEL.md](docs/DATA_MODEL.md): stored entities and the hand shorthand
- [CURRICULUM.md](docs/CURRICULUM.md): how lessons are taught and mastered
- [SOLVER_DATA.md](docs/SOLVER_DATA.md): where strategy data comes from
