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
        body: 'GTO means playing your part of a Nash equilibrium. It protects you against any opponent. It is not the strategy that wins the most against the opponent in front of you.',
      },
      {
        kind: 'text',
        title: 'What an equilibrium is',
        body: [
          'A Nash equilibrium is a set of strategies, one per player. No player can gain by changing only their own strategy.',
          'In a two player zero sum game, each equilibrium strategy guarantees at least the **value of the game**. That holds whatever the opponent does.',
          'That is what unexploitable means. An opponent who knows your strategy exactly still cannot push your result below that value.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Cannot lose, with conditions',
        body: [
          'Heads up, the value of the game is zero when you average over both seats. That is before rake. So an equilibrium strategy cannot lose in expectation over both seats.',
          'In a single spot the value can be negative. The big blind loses money on average even when it plays perfectly. It posts a blind and plays out of position. Unexploitable means you lose no more than the spot is worth.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'River, pot 10bb, bet 10bb, two value combos per bluff',
        columns: ['Villain’s bluff catchers', 'Value', 'Bluff', 'Average'],
        rows: [
          ['Fold all', '+10', '+10', '+10'],
          ['Call all', '+20', '−10', '+10'],
          ['Call half', '+15', '0', '+10'],
        ],
        note: 'EV in bb for the bettor from this point. It counts the 10bb pot when the bettor wins it. A bluff catcher’s call is worth exactly 0 here, since ⅓ × 30 − 10 = 0. So every choice gives the bettor the same +10.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why it does not maximize profit',
        body: [
          'Against equilibrium, a hand that mixes is indifferent between its actions. Say an opponent folds those hands too often, or calls them too often. The equilibrium player earns exactly the same either way.',
          'A best response would bluff every hand against the folder. It would stop bluffing against the caller.',
          'Equilibrium only profits when the opponent picks a strictly worse action. One example is calling with a hand that should always fold. Another is folding a hand that should always continue. Weak players make many of these mistakes. A best response still wins far more from them.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Three or more players',
        body: [
          'With three or more players, equilibria still exist. The guarantee does not. There can be several equilibria with different payoffs. Mixing parts of different equilibria is not an equilibrium.',
          'Even if you play an equilibrium strategy, the other players’ choices can cost you. No collusion is needed. Multiway solver outputs are useful guides, not guarantees.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'An answer to its inputs',
        body: [
          'A solver output is the equilibrium of the game you described. That game includes the ranges entering the spot and the bet sizes allowed. It also includes the stack depth and the rake. The number of players matters too.',
          'Change any of these and the answer changes. A solution built on the wrong preflop ranges is a precise answer to the wrong question.',
        ],
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You bet the river with the equilibrium mix of value and bluffs. Villain folds every bluff catcher. How does your EV compare with villain calling at the right rate?',
        choices: ['The same', 'Higher', 'Lower'],
        answer: 0,
        explain:
          'Your bluffs make villain’s bluff catchers indifferent. So their choice to call or fold does not change your EV. Higher is the tempting answer. To profit from the overfolding, you must deviate and bluff more.',
      },
      {
        kind: 'quiz',
        question: 'What does unexploitable mean in a heads up spot?',
        choices: [
          'Your EV is the highest against any opponent',
          'Your EV cannot fall below the spot’s value',
          'Your EV in the spot is never negative',
        ],
        answer: 1,
        explain: 'The guarantee is a floor, not a maximum. The floor can be negative, as in the big blind. So never negative goes too far.',
      },
      {
        kind: 'quiz',
        question: 'Three players see a flop. You play an equilibrium strategy. Which is true?',
        choices: [
          'You cannot lose in expectation',
          'No equilibrium exists with three players',
          'Other players’ choices can still cost you',
        ],
        answer: 2,
        explain: 'The no loss guarantee belongs to two player zero sum games. Multiway, equilibria still exist. They just protect you far less.',
      },
      {
        kind: 'takeaway',
        points: [
          'GTO is a floor. It is unexploitable heads up, not maximally profitable.',
          'It earns nothing extra from mistakes between indifferent actions.',
          'Multiway, the guarantee disappears.',
          'Every solution depends on its ranges and sizes. Stacks and rake matter too.',
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
        body: 'A solver finds an equilibrium by playing both sides of a spot millions of times. Each time it shifts toward the actions it regrets not taking.',
      },
      {
        kind: 'text',
        title: 'Self play',
        body: [
          'The solver starts with some strategy for both players, often an even mix. Each iteration it walks the game tree. For every hand at every decision, it works out how each action would have done. It measures this against the opponent’s current strategy.',
          'Then it updates both strategies and repeats. This family of methods is counterfactual regret minimization, or CFR.',
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Regret matching',
        formula: 'Next mix ∝ positive regret',
        parts: [
          ['Regret', 'How much better an action would have done than the mix played, summed over iterations'],
          ['Positive', 'Actions with negative total regret get zero weight'],
        ],
        example: 'A hand has regret +6 for bet, +2 for check and −3 for fold. Next iteration it bets **75%** and checks **25%**. It never folds.',
      },
      {
        kind: 'text',
        title: 'The average converges',
        body: [
          'In two player zero sum games, the **average** strategy over all iterations converges to an equilibrium. The latest iteration’s strategy can keep cycling around it.',
          'Modern variants weight later iterations more heavily. That usually converges faster, and the idea is the same.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'You choose the tree',
        body: [
          'A solver cannot consider every possible bet size. You give it a short list of bet and raise sizes. It finds the best strategy within that tree.',
          'If a real opponent uses a size the tree leaves out, the solution does not cover it. Fewer sizes solve faster. More sizes describe the game better.',
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
          ['mbb/hand', 'Thousandths of a big blind per hand. 10 mbb/hand is 1bb/100.'],
          ['Zero', 'An exact equilibrium of that tree'],
        ],
        note: 'Solvers stop at a target you set. Exploitability is measured inside the tree, never against sizes it left out.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Reading a solution',
        body: [
          '**Frequencies** show how often each hand takes each action.',
          '**EV per hand** shows what each hand is worth under the strategy. It tells you which hands are close.',
          '**Aggregate reports** average one decision over many flops. They show patterns you can learn, instead of single boards you cannot.',
          'Start from the aggregate pattern. Then use the hand detail to see why the exceptions differ.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why hands mix',
        body: [
          'At equilibrium a hand only mixes when its actions have about equal EV. If one were clearly better, regret would push the hand fully into it. Hands near the border between two actions mix the most.',
          'So a mix tells you the hand is close to indifferent. The exact split matters for the balance of the range. It matters little for that hand’s own EV.',
          'Tiny mixes can also be leftovers from a solve that has not fully converged. There can also be several equilibria that split frequencies between combos differently.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Check the inputs before the output',
        body: 'Before trusting a solution, check the ranges entering the spot and the stack depth. Then check the sizes in the tree and the rake. Those decide the answer more than anything on the screen.',
      },
      {
        kind: 'quiz',
        question: 'In CFR, which strategy converges to an equilibrium?',
        choices: ['The strategy from the latest iteration', 'The average over all iterations', 'The single iteration with least regret'],
        answer: 1,
        explain: 'The latest strategy can keep cycling around the equilibrium. The average over iterations is what converges in two player zero sum games.',
      },
      {
        kind: 'quiz',
        question: 'A hand’s total regrets are raise +2, call +8 and fold −5. What does regret matching play next?',
        choices: ['Call 100%', 'Call 53%, raise 13% and fold 33%', 'Call 80% and raise 20%'],
        answer: 2,
        explain:
          'Only positive regret counts. Call gets 8 ÷ 10 = 80% and raise gets 2 ÷ 10 = 20%. Fold has negative regret, so it gets nothing. The 53/13/33 split wrongly counts the −5 as a weight.',
      },
      {
        kind: 'quiz',
        question: 'In a converged solution a hand bets 55% and checks 45%. What does that tell you?',
        choices: ['Betting and checking have about the same EV', 'Betting is slightly better for that hand', 'The solve has not finished converging'],
        answer: 0,
        explain:
          'Mixing happens at indifference. The split keeps the range balanced, and the hand earns about the same either way. Betting more often does not mean betting earns more.',
      },
      {
        kind: 'takeaway',
        points: [
          'Solvers play themselves and move toward actions with positive regret.',
          'The average strategy converges. You choose the tree of sizes.',
          'Exploitability is measured inside the tree.',
          'A mix means near indifference, not a precise order for that hand.',
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
        body: 'Full solutions use many sizes and mix hundreds of hands. Nobody plays that at the table. The skill is simplifying in ways that cost little. You also need to know the spots where it costs a lot.',
      },
      {
        kind: 'table',
        title: 'Common simplifications',
        columns: ['Simplification', 'What it gives up'],
        rows: [
          ['One bet size per spot', 'Value or folds where two sizes help'],
          ['Always take the main action', 'Balance, if many hands move together'],
          ['Range bet small', 'EV of hands that prefer to check'],
          ['Few sizes in the tree', 'Coverage of sizes opponents really use'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why mixed hands are cheap to purify',
        body: [
          'A hand that mixes is close to indifferent. Always taking one action with it costs that hand almost nothing. That holds as long as the opponent keeps playing the same way.',
          'The cost appears when many hands move the same way at once. Then your range’s frequencies shift. An opponent who notices can adjust against them.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Solve the simple game, do not round the full one',
        body: [
          'There are two ways to simplify. One rounds a full solution, for example by dropping the second size. The other solves the spot again with only the options you want to use.',
          'The second gives a balanced strategy for the simpler game. It picks again which hands bet when only one size exists. Rounding can leave ranges unbalanced.',
          'To measure a simplification, compare its EV with the full solution on the same ranges.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Small errors and big errors',
        body: [
          'These comparisons tend to find that a sensible simplification gives up little EV. One well chosen flop size in a single raised pot is a common example.',
          'Errors in the inputs usually cost much more. Defending the wrong range preflop is one. Folding far too often to c-bets is another. So is bluffing far too much on the river. These errors affect every hand that follows.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'When simplifying hurts',
        body: [
          'Simple rules lose more when the full strategy splits the range sharply. One example is betting big with some hands and checking many others. Range betting small on a low connected board as the preflop raiser is a costly case.',
          'Rivers are less forgiving, because value to bluff ratios matter more there. Errors also scale with the pot. So deep stacks and 3bet pots punish sloppy shortcuts more.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Study the full answer, play the simple one',
        body: 'Learn why the full solution does what it does. Then play a simple rule. Know the few spots where your rule breaks, and handle those by hand.',
      },
      {
        kind: 'quiz',
        question: 'A hand mixes bet 50% and check 50%. You always bet it. Against an opponent who does not adjust, what does that cost with that hand?',
        choices: ['About half its EV', 'Close to nothing', 'About 10% of the pot'],
        answer: 1,
        explain:
          'Mixing means the two actions are worth about the same for that hand. So picking one costs almost nothing. The 50% mix is not a 50% error. The risk is to your range’s balance, and only if the opponent adapts.',
      },
      {
        kind: 'quiz',
        question: 'Which simplification is the safest?',
        choices: [
          'Re-solve the spot with one size and play that solution',
          'Bet small with your whole range on every flop',
          'Round every mixed hand in the full solution to a bet',
        ],
        answer: 0,
        explain:
          'A restricted solve rebalances the range around the options you will use. Rounding moves many hands at once and can unbalance the range. A blanket small bet is costly on boards that favor the caller.',
      },
      {
        kind: 'quiz',
        question: 'Which error usually costs more?',
        choices: [
          'Using one c-bet size where the solution uses two',
          'Always betting a few close hands that mix',
          'Defending a much too wide range from the big blind',
        ],
        answer: 2,
        explain:
          'A wrong preflop range is an input error. It affects every flop that follows. A missing size or a purified close hand is a small, local loss in most spots.',
      },
      {
        kind: 'takeaway',
        points: [
          'Mixed hands are cheap to purify one at a time.',
          'Simplify by solving the simpler game, not by rounding.',
          'Wrong ranges cost more than missing sizes.',
          'Polarized spots and rivers punish shortcuts most. So do big pots.',
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
        note: 'Exact. All 1,712,304 boards were enumerated with Felt’s evaluator. Ties count as half. Other suit combinations differ slightly.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Not all flips are equal',
        body: [
          'A pair against two overcards is a small favorite. It has **55.6%** against offsuit AK. It has only **52.3%** when AK is suited, because of AK’s flush chances.',
          'AK against a small pair is the same matchup from the other side. A♠K♦ has **47.0%** against 2♣2♥.',
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
        note: 'Exact enumeration of every board. A♠K♦ and A♥Q♣ tie 4.6% of the time. That happens when the board plays or both make the same straight.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why domination hurts',
        body: [
          'When two hands share a card, that card helps neither. AQ mostly needs a queen to win. So AK holds **74.0%**, more than AK against a lower pair or two lower cards.',
          'This is why hands like AQ and KJ do badly calling large raises. The hands that keep going often hold the same high card with a better kicker.',
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
        note: 'Equity of the first hand, all in on the flop. Exact over all 990 turn and river runouts.',
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
        note: 'The turns are 3♠ and 2♠. Exact, since the draws win on 9 and 15 of the 44 rivers. A draw loses a large share of its equity when the turn misses.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Raw equity, one hand',
        body: 'These are all in numbers against one exact hand. In a real hand you face a range. With chips behind, position and playability decide how much raw equity you realize.',
      },
      {
        kind: 'quiz',
        question: 'Which matchup is closest to a true coin flip?',
        choices: ['A♠A♥ vs K♦K♣', 'A♠K♦ vs Q♥Q♣', 'A♠K♦ vs 2♣2♥', 'A♠K♦ vs A♥Q♣'],
        answer: 2,
        explain:
          'AK against a small pair is 47.0% to 53.0%. AK against QQ is 42.8%, a bit further from even. AA against KK is 81.3%, and AK against AQ is 74.0%.',
      },
      {
        kind: 'quiz',
        question: 'The flop is J♥T♥4♣. 9♥8♥ gets all in against A♠A♦. Who is the favorite?',
        choices: ['9♥8♥, with about 55%', 'A♠A♦, with about 65%', 'A♠A♦, with about 80%'],
        answer: 0,
        explain:
          'The draw has 15 outs with two cards to come. That is 9 hearts plus 6 more straight cards. It holds 55.4%. The overpair feels ahead, but 15 outs twice is a lot.',
      },
      {
        kind: 'quiz',
        question: 'You hold K♠Q♦ on K♥7♥2♣ and get all in against T♥9♥. What is your equity closest to?',
        choices: ['40%', '60%', '70%', '80%'],
        answer: 1,
        explain: 'The flush draw has 39.5%, so top pair holds 60.5%. The 40% answer is the draw’s share, not yours. You are a favorite, but far from safe.',
      },
      {
        kind: 'takeaway',
        points: [
          'AA against KK is 81.3%. A pair against two overcards is 52.3% to 55.6%.',
          'AK against AQ is 74.0%. Domination is brutal.',
          'A flush draw against top pair has 39.5% on the flop. A blank turn cuts it to 20.5%.',
          'A 15 out combo draw is a favorite over an overpair on the flop.',
        ],
      },
    ],
  },
];
