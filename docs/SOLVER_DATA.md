# Solver Data

GTO answers are only as good as the data behind them. This doc covers where Suited's strategy data comes from, how we get solver quality data without buying a solver, and how it gets into the app.

## Current state

The starter charts in `packages/content/src/charts.ts` are hand-written approximations of widely published 100bb solutions for 9-handed and 6-handed cash. They are marked `source: 'starter-approx'` and the UI labels them. Their mixes are graded to match the shape of published solutions, with close calls opening part of the time. They are good enough to learn structure (which hands open from which seat and roughly how often) but the exact frequencies are approximations. The BTN vs limper chart is marked `basis: 'exploit'`, since limped pots have no clean GTO answer.

The Spot Lab decision demo uses illustrative numbers and says so.

## Suited Solver (built in)

Suited has its own postflop solver in `packages/core/src/solver.ts`, written from scratch so Suited owns it outright and can sell it. It runs on the phone in a Web Worker (`apps/web/src/solver/`) and in Node for batch jobs.

**What it solves.** Heads up postflop spots from the flop, turn or river: any board, any two weighted ranges, pot, effective stack, and bet and raise sizes per street and per player, with an all in option and a raise cap. Every combo is solved separately with exact card removal. Chance nodes deal every remaining card, so a turn solve is solved through all 44 to 48 rivers, not sampled.

**How.** Discounted counterfactual regret minimization (DCFR with alpha 1.5, beta 0, gamma 2), the variant modern commercial solvers use, with alternating updates. Showdowns are evaluated in linear time per node by sorting hands by strength and subtracting blocked combos card by card.

**How we know it is right.**

- **Measured accuracy.** `exploitability()` computes a best response for each player and reports how much a perfect opponent could still win, as a percent of the pot. This is the same accuracy measure commercial solvers report. The app shows it with every solve.
- **Analytic check.** A polarized river game (nuts or air against a pure bluff catcher, one pot sized bet) has a known exact answer. The solver reproduces it: bluffs are one third of bets and the defender calls exactly 50%. This is a unit test.
- **Runout check.** An all in before the river is valued by its exact runout equity (20.5% for a 9 out flush draw on the turn), also a unit test.
- **Zero sum.** The two players' EVs always add up to the pot, checked in tests.

**Speed (Node on a laptop class CPU).**

| Spot | Size | Time to 0.3% of pot |
| --- | --- | --- |
| River, narrowed ranges, 2 sizes plus raises | about 40 nodes | under a second |
| River, full preflop ranges | about 40 nodes | a few seconds |
| Turn, full BTN vs BB ranges, 2 to 3 sizes plus raises | 11,000 nodes, 490 vs 316 combos | about 2 minutes (0.25% after 300 iterations) |

Phones are slower, so the app solves rivers instantly, offers turn solves with a progress bar and a stop button, and leaves flop solves to batch jobs.

**What it does not do yet.** Multiway spots, preflop solving, suit isomorphism (which would make two tone and monotone boards several times faster), and flop solving on the phone. Next steps: isomorphism and typed array storage, a WASM build, a Node batch runner that writes solved flop packs in the normalized format below, then the preflop and push/fold solvers.

## Can we replicate a solver or download solutions?

Yes, in three ways, from most to least useful.

### 1. Open source solvers (postflop, reference only)

Suited Solver replaces these for the product. They remain useful as an independent cross check of Suited Solver on the same spot.

Free, open source postflop solvers exist and produce real equilibrium strategies:

| Solver | Notes |
| --- | --- |
| [TexasSolver](https://github.com/bupticybee/TexasSolver) | C++, has a console version we can script for batch runs. AGPL-3.0, free for personal use. |
| [desktop-postflop](https://github.com/dylan-chong/desktop-postflop) on the b-inary postflop-solver engine | Rust. AGPL-3.0. Upstream development stopped in October 2023, but the engine works. |

Plan: a batch runner (in a `tools/` folder, kept separate from the app) solves a library of spots on a laptop or a rented cloud machine, then converts each solution into Suited's node format. The phone only downloads the finished data; it never runs a solve. First pack: single raised pots BTN vs BB and CO vs BB across a representative set of flops, then 3bet pots.

Licensing note: both are AGPL-3.0, which is not compatible with selling Suited as a closed product, and outputs generated with them should not be shipped either without legal review. Suited Solver is our own code and has no such restriction.

### 2. Build our own preflop solver (preflop)

Full ring preflop solving is the expensive part. Commercial tools do it with heavy compute because every preflop line needs a postflop model. We can get close with a simplified approach in `@felt/core`:

- Preflop action tree (open, 3bet, 4bet, call, fold, and limps for live games).
- Postflop value estimated from equity times an equity realization factor by position and range, instead of solving every flop.
- Counterfactual regret minimization over that tree.

This will not match a full commercial solve exactly, but it lets us regenerate charts for any table size, stack depth, open size, straddle and rake, which a fixed downloaded chart pack never can. We validate it against well known published results before trusting it.

For tournaments, push/fold Nash ranges and ICM are small enough to compute exactly, so we will do those properly ourselves.

### 3. Enter charts you already have access to

Many training sites publish free preflop charts. You can enter any chart for personal study with the chart editor (Phase 1) using range notation, marked as `custom`. We do not copy or bundle commercial chart packs into the repo, and we do not scrape tools such as GTO Wizard, whose terms prohibit it.

## Normalized format

Every import is converted to the `StrategyNode` shape in `packages/core/src/strategy.ts`, per hand class or per combo:

```jsonc
{
  "id": "srp-btn-bb-Ks7d2c-btn-flop",
  "game": "cash",
  "tableSize": 9,
  "stackBb": 100,
  "line": "btn r2.5 bb c | Ks7d2c x",
  "hero": "BTN",
  "pot": 5.5,
  "basis": "gto",
  "source": "solver-import",
  "solver": { "name": "TexasSolver", "accuracy": "0.3% pot", "rake": "none" },
  "strategy": {
    "AhQh": [
      { "id": "check", "frequency": 0.28, "ev": 3.31 },
      { "id": "bet33", "frequency": 0.66, "ev": 3.36 }
    ]
  }
}
```

## Import pipeline

1. Solve (batch runner) or export from any solver.
2. Convert to normalized node files.
3. Validate: frequencies sum to 1 per hand, EVs present for every action, every combo covered.
4. Store small sets in `packages/content`; ship large libraries as data packs loaded into IndexedDB.
