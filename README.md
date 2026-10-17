# Aced

*Ace every spot.*

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

Built for live 1/3 cash, 9 handed, on a phone first, with settings for any stakes, table size (2 to 10), format and rake.

Working now: the poker engine, game settings and presets, starter 9 handed and 6 handed charts, a daily spaced repetition review (quick recall and range painting drills), free practice, a Today page with streak and accuracy, the Ranges viewer, the Spot Lab, and an installable offline phone app. Next up: the live session and hand logger (Phase 2) and generating our own solver data (Phase 3). See the [roadmap](docs/ROADMAP.md).

### Install on your phone

Deploy the built app (`pnpm build` outputs `apps/web/dist`) to any static host; Vercel and Netlify configs are included. Open it in Safari or Chrome and choose "Add to Home Screen". It works offline and your study data stays on the device, with a backup file in Settings. See [docs/DEPLOY.md](docs/DEPLOY.md) for testing, deploying and what a server would add.

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
packages/core      poker engine: cards, evaluator, ranges, equity, pot math, grading, FSRS, settings, drills
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
- [BRAND.md](docs/BRAND.md): logo, color, type, motion and voice
- [SOLVER_DATA.md](docs/SOLVER_DATA.md): where strategy data comes from, and how we generate it without buying a solver
