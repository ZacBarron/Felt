# Felt: Product Concept

Felt is a personal training system for getting to an elite, professional level in No Limit Hold'em. It is built for one learner first (Zac), so it optimizes for depth, speed of study, and honest measurement over mass market polish.

## The goal

Play close to GTO by default, know exactly why, and deviate on purpose when an opponent gives a reason to. Every feature should move one of three numbers:

1. **Recall**: can you produce the right range or action instantly, from memory?
2. **Decision quality**: how much EV do you give up per decision (measured in drills and scenarios)?
3. **Results**: win rate in bb/100 and per hour, tracked against variance so you know what is signal.

## Player profile

| | |
| --- | --- |
| Main game | Live cash, 1/3 NL, 9 handed |
| Also wants | Online, other stakes and table sizes, tournaments |
| Devices | About 80% phone, 20% laptop |
| Solver | None owned yet (see [SOLVER_DATA.md](SOLVER_DATA.md) for how we get solver data anyway) |

Priority order follows the main game: live full ring cash first, then online and short handed, then tournaments. Every setting (format, venue, table size from 2 to 10, stakes, straddle, ante, rake, stack depth, units) is configurable, and charts and drills follow the settings.

## Learner profile (confirmed)

| Trait | Design consequence |
| --- | --- |
| Learns best by doing, not reading | Lessons are short (3 to 7 minutes) and always end in drills |
| Visual learner | Every concept has a visual: grids, tables, frequency bars, equity charts |
| Wants to know why, not just what | Every answer shows the reasoning: EV of each option, range shape, blockers |
| Busy, studies in short blocks | Daily queue that fits 15 to 30 minutes; phone first |
| Motivated by measurable progress | Stats on everything, streaks, challenges, clear mastery levels |
| Plays live | Logger is fast enough to use between hands; tells module included |

## GTO and the live 1/3 game

GTO is the baseline: it is what you fall back on when you know nothing, and it is what makes you hard to exploit. But a 9 handed 1/3 game is far from equilibrium. Typical pool tendencies:

- Lots of limping and big, inconsistent open sizes (often 4 to 6bb).
- Multiway pots, where solver heads-up strategies apply only loosely.
- Calling too much preflop and on the flop, then often giving up to big turn and river bets.
- Under bluffing big river bets and raises, so big bets are weighted to value.
- Heavy rake relative to pot size, which punishes thin preflop calls.

So for this game the biggest win rate gains come from exploits layered on a solid GTO base. Felt marks every chart and node as `gto` or `exploit`, teaches both, and will measure your pool's actual tendencies from your logged hands.

## The training loop

Everything in the app plugs into one loop:

```
Learn  ->  Drill  ->  Apply  ->  Play  ->  Review
  ^                                          |
  +------------------------------------------+
```

- **Learn**: a short lesson on one idea, with a visual.
- **Drill**: recall it under time pressure until it is automatic. Cards enter spaced repetition.
- **Apply**: use it inside full hand scenarios graded by EV loss.
- **Play**: log real sessions and key hands with minimal effort.
- **Review**: logged hands and drill misses turn into new review cards and lesson suggestions. Leaks feed the next day's queue.

## Feature pillars

### 1. Lessons (core concepts)

A structured curriculum across five tracks: Foundations (math, range thinking), Preflop GTO, Postflop GTO, Exploitation (profiling, node locking, tells), and Mental game and bankroll. See [CURRICULUM.md](CURRICULUM.md).

Each lesson has: one idea, a visual, a worked example, a "why the solver does this" explanation, and 5 to 15 drill cards that go into review.

### 2. Spaced repetition

FSRS scheduling (the algorithm modern Anki uses), with one key difference: **no self grading**. Felt grades every review from accuracy and response time, because a range you need eight seconds to recall is not usable at the table. Card types:

- **Range recall**: paint a range on the 13x13 grid, or answer "UTG, 100bb: A9s?"
- **Spot action**: pick the action and sizing at a solver node.
- **Frequency**: estimate how often GTO takes each action ("BTN c-bet on K72r: ~65% small").
- **Math**: pot odds, MDF, alpha, combos, outs, under a timer.
- **Equity estimate**: guess hand vs range equity, scored by error.
- **Concept**: short recall prompts for principles.

### 3. Challenges

Motivation and pressure testing: daily challenge, timed speed rounds, streaks, accuracy at speed targets, and a "boss fight" that gates mastery of each module. Personal bests are tracked.

### 4. Scenario testing

Play full hands street by street. At each decision you choose an action and sizing, then see:

- The GTO mix for your hand (e.g. check 28%, bet 33% 66%, bet 75% 6%).
- The EV of every option and how much you lost.
- A grade: best, correct, inaccuracy, mistake, blunder (by EV loss as a share of the pot; any action GTO takes at a meaningful frequency counts as correct).
- The explanation: range advantage, nut advantage, blockers, equity realization.

Scenarios can be curated, randomly generated from the solver library, or built from your own logged hands.

### 5. Visual hand explorer (Spot Lab)

A table view of any spot: positions, stacks, bets, pot, board, your cards. Around it:

- Equity vs the opponent's actual range (not a single hand), with card removal applied.
- Pot odds, MDF, bluff break even, SPR.
- EV of every action and the GTO frequency split, as a bar.
- Opponent range on the grid, filtered by the actions taken so far.
- Toggle "vs GTO" and "vs this player type" to see how the best response changes.

### 6. Exploitation and tells

- **Player archetypes** (nit, TAG, LAG, calling station, maniac, and pool specific profiles) with their measurable leaks.
- **Node locking concepts**: what happens to the best strategy when an opponent over folds, over calls, or never bluffs a given line.
- **Population tendencies** for the stakes and format you play, learned from your own logs over time.
- **Tells library**: timing, sizing and physical tells, each with a reliability rating and the evidence behind it. You can attach tells and notes to real opponents.

### 7. Session and hand logging

Built to be faster than writing on paper:

- One tap session start and stop: stakes, venue, buy ins, cash out, time, and an optional mood/energy tag.
- Hand entry in under 20 seconds: tap your cards, tap position, type a short action line (e.g. `co r2.5 b c | Ks7d2c x b1.8 c | 9h x x | 2s b6 f`), tag and flag for review.
- Templates for common spots so you only fill in what changed.
- Voice note capture, transcribed and parsed later (Phase 7).
- Hand history import for online play (Phase 7).

### 8. Stats and progression

- **Results**: bb/100, bb/hour, profit graph, variance bands, by stakes and venue.
- **Skill**: accuracy and speed by topic and position, EV loss trend, retention curve, mastery per module.
- **Leak finder**: where you lose the most EV in drills and the most money in logged play, side by side.

## Principles

1. **Measure everything, trust only measurements.** No feature ships without a stat that shows whether it is working.
2. **Correct before complete.** A small set of exact solver data beats a large set of guesses. Approximate data is always labelled.
3. **Mixed strategies are first class.** Never reduce a GTO answer to one action when the solver mixes.
4. **Fast enough for the table.** Logging and quick lookups work one handed, offline, on a phone.
5. **Your data stays yours.** Local first; sync is optional.
