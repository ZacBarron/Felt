# Variety audit

The owner said practice felt repetitive: the same lessons, scenarios and spots came back too often. This audit measures how repetitive each surface was, names the causes, and records the numbers again after the fix.

## How it is measured

`apps/web/test/variety.audit.test.ts` simulates real use of each surface with a seeded random source, so the numbers replay exactly. Set `VARIETY_OUT=path` to save them as JSON. The raw numbers are in [variety-audit-before.json](variety-audit-before.json) and [variety-audit-after.json](variety-audit-after.json). The before numbers come from the first version of the same script (in git history), run on the code before this work.

The player is a live 1/3 regular: 9-handed, 100bb. The simulations:

| Surface | What the script does |
| --- | --- |
| Ranges quiz | 10 sets of 10 hands in a row on one chart, then 10 sets of the new range quiz across spots in each pool |
| Practice at your level | Sessions a day apart until 100 chart decisions have come up |
| Review | 30 days of the whole daily queue at 15 new cards a day, 85% answered right |
| Daily challenge | Every day for 60 days, then a year |
| Weekly challenge | 12 weeks |
| Scenarios | 30 hands in a row, each from "Up next" |
| Lessons | Two visits in a row to every question, 20 times each, and two tries at the skip ahead quiz |

An item is a spot (table size, stack, spot type, hero seat, villain seat) plus a hand. "Repeats within 20" counts questions that repeat an item seen in the 20 before it.

## Before and after

### Ranges quiz (100 questions)

| | Before | After, one chart | After, across spots (my game) |
| --- | --- | --- | --- |
| Distinct items | 64 | 100 | 100 |
| Charts | 1 | 1 | 100 |
| Spot types | 1 | 1 | 9 |
| Hero seats | 1 | 1 | 9 |
| Repeats within 20 | 18 | 0 | 0 |
| Close calls or mixed hands | 80% | 60% | 89% |

The other pools reach more. "All stacks" covers 5 stack depths and "6-max and full ring" both table sizes. In those pools 91% of charts are derived, and each shows the Estimate tag.

### Practice at your level (100 chart decisions)

| | Before | After |
| --- | --- | --- |
| Charts | 30 | 50 |
| Spot types | 6 | 7 |
| Hero seats | 8 | 9 |
| Repeats within 20 | 1 | 0 |

### Review (30 days, about 1,000 cards)

| | Before | After |
| --- | --- | --- |
| Charts seen | 7 | 20 |
| Charts in the first week | 2 | 15 |
| Spot types | 1 | 8 |
| Hero seats | 7 | 8 |
| Neighbours from the same chart | 86% | 0% |
| Charts in the deck after 30 days | 36 | 52 |
| Same cards as the last time a card showed | 18% | 0% |

Repeats within 20 stayed near 80 in both. Those are missed cards coming back in the same session, which is how spaced repetition is meant to work.

### Daily challenge

| | Before | After |
| --- | --- | --- |
| Exact repeats in 60 days | 7 | 0 |
| Shortest gap between repeats in 60 days | 6 days | none |
| Repeats within 90 days over a year | 101 | 0 |
| Exact repeats over a year | 194 | 0 |
| Distinct decisions in 60 days | 173 of 180 | 180 of 180 |
| Same cards for everyone | No, suits were random per device | Yes |

### Weekly challenge (12 weeks, 120 decisions)

| | Before | After |
| --- | --- | --- |
| Repeats | 12 | 0 |
| Distinct river decisions | 12 of 24 | 24 of 24 |

### Scenarios (30 hands in a row)

| | Before | After |
| --- | --- | --- |
| Scenarios that exist | 12 | 12 hand written, 190 banked, and new hands dealt on the device from 910 templates |
| Distinct hands played | 12 | 30 |
| Repeats | 18 | 0 |
| Plays of the most played hand | 19 | 1 |
| Seat pairs | 8 | 23 |
| Stack depths | 1 | 5 |

The bank alone holds 71 seat pairs, all 6 board textures and 135 different hero hands.

### Lessons

| | Before | After |
| --- | --- | --- |
| Questions with more than one version | 128 of 529 | 137 of 529 |
| Average versions per question | 1.45 | 1.64 |
| Generated versions | 0 | 100 |
| A replay shows the same question, when it has versions | 37% | 0% |
| A replay shows the same question, any question | 86% | 74% |
| A skip ahead retry shows the same question | 81% | 71% |

## Causes

1. **No memory.** Nothing remembered what a player had just seen. Every surface drew at random, so a second set could deal the same hands.
2. **One chart at a time.** The Ranges quiz drew 10 hands from one chart. Variety meant switching charts by hand.
3. **Review in chart order.** New cards came chart by chart in a fixed order. A new player spent the first month on UTG and UTG+1 opens: 1 spot type and 7 charts in 30 days. The deck never grew past the 36 review charts.
4. **Daily picks with collisions.** Each day shuffled the pool with a seed from the date. Independent shuffles collide, so a decision came back after 6 days and 101 times within 90 days in a year.
5. **Short river pool.** The weekly challenge drew 2 rivers a week from 12 scenarios, so it repeated within 6 weeks.
6. **A fixed scenario list.** 12 scenarios, all 100bb and 9-handed. Once played, "Up next" offered the first one forever.
7. **Seeds that ignore the last visit.** A lesson replay picked a version at random, so a question with 2 versions repeated half the time. 401 questions had only one version.

## What changed

- **Seen memory.** `apps/web/src/state/seen.ts` keeps the last 700 things a player saw on this device (`felt.seen`): spots, hands, dealt cards, scenarios and question versions. It falls back to memory when storage is blocked.
- **Novelty sampler.** `packages/core/src/novelty.ts` (pure, tested): `noveltyPick` picks weighted items that were not seen inside a window and spreads a set across labels like spot type, seat, stack and hand. `spreadOrder` keeps neighbours apart. `rotation` builds a fixed order that walks every item once. `dealCombo` deals fresh suits and skips recent combos.
- **Range quiz across spots.** `/quiz` (`SpotQuizPage`) deals 10 hands, each from another chart. Every spot type is equally likely whatever its chart count. Hands weigh mixed hands 4, close calls 3 and clear hands 0.5 (`drillHands` in `core/src/drills.ts`). Pools: my game, all stacks, or 6-max and full ring. Derived charts show "Estimate". The quiz never touches review or the rating. The one chart quiz now skips hands from recent sets.
- **Practice at your level** draws its chart decisions from every hand written equilibrium chart at the table size, spread across spots first. Only close calls and mixed hands count, so the rating stays fair.
- **Review.** `mixedDeck` introduces cards from 16 charts at a time across spot types, one at a time from each. Sessions keep neighbours from the same chart apart. `growDeck` adds one more hand written chart for every 30 cards in long term review. Card ids are unchanged, and a chart that has cards always stays in the deck.
- **Daily challenge.** Fixed rotations through the pool, the same for everyone. Mixed hands rotate across spot types, opening edges across seats, and the last decision across seats within its spot type of the day. A decision comes back only after its whole rotation: 2,158 days for mixed hands, 390 for opening edges and at least 800 for the last decision. Lesson questions rotate too, 2 a day through all 529. Cards are seeded by the day, so everyone sees the same hand.
- **Weekly challenge.** The river pool adds the 150 banked hands from hand written charts. Where one pass of a pool meets the next, the items that closed a pass move to the back, so nothing repeats within half a pool. Mixed items keep the rule that an answer on screen matches exactly.
- **Scenario generator.** See [SOLVER_DATA.md](../SOLVER_DATA.md#generated-scenarios).
- **Lesson versions.** `dealQuizSeed` shows a version other than the ones shown lately, so every version comes up before one repeats. `lessons/generated.ts` adds 100 versions to 19 questions: chart lookups on other hands from the same chart, the UTG pair ladder across all three answers, and prices and counts from other sizes. `test/generated.test.ts` checks each against the charts and the core math.

## Speed and size

- A generated hand to the river takes 3ms at the median and 7ms at the 90th percentile in Node on a laptop class CPU. Building the 910 templates takes 3ms, from chart metadata only.
- A river solve takes 71ms at the median, 163ms at the 90th percentile and 325ms at worst. Picking the hero's decision takes 7 to 50ms. Phones are a few times slower, so a fresh hand is ready in about a second.
- The bank is 190 seeds in 10 KB of source. Each replays on the device and is solved there like the hand written scenarios.
- The main bundle grew from 1,811.6 KB to 1,858.0 KB (533.4 to 549.6 KB gzipped, plus 16.2 KB). The solver worker grew from 26.4 to 29.0 KB.

## What is left

- 392 lesson questions still have one version. Most are concept questions that need versions written by hand, not generated.
- The review deck could grow from the derived charts too, labelled as estimates and unrated. It grows from hand written charts only for now.
- Generated scenarios narrate the flop and turn but do not ask about them. Turn decisions need the turn solver, which is too slow on a phone today.

## Guarding the numbers

The audit is also a test. It fails if variety drops below these floors:

| Surface | Floor |
| --- | --- |
| Ranges quiz | At most 2 repeats in 20 on one chart. Across spots: 7 or more spot types, 8 or more seats, 70 or more charts, no repeats and no same chart neighbours |
| Practice | 6 or more spot types, 50 or more charts per 100 decisions, no repeats in 20 |
| Review | 6 or more spot types, 14 or more charts in the first week, 18 or more in 30 days, at most 5% same chart neighbours, a deck that grows, fresh cards every time |
| Daily | No repeat within 90 days, none in a year, 7 spot types, 9 seats, the same cards all day |
| Weekly | No repeats in 12 weeks, 24 distinct rivers |
| Scenarios | No repeat in 30 hands, 200 or more hands, 15 or more seat pairs, all 6 textures in the bank |
| Lessons | A replay never repeats a question that has versions, 135 or more questions with versions, 80 or more generated versions |
