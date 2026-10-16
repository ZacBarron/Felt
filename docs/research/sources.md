# Research brief: sources for Felt

Compiled October 2026 to ground Felt's rating, scheduling, motivation and monetization decisions.

**How this was checked.** Each citation was confirmed by web search against a publisher, index (PubMed, RePEc, ACL Anthology, dblp, SEC EDGAR) or author page. Full text fetching was not available, so most numbers come from abstracts or passages quoted in search results. Labels: *abstract level* (in the published abstract), *company source* (shareholder letter, SEC filing, company blog), *industry report* (vendor benchmark), *secondary* (third party report; indicative only), *not verified* (do not quote).

---

## 1. Skill rating for learners and players

**Elo.** Elo, A. E. (1978). *The Rating of Chessplayers, Past and Present.* Arco, New York. ISBN 0-668-04721-6. Expected score `E_A = 1 / (1 + 10^((R_B - R_A)/400))`; update `R_A' = R_A + K (S_A - E_A)`. No uncertainty, so a fixed K trades stability against speed.

**Glicko.** Glickman, M. E. (1999). "Parameter estimation in large dynamic paired comparison experiments." *Applied Statistics (JRSS C)* 48(3), 377-394. doi:10.1111/1467-9876.00159. Adds a rating deviation (RD): new or inactive players move fast, settled ones slowly. RD grows with time away, `RD = min(sqrt(RD^2 + c^2 t), 350)`, a direct model of "not practiced lately, so less sure".

**Glicko-2.** Glickman, M. E. (2001). "Dynamic paired comparison models with stochastic variances." *Journal of Applied Statistics* 28(6), 673-689. Adds volatility so real jumps in skill are tracked. Usual defaults: rating 1500, RD 350, volatility 0.06, tau 0.3 to 1.2 (*secondary*: implementations citing Glickman's glicko2.pdf note, which could not be opened).

**Lichess.** FAQ (lichess.org/faq): Glicko-2, start 1500; a rating is provisional while RD > 110; leaderboards need RD < 75. Puzzles use the same system, each attempt a game between solver and puzzle, with less credit when a theme hint is shown (*secondary*). Chess.com uses a Glicko family system (*secondary*).

**TrueSkill.** Herbrich, R., Minka, T., Graepel, T. (2006). "TrueSkill: A Bayesian skill rating system." *NIPS 19*, 569-576. Bayesian Elo with uncertainty, draws and multi player outcomes. Not needed for learner vs item.

**Elo in adaptive education.**
- Pelánek, R. (2016). "Applications of the Elo rating system in adaptive educational systems." *Computers & Education*. doi:10.1016/j.compedu.2016.03.017. Each answer is a match between student and item, estimating student skill and item difficulty online; Elo is "simple, robust and effective" (*abstract level*).
- Pelánek, R., Papoušek, J., Řihák, J., Stanislav, V., Nižnan, J. (2017). "Elo-based learner modeling for the adaptive practice of facts." *User Modeling and User-Adapted Interaction* 27(1). Replaces fixed K with an uncertainty function `K(n) = gamma / (1 + beta n)`, n = prior answers for that student or item. Abdi, Khosravi, Sadiq, Gasevic (EDM 2019, arXiv:1910.12581) used gamma = 1.8, beta = 0.05 after Pelánek et al. and found results "not really sensitive" to them.
- Klinkenberg, S., Straatemeier, M., van der Maas, H. L. J. (2011). "Computer adaptive practice of Maths ability using a new item response model for on the fly ability and difficulty estimation." *Computers & Education* 57(2), 1813-1824. doi:10.1016/j.compedu.2011.02.003. Math Garden: Elo updates of child and item after every answer, scoring that combines accuracy and response time, items chosen for about 75% expected success. 3,648 children, over 3.5 million problems in ten months; reliable and valid (*abstract level*).
- Papoušek, J., Pelánek, R. (2015). "Impact of adaptive educational system behaviour on student motivation." *AIED 2015*, 348-357. doi:10.1007/978-3-319-19773-9_35. Target difficulty affects perceived question suitability and willingness to keep practicing (exact rates *not verified*).

**Item response theory.** Embretson, S. E., Reise, S. P. (2000). *Item Response Theory for Psychologists.* Lawrence Erlbaum. Rasch (1PL): `P(correct) = 1 / (1 + exp(-(theta - b)))`, the same logistic curve as Elo, which is why learner Elo works as an online Rasch estimate. 2PL adds item discrimination `a`.

**Rating classes.** The US Chess Federation's classes are 200 points wide (Class E 1000 to 1199 up to Expert 2000 to 2199 and National Master from 2200), per the USCF rating distribution pages and the Wikipedia summary of USCF classes (*secondary*).

**Goal gradient.** Kivetz, R., Urminsky, O., Zheng, Y. (2006). "The goal-gradient hypothesis resurrected: Purchase acceleration, illusionary goal progress, and customer retention." *Journal of Marketing Research* 43(1), 39-58. doi:10.1509/jmkr.43.1.39. People accelerate effort as they near a reward (coffee card and online rating programs), and effort tracks perceived distance to the goal (*abstract level*).

**For Felt.** Rate the player (theta) and every drill spot (b) with Elo on the logistic scale, `K(n) = 1.8 / (1 + 0.05 n)`, displayed on a 1500 based scale. Add Glicko style uncertainty that grows with days away. Show "provisional" while uncertainty is high.

---

## 2. Poker skill and win rates

- **Potter van Loon, R. J. D., van den Assem, M. J., van Dolder, D. (2015).** "Beyond chance? The persistence of performance in online poker." *PLOS ONE* 10(3): e0115479. doi:10.1371/journal.pone.0115479. 456 million player hand observations, real money ring games, three stakes.
  - Players in the top (bottom) profit deciles over six months were much more likely to be top (bottom) the next six months.
  - Next period, the prior top decile lost 23.0 bb/100 on average and the bottom decile 42.5 bb/100, after rake; gap 19.5 bb/100 (t = 3.12, p = 0.002). Even the best group lost on average once rake was paid. Ranking used players with at least 1,000 hands.
  - Simulations: skill outweighs luck from about 1,500 hands.
  - 58.9% of players played under 100 hands; raked medians roughly -24 to -31 bb/100 by stake (*secondary*: table values via search).
  - Most variance in individual results stays unexplained, consistent with chance.
- **Levitt, S. D., Miles, T. J. (2014).** "The role of skill versus luck in poker: Evidence from the World Series of Poker." *Journal of Sports Economics* 15(1), 31-44. doi:10.1177/1527002512449471. Players pre classified as skilled earned 30.5% ROI at the 2010 WSOP versus -15.6% for others (9.8% vs -16.3% without the Main Event).
- **Croson, R., Fishman, P., Pope, D. G. (2008).** "Poker superstars: Skill or luck?" *Chance*. Past deep finishes predict later ones, with skill differences similar to pro golf.
- **Fiedler, I. C., Rock, J.-P. (2009).** "Quantifying skill in games: Theory and empirical evidence for poker." *Gaming Law Review and Economics*. Defines a "critical repetition frequency" where skill overtakes chance, from data on about 51,761 online players; the "about 1,000 hands" figure is from press coverage (*secondary*).
- **Meyer, G., von Meduna, M., Brosowski, T., Hayer, T. (2013, online 2012).** "Is poker a game of skill or chance? A quasi-experimental study." *Journal of Gambling Studies*. doi:10.1007/s10899-012-9327-8. With card quality fixed, experts did not beat average players over 60 hands but lost less with bad cards. Short samples are noise.
- **Rake.** Fiedler, I. C., Wilcke, A.-C. (2012). "The market for online poker." *UNLV Gaming Research & Review Journal* 16(1): about 6 million players paid US$3.61 billion in rake in 2010. The popular "about 10% of players win after rake" claim has no confirmed primary source (*not verified*).

- **Levels of thinking.** A common way poker is taught: level 1 asks what do I have, level 2 what do they have, level 3 what do they think I have, and so on. It is usually credited to David Sklansky. Felt uses it only as a descriptive ladder for the tiers, not as a measured construct (origin *not verified*; no source was checked).

**For Felt.** Treat results under about 1,500 hands as mostly noise and show confidence intervals on bb/100. Rake can turn a skilled top decile negative, so include it in every EV and win rate.

---

## 3. Learning science for the loops

- **Testing effect.** Roediger, H. L., Karpicke, J. D. (2006). "Test-enhanced learning." *Psychological Science* 17(3), 249-255. One week later: about 61% recall after retrieval practice versus 40% after restudy; restudy won only on a five minute test.
- **Spacing.** Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., Rohrer, D. (2006). "Distributed practice in verbal recall tasks." *Psychological Bulletin* 132(3), 354-380. doi:10.1037/0033-2909.132.3.354. 839 assessments, 317 experiments: the best gap grows with the retention interval. Cepeda, Vul, Rohrer, Wixted, Pashler (2008). "Spacing effects in learning: A temporal ridgeline of optimal retention." *Psychological Science* 19, 1095-1102. Over 1,350 people; optimal gap about 20 to 40% of a one week test delay, falling to 5 to 10% of a one year delay (*abstract level*).
- **Desirable difficulties.** Bjork, R. A. (1994). "Memory and metamemory considerations in the training of human beings." In *Metacognition: Knowing about Knowing*, MIT Press, 185-205. What speeds practice (blocking, constant feedback) can hurt retention; spacing, interleaving and less frequent feedback help. Rohrer, D., Taylor, K. (2007). "The shuffling of mathematics problems improves learning." *Instructional Science* 35(6), 481-498: mixed practice was "vastly superior" a week later.
- **Deliberate practice.** Ericsson, K. A., Krampe, R. T., Tesch-Römer, C. (1993). *Psychological Review* 100(3), 363-406. Effortful practice aimed at weaknesses, with feedback. Macnamara and Maitra (2019, *Royal Society Open Science*) did not replicate the core finding; the effect is real but smaller.
- **Feedback.** Kluger, A. N., DeNisi, A. (1996). *Psychological Bulletin* 119, 254-284. 607 effect sizes: mean d = 0.41, but over a third of feedback interventions lowered performance; feedback that moves attention toward the self works worse. Hattie, J., Timperley, H. (2007). "The power of feedback." *Review of Educational Research* 77(1), 81-112: process and self regulation feedback beat praise of the person.
- **Spaced repetition models.**
  - Settles, B., Meeder, B. (2016). "A trainable spaced repetition model for language learning." *ACL 2016* (P16-1174). Half life regression: `p = 2^(-delta / h)`, `h = 2^(theta . x)` from features like past correct and incorrect counts. Over 45% lower recall prediction error than baselines on Duolingo data; code and data public.
  - Ye, J., Su, J., Cao, Y. (2022). "A stochastic shortest path algorithm for optimizing spaced repetition scheduling." *KDD 2022*, 4381-4390. 220 million MaiMemo memory logs; Markov memory model plus cost minimizing scheduler; 12.6% better than prior methods. Extended in *IEEE TKDE* 35(10), 2023: 64% lower prediction error, 17% lower review cost. These underpin FSRS (difficulty, stability, retrievability; default desired retention 0.9, *secondary*).
- **Optimal difficulty.** Wilson, R. C., Shenhav, A., Straccia, M., Cohen, J. D. (2019). "The eighty five percent rule for optimal learning." *Nature Communications* 10, 4646. doi:10.1038/s41467-019-12552-4. Optimal error about 15.87% for gradient descent learners on binary tasks; shown in models, not proven in humans. Math Garden's 75% is the human field practice.

**For Felt.** Lessons end in retrieval. Schedule recall cards with a half life or FSRS style model at about 90% retention. Choose drill spots for 75 to 85% expected accuracy. Interleave spot types. Feedback explains the decision, not the person.

---

## 4. Motivation, habits and engagement

- **Self determination theory.** Ryan, R. M., Deci, E. L. (2000). *American Psychologist* 55(1), 68-78. Competence, autonomy and relatedness drive lasting motivation.
- **Goal setting.** Locke, E. A., Latham, G. P. (2002). *American Psychologist* 57(9), 705-717. Specific, hard goals with feedback beat "do your best".
- **Implementation intentions.** Gollwitzer, P. M., Sheeran, P. (2006). "Implementation intentions and goal achievement: A meta-analysis of effects and processes." *Advances in Experimental Social Psychology* 38, 69-119. 94 independent tests: d = 0.65 on goal attainment (*secondary*: confirmed through summaries).
- **Implementation intentions (origin).** Gollwitzer, P. M. (1999). "Implementation intentions: Strong effects of simple plans." *American Psychologist* 54(7), 493-503. If-then plans tied to a cue make the action automatic.
- **Habits.** Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., Wardle, J. (2010). *European Journal of Social Psychology* 40, 998-1009. Time to 95% of peak automaticity: 18 to 254 days (median about 66, from 39 well fitting participants). Missing one opportunity did not materially affect habit formation.
- **Gamification.** Hamari, J., Koivisto, J., Sarsa, H. (2014). "Does gamification work?" *HICSS 2014*, 3025-3034: mostly positive, strongly context and user dependent. Sailer, M., Homner, L. (2020). "The gamification of learning: a meta-analysis." *Educational Psychology Review* 32, 77-112: cognitive g = 0.49, motivational g = 0.36, behavioral g = 0.25; only the cognitive effect held in rigorous studies.
- **Leaderboards.** Landers, R. N., Bauer, K. N., Callan, R. C. (2017). *Computers in Human Behavior*: a leaderboard lifted performance to the level of difficult or impossible assigned goals, acting through goal setting. Hanus, M. D., Fox, J. (2015). *Computers & Education* 80, 152-161: a semester of mandatory badges and a leaderboard lowered intrinsic motivation, satisfaction and final exam scores.
- **Loss aversion.** Kahneman, D., Tversky, A. (1979). "Prospect theory." *Econometrica* 47(2), 263-291. Losses outweigh equal gains relative to a reference point. A streak becomes a reference point: that is why it works and why it can coerce.
- **Social comparison.** Festinger, L. (1954). *Human Relations* 7(2), 117-140. Without objective standards people compare with similar others.
- **Duolingo streaks** (*company source*, blog.duolingo.com, "The habit-building research behind your Duolingo streak"): a streak wager raised day 7 retention 14%; a streak milestone animation raised new learner day 7 retention 1.7%; 7 day streak holders were 2.4 times more likely to return next day (correlational). No peer reviewed controlled study of streaks alone was found.
- **Risks.** Deci, E. L., Koestner, R., Ryan, R. M. (1999). *Psychological Bulletin* 125(6), 627-668. 128 studies: engagement, completion and performance contingent rewards cut free choice intrinsic motivation (d = -0.40, -0.36, -0.28); positive feedback raised it (d = 0.33). Mathur, A., et al. (2019). "Dark patterns at scale." *Proc. ACM HCI* 3(CSCW), 81. doi:10.1145/3359183: 1,818 dark pattern instances in 15 types across about 11% of 11K sites, including false urgency and confirmshaming.

- **Self efficacy.** Bandura, A. (1977). "Self-efficacy: Toward a unifying theory of behavioral change." *Psychological Review* 84(2), 191-215. Efficacy expectations decide whether people start, how hard they try and how long they persist. Performance accomplishments are the most dependable source (*abstract level*; the ranking of sources is from secondary summaries).
- **Endowed progress.** Nunes, J. C., Drèze, X. (2006). "The endowed progress effect: How artificial advancement increases effort." *Journal of Consumer Research* 32(4), 504-512. doi:10.1086/500480. An 8 step task framed as 10 steps with 2 already done raised completion and shortened completion time (*abstract level*; the car wash completion rates were not confirmed).
- **Labor illusion.** Buell, R. W., Norton, M. I. (2011). "The labor illusion: How operational transparency increases perceived value." *Management Science* 57(9), 1564-1579. Showing the work behind a result raises its perceived value (citation confirmed; findings *secondary*).
- **Social proof.** Goldstein, N. J., Cialdini, R. B., Griskevicius, V. (2008). "A room with a viewpoint: Using social norms to motivate environmental conservation in hotels." *Journal of Consumer Research* 35(3), 472-482. doi:10.1086/586910. Descriptive norms beat the standard appeal, and norms from the most similar group worked best (*abstract level*).
- **Try before signing up.** Duolingo lets people finish a lesson before asking for an account. A reported 20% lift in DAUs from moving sign up later comes from an executive interview quoted by Taplytics (*secondary*; no primary Duolingo source found).

---

## 5. Apps that grew and monetized

**Duolingo** (*company source*).
- Q2 2026 (quarter to June 30, 2026; shareholder letter, 10-Q): DAUs 58.7M (+23%), MAUs 140.6M (+10%), paid subscribers 12.7M (+17%), revenue $298.5M (+18%), bookings $289.1M (+8%), net income $33.2M. Current user retention rate (CURR) at an all time high of 84%. DAU growth credited partly to a one time event reviving lost streaks.
- FY2025 (letter of Feb 26, 2026): revenue $1,037.6M (+39%), bookings $1,158.4M (+33%); Q4 DAUs 52.7M (+30%), paid subscribers 12.2M (+28%).
- Paid share: 9.2% of average LTM MAUs at Dec 31, 2025, up from 8.8% (FY2025 10-K). Tiers: Super and Max.
- Levers: Jorge Mazal (former Duolingo product lead), "How Duolingo reignited user growth," *Lenny's Newsletter*, 2022 (*insider essay*): CURR had about 5 times the DAU impact of the next best lever; leaderboards (fourth attempt, modeled on mobile games) raised learning time about 17%. Notifications: Duolingo's KDD 2020 paper "A sleeping, recovering bandit algorithm for optimizing recurring notifications" reports +0.5% DAUs and +2% new user retention; 200 million reminder dataset listed on research.duolingo.com (authors and DOI *not verified*).

**Lichess.** Glicko-2 for games and puzzles (section 1). Engagement figures for daily puzzles *not verified*.

**Wordle.** One shared daily puzzle with a spoiler free emoji grid. About 90 players on Nov 1, 2021; about 300,000 by mid January 2022; millions when the New York Times bought it on Jan 31, 2022 for a low seven figure sum (press coverage of the Times announcement).

**GTO Wizard** (*company source*, gtowizard.com and its blog, 2026). Free tier with limited daily trainer hands; Starter from $39/month; Premium and Elite raised $10 to $20/month for new subscribers in March 2026 (new totals *not verified*); Ultra $359/month or $289/month annual. Plans split into Cash and Tournament.

**Conversion benchmarks** (*industry report*, RevenueCat State of Subscription Apps). 2025: 82% of trial starts happen on the day of install (revenuecat.com/state-of-subscription-apps-2025). 2026: hard paywall apps convert about 10.7% of downloads to paid by day 35 versus 2.1% for freemium, with nearly equal one year retention; 55% of 3 day trial cancellations happen on day 0; Education leans to annual plans. 2025 (*secondary* summaries): median download to trial 6.2%; trials of 17 to 32 days convert at 42.5% versus 25.5% under 4 days.

---

## 6. Implications for Felt

1. **One rating engine for player and spots**: Elo on a logistic curve with `K(n) = 1.8 / (1 + 0.05 n)`, provisional while uncertain (Pelánek 2016; Pelánek et al. 2017; Klinkenberg et al. 2011; Lichess).
2. **Uncertainty grows with rust**, so stale areas re rate fast and rise in the queue (Glickman 1999).
3. **Drills at 75 to 85% expected accuracy**, chosen from the rating gap (Klinkenberg et al. 2011; Wilson et al. 2019; Papoušek and Pelánek 2015).
4. **Recall on a memory model** targeting about 90% retention (Settles and Meeder 2016; Ye et al. 2022, 2023; Cepeda et al. 2008).
5. **Retrieval first, interleaved sessions** (Roediger and Karpicke 2006; Bjork 1994; Rohrer and Taylor 2007).
6. **Feedback about the decision** (EV per option, range reasoning), not praise of the person (Kluger and DeNisi 1996; Hattie and Timperley 2007).
7. **Honest variance**: bb/100 with confidence intervals, a "too few hands" state under about 1,500 hands, rake always included (Potter van Loon et al. 2015; Levitt and Miles 2014).
8. **Forgiving streaks**: streak freezes, "one miss is fine" copy, and an if-then plan at setup (Kahneman and Tversky 1979; Lally et al. 2010; Gollwitzer 1999; Duolingo streak blog).
9. **Compete with your past self first**; any social board groups similar levels (Festinger 1954; Landers et al. 2017; Hanus and Fox 2015).
10. **Onboarding earns trust**: a winnable first hand before any ask (Bandura 1977; Duolingo, *secondary*), shown work and a step already done in the plan (Buell and Norton 2011; Nunes and Drèze 2006), and only real social proof (Goldstein et al. 2008).
11. **Rewards inform, not bribe**: badges mark real competence gains; no false urgency or confirmshaming in reminders or paywalls (Deci, Koestner and Ryan 1999; Ryan and Deci 2000; Mathur et al. 2019).
12. **Few, varied reminders** that decay when ignored (Duolingo KDD 2020).
13. **Monetization**: freemium with annual plans and a longer trial suits education (RevenueCat 2025, 2026); about 9% paid share is achievable at scale (Duolingo 10-K); poker players accept tiers by depth of solver content (GTO Wizard).
