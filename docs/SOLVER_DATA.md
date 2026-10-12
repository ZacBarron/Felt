# Solver Data

GTO answers are only as good as the data behind them. This doc covers where Felt's strategy data comes from and how it gets in.

## Current state

The starter preflop charts in `packages/content/src/charts.ts` are hand-written approximations of widely published 6-max 100bb solutions. They are marked `source: 'starter-approx'` and the UI labels them. They are good enough to start drilling structure (which hands open where) but not for fine frequencies.

The Spot Lab decision demo uses illustrative numbers and says so.

## Sources (Phase 5)

| Source | What it gives | Notes |
| --- | --- | --- |
| Your own solver (PioSolver, GTO+) | Exact preflop and postflop nodes for the spots you care about | Best option. Export node strategies and EVs to CSV/JSON and import |
| TexasSolver (open source) | Postflop solves we can run ourselves in batch | Free; useful for building an aggregate flop library. Check its license before bundling outputs |
| Published charts you have rights to | Preflop ranges | Enter via range notation as `custom` source |

Do not scrape commercial tools such as GTO Wizard; their terms prohibit it. If you have a subscription, use it alongside Felt and enter the spots you study as custom nodes.

## Normalized format

Every import is converted to the `StrategyNode` shape in `packages/core/src/strategy.ts`, per hand class or per combo:

```jsonc
{
  "id": "srp-btn-bb-Ks7d2c-btn-flop",
  "format": "6-max cash, 100bb",
  "line": "btn r2.5 bb c | Ks7d2c x",
  "hero": "BTN",
  "pot": 5.5,
  "source": "solver-import",
  "solver": { "name": "GTO+", "accuracy": "0.3% pot", "rake": "none" },
  "strategy": {
    "AhQh": [
      { "id": "check", "frequency": 0.28, "ev": 3.31 },
      { "id": "bet33", "frequency": 0.66, "ev": 3.36 }
    ]
  }
}
```

## Import pipeline

1. Export from the solver (CSV or JSON per node).
2. Run an importer script per solver format that outputs normalized node files.
3. Validate: frequencies sum to 1 per hand, EVs present for every action, every combo covered.
4. Store in `packages/content` (small sets) or as downloadable packs loaded into IndexedDB (large libraries).
