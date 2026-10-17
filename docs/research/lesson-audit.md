# Lesson audit: spots, seats and pot types

This audit counts what the lessons teach and what their questions ask. It ran before and after the thin spots pass. The owner's critique was that spots and questions felt stale. Lessons leaned on the button, UTG and the big blind. 3bet pots, 4bet pots and defense were thin.

## How it is counted

The tags come from `packages/content/test/audit.ts`. Run `AUDIT=1 pnpm --filter @felt/content exec vitest run test/lesson-audit.test.ts` to print the tables. `lesson-audit.test.ts` keeps floors on the thin spots so they stay covered.

- Each question is tagged from its own words and cards, not its explanation. Explanations often name other seats for contrast.
- A question can name several seats and pot types.
- "Questions" counts each question once, as written.
- "With variants" also counts every other version a question can deal. The lesson page deals a random version on each visit, so these are what players actually see over replays and reviews.
- Keyword tagging is rough on purpose. It counts what a player reads.

## Totals

| | Before | After |
| --- | ---: | ---: |
| Lessons | 127 | 154 |
| Questions | 448 | 529 |
| Extra authored versions | 0 | 238 |
| Questions dealt more than one way | 0 | 181 |
| Distinct questions a seed can deal | 448 | 5,528 |

Suit shuffles count toward the last row. A shuffle deals the same cards in another of the 24 suit orders.

## Lessons by the spot they focus on

Counted from lesson titles. A lesson can count twice.

| Focus | Before | After |
| --- | ---: | ---: |
| 3bet pots (title says 3bet or squeeze) | 10 | 26 |
| 4bet pots (title says 4bet) | 1 | 5 |
| Defending an open (BB, SB, cold calls, overcalls) | 8 | 15 |
| Blind vs blind | 2 | 4 |
| Limped pots | 3 | 6 |
| Straddled pots | 1 | 4 |
| Multiway | 4 | 10 |

## Lessons and questions by topic

Only the topics that changed are listed.

| Topic | Lessons before | Lessons after | Questions before | Questions after |
| --- | ---: | ---: | ---: | ---: |
| preflop/vs-open | 5 | 9 | 16 | 28 |
| preflop/3bet-pots | 3 | 9 | 9 | 27 |
| preflop/multiway-preflop (new) | 0 | 3 | 0 | 9 |
| preflop/live-preflop | 3 | 7 | 9 | 21 |
| postflop/3bet-postflop | 2 | 8 | 5 | 23 |
| postflop/multiway | 2 | 5 | 6 | 15 |
| formats/short-handed | 3 | 4 | 12 | 15 |

## Seats named in the question

| Seat | Before | After | After, with variants |
| --- | ---: | ---: | ---: |
| UTG | 10 | 17 | 30 |
| UTG+1 | 0 | 1 | 10 |
| UTG+2 | 0 | 0 | 5 |
| LJ | 2 | 2 | 18 |
| HJ | 2 | 7 | 30 |
| CO | 12 | 26 | 58 |
| BTN | 67 | 88 | 146 |
| SB | 22 | 34 | 78 |
| BB | 86 | 102 | 160 |
| Straddle | 3 | 11 | 27 |

## Pot types

| Pot type | Before | After | After, with variants |
| --- | ---: | ---: | ---: |
| Single raised | 64 | 76 | 127 |
| 3bet | 27 | 61 | 127 |
| 4bet | 4 | 14 | 26 |
| Limped | 10 | 19 | 42 |
| Multiway | 18 | 26 | 46 |
| Straddled | 3 | 11 | 27 |
| No pot (math or concept) | 325 | 333 | 399 |

## Streets

| Street | Before | After | After, with variants |
| --- | ---: | ---: | ---: |
| Preflop | 67 | 115 | 223 |
| Flop | 64 | 89 | 155 |
| Turn | 21 | 23 | 30 |
| River | 50 | 51 | 67 |
| No street | 246 | 251 | 286 |

## Stack depth stated in the question

| Depth | Before | After | After, with variants |
| --- | ---: | ---: | ---: |
| Under 50bb | 9 | 11 | 14 |
| 50 to 99bb | 2 | 4 | 9 |
| 100bb | 6 | 16 | 32 |
| Over 100bb | 7 | 9 | 24 |
| Not stated | 424 | 489 | 688 |

## Table size stated in the question

| Table | Before | After | After, with variants |
| --- | ---: | ---: | ---: |
| Heads up | 11 | 11 | 11 |
| 6-max | 6 | 8 | 11 |
| Full ring | 2 | 2 | 7 |
| Not stated | 429 | 508 | 732 |

## What changed

27 new lessons, all with 3 questions and real exact math:

- Facing an open: the big blind against early opens, middle seats against an early open, cold calling in position, and how open size changes your defense.
- 3bet and 4bet pots: facing a 3bet out of position and in position, facing a 4bet, when the 4bet is all in, the small blind against a big blind 3bet, and the big blind against a small blind limp.
- Multiway preflop, a new topic: facing a squeeze, overcalls and cold 4bets.
- Live preflop: playing from the straddle, 3bets in straddled pots, the limp reraise and 3bets against big live opens at 100bb to 250bb.
- 3bet pots after the flop: c-betting in position as the 3bettor, the caller out of position, facing a c-bet in position, turns, low boards and 4bet pots.
- Multiway after the flop: limped pots, straddled pots and multiway 3bet pots.
- Other formats: defending at 6-max.

Variety in older questions. 108 of the 448 older questions can now be dealt more than one way. 60 of them gained 121 authored versions in all. 80 deal their cards in shuffled suits. Authored versions change the seat, the hand, the board, the size or the stack depth. Each one is checked in `variety.test.ts` against the charts, the evaluator or the core math.

## Still thin

- Turn questions grew least, from 21 to 23. River questions barely moved.
- Most questions still state no stack depth or table size. Many are math or concept questions where depth does not matter.
- UTG+2 appears only in question versions, not in any question as written.
- No full ring vs 6-max comparison questions beyond the 6-max defense lesson.
