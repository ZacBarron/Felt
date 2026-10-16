# Play

Play is a full table against bots. You play whole hands, from the deal to showdown. Afterwards a recap grades every decision Suited can grade honestly and says which ones it cannot. It has its own tab between Train and You.

Drills train one decision at a time. Play trains the same decisions in the order a real hand brings them, with the stack, the pot and the players left in the hand all changing as you go.

## The table

Play works like sitting down in an online cash game.

- **Lobby**: pick a table (full ring, home game, online 6 max, deep 6 max or heads up) and a buy in.
- **Continuous play**: hands are dealt one after another. Stacks carry over. Bots that get short top up and bots that bust rebuy, as online. If you bust you choose to add chips.
- **Controls**: Fold, Check or Call, and Bet or Raise with Min, pot shares (multiples of the blind preflop) and All in, plus a slider. While waiting you can tick Check/fold, Check or Call any, as in an online client.
- **Quiet grading**: the table never stops for a recap. Last hand opens the hand history and its grades, and its dot marks a mistake. Grades after each hand is an opt in.
- **Skip clear folds**: a hand is folded for you only when the chart folds it 100% from your seat in that spot. It still plays out, so the blinds you lose count. A hand the chart plays even 1% of the time is always dealt.
- **The session** survives switching tabs. Stacks and totals are saved on the device, so a reload sits you back down. A hand in progress restarts, like a reconnect.

## Bots

Each bot is a character with a name, a drawn portrait, a style and a rating, the way chess apps present their bots. Two rules keep it honest (CLAUDE.md: no fake competitors):

1. **Always clearly a bot.** A "Bot" tag sits on every seat. No photos, and nothing that suggests a real person or a live table.
2. **The rating is measured, not set by hand.** Suited grades the bot's own decisions with the same grader the player gets, over many seeded hands. Then it converts the result to the Suited Rating scale. The bot card says how many decisions the rating rests on. The rating is measured again whenever the bot or the grader changes.

A bot is built from two settings:

- **Style** comes from the archetypes in `packages/content/src/exploits.ts` (calling station, nit, maniac, solid regular and more). It decides which mistakes the bot makes, for example calling too much or folding too much to aggression.
- **Strength** decides how far the bot strays from the baseline. Low strength makes the style's mistakes often and by a lot. High strength sticks close to the baseline.

The baseline is the chart preflop and the solver strategy postflop wherever a solve exists. Elsewhere it follows a rule based policy: equity against the range the bot puts you on, the price, the SPR and the board texture. Bots that use the rule based policy carry an "approximate" label until solved packs cover their spots.

## Grading

Every decision lands in one of three tiers. The recap shows the tier next to each grade.

### 1. Solver graded (heads up)

Grades come from Suited Solver (`core/src/solver.ts`), with exploitability reported on every solve as the solver rules require.

| Street | How | Measured cost |
| --- | --- | --- |
| Preflop | The chart for the spot, graded by mix distance | Instant |
| River | Solved live in a Web Worker | About 1 second to 0.5% exploitability (BTN vs BB, 100bb) |
| Turn | Solved in the background with one bet size per player. Ready in the recap | About 40 seconds to 0.5%. The full set of sizes took over 4 minutes and was still at 2.4% |
| Flop | From a solved pack (roadmap: first postflop pack). An exact match up to suit isomorphism is exact. A nearest texture match is labelled approximate | A live flop solve with real ranges ran out of memory. It needs the pack, or suit isomorphism plus a WASM build |

A grade shows the EV of every option at that node: check, each bet or raise size, call and fold. That turns sizing into a number, for example "75% lost 0.4bb against 33%". Play's size buttons are the solver's sizes, so most choices land on the tree. A custom size is graded as the nearest size in the tree, and the recap says so.

The ranges for each solve come from the hand's own action: the charts preflop, then each street's solved strategy. A spot whose action leaves the solved tree falls back to tier 2.

### 2. Graded against this bot

In Play, Suited knows each bot's exact strategy. So it knows the bot's real range at every point of the hand.

- **River calls and folds**: exact. EV of a call is your equity against the hands this bot bets with here, times the final pot, minus the price.
- **Earlier calls and folds**: equity based. EV of a call is your equity against the bot's range now, times the pot after the call, minus the price. The recap says this leaves out how the rest of the hand would play.
- **Multiway pots**: the same method against every live player's range. No solver handles multiway spots well, so this is the main grade there.

Where tiers 1 and 2 both apply, the recap shows both: what the solver does, and what beats this player. The gap between them is the Exploitation track in practice.

### 3. Coaching notes, never graded

Some feedback has no exact answer in the model. It shows as a tip, never as a grade:

- SPR and commitment: the stack is committed when the pot is this big.
- Geometric sizing: the bet that gets all in by the river.
- Multiway: bet less often with more players in the pot.
- Board and range: whose range this board favours.

### What feeds the rating

Only tiers 1 and 2 feed the Suited Rating, in the rating's postflop area. Tier 3 never does. Chips won never do, because a session's result is mostly luck (see the variance lessons).

## Recap

- The headline is decision quality: decisions graded, EV lost in bb, and the biggest leak.
- bb won shows smaller and is labelled "mostly luck over a few hundred hands".
- Each graded mistake can go to Review as a card, the way Practice and Daily do.
- "Ask the coach" on any hand passes the hand history and its grades to the coach.

## Engine

The engine lives in `packages/core` as pure TypeScript, with unit tests for every function:

- A hand state machine: blinds and antes, betting rounds, minimum raises, all ins and side pots, showdown with `evaluator.ts`.
- Seeded dealing, so a hand can be replayed and a bot's rating measured again exactly.
- The bot policy interface: given the state and the bot's settings, return a mix over legal actions. Bots sample from the mix, so mixed strategies stay mixed.
- Grading helpers for tier 2: equity against a known range with `equity.ts`.

## What ships first

- Preflop: graded by the chart when the spot matches what the chart assumes (no callers before you, about a 2.5bb open, 60 to 150bb stacks, 3 to 9 players). Seats match charts by the players behind them. Other preflop spots say why they are not graded.
- Calls and folds after the flop: graded against the bots' real ranges (tier 2). Only exact river calls against one bot, with no one left to act, count toward the rating, in the exploit area.
- Bets, raises and checks after the flop: shown as not graded until solver grading lands.
- Bots show no rating yet. A rating appears only once it has been measured.

## Build order

1. Hand engine and bots on chart preflop and rule based postflop. Grading for preflop and tier 2.
2. River grading with the live solver, then turn grading in the recap.
3. Bot ratings measured by self play.
4. Flop grading once the first postflop pack exists.
