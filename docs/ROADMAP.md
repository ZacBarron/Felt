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
- [x] Brand identity: F mark painted in a 6x6 range grid, serif wordmark, Card room palette (spruce and brass), guidelines in BRAND.md, app icons, Home with a felt hero, up next hand preview, mastery map, key idea and chart progress, motion (card flip, diagonal grid wave, ink painting, liquid tab pill, count ups)
- [x] UI pass: press states on every control, haptics (Android vibration, iOS switch tick), thumb zone answer buttons, focus mode for review, animated verdicts and score rings, settings with segmented controls, steppers and toggles, keyboard shortcuts on laptops
- [x] Lesson player: one idea per screen (text, formulas, tables, charts, hands on felt, callouts, quick checks, takeaways), story style progress, swipe and keyboard navigation, resume where you left off, completion with practice links
- [x] 11 lessons: pot odds, MDF and alpha, combos and blockers, outs, equity realization, early and late position opens, small blind, big blind defense, live pool tendencies, punishing limpers (quiz answers tested against the charts)
- [x] Themes: Card room (brand default), Ink, Oxblood, Cobalt
- [x] 29 lessons across foundations (EV and indifference, implied odds, SPR and geometric sizing, range vs range, range and nut advantage, range shapes), postflop (textures, c-betting in position, sizing, defending c-bets, check raising, turn cards, bluff selection, bluff catching) and exploitation (node locking, stations, nits, sizing tells)
- [x] Accuracy pass: every lesson claim labelled exact math, solver pattern (approximate) or pool tendency; every math number recomputed in tests; range numbers computed from Felt's charts
- [x] Full curriculum: 70 lessons across foundations and game theory, preflop (including live preflop), postflop (river play, 3bet pots, multiway), exploitation, mental game and study, and tournaments; every lesson has at least two quiz questions
- [x] Topic intros: why each topic matters and when it comes up at the table, on Learn and once before a topic's first lesson
- [ ] Chart editor: enter or paste any chart (range notation) as a `custom` source

## Product: onboarding, placement and Felt Pro (done)

See [MONETIZATION.md](MONETIZATION.md).

- [x] Onboarding: goal, game, focus, daily study time, study cue, placement, a personal plan with free and Pro dates, and a hold to start pledge with a calendar reminder
- [x] Placement test that walks the core path and marks known lessons as tested out, with a per topic undo
- [x] Test out of any module; a miss expands into the full lesson
- [x] Path ordering: in progress, then placement module, then focus areas
- [x] Today leads with the next lesson in the plan and a three task plan (lesson, review, daily challenge)
- [x] Felt Pro paywall with plan cards, trial timeline and honest fine print; free tier is the first module of every track
- [x] Onboarding v2: welcome with the Newcomer to Elite ladder and real content counts, a reply to each answer, a target tier, a first hand before any commitment, cited reasons Felt works, basics first for new players, and a Day 1 moment after the pledge
- [ ] Testimonials: add real quotes from test players to `TESTIMONIALS` in `packages/content/src/onboarding.ts` (with permission)
- [x] Developer switch for Pro, onboarding replay and progress reset
- [x] Paywall v2 on one phone screen, Restore purchases that always answers (signed out, found, not found, server down), Unlock Felt Pro for testing in Settings and `PRO_FOR_EVERYONE` on the server
- [x] Paywall v3: felt hero with real Pro lessons, Free vs Pro table, trial timeline (patterns from Mobbin)
- [x] Reminders by push: the daily study reminder from the Today card, and a trial reminder 2 days before a free week ends (switch on the paywall, on by default, sent once)
- [x] Log out reliably; create a new account or continue without one from the signed out screen
- [x] Saves: bookmark any lesson screen or solver hand; a Saved page with notes; every save becomes a review card (quizzes graded, other screens as self graded flashcards, solver hands graded against the solver's mix), plus a saved only review session
- [x] Felt Rating: Glicko rating overall and per area from every graded answer, provisional until settled, tiers, history (see ENGAGEMENT.md)
- [x] Win rate model: rake and tips per player from the rake rules, skill edge from rating against the table, 95% range, Bayesian blend with entered results
- [x] Daily challenge: five decisions, the same for everyone, harder as it goes, saved after every answer, rated, a decision list that adds misses to review, and a shareable spoiler free grid
- [x] Weekly Pro challenge: 10 harder decisions per ISO week, the same for every Pro player, balanced across math, mixed hands, close calls, solver graded rivers and advanced questions, harder as it goes, mixes graded by mix distance, one attempt, rated, personal bests against earlier weeks, misses to review, a share grid, a card on Today for Pro players
- [x] Streaks with freezes: one to start, one earned every seven days in a row
- [x] Research brief with verified sources (docs/research/sources.md)
- [x] Tiers every 150 points (nine tiers, Newcomer to Elite, none while provisional) with progress to the next
- [x] Levels of thinking: each tier names the question its players ask and what Felt rates there; Your tier card on You with points and right answers to the next tier (from the update rule), the full ladder in a sheet, and the question in the tier moment
- [x] Imports: hand histories (PokerStars format, GGPoker header, tracker exports) and live session CSVs; stats by seat, opening leaks against the charts, results feeding the win rate
- [x] Practice at your level (about 80% expected success, weaker areas first, interleaved); study cue at onboarding
- [x] More preflop charts: BB vs CO and UTG, SB vs BTN, BTN vs CO, BTN and UTG facing a 3bet (with reach, so only opened hands are drilled), BTN vs two limpers
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

## Before launch

- [ ] Turn on push on the live server: set the 3 VAPID values on Render (see DEPLOY.md). Reminders and the trial reminder stay off until then.
- [ ] Turn on billing (Stripe keys and prices) and email codes (Resend)
- [ ] Turn off `PRO_FOR_EVERYONE` and remove the Pro testing switch from Settings

## Phase 2: Live game essentials

- [x] Session tracker: one tap start and stop, stakes, buy ins, cash out, venue, notes
- [ ] Fast hand entry on a phone: card picker, seat chips, action shorthand parser, money amounts
- [ ] Hand replayer on the table component; flag a hand to open it in Spot Lab
- [ ] Results: profit in money and bb, bb/hour, profit graph, variance bands
- [ ] Live charts: iso raise and overlimp from every seat (BTN vs one and two limpers done), facing large live open sizes, straddled pots, 150 to 200bb stacks
- [ ] Live pool exploits track: lessons and drills on limpers, multiway, big river bets
- [ ] Rake aware preflop: show how the rake setting tightens calling ranges

## Phase 3: Solver data we generate ourselves

See [SOLVER_DATA.md](SOLVER_DATA.md).

- [x] Felt Solver: heads up postflop DCFR solver in `@felt/core`, per combo with exact card removal, measured exploitability, validated against an analytic river game
- [x] Solver screen: example spots free, custom spots with Pro, runs in a Web Worker, browse the tree with per hand class strategies
- [ ] Suit isomorphism and a WASM build for faster turn and flop solves

- [ ] Normalized node format and import validator
- [ ] Batch runner for Felt Solver on a laptop or cloud machine
- [ ] First postflop pack: single raised pots BTN vs BB and CO vs BB across a representative flop set
- [ ] Simplified preflop solver in `@felt/core` to regenerate charts for any table size, stack depth, open size and rake
- [ ] Data packs downloaded into the app, so the phone never runs a solve

## Phase 4: Math and the Spot Lab builder

- [x] Gap lessons: hand reading, semi-bluffs, rake, reshoves, the bubble, final tables, live table basics
- [x] Second gap pass: side pots, reading the board for the nuts, showdown value and pot control, your poker face, how much to trust a tell, bounty tournaments, satellites, knowing when to stop (every number and hand claim recomputed in `gaps2.test.ts`)
- [x] Thick and thin value: a c-bet lesson on why bet size follows how far ahead you stay when called, not board wetness, with BB's equity curves against KK on 7♦5♠4♠ and 7♦3♣2♠ from Felt's charts (recomputed in `value.test.ts`). Texture, sizing and multiway lessons no longer say wet boards mean big bets
- [x] Win rate, rake and variance track: 12 lessons on bb/100 and hourly rates, the true cost of rake and tips, table selection, how rake works and what it costs, raked strategy, SD, sample size, downswings, risk of ruin, and luck and skill. New pure helpers in `core/src/variance.ts` and a seeded `paths` illustration. Every number recomputed in `results.test.ts`
- [x] Heads up and blind vs blind topic in a new Other formats track: 5 advanced lessons (heads up preflop, big blind defense, blind vs blind in a full ring, postflop with wide ranges, adjusting to one opponent). Exact math and qualitative solver patterns, no invented 2-handed charts; numbers recomputed in `formats-heads-up.test.ts`
- [x] Picture pass: every lesson has at most 2 text steps in a row, every core lesson at least 2 pictures; hand flow is a street by street walkthrough
- [x] Mixed answers in hand quizzes (frequencies and splits), graded by mix distance
- [x] Math facts deck in review: pot odds, MDF, alpha, combos, outs (exact, four choices)
- [ ] Timed math speed rounds
- [ ] Equity estimation drill (hand vs range) scored by error
- [ ] Spot Lab: build any spot (seats, stacks, actions), equity in a Web Worker
- [ ] Range vs range equity and equity distribution charts
- [x] Foundations track lessons

## Phase 5: Scenarios and challenges

- [x] Scenario engine: walk a hand tree, grade each decision by EV loss (12 river scenarios solved on device)
- [ ] Curated scenario packs per lesson; replay your own logged hands as scenarios
- [ ] Speed rounds, module boss fights (daily challenge and weekly personal bests done)
- [ ] Skill stats: EV loss trend, accuracy by position and street, mastery levels

## Phase 6: Exploitation and tells

- [x] Player archetypes and leak profiles
- [ ] Node locked comparisons: GTO vs best response to each archetype
- [ ] Opponent notes and tags from the logger, with pool stats over time
- [x] Tells library with reliability ratings

## Phase 7: Tournaments, coach and sync

- [ ] Push/fold Nash charts and ICM calculator, computed in `@felt/core`
- [x] Tournament track lessons (ICM, bubble, short stack play)
- [ ] AI hand review grounded in solver data and your leak history (Claude API)
- [x] AI coach chat for Felt Pro, using Felt's charts, your Felt Rating and recent misses (Claude API, `apps/server/src/coach.ts`, `/coach`)
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
