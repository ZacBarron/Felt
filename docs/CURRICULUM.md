# Curriculum

The full lesson map lives in [`packages/content/src/curriculum.ts`](../packages/content/src/curriculum.ts) and renders on the Learn page. This document covers how lessons are taught.

## Tracks

1. **Foundations**: poker math and range thinking. Prerequisite for everything.
2. **Preflop GTO**: opening, defending, 3bet and 4bet pots, blind vs blind, stack depth.
3. **Postflop GTO**: textures, c-betting, defending, check raising, turn and river play, multiway.
4. **Exploitation**: profiling, node locking, adjustments by archetype, tells.
5. **Mental game and bankroll**: tilt, variance, bankroll, study habits.

Suggested order: Foundations math, then Preflop RFI and BB defense in parallel with Foundations ranges, then Postflop, with Exploitation and Mental game woven in once the GTO baseline is solid.

## Where lessons live

Lesson content is in [`packages/content/src/lessons/`](../packages/content/src/lessons/), one file per track, keyed `track/module/lesson` to match the curriculum. Step kinds: `intro`, `text`, `formula`, `table`, `chart`, `hand`, `board`, `callout` (tip, exploit or theory), `quiz` and `takeaway`. Each lesson is `core` or `advanced`.

## Accuracy policy

Accuracy is the product, so lessons do not simplify a claim until it is wrong.

- **Label the evidence.** Steps that state facts carry `evidence`, shown in the app:
  - `math`: exact, from the rules or arithmetic. Every number of this kind is recomputed by the content tests with `@felt/core` (pot odds, MDF, alpha, bluff share, EV, outs, implied odds, SPR, geometric sizing, combo counts).
  - `solver`: how equilibrium strategies tend to play. Directional only, and labelled approximate until Felt's own solver packs back each claim with numbers.
  - `exploit`: an assumption about a player pool, to check against logged hands.
- **State the limits.** MDF is a river concept; raw equity is not realized equity; raise or fold small blind play is a simplification of a strategy that also limps. Lessons say so.
- **Compute, do not recall.** Range numbers (for example the share of each range with 80% or more equity on a flop) are computed from Felt's own charts, and the note under the table says how.
- **Self contained.** Lessons teach everything in Felt's own words and never send the player elsewhere to finish learning.

## Placement and test outs

Players skip what they know by answering questions taken from the lessons. Every lesson needs at least two `quiz` steps for this, and its last quiz should check the lesson's main idea. See [MONETIZATION.md](MONETIZATION.md) for how placement and test outs work.

## Lesson anatomy

Every lesson follows the same shape so study sessions feel predictable:

1. **One idea**, stated in a sentence.
2. **The visual**: a grid, a table spot, a frequency bar, or an equity chart.
3. **Worked example** with the numbers shown.
4. **Why the solver does it**: range advantage, nut advantage, equity realization, blockers, SPR.
5. **Common mistakes** and how they cost EV.
6. **Drills**: 5 to 15 cards that enter spaced review immediately.

Target length: 3 to 7 minutes before the first drill.

## Mastery levels

Per lesson, from review and drill data:

| Level | Meaning |
| --- | --- |
| New | Not started |
| Learning | Cards in learning steps |
| Familiar | All cards reviewed at least once with 80%+ accuracy |
| Fluent | 90%+ accuracy within target time over the last 2 weeks |
| Mastered | Fluent, plus the module boss fight passed with average EV loss under the threshold |

## How preflop ranges are memorized

Memorizing 169 cells per chart by rote does not scale. Drills teach the structure:

1. **Anchors and edges.** Learn the weakest hand that opens in each family (pairs, suited aces, suited kings, offsuit broadways). The interior follows.
2. **Diffs between neighbors.** Learn HJ as "UTG plus these hands", not as a new chart.
3. **Mixed edges.** Hands at the border are where frequencies live; they get their own frequency drills.
4. **Recall, then paint.** Quick yes/no recall first, then painting full charts once the edges are solid.
