# Play

Play is a full table against bots. You play whole hands, from the deal to showdown. Afterwards a recap grades every decision Aced can grade honestly and says which ones it cannot. It has its own tab between Train and You.

Drills train one decision at a time. Play trains the same decisions in the order a real hand brings them, with the stack, the pot and the players left in the hand all changing as you go.

## The table

Play works like sitting down in an online cash game.

- **Lobby**: pick a table (full ring, home game, online 6 max, deep 6 max or heads up) and a buy in, or one of your own tables (see Custom tables).
- **Continuous play**: hands are dealt one after another. Stacks carry over. Bots that get short top up and bots that bust rebuy, as online. If you bust you choose to add chips.
- **Controls**: Fold, Check or Call, and Bet or Raise with Min, your open (plus 1bb per limper, in straddles when there is one), multiples of the raise, a third, half, three quarters or all of the pot after the flop, and All in. A slider and minus and plus buttons fine tune the size. While waiting you can tick Check/fold, Check or Call any, as in an online client.
- **Quiet grading**: the table never stops for a recap. Last hand opens the hand history and its grades, and its dot marks a mistake. Grades after each hand is an opt in.
- **After you fold**: the next hand is dealt at once by default. The rest of the folded hand plays out off screen with the same bots and draws, and is booked in full: your stats, the bots' stacks and Last hand (with the board and any showdown) are the same as if you had watched. Table settings, After you fold, Watch the hand keeps the old way.
- **Skip clear folds**: a hand is folded for you only when folding it is clearly right. It asks the same question as the grade. An exact chart match skips hands the chart folds 100% of the time. A chart that only roughly fits (a live size open, callers, deep or short stacks) skips hands it folds 100% of the time that are not close calls, since those changes make the spot tighter or barely move its edge. A spot no chart covers (3 or more limpers, a 3bet, heads up, a straddle) skips hands the approximate range folds that sit at least 8% of hands past its edge. A hand the strategy plays even part of the time is always dealt. Skipped hands still play out, so the blinds you lose count, and the header says how many were skipped.

  The first version skipped only exact chart matches. Against bots that open 4 or 5bb, limp and 3bet, it skipped only about half of the hands a player folds for sure at the live tables, and none heads up. Now it skips about 9 in 10 of them. A test now plays 400 random spots and checks every skipped hand is one the grade calls a best fold.
- **The session** survives switching tabs. Stacks and totals are saved on the device, so a reload sits you back down. A hand in progress restarts, like a reconnect.
- **Leaving**: Leave sits top left at all times. With no hand in progress it leaves at once. With cards in a hand it asks first and says what happens: the hand is folded (chips already in the pot count as lost) and your stack is saved. Play now in the lobby then offers that table with the saved stack. The table is its own page (`/play/seat`), so the back gesture leaves it the same way, with the same confirm. The tab bar stays hidden at the table to give the felt room. Tapping Play from anywhere else in the app (after Ask the coach, say) takes you back to your seat.
- **Bots on the table**: tap a bot's seat to see its card: its portrait, its player type, how it plays and a link to the player types in Exploits.

### Simple and Full

The table has two layouts with the same engine, grades and stats. Simple is the default for players who told onboarding they are new or play for fun (`tableLayout` in `state/playTable.ts`). Regulars start on Full. Table settings, Layout switches between them, and the choice carries over.

- **Simple**: Fold, Check or Call, and one raise at the size a coach reaches for first (your open, three times a raise, or half the pot after the flop, from `simpleSize`). More sizes shows the size chips. There is no slider and no early action boxes. One line says what is happening, such as "Sam raised to 6. It's 5 more to call." (`situationLine`). Your cards and the board are bigger, and the bots' seat labels are hidden.
- **What would a coach do?** Simple has a quiet hint button before the flop. It stays hidden until asked. Then it shows the chart's whole mix for your hand (or the approximate range, labelled Approximate) and where it comes from. After you act before the flop it shows the same answer for the hand you just played. A decision made after asking keeps its grade, so the stats match Full, but it never counts toward the Aced Rating, because the answer was on screen. After the flop there is no hint: there is no honest answer to give yet.
- **Full**: every size, the slider, the nudge buttons and the boxes to act early, as in an online client.

### First time at a table

The first time a player sits down, three tips point at the real table: your seat, where your buttons appear and Last hand. The first hand waits until they are closed. A tap anywhere else closes them. Settings, Show the tour again brings them back.

### Your open size

Settings has **Your open** (Game and stakes, also in the table menu). It defaults to the 2.5bb the charts assume. Live players often set 4 or 5bb. Play offers it as the first raise size before the flop, plus 1bb for each limper. The Ranges page defaults to the charts for your stack and open size, and flags any chart that is not your game. Bots open like the room they sit in: 5bb at the Live 1/2 table, 4bb at the home game and 2.5bb at the online tables. Facing a live size open, Play grades the spot against the chart for that size and stack (derived by rule from the 2.5bb chart, so it is labelled approximate and not rated). Open size itself is not graded.

### Table settings

The ⋯ button (top right) opens Table settings, in five groups:

- **Layout**: Simple or Full.
- **Speed**: Bot speed (Instant, Quick or Natural), After you fold (Deal next hand or Watch the hand) and Skip clear folds.
- **Coaching**: Grades after each hand.
- **Your open size**: the same setting as in Game and stakes.
- **Table**: top up, sit out and leave (the same as the Leave button).

Settings carry over to the next table (`felt.play.settings.v1`).

### Custom tables

Create a table in the lobby builds a table of your own:

- **Seats**: 2 to 9, you included.
- **Stakes**: $1/$2, $1/$3, $2/$5, $5/$10 or plain 0.5/1bb. Amounts stay in big blinds. The stakes set the small blind (a third of the big blind at $1/$3) and show buy ins in dollars.
- **Buy in**: a smallest and a largest from 20 to 400bb. The middle is the default.
- **Straddle**: the player after the big blind posts 2bb, acts last before the flop and makes the minimum raise 4bb. Not heads up. Preflop grades in a straddled pot use the approximate range and never feed the rating, since no chart assumes a straddle.
- **Bots**: a count per player type, or Mix for a room like a live game (more loose and passive players than regulars). Each type uses its roster bots first, then stand ins that play exactly like them under their own names (`lineupBots` in `content/src/bots.ts`).
- **Their open size**: 2.5bb online, or 4 or 5bb live. Bots open to it through `botAtTable`.
- **Name**: up to 24 characters.

The form checks every field before it saves (`validateTable`). Tables are saved on this device (`felt.play.tables.v1`), up to 20. Tap a table in the lobby to sit down, edit it or delete it.

## Bots

Each bot is a character with a name, a drawn portrait, a style and a rating, the way chess apps present their bots. The portraits are pre-drawn Notionists faces from DiceBear (see BRAND.md, Bot portraits) on a disc tinted by player type, so a lineup shows its mix at a glance. Stand ins get their own faces. The player type shows on the bot's card at the table, in the lobby's buy in sheet, in Create a table and on the Exploits player types. Two rules keep it honest (CLAUDE.md: no fake competitors):

1. **Always clearly a bot.** A "Bot" tag sits on every seat. Drawn faces, never photos, and nothing that suggests a real person or a live table.
2. **The rating is measured, not set by hand.** Aced grades the bot's own decisions with the same grader the player gets, over many seeded hands. Then it converts the result to the Aced Rating scale. The bot card says how many decisions the rating rests on. The rating is measured again whenever the bot or the grader changes.

A bot is built from two settings:

- **Style** comes from the archetypes in `packages/content/src/exploits.ts` (calling station, nit, maniac, solid regular and more). It decides which mistakes the bot makes, for example calling too much or folding too much to aggression.
- **Strength** decides how far the bot strays from the baseline. Low strength makes the style's mistakes often and by a lot. High strength sticks close to the baseline.

The baseline is the chart preflop and the solver strategy postflop wherever a solve exists. Elsewhere it follows a rule based policy: equity against the range the bot puts you on, the price, the SPR and the board texture. Bots that use the rule based policy carry an "approximate" label until solved packs cover their spots.

## Grading

Every decision lands in one of three tiers. The recap shows the tier next to each grade.

### 1. Solver graded (heads up)

Grades come from Aced Solver (`core/src/solver.ts`), with exploitability reported on every solve as the solver rules require.

| Street | How | Measured cost |
| --- | --- | --- |
| Preflop | The chart for the spot, graded by mix distance | Instant |
| River | Solved live in a Web Worker | About 1 second to 0.5% exploitability (BTN vs BB, 100bb) |
| Turn | Solved in the background with one bet size per player. Ready in the recap | About 40 seconds to 0.5%. The full set of sizes took over 4 minutes and was still at 2.4% |
| Flop | From a solved pack (roadmap: first postflop pack). An exact match up to suit isomorphism is exact. A nearest texture match is labelled approximate | A live flop solve with real ranges ran out of memory. It needs the pack, or suit isomorphism plus a WASM build |

A grade shows the EV of every option at that node: check, each bet or raise size, call and fold. That turns sizing into a number, for example "75% lost 0.4bb against 33%". Play's size buttons are the solver's sizes, so most choices land on the tree. A custom size is graded as the nearest size in the tree, and the recap says so.

The ranges for each solve come from the hand's own action: the charts preflop, then each street's solved strategy. A spot whose action leaves the solved tree falls back to tier 2.

### 2. Graded against this bot

In Play, Aced knows each bot's exact strategy. So it knows the bot's real range at every point of the hand.

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

Only tiers 1 and 2 feed the Aced Rating, in the rating's postflop area. Tier 3 never does. Chips won never do, because a session's result is mostly luck (see the variance lessons).

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

- Preflop: graded by the chart for the spot (open, facing an open, a 3bet, a 4bet, a squeeze, limpers or a blind vs blind limp) at the stack and open size nearest to the hand's. Seats match charts by the players behind them: 6-max charts for 3 to 6 players, 9-handed charts for 7 to 10. A hand written chart that matches the stack and size grades the spot as a chart grade and can be rated. A derived chart, or one for another stack, size or caller seat, still grades the spot but says why it is approximate and is never rated. Spots no chart covers (two callers, a raise after limpers) fall back to the approximate range and say why.
- Calls and folds after the flop: graded against the bots' real ranges (tier 2). Only exact river calls against one bot, with no one left to act, count toward the rating, in the exploit area.
- Bets, raises and checks after the flop: shown as not graded until solver grading lands.
- Bots show no rating yet. A rating appears only once it has been measured.

## Build order

1. Hand engine and bots on chart preflop and rule based postflop. Grading for preflop and tier 2.
2. River grading with the live solver, then turn grading in the recap.
3. Bot ratings measured by self play.
4. Flop grading once the first postflop pack exists.
