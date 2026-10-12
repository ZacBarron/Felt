# Measuring skill and building the habit

How Felt measures a player's ability, turns it into money at their stake, and keeps them coming back. Each decision cites the research in [research/sources.md](research/sources.md), where every source is listed with how it was verified.

## 1. Felt Rating

**What it is.** One number for overall ability plus one per area (preflop, postflop, math, exploits, theory and mindset), on a chess style scale. Code: `packages/core/src/rating.ts`, unit tested against the worked example in Glickman (1999).

**How it works.**

- Every graded answer is a game between the player and an item with a difficulty rating. The chance of a right answer is `1 / (1 + 10^((difficulty - rating) / 400))`. This is the Elo model used for learners and items in adaptive education (Pelánek 2016; Klinkenberg, Straatemeier and van der Maas 2011), and the same logistic curve as the Rasch model in item response theory (Embretson and Reise 2000).
- Uncertainty follows Glicko (Glickman 1999): a rating deviation that starts at 350, shrinks with every answer and grows again with days away (back to 350 after about 100 idle days). New players move fast and settled players slowly, the effect Pelánek et al. (2017) get with an uncertainty function for K.
- A rating with deviation above 110 is provisional: it is shown with a "~" and no tier, as Lichess marks provisional ratings. Tiers appear once the rating has settled.
- Only objective answers count: lesson quizzes, chart decisions, solver decisions, test outs, placement and the daily challenge. Self graded flashcards never move the rating. An item answered again within ten minutes does not count, because that is recall from the screen, not from memory.
- Ratings are recomputed by replaying every stored answer, so item difficulties can be recalibrated later without losing history.

**Item difficulties.** Design priors for now (`DIFFICULTY` in `rating.ts`): a pure decision on the range edge 1350, a mixed hand where some answer is still wrong 1250 (more than one answer counts, so it is easier), painting a chart 1600, core lesson questions 1300, advanced 1600, decisions from saved solver spots 1450 (the player picked the spot after seeing the answer). Chart hands where every answer is accepted are not rated at all, and only equilibrium charts are rated, never exploit charts. With a server, item difficulties should be fitted from everyone's answers, exactly as player ratings are (Pelánek 2016).

**Tiers.** Nine tiers, one every 150 points: Newcomer, Beginner (900), Developing (1050), Solid (1200), Sharp (1350), Regular (1500), Strong regular (1650), Expert (1800), Elite (1950). Players start at 1200 but see no tier until the rating settles. The ladder stops at 1950 because the hardest items are rated about 1600: a rating far above every item cannot be measured, so tiers named "Pro" or "World class" would be claims Felt cannot back. Names describe skill, not status, and avoid "Pro", which is the paid plan. Chess classes are 200 points wide (USCF). 150 keeps each step meaningful, since a player one tier up is expected to win about 70% of decisions against the tier below, and puts the next milestone close enough to pull effort forward: people speed up as a goal gets near (Kivetz, Urminsky and Zheng 2006). The You page shows the points to the next tier.

## 2. What the rating is worth at the table

Code: `packages/core/src/winrate.ts`. Shown on the You page.

- **Costs are arithmetic.** Poker is zero sum before the house takes its share, so the average player at any table loses exactly the rake and tips per player. Felt computes this from the player's rake settings: at a live 1/3 game with 10% up to $5 plus a $1 drop, an average final pot of 20bb when a flop is seen, and a $1 tip per pot, the average player pays about 12.9 bb/100 in rake and 3.0 in tips. Rake is averaged over a spread of pot sizes, since a capped rake on the average pot overstates it, and tips are charged only on pots that see a flop. Skill persists but rake is heavy: in 456 million online hands, the previous period's top decile did 19.5 bb/100 better than the bottom decile the next period, yet still lost 23.0 bb/100 on average after rake (Potter van Loon, van den Assem and van Dolder 2015).
- **The edge is a model.** Edge before costs = `edgeScale x (2p - 1)`, where p is the expected score of the player's rating against the table's average rating. Zero at the pool's rating, symmetric, and bounded. The pool rating and scale are stated assumptions (editable on the You page), set per game until Felt has player data to fit them.
- **Uncertainty is shown.** The estimate carries a 95% range from the rating deviation and the model's own uncertainty.
- **Results take over.** Entered results are combined with the model by a normal Bayesian update: each source is weighted by its precision. Results alone are noisy (standard deviation about 120 to 140 bb/100 live, 90 online), so pinning a win rate within 5 bb/100 needs well over 100,000 hands. Felt calls results noise until their 95% range is within 10 bb/100 of the estimate, instead of a fixed hand count. The page says how much weight the results carry and which parts are arithmetic and which are model assumptions.

What Felt does not claim: the share of players who win after rake. No primary source supports the popular "about 10%" figure.

## 3. Loops

The goal is a habit built on real competence, not on points. Gamification has small average effects on learning, with only the cognitive effect holding up in rigorous studies (Sailer and Homner 2020), and contingent rewards can undermine intrinsic motivation (Deci, Koestner and Ryan 1999). So Felt's loops feed back skill, not tokens. There are no XP points.

| Loop | What the player does | What keeps it going | Grounding |
| --- | --- | --- | --- |
| Daily review | Spaced review of charts, saved items and quizzes | Due cards, FSRS scheduling | Spacing (Cepeda et al. 2006, 2008), testing effect (Roediger and Karpicke 2006), FSRS (Ye et al. 2022) |
| Daily challenge | Five decisions, the same for everyone that day: three range decisions that get harder and two lesson questions. Saved after every answer, so it cannot be replayed. The result lists each decision and adds missed hands to review | A new one every day, a result to share | Retrieval practice; shared daily puzzle format (Wordle) as a distribution loop |
| Today's plan | The next lesson in their plan, clearing the review, the daily challenge | Three tasks checked off by what they finished, never by minutes spent | Specific, attainable goals (Locke and Latham 2002); rewards tied to competence, not time (Deci, Koestner and Ryan 1999) |
| Streak with freezes | Study any amount each day | Loss aversion, softened: every player starts with one freeze, earns another every seven days in a row (bank of two), and each covers one missed day | Loss aversion (Kahneman and Tversky 1979); habits form with repetition, and missing one day did not materially set back habit formation (Lally et al. 2010), so one miss should not cost the streak |
| Rating | Every graded answer moves it | Visible competence, provisional to settled, tiers | Competence need in self determination theory (Ryan and Deci 2000); task focused feedback (Kluger and DeNisi 1996; Hattie and Timperley 2007) |
| Win rate | Enter results | The model turns study into money at their stake | Concrete value of skill |
| Saves | Bookmark anything interesting | It returns in review | Retrieval practice of what the player chose |
| Placement and test outs | Skip known material | Endowed progress, no repetition | Adaptive practice at the right difficulty (Klinkenberg et al. 2011 target about 75% success) |
| Practice at your level | Ten decisions picked near 80% expected success, weaker areas first, areas mixed | Always the right difficulty | Klinkenberg et al. 2011; Wilson et al. 2019; interleaving (Rohrer and Taylor 2007) |
| Study cue | Picks when they will study at onboarding; the pledge reads "When I ..., I will study", and one tap adds a daily calendar event at that time | A plan tied to an existing routine, with a cue that actually fires | Implementation intentions (Gollwitzer 1999) |

**Commitment at onboarding.** A chosen daily goal and a held pledge are implementation intentions in miniature (Gollwitzer 1999): when, how long and what.

**What Felt avoids.** Fake competitors or leagues without real players, fake scarcity, guilt notifications, and rewards for time spent rather than skill shown.

## 4. Real results: imports

Code: `packages/core/src/handhistory.ts`, `packages/core/src/sessions.ts`, `apps/web/src/pages/ImportPage.tsx`.

- **Hand histories.** Felt reads the PokerStars text format, which most sites write and which PokerTracker 4 and Holdem Manager 3 export. It also accepts the GGPoker header. Tests use real PokerStars hands and check that every hand conserves chips (nets add up to minus the rake). GGPoker parsing follows the same layout but has not been checked against a real GG export yet.
- **Tracker databases.** PokerTracker and Holdem Manager keep hands in a database on the player's computer, which a web app cannot open. Players export hands as text and import the files. Nothing leaves the device.
- **Live sessions.** Any CSV with a date, a session length and a result (or buy in and cash out) imports, with columns found by their headers.
- **What imports drive.** Win rate by seat, VPIP, PFR, 3bet, went to showdown, won at showdown, flop c-bet, fold to 3bet and postflop aggression, filterable by stakes; first in decisions compared with the opening charts, flagged only outside mixes and drillable in review; and the results that feed the win rate estimate. Until the 95% range of the results is within 10 bb/100, Felt says the sample is mostly luck. Opening rates by seat are compared with the chart's rate, with a binomial range, and only cash hands at 60bb or deeper, six or more players and no straddle are compared with the charts.

## 5. Next, needing a server

1. **Item calibration** from all players' answers, and then the pool ratings in the win rate model from real players at each stake.
2. **Leagues and friends**: weekly groups ranked by rating gained, only with real players. Duolingo reports leagues and streak mechanics among its main retention levers (company sources in the brief).
3. **Push reminders** at the time the player chose, with a streak saver. Today Felt offers calendar events (.ics) for the study time and for two days before a trial ends, which need no server.
4. **Global daily challenge stats**: how everyone did on today's five.

Adaptive difficulty already ships without a server: Practice picks items near 80% expected success from the rating model (Klinkenberg et al. 2011; Wilson et al. 2019 derive about 85% for model learners).

## Measurement

Felt logs events to a local table on the device (`apps/web/src/state/events.ts`): onboarding steps, placement, plan commitment, paywall views, plan choice and purchase results, and daily challenge starts and finishes. Nothing is sent anywhere; developer mode can export the log. Metrics to watch once events can be collected with consent: first lesson within 24 hours, D1, D7 and D30 retention, share of days the plan is done, paywall to trial, trial to paid, day 0 cancellations, and rating gained per active week.

## 6. Monetization context

Duolingo, the reference freemium learning app, reported 58.7M daily active users and 12.7M paid subscribers in Q2 2026, with subscribers 9.2% of monthly actives at the end of 2025 (company sources). Its model is a generous free tier with a habit loop, and paid features that add depth. Felt follows the same shape: the daily challenge, review, placement and the first module of every track are free; depth (every lesson, the solver on any spot) is Pro. See [MONETIZATION.md](MONETIZATION.md).
