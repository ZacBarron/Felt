# Roadmap

Ordered for the main game (live 1/3 cash, 9-handed, on a phone) and so the core loop (learn, drill, review) works as early as possible.

## Phase 0: Foundation (done)

- [x] pnpm monorepo: `@felt/core`, `@felt/content`, `@felt/web`
- [x] Card model, 7 card hand evaluator, range notation parser, 169 hand grid
- [x] Equity: exact enumeration and Monte Carlo vs weighted ranges with card removal
- [x] Pot math: pot odds, MDF, alpha, bluff share, call/bet/bluff EV, outs, SPR
- [x] Decision grading by EV loss with mixed strategy awareness
- [x] FSRS scheduler wrapper graded from accuracy and speed
- [x] Web shell, Ranges viewer, Spot Lab demo, curriculum map
- [x] Unit tests and CI

## Phase 1: Range trainer, spaced repetition, settings (mostly done)

- [x] Game settings: cash or tournament, live or online, 2 to 10-handed, stakes, straddle, ante, rake, stack depth, money or bb display
- [x] Presets: live 1/3 and 2/5 full ring, online 6-max, tournament 9-handed
- [x] Seat names for every table size; charts fall back to the nearest table size that has charts
- [x] Starter 9-handed charts: every open from UTG to SB, BB vs BTN, BTN vs one limper (exploit)
- [x] Local persistence with IndexedDB (Dexie): cards and review logs
- [x] Quick recall drill: seat strip, real cards, timed, full mix and chart shown after
- [x] Range painting drill: drag to paint (touch friendly), scored per combo, misses outlined
- [x] Deck built from each chart's borderline hands, then a full chart paint card
- [x] Daily review queue with FSRS and a new card limit; missed cards return in the same session
- [x] Today page: due, new, streak, accuracy, recall speed
- [x] Free practice mode that does not touch the schedule
- [x] Phone layout with a bottom tab bar; installable PWA that works offline
- [x] Liquid Glass redesign: iOS system colors, light and dark modes, glass tab bar and sidebar, large titles with a collapsing nav bar, inset grouped lists, a custom icon set
- [x] Rebrand to Suited (October 2026): the suited half of a range chart as the mark, "Poker, suited to you.", color blind friendly action colors as an option in Settings
- [x] Rename to Aced (October 2026): Suited clashed with suitedpoker.com. Tagline "Ace every spot.", domain acedpoker.app, marketing site in `apps/site`
- [x] Brand identity: F mark painted in a 6x6 range grid, serif wordmark, Card room palette (spruce and brass), guidelines in BRAND.md, app icons, Home with a felt hero, up next hand preview, mastery map, key idea and chart progress, motion (card flip, diagonal grid wave, ink painting, liquid tab pill, count ups)
- [x] UI pass: press states on every control, haptics (Android vibration, iOS switch tick), thumb zone answer buttons, focus mode for review, animated verdicts and score rings, settings with segmented controls, steppers and toggles, keyboard shortcuts on laptops
- [x] Lesson player: one idea per screen (text, formulas, tables, charts, hands on felt, callouts, quick checks, takeaways), story style progress, swipe and keyboard navigation, resume where you left off, completion with practice links
- [x] 11 lessons: pot odds, MDF and alpha, combos and blockers, outs, equity realization, early and late position opens, small blind, big blind defense, live pool tendencies, punishing limpers (quiz answers tested against the charts)
- [x] Themes: Card room (brand default), Ink, Burgundy, Cobalt
- [x] 29 lessons across foundations (EV and indifference, implied odds, SPR and geometric sizing, range vs range, range and nut advantage, range shapes), postflop (textures, c-betting in position, sizing, defending c-bets, check raising, turn cards, bluff selection, bluff catching) and exploitation (node locking, stations, nits, sizing tells)
- [x] Accuracy pass: every lesson claim labelled exact math, solver pattern (approximate) or pool tendency; every math number recomputed in tests; range numbers computed from Aced's charts
- [x] Full curriculum: 70 lessons across foundations and game theory, preflop (including live preflop), postflop (river play, 3bet pots, multiway), exploitation, mental game and study, and tournaments; every lesson has at least two quiz questions
- [x] Topic intros: why each topic matters and when it comes up at the table, on Learn and once before a topic's first lesson
- [ ] Chart editor: enter or paste any chart (range notation) as a `custom` source

## Product: onboarding, placement and Aced Pro (done)

See [MONETIZATION.md](MONETIZATION.md).

- [x] Onboarding: goal, game, focus, daily study time, study cue, placement, a personal plan with free and Pro dates, and a hold to start pledge with a calendar reminder
- [x] Placement test that walks the core path and marks known lessons as tested out, with a per topic undo
- [x] Test out of any module; a miss expands into the full lesson
- [x] Path ordering: in progress, then placement module, then focus areas
- [x] Today leads with the next lesson in the plan and a three task plan (lesson, review, daily challenge)
- [x] Aced Pro paywall with plan cards, trial timeline and honest fine print; free tier is the first module of every track
- [x] Onboarding v2: welcome with the Newcomer to Elite ladder and real content counts, a reply to each answer, a target tier, a first hand before any commitment, cited reasons Aced works, basics first for new players, and a Day 1 moment after the pledge
- [ ] Testimonials: add real quotes from test players to `TESTIMONIALS` in `packages/content/src/onboarding.ts` (with permission)
- [x] Developer switch for Pro, onboarding replay and progress reset
- [x] Paywall v2 on one phone screen, Restore purchases that always answers (signed out, found, not found, server down), Unlock Aced Pro for testing in Settings and `PRO_FOR_EVERYONE` on the server
- [x] Paywall v3: felt hero with real Pro lessons, Free vs Pro table, trial timeline (patterns from Mobbin)
- [x] Reminders by push: the daily study reminder from the Today card, and a trial reminder 2 days before a free week ends (switch on the paywall, on by default, sent once)
- [x] Log out reliably; create a new account or continue without one from the signed out screen
- [x] Saves: bookmark any lesson screen or solver hand; a Saved page with notes; every save becomes a review card (quizzes graded, other screens as self graded flashcards, solver hands graded against the solver's mix), plus a saved only review session
- [x] Aced Rating: Glicko rating overall and per area from every graded answer, provisional until settled, tiers, history (see ENGAGEMENT.md)
- [x] Win rate model: rake and tips per player from the rake rules, skill edge from rating against the table, 95% range, Bayesian blend with entered results
- [x] Daily challenge: five decisions, the same for everyone, harder as it goes, saved after every answer, rated, a decision list that adds misses to review, and a shareable spoiler free grid
- [x] Weekly Pro challenge: 10 harder decisions per ISO week, the same for every Pro player, balanced across math, mixed hands, close calls, solver graded rivers and advanced questions, harder as it goes, mixes graded by mix distance, one attempt, rated, personal bests against earlier weeks, misses to review, a share grid, a card on Today for Pro players
- [x] Streaks with freezes: one to start, one earned every seven days in a row
- [x] Share cards: a sheet with a swipeable carousel of 1080x1350 cards (rating, streak and daily challenge, on felt or paper) and page dots, then Share (the image with its text where the browser can), Copy and Save image. A rating still settling shows as "About 1180". The daily challenge also shares a spoiler free text result (`Aced Daily #312 4/5` and five squares). Every link carries the invite code
- [x] Research brief with verified sources (docs/research/sources.md)
- [x] Tiers every 150 points (nine tiers, Newcomer to Elite, none while provisional) with progress to the next
- [x] Levels of thinking: each tier names the question its players ask and what Aced rates there; Your tier card on You with points and right answers to the next tier (from the update rule), the full ladder in a sheet, and the question in the tier moment
- [x] Imports: hand histories (PokerStars format, GGPoker header, tracker exports) and live session CSVs; stats by seat, opening leaks against the charts, results feeding the win rate
- [x] Practice at your level (about 80% expected success, weaker areas first, interleaved); study cue at onboarding
- [x] Variety pass (see research/variety-audit.md): a seen memory on the device, a novelty sampler in core, a range quiz across spots with pools for my game, all stacks, and 6-max and full ring, practice from every hand written chart, review that mixes 16 charts across spot types and grows with the player, fresh suits on every card, a daily challenge on fixed rotations with no repeat within 90 days and the same cards for everyone, weekly rivers from the scenario bank with no repeats where passes meet, and lesson replays that never repeat a version while another is left. The audit test keeps the floors
- [x] More preflop charts: BB vs CO and UTG, SB vs BTN, BTN vs CO, BTN and UTG facing a 3bet (with reach, so only opened hands are drilled), BTN vs two limpers
- [x] Full preflop library (`packages/content/src/charts/`): hand written 100bb charts for every open, every seat against every opener, every opener against every 3bettor, the common 4bet pairings, squeezes and facing a squeeze, blind vs blind limps, and limpers, at 9-handed and 6-max
- [x] Derived chart variants for 40 to 200bb stacks and 2.5 to 5bb opens by a documented, tested rule (`core/src/chartModel.ts`), labelled "Estimate" and never rated; chart picking for a game with an honest fit (`core/src/chartPick.ts`)
- [x] Ranges picker by spot type (Open, Vs open, Vs 3bet, Vs 4bet, Squeeze, Blind vs blind, Limpers, Straddle), seat, stack, open size and table, defaulting to your game; a compact header so the grid and the selected hand fit on a phone
- [x] Play grades preflop against the chart for the open size and stack faced (3bets, 4bets, squeezes and blind battles too); the daily challenge rotates its hardest decision through defense, 3bet, 4bet, squeeze and blind vs blind spots, and the weekly pool takes close calls from every spot that faces action
- [ ] Replace the derived variants with output from the preflop solver below
- [x] Untimed drills and a switch for drill keyboard shortcuts; placement with "Not sure" and resume
- [x] Ranges and Drills in one place: view, paint (with 100/75/50/25% and split brushes, graded by mix distance) or quiz any chart
- [x] Charts with graded edges in 5% steps, like published solutions
- [x] Avatar with rating on Today; milestone moments for tiers and streaks; game sheet from Ranges
- [x] Poker basics track for complete beginners (rules, rankings, how a hand plays, position, starting hands, ranges, odds), skippable by placement
- [x] Playing for money in Poker basics: how stakes and buy ins work (cash games and tournaments), a first visit to a card room (the list, chips, the dealer, rake), and a first bankroll that agrees with the full bankroll lesson
- [x] Lesson illustrations drawn in the brand style for covers and visual steps
- [x] Review overview like Anki: decks (preflop charts, lesson questions, math facts, saved) with new, learning and due counts, per deck limits, session size, timer, and custom study (extra, ahead, weakest, missed today)
- [x] Import stats: flop c-bet, fold to 3bet, aggression and won at showdown, with a stakes filter
- [ ] Connect a store (App Store, Play, web checkout) to `purchase()`
- [ ] Verify GGPoker parsing against a real GG export; add Winamax and iPoker formats
- [x] Calendar reminders (.ics) for the study time and the trial end; local event log with export
- [x] Copy, accessibility (WCAG 2.2 AA pass) and visual review from simulated expert panels
- [x] Server: item calibration, real pool ratings per stake, leagues with real players, push reminders, global daily stats
- [x] Retention: Manage Pro with a reason first cancel flow and one offer per reason (yearly switch, a coupon once a year, or a pause), resume, a billing issue banner with a grace period, and the founding (lifetime) purchase with a 500 seat cap on the server (see MONETIZATION.md)
- [x] Lifecycle messages: push caps (1 a day, 4 a week), quiet hours, decay and one closing note; trial, billing, weekly digest and win-back email with opt in, one tap unsubscribe, a sunset and a holdout (see ENGAGEMENT.md)
- [x] Product analytics, cookieless and anonymous: an event dictionary with a typed `track()`, a batched queue with sendBeacon, Global Privacy Control, Do Not Track and a Share anonymous usage switch, server ingestion with an allowlist, rate limits and 13 month retention, install to account linking for revenue by first touch, server side money and message events, and A/B tests on the site (see ANALYTICS.md)
- [x] Operations console at `/admin`: charts for actives, funnels, retention, sources, revenue and quality, player search with support actions (each with a reason and an audit entry), feature flags and config, lifecycle programs, health, waitlists and CSV exports (see ADMIN.md)

## Before launch

- [ ] Turn on push on the live server: set the 3 VAPID values on Render (see DEPLOY.md). Reminders and the trial reminder stay off until then.
- [ ] Turn on billing (Stripe keys and prices) and email codes (Resend)
- [ ] Turn off `PRO_FOR_EVERYONE` and remove the Pro testing switch from Settings
- [ ] Set up the retention pieces: founding price, retention coupon, portal settings, Smart Retries, the new webhook events and `MAIL_POSTAL_ADDRESS` (see DEPLOY.md)
- [ ] A founding member buy button on the site or in the app (the seam is `purchaseLifetime()` in `state/access.ts`)
- [ ] Set `ADMIN_TOKEN` on the server, add `charge.refunded` to the Stripe webhook, and add named admins in the console (see ADMIN.md)
- [ ] Have the privacy page reviewed for Canada (PIPEDA and Quebec Law 25) and for any EU or UK traffic before running ads there (see ANALYTICS.md, Legal notes)
- [ ] Run the first two A/B tests for at least 2 full weeks each: hero daily first vs start free first, and the sticky bar on phones

## Train, Play and You

See [PLAY.md](PLAY.md).

- [x] Tabs: Today, Learn, Train, Play and You. Train is six tiles (Review, Daily challenge, Ranges, Scenarios, At your level, Weekly challenge), plus a Range quiz across spots. Study tools (Coach, Solver, Spot Lab, Exploits) sit at the end of Learn, with Glossary in its corner. More became You, with Settings in the corner and Saved under Your game
- [x] Coach where questions come up: on a missed chart decision, on a missed lesson question (as an editable draft), on Today and on every Play hand
- [x] Play engine in `@felt/core` (`play.ts`): blinds and antes, the big blind's option, minimum raises, short all ins, side pots, split pots, seeded dealing, fuzz tested
- [x] Bots (`bots.ts`): mixes over legal actions, charts preflop through the app's advisor, a measured hand strength order elsewhere (`preflopStrength.ts`), rule based postflop. Ten characters from the Exploits player types with drawn portraits and a Bot tag on every seat
- [x] Play tab as a cash table: a lobby of tables (full ring, home game, online 6 max, deep 6 max, heads up) with a buy in, hands dealt one after another with stacks that carry over, bots that top up and rebuy, think time rings, chips that slide to the pot and the winner, pre actions (Check/fold, Check, Call any), Min, pot share and All in sizes with a slider, a table menu (top up, sit out, fast bots, grades after each hand, leave), a Last hand sheet with the hand history, and a session that survives switching tabs and reloads. Skip clear folds plays out hands the chart folds every time at once
- [x] Skip clear folds that works at every table: it asks the grade's question (exact chart, chart that roughly fits, or the approximate range with room past its edge), so live opens, limpers, 3bets, straddles and heads up skip too. Tested so a skipped hand is always one the grade calls a best fold
- [x] After you fold the next hand is dealt at once and the rest plays out off screen (a setting watches it instead). The hand is booked in full for stats, the bots' stacks and Last hand
- [x] Table settings in four groups (Speed, Coaching, Your open size, Table) with the shared controls
- [x] Create a table: 2 to 9 seats, stakes ($1/$2 to $5/$10 or plain bb), a buy in range, a lineup by player type with Mix, the bots' open size (2.5bb online, 4 or 5bb live) and an optional straddle. Saved on the device (`felt.play.tables.v1`), listed in the lobby with edit and delete. The engine posts the straddle (`TableSetup.straddle`) and bots scale their opens to it
- [x] Table polish: a taller felt on phones, seats spread at the top and bottom of full tables, the full pot in the middle, finer sizing (a third of the pot, nudge buttons), a recap that leads with your cards, the result and the board, showdowns in the hand history
- [x] Recap: preflop graded by the chart where it matches the spot, calls and folds graded against the bots' real ranges (exact on the river heads up), coaching notes, decision quality first, mistakes to Review, Ask the coach
- [x] Bot portraits: pre-drawn Notionists faces (CC0, via DiceBear at build time) seeded by bot id, stand ins with their own faces, tinted by player type, on the table, lobby, buy in sheet, Create a table, Exploits and the Last hand history; tap a seat for the bot's card with its player type
- [x] Leave the table from a Leave button top left, the back gesture or the menu; a confirm while a hand is in progress (the hand is folded, the stack is saved for Play now); the table is its own page and the Play tab takes you back to your seat
- [x] Simple table layout for new and casual players: three buttons with one coach size and More sizes, one line on what is happening, bigger cards, fewer labels, and a "What would a coach do?" hint before the flop that never feeds the rating; Full for regulars, switchable in Table settings
- [x] First run tour: five coach marks on Today's main card and the tabs, skippable, then one time tips the first time at a Play table and on Ranges; Show the tour again in Settings
- [ ] River grading with the live solver, then turn grading in the recap
- [ ] Bot ratings measured by self play on the Aced Rating scale
- [ ] Flop grading from the first postflop pack

## Phase 2: Live game essentials

- [x] Session tracker: one tap start and stop, stakes, buy ins, cash out, venue, notes
- [ ] Fast hand entry on a phone: card picker, seat chips, action shorthand parser, money amounts
- [ ] Hand replayer on the table component; flag a hand to open it in Spot Lab
- [ ] Results: profit in money and bb, bb/hour, profit graph, variance bands
- [x] Live charts: iso raise and overlimp from CO, BTN and the blinds against 1, 2 and 3 limpers (exploit), facing 3bb, 4bb and 5bb opens, opens in straddled pots, 40 to 200bb stacks (derived charts, labelled as estimates)
- [ ] Iso raise charts from the earlier seats, and limped pots deeper than 100bb
- [ ] Live pool exploits track: lessons and drills on limpers, multiway, big river bets
- [ ] Rake aware preflop: show how the rake setting tightens calling ranges

## Phase 3: Solver data we generate ourselves

See [SOLVER_DATA.md](SOLVER_DATA.md).

- [x] Aced Solver: heads up postflop DCFR solver in `@felt/core`, per combo with exact card removal, measured exploitability, validated against an analytic river game
- [x] Solver screen: example spots free, custom spots with Pro, runs in a Web Worker, browse the tree with per hand class strategies
- [ ] Suit isomorphism and a WASM build for faster turn and flop solves

- [ ] Normalized node format and import validator
- [ ] Batch runner for Aced Solver on a laptop or cloud machine
- [ ] First postflop pack: single raised pots BTN vs BB and CO vs BB across a representative flop set
- [ ] Simplified preflop solver in `@felt/core` to regenerate charts for any table size, stack depth, open size and rake
- [ ] Data packs downloaded into the app, so the phone never runs a solve

## Phase 4: Math and the Spot Lab builder

- [x] Gap lessons: hand reading, semi-bluffs, rake, reshoves, the bubble, final tables, live table basics
- [x] Second gap pass: side pots, reading the board for the nuts, showdown value and pot control, your poker face, how much to trust a tell, bounty tournaments, satellites, knowing when to stop (every number and hand claim recomputed in `gaps2.test.ts`)
- [x] Thick and thin value: a c-bet lesson on why bet size follows how far ahead you stay when called, not board wetness, with BB's equity curves against KK on 7♦5♠4♠ and 7♦3♣2♠ from Aced's charts (recomputed in `value.test.ts`). Texture, sizing and multiway lessons no longer say wet boards mean big bets
- [x] Win rate, rake and variance track: 12 lessons on bb/100 and hourly rates, the true cost of rake and tips, table selection, how rake works and what it costs, raked strategy, SD, sample size, downswings, risk of ruin, and luck and skill. New pure helpers in `core/src/variance.ts` and a seeded `paths` illustration. Every number recomputed in `results.test.ts`
- [x] Heads up and blind vs blind topic in a new Other formats track: 5 advanced lessons (heads up preflop, big blind defense, blind vs blind in a full ring, postflop with wide ranges, adjusting to one opponent). Exact math and qualitative solver patterns, no invented 2-handed charts; numbers recomputed in `formats-heads-up.test.ts`
- [x] Short handed (6-max) and Deep stacks topics in Other formats: 6 advanced lessons (fewer players and wider ranges, 3bets and blind battles, postflop at 6-max, what changes deep, one pair hands deep, preflop deep). Numbers come from Aced's 6-max charts and exact math (new `core/src/behind.ts`), with solver patterns kept qualitative; recomputed in `formats-short-deep.test.ts`
- [x] Picture pass: every lesson has at most 2 text steps in a row, every core lesson at least 2 pictures; hand flow is a street by street walkthrough
- [x] Thin spots pass: 27 advanced lessons on defending opens from every seat, facing 3bets in and out of position, facing 4bets, when the 4bet is all in, blind vs blind after a raise or a limp, a new Multiway preflop topic (facing a squeeze, overcalls, cold 4bets), the straddle, 3bets in straddled pots, the limp reraise, big live opens at 100 to 250bb, 3bet and 4bet pots after the flop (c-betting as the 3bettor, the caller out of position, facing a c-bet, turns, low boards, 4bet pots), limped, straddled and multiway 3bet pots, and 6-max defense. Every number recomputed in `thin-spots.test.ts`
- [x] Question variety: seeded question versions (`variants` and `shuffleSuits`, picked by `quizVersion`) so a replay or a review card is not the same question twice. 181 questions can be dealt more than one way, with every version checked in `variants.test.ts` and `variety.test.ts`. Challenges seed by day or week so everyone still gets the same question
- [x] Lesson audit by seat, pot type, street, stack depth and table size, before and after, in `docs/research/lesson-audit.md`, with floors kept by `lesson-audit.test.ts`
- [ ] More turn and river questions in 3bet and multiway pots, and questions that state table size and depth
- [x] Generated question versions (`lessons/generated.ts`): 100 versions on 19 questions, from the charts (other hands, every answer of the UTG pair ladder) and the math (other sizes and stakes), each checked in `generated.test.ts`
- [ ] Versions for the 392 questions that still have one, written by hand where they cannot be generated
- [x] Mixed answers in hand quizzes (frequencies and splits), graded by mix distance
- [x] Math facts deck in review: pot odds, MDF, alpha, combos, outs (exact, four choices)
- [ ] Timed math speed rounds
- [ ] Equity estimation drill (hand vs range) scored by error
- [ ] Spot Lab: build any spot (seats, stacks, actions), equity in a Web Worker
- [ ] Range vs range equity and equity distribution charts
- [x] Foundations track lessons

## Phase 5: Scenarios and challenges

- [x] Scenario engine: walk a hand tree, grade each decision by EV loss (12 river scenarios solved on device)
- [x] Scenario generator: 910 heads up templates from the chart library (both table sizes, single raised and 3bet pots, 40 to 200bb, either seat), boards of six textures, a modelled flop and turn line, the river solved on the device with the exploitability shown, and a hero decision that matters. A bank of 190 checked seeds, "Deal a new hand" for fresh ones, and the hand written set inside the mix. Derived stacks are labelled estimates and never rated (see SOLVER_DATA.md)
- [ ] Generated turn decisions, once turn solves are fast enough on a phone
- [ ] Curated scenario packs per lesson; replay your own logged hands as scenarios
- [ ] Speed rounds, module boss fights (daily challenge and weekly personal bests done)
- [ ] Skill stats: EV loss trend, accuracy by position and street, mastery levels

## Phase 6: Exploitation and tells

- [x] Player archetypes and leak profiles
- [ ] Node locked comparisons: GTO vs best response to each archetype
- [ ] Opponent notes and tags from the logger, with pool stats over time
- [x] Tells library with reliability ratings

## Phase 7: Tournaments, coach and sync

- [x] ICM calculator in `@felt/core` (`icm.ts`): exact Malmuth-Harville $EV and finishing chances, all in outcomes with blinds and dead money, required equity, risk premium, bubble factor and chip chop (no UI yet)
- [ ] Push/fold Nash charts, computed in `@felt/core`
- [x] Tournament track lessons (ICM, bubble, short stack play)
- [x] Advanced tournament play topic: bubble factor and risk premium, the big stack on the bubble (with an exact one hand ICM equilibrium), short and medium stacks, folding into a pay jump and ICM deals (every number from `icm.ts`, recomputed in `tournaments-icm.test.ts`)
- [ ] AI hand review grounded in solver data and your leak history (Claude API)
- [x] AI coach chat for Aced Pro, using Aced's charts, your Aced Rating and recent misses (Claude API, `apps/server/src/coach.ts`, `/coach`)
- [ ] Voice note hand capture; online hand history import
- [x] Optional cloud sync and backup
- [x] Passkey accounts (sign up and sign in with Face ID or a fingerprint, no username), email code as the fallback, an optional email for passkey accounts
- [x] Accounts on the GitHub Pages link: CORS for listed origins and `FELT_API_URL` at build time
- [x] Deferred sign up: "Save your progress" after the plan is set, one quiet card on Today later, "Welcome back" with what came back, a clear choice when both copies have progress
- [x] Log out that saves first, with "remove from this device" for a shared phone; sessions renew on use (180 days idle)
- [ ] Manage passkeys by name on the Account page (list and remove are in the API)
- [ ] Leak driven study plans

## Decisions

| Question | Answer |
| --- | --- |
| Formats | All, live cash first |
| Main game | 1/3 NL, 9-handed |
| Solver | None owned; we generate our own data (Phase 3) |
| Devices | Both, 80% phone, so phone first |
| Learning style | Confirmed (see CONCEPT.md) |
