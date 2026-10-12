# Curriculum

The full lesson map lives in [`packages/content/src/curriculum.ts`](../packages/content/src/curriculum.ts) and renders on the Learn page. This document covers how lessons are taught.

## Tracks

1. **Foundations**: poker math and range thinking. Prerequisite for everything.
2. **Preflop GTO**: opening, defending, 3bet and 4bet pots, blind vs blind, stack depth.
3. **Postflop GTO**: textures, c-betting, defending, check raising, turn and river play, multiway.
4. **Exploitation**: profiling, node locking, adjustments by archetype, tells.
5. **Mental game and bankroll**: tilt, variance, bankroll, study habits.

Suggested order: Foundations math, then Preflop RFI and BB defense in parallel with Foundations ranges, then Postflop, with Exploitation and Mental game woven in once the GTO baseline is solid.

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
