# Measuring skill and building the habit

How Felt measures a player's ability, turns it into money at their stake, and keeps them coming back. Each decision cites the research in [research/sources.md](research/sources.md), where every source is listed with how it was verified.

## 1. Felt Rating

**What it is.** One number for overall ability plus one per area (preflop, postflop, math, exploits, theory and mindset), on a chess style scale. Code: `packages/core/src/rating.ts`, unit tested against the worked example in Glickman (1999).

**How it works.**

- Every graded answer is a game between the player and an item with a difficulty rating. The chance of a right answer is `1 / (1 + 10^((difficulty - rating) / 400))`. This is the Elo model used for learners and items in adaptive education (Pelánek 2016; Klinkenberg, Straatemeier and van der Maas 2011), and the same logistic curve as the Rasch model in item response theory (Embretson and Reise 2000).
- Uncertainty follows Glicko (Glickman 1999): a rating deviation that starts at 350, shrinks with every answer and grows again with days away (back to 350 after about 100 idle days). New players move fast and settled players slowly, the effect Pelánek et al. (2017) get with an uncertainty function for K.
- A rating with deviation above 110 is provisional and shown with a "?", the convention Lichess uses.
- Only objective answers count: lesson quizzes, chart decisions, solver decisions, test outs, placement and the daily challenge. Self graded flashcards never move the rating. An item answered again within ten minutes does not count, because that is recall from the screen, not from memory.
- Ratings are recomputed by replaying every stored answer, so item difficulties can be recalibrated later without losing history.

**Item difficulties.** Design priors for now (`DIFFICULTY` in `rating.ts`): a clear chart decision 1050, a pure decision on the range edge 1350, a mixed hand 1550, painting a chart 1600, core lesson questions 1300, advanced 1600, solver decisions 1700. With a server, item difficulties should be fitted from everyone's answers, exactly as player ratings are (Pelánek 2016).

**Tiers.** Beginner, Recreational (1000), Club (1200), Regular (1400), Strong regular (1600), Pro (1800), Elite (2000). Players start at 1200.

## 2. What the rating is worth at the table

Code: `packages/core/src/winrate.ts`. Shown on the You page.

- **Costs are arithmetic.** Poker is zero sum before the house takes its share, so the average player at any table loses exactly the rake and tips per player. Felt computes this from the player's rake settings: at a live 1/3 game with 10% up to $5 plus a $1 drop, an average final pot of 20bb when a flop is seen, and a $1 tip per pot, the average player pays about 17.8 bb/100 in rake and 3.7 in tips. Rake is large enough that in a study of 456 million online hands, even the previous period's top decile lost 23 bb/100 on average the next period (Potter van Loon, van den Assem and van Dolder 2015).
- **The edge is a model.** Edge before costs = `edgeScale x (2p - 1)`, where p is the expected score of the player's rating against the table's average rating. Zero at the pool's rating, symmetric, and bounded. The pool rating and scale are stated assumptions (editable on the You page), set per game until Felt has player data to fit them.
- **Uncertainty is shown.** The estimate carries a 95% range from the rating deviation and the model's own uncertainty.
- **Results take over.** Entered results are combined with the model by a normal Bayesian update: each source is weighted by its precision. Results alone are noisy (standard deviation about 100 bb/100 live), so pinning a win rate within 5 bb/100 needs about 154,000 hands; skill only outweighs luck after roughly 1,500 hands (Potter van Loon et al. 2015). The page says how much weight the results carry.

What Felt does not claim: the share of players who win after rake. No primary source supports the popular "about 10%" figure.

## 3. Loops

The goal is a habit built on real competence, not on points. Gamification has small average effects on learning, with only the cognitive effect holding up in rigorous studies (Sailer and Homner 2020), and contingent rewards can undermine intrinsic motivation (Deci, Koestner and Ryan 1999). So Felt's loops feed back skill, not tokens. There are no XP points.

| Loop | What the player does | What keeps it going | Grounding |
| --- | --- | --- | --- |
| Daily review | Spaced review of charts, saved items and quizzes | Due cards, FSRS scheduling | Spacing (Cepeda et al. 2006, 2008), testing effect (Roediger and Karpicke 2006), FSRS (Ye et al. 2022) |
| Daily challenge | Five decisions, the same for everyone that day, rated, shared as a spoiler free grid | A new one every day, a result to share | Retrieval practice; shared daily puzzle format (Wordle) as a distribution loop |
| Quests | Daily challenge, the daily minutes goal, clearing the review | Three clear goals and a "Perfect day" | Specific, attainable goals (Locke and Latham 2002) |
| Streak with freezes | Study any amount each day | Loss aversion, softened: a freeze is earned every seven days in a row (bank of two) and covers one missed day | Loss aversion (Kahneman and Tversky 1979); habits form with repetition, and missing one day did not materially set back habit formation (Lally et al. 2010), so one miss should not cost the streak |
| Rating | Every graded answer moves it | Visible competence, provisional to settled, tiers | Competence need in self determination theory (Ryan and Deci 2000); task focused feedback (Kluger and DeNisi 1996; Hattie and Timperley 2007) |
| Win rate | Enter results | The model turns study into money at their stake | Concrete value of skill |
| Saves | Bookmark anything interesting | It returns in review | Retrieval practice of what the player chose |
| Placement and test outs | Skip known material | Endowed progress, no repetition | Adaptive practice at the right difficulty (Klinkenberg et al. 2011 target about 75% success) |

**Commitment at onboarding.** A chosen daily goal and a held pledge are implementation intentions in miniature (Gollwitzer 1999): when, how long and what.

**What Felt avoids.** Fake competitors or leagues without real players, fake scarcity, guilt notifications, and rewards for time spent rather than skill shown.

## 4. Next, needing a server

1. **Item calibration** from all players' answers, and then the pool ratings in the win rate model from real players at each stake.
2. **Leagues and friends**: weekly groups ranked by rating gained, only with real players. Duolingo reports leagues and streak mechanics among its main retention levers (company sources in the brief).
3. **Reminders** at the time the player chose, with a streak saver.
4. **Global daily challenge stats**: how everyone did on today's five.
5. **Adaptive difficulty**: pick practice items near a 75 to 85% expected success rate from the rating model (Klinkenberg et al. 2011 in children; Wilson et al. 2019 derive about 85% for model learners).

## 5. Monetization context

Duolingo, the reference freemium learning app, reported 58.7M daily active users and 12.7M paid subscribers in Q2 2026, with subscribers 9.2% of monthly actives at the end of 2025 (company sources). Its model is a generous free tier with a habit loop, and paid features that add depth. Felt follows the same shape: the daily challenge, review, placement and the first module of every track are free; depth (every lesson, the solver on any spot) is Pro. See [MONETIZATION.md](MONETIZATION.md).
