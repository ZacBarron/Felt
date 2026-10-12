import type { LessonContent } from './types';

export const THEORY_LESSONS: LessonContent[] = [
  {
    key: 'foundations/theory/what-is-gto',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: 'Nash' },
    steps: [
      {
        kind: 'intro',
        title: 'Unexploitable, not maximal',
        body: 'GTO means playing your part of a Nash equilibrium. It protects you against any opponent, but it is not the strategy that wins the most against the opponent in front of you.',
      },
      {
        kind: 'text',
        title: 'What an equilibrium is',
        body: [
          'A Nash equilibrium is a set of strategies, one per player, where no player can gain by changing only their own strategy.',
          'In a two player zero sum game, every equilibrium strategy guarantees at least the **value of the game**, whatever the opponent does. That is what unexploitable means: an opponent who knows your strategy exactly still cannot push your result below that value.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Cannot lose, with conditions',
        body: [
          'Heads up, averaged over both seats and before rake, the value of the game is zero. So an equilibrium strategy cannot lose in expectation.',
          'In a single spot the value can be negative. The big blind loses money on average even when it plays perfectly, because it posts a blind out of position. Unexploitable means you lose no more than the spot is worth.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'River, pot 10, bet 10, two value combos per bluff',
        columns: ['Villain’s bluff catchers', 'Value', 'Bluff', 'Average'],
        rows: [
          ['Fold all', '+10', '+10', '+10'],
          ['Call all', '+20', '−10', '+10'],
          ['Call half', '+15', '0', '+10'],
        ],
        note: 'EV in bb for the bettor from this point, counting the 10bb pot when the bettor takes it. A bluff catcher’s call is worth exactly 0 here (⅓ × 30 − 10), so every choice gives the bettor the same +10.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why it does not maximize profit',
        body: [
          'Against equilibrium, a hand that mixes is indifferent between its actions. If an opponent folds those hands too often or calls them too often, the equilibrium player earns exactly the same. A best response would bluff every hand against the folder and stop bluffing against the caller.',
          'Equilibrium only profits when the opponent picks an action that is strictly worse against it: calling with a hand that should always fold, or folding a hand that should always continue. Weak players make many of those mistakes, but a best response wins far more from them.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Three or more players',
        body: [
          'With three or more players, equilibria still exist but the guarantee is gone. There can be several equilibria with different payoffs, and mixing parts of different equilibria is not an equilibrium.',
          'Even if you play an equilibrium strategy, the other players’ choices can cost you, with no collusion needed. Multiway solver outputs are useful guides, not guarantees.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'An answer to its inputs',
        body: [
          'A solver output is the equilibrium of the game you described: the ranges entering the spot, the bet sizes allowed, the stack depth, the rake and the number of players.',
          'Change any of these and the answer changes. A solution built on the wrong preflop ranges is a precise answer to the wrong question.',
        ],
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'On the river you bet with the equilibrium mix of value and bluffs. Villain folds every bluff catcher. Compared with villain calling at the right rate, your EV is:',
        choices: ['Higher', 'Lower', 'The same'],
        answer: 2,
        explain: 'Your bluffs make villain’s bluff catchers indifferent, so their call or fold choice does not change your EV. To profit from the overfolding you must deviate and bluff more.',
      },
      {
        kind: 'quiz',
        question: 'What does unexploitable mean in a heads up spot?',
        choices: [
          'A perfect opponent cannot push your EV below the value of the spot',
          'It wins the most against any opponent',
          'It never loses money in that spot',
        ],
        answer: 0,
        explain: 'The guarantee is a floor, not a maximum, and the floor can be negative, as in the big blind.',
      },
      {
        kind: 'quiz',
        question: 'Three players see a flop. You play an equilibrium strategy. Which is true?',
        choices: [
          'You cannot lose in expectation',
          'An equilibrium does not exist with three players',
          'Other players’ choices can still cost you',
        ],
        answer: 2,
        explain: 'The no-loss guarantee belongs to two player zero sum games. Multiway, equilibria exist but protect you far less.',
      },
      {
        kind: 'takeaway',
        points: [
          'GTO is a floor: unexploitable heads up, not maximally profitable.',
          'It earns nothing extra from mistakes between indifferent actions.',
          'Multiway, the guarantee disappears.',
          'Every solution depends on ranges, sizes, stacks and rake.',
        ],
      },
    ],
  },
  {
    key: 'foundations/theory/solvers',
    level: 'advanced',
    minutes: 8,
    cover: { kind: 'figure', text: 'CFR' },
    steps: [
      {
        kind: 'intro',
        title: 'A program that plays itself',
        body: 'A solver finds an equilibrium by playing both sides of a spot millions of times and shifting toward the actions it regrets not taking.',
      },
      {
        kind: 'text',
        title: 'Self play',
        body: [
          'The solver starts with some strategy for both players, often a uniform mix. Each iteration it walks the game tree and works out, for every hand at every decision, how each action would have done against the opponent’s current strategy.',
          'Then it updates both strategies and repeats. This family of methods is counterfactual regret minimization, or CFR.',
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Regret matching',
        formula: 'Next mix ∝ positive regret',
        parts: [
          ['Regret', 'How much better an action would have done than the mix actually played, summed over iterations'],
          ['Positive', 'Actions with negative total regret get zero weight'],
        ],
        example: 'A hand has regret +6 for bet, +2 for check and −3 for fold. Next iteration it bets **75%**, checks **25%** and never folds.',
      },
      {
        kind: 'text',
        title: 'The average converges',
        body: [
          'In two player zero sum games, the **average** strategy over all iterations converges to an equilibrium. The strategy of the latest iteration can keep cycling around it.',
          'Modern variants weight later iterations more heavily, which usually converges faster. The idea is the same.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'You choose the tree',
        body: [
          'A solver cannot consider every possible bet size, so you give it a short list of bet and raise sizes. It finds the best strategy within that tree.',
          'If a real opponent uses a size the tree does not include, the solution does not cover it. Fewer sizes solve faster; more sizes describe the game better.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'How close is close enough',
        columns: ['Term', 'Meaning'],
        rows: [
          ['Exploitability', 'What a perfect counter strategy would win against the solution'],
          ['% of pot', 'That amount as a share of the starting pot'],
          ['mbb/hand', 'Thousandths of a big blind per hand; 10 mbb/hand is 1bb per 100 hands'],
          ['Zero', 'An exact equilibrium of that tree'],
        ],
        note: 'Solvers stop at a target the user sets. Low exploitability is measured inside the tree, never against sizes it left out.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Reading a solution',
        body: [
          '**Frequencies** show how often each hand takes each action. **EV per hand** shows what each hand is worth under the strategy, so you see which hands are close. **Aggregate reports** average one decision over many flops, which shows patterns you can learn instead of single boards you cannot.',
          'Start from the aggregate pattern, then use the hand detail to see why the exceptions differ.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why hands mix',
        body: [
          'At equilibrium a hand only mixes when its actions have about equal EV. If one were clearly better, regret would push the hand fully into it. Hands near the border between two actions mix the most.',
          'So a mix tells you the hand is close to indifferent. The exact percentages matter for the balance of the range, not for that hand’s own EV. Tiny mixes can also be leftovers from a solve that is not fully converged, and there can be several equilibria that split frequencies between combos differently.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Check the inputs before the output',
        body: 'Before trusting a solution, check the ranges entering the spot, the stack depth, the sizes in the tree and the rake. Those decide the answer more than anything you read off the screen.',
      },
      {
        kind: 'quiz',
        question: 'In CFR, which strategy converges to an equilibrium?',
        choices: ['The latest iteration’s strategy', 'The average over all iterations', 'The first iteration’s strategy'],
        answer: 1,
        explain: 'The current strategy can cycle. The average over iterations is what converges in two player zero sum games.',
      },
      {
        kind: 'quiz',
        question: 'A hand’s total regrets are raise +2, call +8, fold −5. What does regret matching play next?',
        choices: ['Call 100%', 'Call 62%, raise 15%, fold 23%', 'Call 80%, raise 20%'],
        answer: 2,
        explain: 'Only positive regret counts: 8 ÷ 10 = 80% call, 2 ÷ 10 = 20% raise, fold gets nothing.',
      },
      {
        kind: 'quiz',
        question: 'In a converged solution a hand bets 55% and checks 45%. What does that tell you?',
        choices: ['Betting is clearly better for that hand', 'Betting and checking have about the same EV for that hand', 'The solve has failed'],
        answer: 1,
        explain: 'Mixing happens at indifference. The split keeps the range balanced; the hand itself earns about the same either way.',
      },
      {
        kind: 'takeaway',
        points: [
          'Solvers play themselves and move toward actions with positive regret.',
          'The average strategy converges; the tree of sizes is your choice.',
          'Exploitability is measured inside the tree.',
          'A mix means near indifference, not a precise instruction for that hand.',
        ],
      },
    ],
  },
  {
    key: 'foundations/theory/simplification',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'figure', text: '≈' },
    steps: [
      {
        kind: 'intro',
        title: 'Strategies you can actually play',
        body: 'Full solutions use many sizes and mix hundreds of hands. Nobody plays that at the table. The skill is simplifying in ways that cost little, and knowing the spots where they cost a lot.',
      },
      {
        kind: 'table',
        title: 'Common simplifications',
        columns: ['Simplification', 'What it gives up'],
        rows: [
          ['One bet size per spot', 'Value or fold equity where two sizes help'],
          ['Pure: always the main action', 'Balance, if many hands move together'],
          ['Range bet small', 'EV of hands that prefer to check'],
          ['Few sizes in the tree', 'Coverage of sizes opponents really use'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why mixed hands are cheap to purify',
        body: [
          'A hand that mixes is close to indifferent. Always taking one action with it costs that hand almost nothing, as long as the opponent keeps playing the same way.',
          'The cost appears when many hands are moved the same way at once. Then your range’s frequencies shift, and an opponent who notices can adjust against them.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Solve the simple game, do not round the full one',
        body: [
          'There are two ways to simplify. One rounds a full solution, for example dropping the second size. The other solves the spot again with only the options you want to use.',
          'The second gives a balanced strategy for the simpler game: it chooses again which hands bet when only one size exists. Rounding can leave ranges unbalanced. The cost of a simplification is measured by comparing its EV with the full solution on the same ranges.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Small errors and big errors',
        body: [
          'Comparisons like this tend to find that a sensible simplification, such as one well chosen flop size in a single raised pot, gives up little EV.',
          'Errors in the inputs usually cost much more: defending the wrong range preflop, folding far too often to c-bets, or bluffing far too much on the river. Those affect every hand that follows.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'When simplifying hurts',
        body: [
          'When the full strategy splits the range sharply, for example betting big with some hands and checking a lot of others, one action for everything loses more. Range betting small on a low connected board as the preflop raiser is a costly version of this.',
          'Rivers are less forgiving, because value to bluff ratios matter more there. Errors also scale with the pot, so deep stacks and 3bet pots punish sloppy shortcuts more.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Study the full answer, play the simple one',
        body: 'Learn why the full solution does what it does, then play a simple rule. Know the few spots where your rule breaks and handle those by hand.',
      },
      {
        kind: 'quiz',
        question: 'A hand mixes bet 50% and check 50%. You always bet it. Against an opponent who does not adjust, what does that cost with that hand?',
        choices: ['Half its EV', 'About nothing', 'Its whole EV'],
        answer: 1,
        explain: 'Mixing means the two actions are worth about the same for that hand. The risk is to your range’s balance, and only if the opponent adapts.',
      },
      {
        kind: 'quiz',
        question: 'Which simplification is the safest?',
        choices: [
          'Range bet small on every flop',
          'Round every mixed hand in the full solution to bet',
          'Solve the spot again with one size and play that solution',
        ],
        answer: 2,
        explain: 'A restricted solve rebalances the range around the options you will really use. Rounding and blanket rules do not.',
      },
      {
        kind: 'quiz',
        question: 'Which error usually costs more?',
        choices: ['Defending a much too wide range from the big blind', 'Using one c-bet size where the solution uses two'],
        answer: 0,
        explain: 'A wrong range is an input error: it affects every flop that follows. A missing size is a small, local loss in most spots.',
      },
      {
        kind: 'takeaway',
        points: [
          'Mixed hands are cheap to purify one at a time.',
          'Simplify by solving the simpler game, not by rounding.',
          'Wrong ranges cost more than missing sizes.',
          'Polarized spots, rivers and big pots punish shortcuts most.',
        ],
      },
    ],
  },
  {
    key: 'foundations/theory/equity-benchmarks',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '81%' },
    steps: [
      {
        kind: 'intro',
        title: 'Numbers to know cold',
        body: 'A few all in matchups come up again and again. Knowing them exactly helps you estimate everything else.',
      },
      {
        kind: 'table',
        title: 'Preflop: pairs',
        columns: ['Hand', 'Against', 'Equity'],
        rows: [
          ['A♠A♥', 'K♦K♣', '81.3%'],
          ['A♠A♥', '7♦6♦', '77.0%'],
          ['8♠8♥', 'A♦K♣', '55.6%'],
          ['8♠8♥', 'A♦K♦', '52.3%'],
        ],
        note: 'Exact: all 1,712,304 boards enumerated with Felt’s evaluator. Ties count as half. Other suit combinations differ slightly.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Not all flips are equal',
        body: [
          'A pair against two overcards is a small favorite: **55.6%** against offsuit AK, but only **52.3%** when AK is suited, because of AK’s flush chances.',
          'AK against a small pair is the same matchup from the other side: A♠K♦ has **47.0%** against 2♣2♥.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Preflop: overcards and domination',
        columns: ['Hand', 'Against', 'Equity'],
        rows: [
          ['A♠K♦', '2♣2♥', '47.0%'],
          ['A♠K♦', 'Q♥Q♣', '42.8%'],
          ['A♠K♦', 'A♥Q♣', '74.0%'],
          ['A♠K♠', 'A♥Q♥', '71.3%'],
          ['A♥K♥', '7♠6♠', '60.4%'],
        ],
        note: 'Exact enumeration of every board. A♠K♦ against A♥Q♣ ties 4.6% of the time, when the board plays or both make the same straight.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why domination hurts',
        body: [
          'When two hands share a card, that card helps neither. AQ mostly needs a queen to win, so AK holds about **74%**, more than AK against a lower pair or two lower cards.',
          'This is why hands like AQ and KJ call large raises badly: the hands that keep going often contain the same high card with a better kicker.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Flop: draws and made hands',
        columns: ['Flop', 'Matchup', 'Equity'],
        rows: [
          ['K♥7♥2♣', 'T♥9♥ vs K♠Q♦', '39.5%'],
          ['K♥7♥2♣', 'A♥J♥ vs K♠Q♦', '45.6%'],
          ['J♥T♥4♣', '9♥8♥ vs A♠A♦', '55.4%'],
          ['T♥9♥2♣', 'Q♥J♥ vs A♠A♦', '56.3%'],
          ['J♠7♦2♣', '7♥7♣ vs A♠A♦', '91.1%'],
        ],
        note: 'Equity of the first hand, all in on the flop. Exact: all 990 turn and river runouts.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'What a blank turn does',
        columns: ['Draw vs made hand', 'Flop', 'Turn'],
        rows: [
          ['T♥9♥ vs K♠Q♦, K♥7♥2♣', '39.5%', '20.5%'],
          ['9♥8♥ vs A♠A♦, J♥T♥4♣', '55.4%', '34.1%'],
        ],
        note: 'Turns 3♠ and 2♠. Exact: 9 of 44 rivers and 15 of 44 rivers. A draw loses a large share of its equity when the turn misses.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Raw equity, one hand',
        body: 'These are all in numbers against one exact hand. In a real hand you face a range, and with chips behind, position and playability decide how much of the raw equity you realize.',
      },
      {
        kind: 'quiz',
        question: 'Which matchup is closest to a true coin flip?',
        choices: ['A♠A♥ vs K♦K♣', 'A♠K♦ vs A♥Q♣', 'A♠K♦ vs 2♣2♥'],
        answer: 2,
        explain: 'AK against a small pair is 47% to 53%. AA against KK is about 81%, and AK against AQ about 74%.',
      },
      {
        kind: 'quiz',
        question: 'Flop J♥T♥4♣. 9♥8♥ gets all in against A♠A♦. Who is the favorite?',
        choices: ['A♠A♦, about 65%', '9♥8♥, about 55%', 'Exactly even'],
        answer: 1,
        explain: 'Flush draw plus open ended straight draw: 15 outs with two cards to come. The draw holds 55.4%.',
      },
      {
        kind: 'quiz',
        question: 'You hold K♠Q♦ on K♥7♥2♣ and get all in against T♥9♥. Your equity is closest to:',
        choices: ['80%', '60%', '40%'],
        answer: 1,
        explain: 'The flush draw has 39.5%, so top pair holds 60.5%. A favorite, but far from safe.',
      },
      {
        kind: 'takeaway',
        points: [
          'AA vs KK 81%. Pair vs two overcards 52 to 56%.',
          'AK vs AQ about 74%: domination is brutal.',
          'Flush draw vs top pair about 40% on the flop, 20% on the turn.',
          'A 15 out combo draw is a favorite over an overpair on the flop.',
        ],
      },
    ],
  },
];
