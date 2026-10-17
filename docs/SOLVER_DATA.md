# Solver Data

GTO answers are only as good as the data behind them. This doc covers where Aced's strategy data comes from, how we get solver quality data without buying a solver, and how it gets into the app.

## Current state

The preflop library lives in `packages/content/src/charts/`. It has two kinds of chart, and the app always says which one you are looking at.

### Hand written starter charts (`source: 'starter-approx'`)

Approximations of widely published 100bb cash solutions (2.5bb opens, 3bb from the small blind, typical online rake), written by hand with graded mixes. They are good enough to learn structure (which hands play from which seat, and roughly how often), but the exact frequencies are approximations. The UI labels them "Close to solver".

| Spot type | Coverage, 9-handed and 6-max |
| --- | --- |
| Open | Every seat, UTG to SB (SB raise only) |
| Vs open | Every seat against every earlier opener: 3bet, call or fold, the blinds included (BB vs SB too) |
| Vs 3bet | Every opener against every 3bettor: 4bet, call or fold. 3bettors that play alike share a chart (the seats in position before the button, the button, the blinds) |
| Vs 4bet | The common pairings (BB and SB vs BTN and CO, BTN vs CO, CO vs HJ, BB vs SB, BB and BTN vs LJ, BB vs UTG): 5bet all in, call or fold |
| Squeeze | BB vs BTN plus SB, BB vs CO plus a caller, SB vs CO plus BTN, BTN vs HJ plus CO, BB vs HJ plus a caller, BB vs UTG plus a caller, BTN vs LJ plus a caller. Facing a squeeze: CO, BTN and HJ opens |
| Blind vs blind | SB limp or raise, BB vs SB limp, SB limp vs BB raise (plus the raised pots under Vs open, Vs 3bet and Vs 4bet) |
| Limpers | CO, BTN, SB and BB against 1, 2 and 3 limpers: iso raise, overlimp (complete or check from the blinds) or fold. These are `basis: 'exploit'` charts for a typical live limper |

A 6-max table plays like the last six seats of a full ring (the same players behind each seat), so 6-max charts reuse the 9-handed ranges with UTG standing in for LJ. Content tests check the shape: later seats open wider, defense widens as the opener widens, the small blind 3bets or folds, squeezes are tighter than 3bets, 4bets and 5bets come only from hands that reach the spot, aces never fold.

### Derived charts (`source: 'model-approx'`)

Variants for other stack depths and open sizes, made by a documented rule in `packages/core/src/chartModel.ts` from the starter chart of the same spot. Each one names the chart it comes from and what changed, and the UI labels it "Estimate". They are never presented as a solve, and Play grades against them without feeding the Aced Rating.

| Family | Variants |
| --- | --- |
| Open, Vs open, Vs 3bet | Stacks 40, 60, 100, 150 and 200bb times opens of 2.5, 3, 4 and 5bb |
| Squeeze, facing a squeeze | Every stack, 2.5bb opens |
| Vs 4bet | 150 and 200bb (at 60bb and less a 4bet is all in, so the 3bet answer charts cover it) |
| Straddle | Opens in a straddled pot at 100, 150 and 200bb with opens of 2.5 and 3 straddles, from the opening chart of the seat with the same players behind |

The rule, in two steps:

1. **Width.** Each hand is scored by its continue frequency in the starter chart (pure hands ranked by strength above mixed ones, folded hands ranked below zero by strength and playability). A tilt favours pairs and suited connectors deep and high cards short. One threshold moves until the range holds the target share of combos, in 5% steps. Premiums the starter chart always plays are never cut.
2. **Split.** Each continuing hand keeps the starter chart's raise share, then an aggression shift moves high card calls to raises at short stacks (a 4bet at 40bb is all in) or moderate raises to calls at deep stacks. Facing a bigger open, 3bets fall with the square root of the defense width, so the cut comes mostly from flats.

The anchors (in `STACK_RULES` and `openSizeRule`) are model choices that follow the direction of published results: bigger opens come from tighter ranges (width times (2.5 / size) to the power 0.38), defense against a bigger open falls faster for the big blind (power 0.75) than for the small blind (0.6) or a player in position (0.5), and so on. Their sizes are rough. Unit tests check the direction and the arithmetic, not that the numbers match a solve. A real preflop solver (below) would replace this rule.

### Picking a chart

`closestCharts` and `chartFit` in `packages/core/src/chartPick.ts` find the chart nearest a game: the nearest table size, then the nearest stack and open size on a log scale. The fit says plainly which parts are approximate (table size, stack, open size). The review deck uses only the hand written charts marked for review in the player's table size, so it grows by a few dozen charts, not thousands, and saved card ids never change.

The Spot Lab decision demo uses illustrative numbers and says so.

## Aced Solver (built in)

Aced has its own postflop solver in `packages/core/src/solver.ts`, written from scratch so Aced owns it outright and can sell it. It runs on the phone in a Web Worker (`apps/web/src/solver/`) and in Node for batch jobs.

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

Aced Solver replaces these for the product. They remain useful as an independent cross check of Aced Solver on the same spot.

Free, open source postflop solvers exist and produce real equilibrium strategies:

| Solver | Notes |
| --- | --- |
| [TexasSolver](https://github.com/bupticybee/TexasSolver) | C++, has a console version we can script for batch runs. AGPL-3.0, free for personal use. |
| [desktop-postflop](https://github.com/dylan-chong/desktop-postflop) on the b-inary postflop-solver engine | Rust. AGPL-3.0. Upstream development stopped in October 2023, but the engine works. |

Plan: a batch runner (in a `tools/` folder, kept separate from the app) solves a library of spots on a laptop or a rented cloud machine, then converts each solution into Aced's node format. The phone only downloads the finished data; it never runs a solve. First pack: single raised pots BTN vs BB and CO vs BB across a representative set of flops, then 3bet pots.

Licensing note: both are AGPL-3.0, which is not compatible with selling Aced as a closed product, and outputs generated with them should not be shipped either without legal review. Aced Solver is our own code and has no such restriction.

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
