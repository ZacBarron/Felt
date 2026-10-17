# Curriculum

The full lesson map lives in [`packages/content/src/curriculum.ts`](../packages/content/src/curriculum.ts) and renders on the Learn page. This document covers how lessons are taught.

## Tracks

0. **Poker basics**: the rules (including all in and side pots) and a first strategy (including reading the board for the nuts), for anyone who has never played. A last topic covers playing for money: stakes and buy ins, a first visit to a card room and a first bankroll. Free. The test is whether someone who knows nothing can follow it. The placement quiz skips the rules and first strategy for players who already know the game. Playing for money is practical knowledge, not a skill check. So placement leaves it out.
1. **Foundations**: poker math and range thinking. Prerequisite for everything after it.
2. **Preflop GTO**: opening, defending from every seat (big blind against early opens, middle seats, cold calls, open sizes), 3bet and 4bet pots in and out of position, facing 4bets, blind vs blind after a raise or a limp, multiway preflop (squeezes, overcalls, cold 4bets), stack depth and live preflop (straddles, limp reraises, big live opens at 100 to 250bb).
3. **Postflop GTO**: textures, c-betting, defending, check raising, turn and river play, showdown value and pot control, 3bet and 4bet pots (as the 3bettor and as the caller, in and out of position, turns, low boards, SPR), and multiway (limped, straddled and multiway 3bet pots).
4. **Exploitation**: profiling, node locking, adjustments by archetype, tells. The tells topic stays grounded: a poker face is mostly consistency, and a tell only moves a decision that is already close.
5. **Mental game and bankroll**: tilt, variance, bankroll, stop rules, study habits. Knowing when to stop also names the signs that poker has become a problem, and points the player to someone they trust or a professional.
6. **Win rate, rake and variance**: the math home for results. Win rates (bb/100, per hour in bb and money, what rake and tips cost, choosing a table), rake (how rooms take it, what it costs in bb/100, how it changes strategy) and variance (SD, sample size, downswings, risk of ruin, luck and skill). It sits right after Mental game and goes deeper than its short variance and bankroll lessons, with the same formulas. Every number uses the app's own win rate model (`winrate.ts`, `variance.ts`: presets, 27 hands an hour and SD 120 live, 75 and SD 90 online) and is recomputed in `results.test.ts`. Rake rules are arithmetic. Pot sizes, tips, pace, SD and the skill edge are labelled as assumptions or as the model. Variance pictures use the `paths` illustration: seeded sample results of players who share one true win rate, with the 95% band, always labelled as simulated. Win rates is the free topic.

Suggested order: Poker basics for new players, then Foundations math, then Preflop RFI and BB defense in parallel with Foundations ranges, then Postflop, with Exploitation and Mental game woven in once the GTO baseline is solid.

The Tournaments track covers antes, push or fold, reshoves, ICM, the bubble and final tables, then two formats: bounty events (the bounty priced as part of the pot, a labelled chip model) and satellites (ICM at its most extreme, since every seat pays the same). A second topic, Advanced tournament play, goes deeper with exact ICM from `core/src/icm.ts`: the bubble factor and risk premium, why the covering stack shoves wide and medium stacks call tight, why the medium stack suffers most, folding into a pay jump, and chip chop against ICM chop deals. Hand equities there are sampled and say "about". Ranges are stated only where Aced computes them (one blind vs blind bubble spot, solved exactly in the model). Everything else stays a labelled solver pattern, and the deals lesson says that taking a deal is a judgment call.

The Other formats track sits after Exploitation. Its heads up topic covers heads up cash and blind vs blind: the button as the small blind, the price and MDF against small raises, big blind defense and realization, blind vs blind in a full ring, wide range postflop play, and adjusting to one opponent. Aced has no 2-handed charts, so it teaches with exact math, qualitative solver patterns and one wide button range labelled as an illustration (`HU_ILLUSTRATION_RANGE` in `lessons/formats-heads-up.ts`). Every number is recomputed in `formats-heads-up.test.ts`.

Two more topics follow in Other formats. Short handed (6-max) teaches that ranges follow the players behind you, not the seat name: Aced's 6-max charts reuse the 9-handed chart with the same players behind. It covers the exact chance that someone behind holds QQ+ or AK (`chanceAnyoneHolds` in `core/src/behind.ts`), what the blinds cost per 100 hands, 3bet shares from the defense charts, and flop hit rates for wider ranges. How often it folds to a seat comes from a labelled simple model (`firstInShares`: seats independent, card removal ignored). Deep stacks covers 150 to 300bb: SPR and geometric sizes at 100bb and 200bb, set mining a 3bet, one pair hands against the parts of a defending range (exact flop equity), and preflop deep (SPR after 3bets and 4bets, 5bet bluff prices, AQo and KQo against QQ+ and AK, and how often suited hands make a straight or better). Solver patterns stay qualitative. Every number is recomputed in `formats-short-deep.test.ts`.

## Topic intros

Every topic opens with an intro in `curriculum.ts`. It says why the topic matters and when it comes up at the table. Then it lists 2 or 3 things the player will be able to do. The Learn page shows the why under each topic title. The full intro opens in a sheet, and it shows once before the first lesson of a topic the player has not started. Each track also says in one sentence why it matters. Intros promise only what the topic's lessons teach, and `intros.test.ts` checks them against VOICE.md.

## Where lessons live

Lesson content is in [`packages/content/src/lessons/`](../packages/content/src/lessons/), one file per track, keyed `track/module/lesson` to match the curriculum. Lessons added later to fill topic gaps live in `gaps-*.ts` files, appended to the end of their topic. Step kinds: `intro`, `text`, `formula`, `table`, `chart`, `hand`, `board`, `visual` (a drawn illustration: ring, bars, table, streets, ladder, chips, tree, curve, paths, cards or chart), `callout` (tip, exploit or theory), `quiz` (with optional cards, board and card faces per choice) and `takeaway`. Covers use the same illustrations. Each lesson is `core` or `advanced`.

A quiz can carry `variants` (another seat, hand, board, size or stack depth with its own answer) and `shuffleSuits` (the same cards in another suit order, only for questions that never name a suit in words). `quizVersion` in `lessons/variants.ts` picks one from a seed. The lesson page, placement, review and saved cards deal a fresh seed per visit. The daily challenge and the weekly Pro challenge seed by day or week, so everyone gets the same question. Seed 0 is the question as written. Saved progress and review cards still key on the step index, which variants never change. `variants.test.ts` checks every version, and the lesson's own tests check each variant's answer.

The thin spots pass (`preflop-defense.ts`, `preflop-3bets.ts`, `preflop-multiway.ts`, `preflop-live-more.ts`, `postflop-3bp.ts`, `postflop-multiway-more.ts`, `formats-6max-defense.ts`) teaches with exact prices, SPRs, fold shares, combo counts and equities, recomputed in `thin-spots.test.ts`. Strategy claims stay directional and labelled as solver patterns. Live reads sit in exploit callouts. `docs/research/lesson-audit.md` counts lessons and questions by seat, pot type, street and depth, before and after.

## Accuracy policy

Accuracy is the product, so lessons do not simplify a claim until it is wrong.

- **Label the evidence.** Steps that state facts carry `evidence`, shown in the app:
  - `math`: exact, from the rules or arithmetic. Every number of this kind is recomputed by the content tests with `@felt/core` (pot odds, MDF, alpha, bluff share, EV, outs, implied odds, SPR, geometric sizing, combo counts).
  - `solver`: how equilibrium strategies tend to play. Directional only, and labelled approximate until Aced's own solver packs back each claim with numbers.
  - `exploit`: an assumption about a player pool, to check against logged hands.
- **State the limits.** MDF is a river concept; raw equity is not realized equity; raise or fold small blind play is a simplification of a strategy that also limps. Lessons say so.
- **Compute, do not recall.** Range numbers (for example the share of each range with 80% or more equity on a flop) are computed from Aced's own charts, and the note under the table says how.
- **Self contained.** Lessons teach everything in Aced's own words and never send the player elsewhere to finish learning.

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
