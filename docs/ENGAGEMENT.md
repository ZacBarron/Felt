# Measuring skill and building the habit

How Suited measures a player's ability, turns it into money at their stake, and keeps them coming back. Each decision cites the research in [research/sources.md](research/sources.md), where every source is listed with how it was verified.

## 1. Suited Rating

**What it is.** One number for overall ability plus one per area (preflop, postflop, math, exploits, theory and mindset), on a chess style scale. Code: `packages/core/src/rating.ts`, unit tested against the worked example in Glickman (1999).

**How it works.**

- Every graded answer is a game between the player and an item with a difficulty rating. The chance of a right answer is `1 / (1 + 10^((difficulty - rating) / 400))`. This is the Elo model used for learners and items in adaptive education (Pelánek 2016; Klinkenberg, Straatemeier and van der Maas 2011), and the same logistic curve as the Rasch model in item response theory (Embretson and Reise 2000).
- Uncertainty follows Glicko (Glickman 1999): a rating deviation that starts at 350, shrinks with every answer and grows again with days away (back to 350 after about 100 idle days). New players move fast and settled players slowly, the effect Pelánek et al. (2017) get with an uncertainty function for K.
- A rating with deviation above 110 is provisional: it is shown with a "~" and no tier, as Lichess marks provisional ratings. Tiers appear once the rating has settled.
- Only objective answers count: lesson quizzes, chart decisions, solver decisions, test outs, placement, the daily challenge and the weekly Pro challenge. Self graded flashcards never move the rating. An item answered again within ten minutes does not count, because that is recall from the screen, not from memory.
- Ratings are recomputed by replaying every stored answer, so item difficulties can be recalibrated later without losing history.

**Item difficulties.** Design priors for now (`DIFFICULTY` in `rating.ts`): a pure decision on the range edge 1350, a mixed hand where some answer is still wrong 1250 (more than one answer counts, so it is easier), painting a chart 1600, core lesson questions 1300, advanced 1600, decisions from saved solver spots 1450 (the player picked the spot after seeing the answer). Chart hands where every answer is accepted are not rated at all, and only equilibrium charts are rated, never exploit charts. With a server, item difficulties should be fitted from everyone's answers, exactly as player ratings are (Pelánek 2016).

**Tiers.** Nine tiers, one every 150 points: Newcomer, Beginner (900), Developing (1050), Solid (1200), Sharp (1350), Regular (1500), Strong regular (1650), Expert (1800), Elite (1950). Players start at 1200 but see no tier until the rating settles. The ladder stops at 1950 because the hardest items are rated about 1600: a rating far above every item cannot be measured, so tiers named "Pro" or "World class" would be claims Suited cannot back. Names describe skill, not status, and avoid "Pro", which is the paid plan. Chess classes are 200 points wide (USCF). 150 keeps each step meaningful, since a player one tier up is expected to win about 70% of decisions against the tier below, and puts the next milestone close enough to pull effort forward: people speed up as a goal gets near (Kivetz, Urminsky and Zheng 2006). The You page shows the points to the next tier.

**What each tier thinks about.** Each tier carries a question (`thinks`) and a line on what Suited rates near it (`skills`), in `TIERS` in `rating.ts`. The ladder follows the "levels of thinking" idea common in poker teaching: first what do I have, then what do they have, then what do they think I have. Thinking in ranges is the modern step past reading a single hand, and play close to equilibrium sits at the top. The skills lines come from the difficulty priors, so a tier names material players at that rating get right about half the time or better.

| Tier | From | Thinks | Rated near this band |
| --- | --- | --- | --- |
| Newcomer | below 900 | How does a hand play out? | Hand rankings and the order of betting |
| Beginner | 900 | What do I have? | Which starting hands to play and how strong your hand is |
| Developing | 1050 | Where am I sitting, and what does it cost to call? | Position and pot odds |
| Solid | 1200 | What might they have? | Core lessons (1300) and math facts (1250) |
| Sharp | 1350 | What range of hands could they have? | Close calls on charts (1350) |
| Regular | 1500 | How do I mix my plays so I stay hard to read? | Solver spots (1450) and river decisions (1500) |
| Strong regular | 1650 | What is this player doing wrong, and how do I profit? | Advanced lessons and painting charts (1600) |
| Expert | 1800 | What do they think I have? | Advanced questions right about 3 times in 4 (expected score 0.76) |
| Elite | 1950 | Does my whole strategy hold up against anyone? | The hardest questions right nearly 9 times in 10 (0.88) |

Suited measures answers, not thoughts. The rating is the measurement and the question is a guide, and the You page says so.

**How close is the next tier.** `tierProgress` in `rating.ts` (unit tested) returns the tier, the next tier, the points away, the progress through the tier and an estimate in answers, all from the Glicko update itself:

- One answer against an item you get right with probability E moves the rating by `step x (score - E)`, where `step = q g / (1/rd^2 + q^2 g^2 E (1 - E))`, `q = ln 10 / 400` and `g` is the item's uncertainty factor (item rd 60, g about 0.98).
- **At your level** (E = 0.5) a right answer adds `step / 2` and a miss takes the same away. So the climb is counted in right answers beyond misses. Suited replays a run of right answers through `updateRating`, against items at the current rating, until the rating reaches the next tier. Rd shrinks answer by answer exactly as it would for real. A random run with misses mixed in lands within 10% of the count in tests.
- **In practice** (E = 0.8, the `pickAdaptive` target) a right answer adds `0.2 step` and a miss costs `0.8 step`, four times as much. A player who answers exactly as expected stays put on average, at any difficulty. The rating climbs only when you beat what it expects.
- Worked example: a settled rating of 1420 with rd 45 is 80 points from Regular. Here `step` is about 11.3, so a right answer at your level adds about 5.6 points. 80 / 5.6 is 14.2, and the replay (with rd held at its floor of 45) says 15 right answers. In practice the same player gains about 2.3 per right answer and loses about 9.1 per miss. After a week away rd widens to about 103, so a right answer counts for more (about 28 points) and the count drops to 4.
- **Still settling.** A rating with rd above 110 has no tier and no estimate. Suited replays answers until rd drops to 110 and says how many that takes: from a new rating, 10 answers at your level or 15 on easier practice questions (they tell the rating less), so the page says "about 10 to 15 more answers".
- The count is labelled as our estimate, since it depends on the questions you get.

## 2. What the rating is worth at the table

Code: `packages/core/src/winrate.ts`. Shown on the You page.

- **Costs are arithmetic.** Poker is zero sum before the house takes its share, so the average player at any table loses exactly the rake and tips per player. Suited computes this from the player's rake settings: at a live 1/3 game with 10% up to $5 plus a $1 drop, an average final pot of 20bb when a flop is seen, and a $1 tip per pot, the average player pays about 12.9 bb/100 in rake and 3.0 in tips. Rake is averaged over a spread of pot sizes, since a capped rake on the average pot overstates it, and tips are charged only on pots that see a flop. Skill persists but rake is heavy: in 456 million online hands, the previous period's top decile did 19.5 bb/100 better than the bottom decile the next period, yet still lost 23.0 bb/100 on average after rake (Potter van Loon, van den Assem and van Dolder 2015).
- **The edge is a model.** Edge before costs = `edgeScale x (2p - 1)`, where p is the expected score of the player's rating against the table's average rating. Zero at the pool's rating, symmetric, and bounded. The pool rating and scale are stated assumptions (editable on the You page), set per game until Suited has player data to fit them.
- **Uncertainty is shown.** The estimate carries a 95% range from the rating deviation and the model's own uncertainty.
- **Results take over.** Entered results are combined with the model by a normal Bayesian update: each source is weighted by its precision. Results alone are noisy (standard deviation about 120 to 140 bb/100 live, 90 online), so pinning a win rate within 5 bb/100 needs well over 100,000 hands. Suited calls results noise until their 95% range is within 10 bb/100 of the estimate, instead of a fixed hand count. The page says how much weight the results carry and which parts are arithmetic and which are model assumptions.

What Suited does not claim: the share of players who win after rake. No primary source supports the popular "about 10%" figure.

## 3. Loops

The goal is a habit built on real competence, not on points. Gamification has small average effects on learning, with only the cognitive effect holding up in rigorous studies (Sailer and Homner 2020), and contingent rewards can undermine intrinsic motivation (Deci, Koestner and Ryan 1999). So Suited's loops feed back skill, not tokens. There are no XP points.

| Loop | What the player does | What keeps it going | Grounding |
| --- | --- | --- | --- |
| Daily review | Spaced review of charts, saved items and quizzes | Due cards, FSRS scheduling | Spacing (Cepeda et al. 2006, 2008), testing effect (Roediger and Karpicke 2006), FSRS (Ye et al. 2022) |
| Daily challenge | Five decisions, the same for everyone that day: three range decisions that get harder and two lesson questions. Saved after every answer, so it cannot be replayed. The result lists each decision and adds missed hands to review | A new one every day, a result to share | Retrieval practice; shared daily puzzle format (Wordle) as a distribution loop |
| Weekly Pro challenge | Ten harder decisions, the same for every Pro player in an ISO week: 1 exact math question, 3 mixed hands where only the right mix earns full credit, 2 close calls facing a raise or 3bet, 2 river decisions graded by Suited Solver and 2 advanced lesson questions. Easiest first. One attempt, saved after every answer. The result compares accuracy with the player's own earlier weeks, adds misses to review and has a share grid. No leaderboard | A harder set each Monday and a personal best to beat | Specific, hard goals with feedback (Locke and Latham 2002); desirable difficulties and interleaving (Bjork 1994; Rohrer and Taylor 2007); comparison with your own past results, since public leaderboards can lower intrinsic motivation (Hanus and Fox 2015) |
| Today's plan | The next lesson in their plan, clearing the review, the daily challenge | Three tasks checked off by what they finished, never by minutes spent | Specific, attainable goals (Locke and Latham 2002); rewards tied to competence, not time (Deci, Koestner and Ryan 1999) |
| Streak with freezes | Study any amount each day | Loss aversion, softened: every player starts with one freeze, earns another every seven days in a row (bank of two), and each covers one missed day | Loss aversion (Kahneman and Tversky 1979); habits form with repetition, and missing one day did not materially set back habit formation (Lally et al. 2010), so one miss should not cost the streak |
| Rating | Every graded answer moves it | Visible competence, provisional to settled, tiers | Competence need in self determination theory (Ryan and Deci 2000); task focused feedback (Kluger and DeNisi 1996; Hattie and Timperley 2007) |
| Win rate | Enter results | The model turns study into money at their stake | Concrete value of skill |
| Saves | Bookmark anything interesting | It returns in review | Retrieval practice of what the player chose |
| Placement and test outs | Skip known material | Endowed progress, no repetition | Adaptive practice at the right difficulty (Klinkenberg et al. 2011 target about 75% success) |
| Practice at your level | Ten decisions picked near 80% expected success, weaker areas first, areas mixed | Always the right difficulty | Klinkenberg et al. 2011; Wilson et al. 2019; interleaving (Rohrer and Taylor 2007) |
| Study cue | Picks when they will study at onboarding; the pledge reads "When I ..., I will study", and one tap adds a daily calendar event at that time | A plan tied to an existing routine, with a cue that actually fires | Implementation intentions (Gollwitzer 1999) |

**Weekly Pro challenge.** Code: `packages/core/src/weekly.ts` (ISO week, picks, summary; unit tested) and `apps/web/src/state/weekly.ts` (pool and storage). Each spot type keeps its harder half by item difficulty and walks a seeded shuffle, so a type's pool is used up before anything repeats. Picks use the fixed difficulty priors, never a device's fitted values, so every Pro player gets the same set. Range decisions always offer mixed answers and are graded by mix distance (`scoreMixAnswer`), whatever the player's setting. Mixed hands are chosen so the main action alone is not full credit and an answer on screen is. River decisions use the same EV loss grades as Scenarios, solved on the device with the exploitability shown. Every answer is objective, so each one goes to the Suited Rating. It is a Pro event because it draws on Pro depth (advanced lessons and the solver); free players see what it is in More and never on Today.

**Commitment at onboarding.** A chosen daily goal and a held pledge are implementation intentions in miniature (Gollwitzer 1999): when, how long and what.

**What Suited avoids.** Fake competitors or leagues without real players, fake scarcity, guilt notifications, and rewards for time spent rather than skill shown.

## 4. Real results: imports

Code: `packages/core/src/handhistory.ts`, `packages/core/src/sessions.ts`, `apps/web/src/pages/ImportPage.tsx`.

- **Hand histories.** Suited reads the PokerStars text format, which most sites write and which PokerTracker 4 and Holdem Manager 3 export. It also accepts the GGPoker header. Tests use real PokerStars hands and check that every hand conserves chips (nets add up to minus the rake). GGPoker parsing follows the same layout but has not been checked against a real GG export yet.
- **Tracker databases.** PokerTracker and Holdem Manager keep hands in a database on the player's computer, which a web app cannot open. Players export hands as text and import the files. Nothing leaves the device.
- **Live sessions.** Any CSV with a date, a session length and a result (or buy in and cash out) imports, with columns found by their headers.
- **What imports drive.** Win rate by seat, VPIP, PFR, 3bet, went to showdown, won at showdown, flop c-bet, fold to 3bet and postflop aggression, filterable by stakes; first in decisions compared with the opening charts, flagged only outside mixes and drillable in review; and the results that feed the win rate estimate. Until the 95% range of the results is within 10 bb/100, Suited says the sample is mostly luck. Opening rates by seat are compared with the chart's rate, with a binomial range, and only cash hands at 60bb or deeper, six or more players and no straddle are compared with the charts.

## 5. Next, needing a server

1. **Item calibration** from all players' answers, and then the pool ratings in the win rate model from real players at each stake.
2. **Leagues and friends**: weekly groups ranked by rating gained, only with real players. Duolingo reports leagues and streak mechanics among its main retention levers (company sources in the brief).
3. **Push reminders** at the time the player chose, with a streak saver. Today Suited offers calendar events (.ics) for the study time and for two days before a trial ends, which need no server.
4. **Global daily challenge stats**: how everyone did on today's five.

Adaptive difficulty already ships without a server: Practice picks items near 80% expected success from the rating model (Klinkenberg et al. 2011; Wilson et al. 2019 derive about 85% for model learners).

## Measurement

Suited logs events to a local table on the device (`apps/web/src/state/events.ts`): onboarding steps, placement, plan commitment, paywall views, plan choice and purchase results, and daily challenge starts and finishes. Nothing is sent anywhere; developer mode can export the log. Metrics to watch once events can be collected with consent: first lesson within 24 hours, D1, D7 and D30 retention, share of days the plan is done, paywall to trial, trial to paid, day 0 cancellations, and rating gained per active week.

## 6. Monetization context

Duolingo, the reference freemium learning app, reported 58.7M daily active users and 12.7M paid subscribers in Q2 2026, with subscribers 9.2% of monthly actives at the end of 2025 (company sources). Its model is a generous free tier with a habit loop, and paid features that add depth. Suited follows the same shape: the daily challenge, review, placement and the first module of every track are free; depth (every lesson, the solver on any spot) is Pro. See [MONETIZATION.md](MONETIZATION.md).
