import { JANDA_ADVANCED, JANDA_APPLICATIONS } from './reading';
import type { LessonContent } from './types';

export const FOUNDATIONS_LESSONS: LessonContent[] = [
  {
    key: 'foundations/math/pot-odds',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: '33%' },
    steps: [
      {
        kind: 'intro',
        title: 'Every call has a price',
        body: 'Pot odds turn a bet into a number: the share of the final pot you need to win for a call to break even.',
      },
      {
        kind: 'formula',
        title: 'The price of a call',
        formula: 'Equity needed = call ÷ final pot',
        parts: [
          ['Call', 'What you put in now'],
          ['Final pot', 'Everything in the middle after you call'],
        ],
        example: 'The pot is 100 and villain bets 50. You call 50 to make a final pot of 200, so you need 50 ÷ 200 = **25%**.',
      },
      {
        kind: 'table',
        title: 'Learn these by heart',
        columns: ['Bet size', 'Equity to call'],
        rows: [
          ['1/4 pot', '16.7%'],
          ['1/3 pot', '20.0%'],
          ['1/2 pot', '25.0%'],
          ['2/3 pot', '28.6%'],
          ['3/4 pot', '30.0%'],
          ['Pot', '33.3%'],
          ['2x pot', '40.0%'],
        ],
        note: 'The required equity rises with bet size but never reaches 50%.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Put a number on your hand',
        cards: 'AhKh',
        board: 'Qh7h2c9s',
        caption: 'A flush draw on the turn has 9 outs among 46 unseen cards: **19.6%** to hit on the river.',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Compare against realized equity',
        body:
          'Pot odds are exact, but your equity is only worth what you realize. Out of position, or with a hand that often has to fold to a later bet, you keep less than your raw equity, so you need a better price than the table shows.',
      },
      {
        kind: 'quiz',
        question: 'Villain bets 75 into a pot of 100. What equity do you need to call?',
        choices: ['25%', '30%', '33%', '43%'],
        answer: 1,
        explain: 'You call 75 to make a final pot of 250. 75 ÷ 250 = 30%.',
      },
      {
        kind: 'quiz',
        question: 'Your flush draw (19.6%) faces a half pot bet on the turn (25% needed). On pot odds alone?',
        choices: ['Call, it is close', 'Fold, unless you win enough extra when you hit', 'Always raise'],
        answer: 1,
        explain: 'You are about 5 points short. Calling is only right if later winnings make up the gap: implied odds.',
      },
      {
        kind: 'takeaway',
        points: [
          'Equity needed = call ÷ final pot.',
          'Half pot 25%, pot 33.3%, twice pot 40%.',
          'Compare the price with the equity you will realize, not raw equity.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/ev',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: 'EV' },
    reading: [JANDA_APPLICATIONS],
    steps: [
      {
        kind: 'intro',
        title: 'The only number that matters',
        body: 'Expected value is the average result of a decision across every way the hand can go. Folding is the zero point; every other action is measured against it.',
      },
      {
        kind: 'formula',
        title: 'EV of a call',
        formula: 'EV(call) = equity × final pot − call',
        example: 'Villain bets 50 into 100. With 30% equity: 0.30 × 200 − 50 = **+10**. A profitable call even though you lose most of the time.',
      },
      {
        kind: 'formula',
        title: 'EV of a bet',
        formula: 'EV(bet) = fold% × pot + call% × (equity × (pot + 2 × bet) − bet)',
        example:
          'Bet 50 into 100. Villain folds 40%; when called you have 30% equity. 0.4 × 100 + 0.6 × (0.3 × 200 − 50) = 40 + 6 = **+46**. This ignores raises, which only lower it.',
      },
      {
        kind: 'text',
        title: 'Indifference: the engine of GTO',
        body: [
          'At equilibrium, every hand that mixes between two actions earns the same EV with each. If one action were better, it would be taken 100% of the time.',
          'The bettor bluffs exactly often enough to make the defender’s bluff catchers indifferent between calling and folding. The defender calls exactly often enough to make the bettor’s bluffs break even.',
          'That is why a GTO strategy cannot be exploited, and also why it does not punish mistakes as hard as possible. Exploiting starts when an opponent breaks the indifference.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'A bluff catcher facing a pot bet',
        columns: ['Villain bluffs', 'EV of calling 100 into 200'],
        rows: [
          ['20%', '−40'],
          ['33.3%', '0'],
          ['50%', '+50'],
        ],
        note: 'EV = bluff% × 200 − value% × 100. At one bluff for every two value bets, calling and folding are worth the same.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You bluff 75 into 100 with no equity. Villain folds half the time. Your EV?',
        choices: ['−12.5', '0', '+12.5', '+37.5'],
        answer: 2,
        explain: '0.5 × 100 − 0.5 × 75 = 50 − 37.5 = +12.5.',
      },
      {
        kind: 'quiz',
        question: 'Facing a pot sized river bet, you are sure villain bluffs only 20%. With a pure bluff catcher you should',
        choices: ['Call', 'Fold', 'Raise'],
        answer: 1,
        explain: 'Calling loses 40 per 100 called. Below one third bluffs, folding every bluff catcher is the best response.',
      },
      {
        kind: 'takeaway',
        points: [
          'Fold is zero; measure everything against it.',
          'Mixed hands are indifferent at equilibrium.',
          'Exploits come from opponents breaking that indifference.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/outs',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: '×4' },
    steps: [
      {
        kind: 'intro',
        title: 'Count outs, then multiply',
        body: 'An out is a card that makes you the best hand. Turning outs into a percentage takes one multiplication, plus one correction for big draws.',
      },
      {
        kind: 'formula',
        title: 'The rule of 2 and 4, corrected',
        formula: 'Flop: outs × 4 − (outs − 8) when outs > 8.  Turn: outs × 2',
        example: '15 outs on the flop: 60 − 7 = 53%. The exact figure is **54.1%**. Without the correction you would say 60%.',
      },
      {
        kind: 'table',
        title: 'Common draws, exact',
        columns: ['Draw', 'Outs', 'Flop to river', 'Turn to river'],
        rows: [
          ['Gutshot', '4', '16.5%', '8.7%'],
          ['Open ender', '8', '31.5%', '17.4%'],
          ['Flush draw', '9', '35.0%', '19.6%'],
          ['Flush and gutshot', '12', '45.0%', '26.1%'],
          ['Flush and open ender', '15', '54.1%', '32.6%'],
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Price one card at a time',
        body:
          'The flop column assumes you see both the turn and river. Facing a bet on the flop you usually pay to see only the turn, and may face another bet. When pricing a flop call, start from the one card number.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Discount dirty outs',
        body: 'A card that also improves villain is not a clean out. A heart that pairs the board can complete your flush and give villain a full house.',
      },
      {
        kind: 'quiz',
        question: 'Open ended straight draw on the turn. How often do you hit on the river?',
        choices: ['8.7%', '17.4%', '25.0%', '31.5%'],
        answer: 1,
        explain: '8 outs among 46 unseen cards: 17.4%.',
      },
      {
        kind: 'quiz',
        question: 'Flush draw plus gutshot on the flop (12 outs). The corrected estimate to the river?',
        choices: ['36%', '44%', '48%', '54%'],
        answer: 1,
        explain: '12 × 4 − (12 − 8) = 44%. The exact figure is 45.0%.',
      },
      {
        kind: 'takeaway',
        points: [
          'Flop: outs × 4, minus (outs − 8) above eight outs.',
          'Turn: outs × 2. Price flop calls one card at a time.',
          'Only count outs that make you the best hand.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/implied-odds',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: '+15' },
    steps: [
      {
        kind: 'intro',
        title: 'Money you have not won yet',
        body: 'When the price is too high for your draw, the call can still be right if you win enough extra on later streets when you hit. That extra is implied odds.',
      },
      {
        kind: 'formula',
        title: 'How much extra you need',
        formula: 'Extra needed when you hit = call ÷ equity − final pot',
        example:
          'Turn: pot 60, villain bets 20. You call 20 into a final pot of 100 with an open ender (8 of 46 cards). 20 ÷ (8/46) = 115, minus 100 = **15**. You must win 15 more on the river, on average, when you hit.',
      },
      {
        kind: 'text',
        title: 'What makes implied odds real',
        body: [
          'Deep stacks behind, a disguised draw, an opponent who pays off, and position, so you can size the river bet after seeing what they do.',
          'Obvious draws on boards where the draw completing scares the opponent are worth much less than the formula suggests.',
        ],
      },
      {
        kind: 'text',
        title: 'Reverse implied odds',
        body: [
          'Some hands win small pots and lose big ones: low flush draws, dominated top pairs like A5 on an ace high board, and one card straights.',
          'When you hit, you are sometimes second best and pay off a bigger hand. Those hands need a better price, not a worse one.',
        ],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Opponent dependent',
        body: 'Against players who call big river bets light, implied odds grow. Against tight players who fold when the draw completes, they shrink toward nothing.',
      },
      {
        kind: 'quiz',
        question: 'Turn: pot 30, villain bets 10. You call 10 with a flush draw (9 of 46). Roughly how much extra do you need when you hit?',
        choices: ['About 1', 'About 10', 'About 25', 'Nothing, the call is already priced'],
        answer: 0,
        explain: '10 ÷ (9/46) = 51.1, minus a final pot of 50 = about 1.1. Nearly priced in on its own.',
      },
      {
        kind: 'takeaway',
        points: [
          'Extra needed = call ÷ equity − final pot.',
          'Deep, disguised, in position: implied odds are real.',
          'Second best hands carry reverse implied odds.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/mdf-alpha',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '50%' },
    reading: [JANDA_APPLICATIONS],
    steps: [
      {
        kind: 'intro',
        title: 'Two sides of one bet',
        body: 'Alpha is how often a bluff must work. MDF is how often the defender must continue so bluffs cannot profit automatically. Together they set the balance of every polarized bet.',
      },
      {
        kind: 'formula',
        title: 'Alpha: what a bluff needs',
        formula: 'Alpha = bet ÷ (pot + bet)',
        example: 'Bet 50 into 100: 50 ÷ 150 = **33.3%**. A pure bluff profits if villain folds more than a third of the time.',
      },
      {
        kind: 'formula',
        title: 'MDF: what a defender owes',
        formula: 'MDF = pot ÷ (pot + bet) = 1 − alpha',
        example: 'Facing 50 into 100: 100 ÷ 150 = **66.7%**. Continue with at least two thirds of your range, or any two cards bluff profitably.',
      },
      {
        kind: 'table',
        title: 'Alpha, MDF and the balanced bluff share',
        columns: ['Bet size', 'Alpha', 'MDF', 'Bluffs in range'],
        rows: [
          ['1/3 pot', '25.0%', '75.0%', '20.0%'],
          ['1/2 pot', '33.3%', '66.7%', '25.0%'],
          ['3/4 pot', '42.9%', '57.1%', '30.0%'],
          ['Pot', '50.0%', '50.0%', '33.3%'],
          ['2x pot', '66.7%', '33.3%', '40.0%'],
        ],
        note: 'Bluff share = bet ÷ (pot + 2 × bet): the share of a polarized river range that makes bluff catchers indifferent.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Where MDF applies, and where it does not',
        body: [
          'MDF is cleanest on the river against a polarized range, where bluffs have no equity.',
          'On the flop and turn, bets with draws are not pure bluffs, and the defender’s range may simply be too weak. Equilibrium strategies often fold more than MDF on earlier streets, especially out of position.',
          'MDF also assumes villain might hold any two cards. When the bettor’s range is already strong, defending MDF just pays off value.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'A guide, not a law',
        body: 'In live low stakes games big river bets are weighted to value. Folding well below MDF there is usually the winning adjustment.',
      },
      {
        kind: 'quiz',
        question: 'You bet 3/4 pot on the river with a polarized range. What share of your bets should be bluffs?',
        choices: ['20%', '25%', '30%', '43%'],
        answer: 2,
        explain: '0.75 ÷ (1 + 1.5) = 30%. That makes villain’s bluff catchers indifferent.',
      },
      {
        kind: 'quiz',
        question: 'You bluff 3/4 pot with nothing. How often must villain fold to break even?',
        choices: ['30.0%', '42.9%', '57.1%', '75.0%'],
        answer: 1,
        explain: 'Alpha = 0.75 ÷ 1.75 = 42.9%.',
      },
      {
        kind: 'takeaway',
        points: [
          'Alpha = bet ÷ (pot + bet); MDF = 1 − alpha.',
          'Balanced bluff share = bet ÷ (pot + 2 × bet).',
          'MDF is a river concept; earlier streets can fold more.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/combos',
    level: 'core',
    minutes: 5,
    cover: { kind: 'cards', cards: 'AsKs' },
    steps: [
      {
        kind: 'intro',
        title: 'Not every hand is equally likely',
        body: 'Counting combos tells you how often villain has each hand, and the cards you can see change the count.',
      },
      {
        kind: 'table',
        title: 'Combos per hand',
        columns: ['Hand type', 'Example', 'Combos'],
        rows: [
          ['Pair', 'QQ', '6'],
          ['Suited', 'AKs', '4'],
          ['Offsuit', 'AKo', '12'],
          ['Unpaired, any suits', 'AK', '16'],
        ],
        note: 'AK is 2.7 times as common as AA.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Card removal',
        body: [
          'Every card you see removes combos. With one ace on the board, AA drops from 6 combos to **3**, and AK from 16 to **12**.',
          'Holding a card yourself does the same. This is why the cards in your hand change how often villain is bluffing or value betting.',
        ],
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'A blocker in action',
        cards: 'AsQd',
        board: 'Ks9s4s',
        caption: 'You hold the **ace of spades** on a three spade board. Villain can never have the nut flush.',
      },
      {
        kind: 'quiz',
        question: 'The board is K72 with three suits. You hold none of those ranks. How many set combos exist?',
        choices: ['6', '9', '12', '18'],
        answer: 1,
        explain: 'KK, 77 and 22 each have 3 combos left with one of each rank on the board: 9.',
      },
      {
        kind: 'quiz',
        question: 'You hold one ace and the board shows one king. How many AK combos are left for villain?',
        choices: ['6', '9', '12', '16'],
        answer: 1,
        explain: 'Three aces left times three kings left = 9.',
      },
      {
        kind: 'takeaway',
        points: ['Pairs 6, suited 4, offsuit 12.', 'Every visible card removes combos.', 'Count value and bluff combos before big decisions.'],
      },
    ],
  },
  {
    key: 'foundations/math/spr',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'figure', text: 'SPR' },
    reading: [JANDA_ADVANCED],
    steps: [
      {
        kind: 'intro',
        title: 'How deep is this pot, really?',
        body: 'Stack to pot ratio tells you how many pot sized bets are left. It decides which hands can happily get all in and which bet sizes make sense.',
      },
      {
        kind: 'formula',
        title: 'Stack to pot ratio',
        formula: 'SPR = effective stack ÷ pot on the flop',
        example: 'BTN opens 2.5bb, BB calls, 100bb deep: 97.5 ÷ 5.5 ≈ **17.7**. If BB 3bets to 11 and BTN calls: 89 ÷ 22.5 ≈ **4.0**.',
      },
      {
        kind: 'table',
        title: 'Pot types at 100bb',
        columns: ['Pot', 'SPR', 'What it means'],
        rows: [
          ['Single raised', '≈ 18', 'One pair rarely wants to play for stacks'],
          ['3bet pot', '≈ 4', 'Strong top pairs often go all in by the river'],
          ['4bet pot', '≈ 1.5', 'Almost any strong pair is committed'],
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Geometric sizing',
        formula: 'f = ((1 + 2 × stack ÷ pot)^(1/streets) − 1) ÷ 2',
        example:
          'The one pot fraction that gets stacks in evenly by the river. Single raised pot, three streets: **116%** of pot each street. 3bet pot: **54%**.',
      },
      {
        kind: 'text',
        title: 'Why geometric matters',
        body: [
          'A polarized range wants as much money in as possible with its best hands. Betting the same fraction each street does that while keeping every bet the same size relative to the pot.',
          'This is why equilibrium strategies use much smaller bets in low SPR pots and why big polarized lines in deep pots often include overbets.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Pot 10, effective stacks 35, two streets left. What geometric bet gets it in?',
        choices: ['50% pot', '75% pot', '91% pot', '150% pot'],
        answer: 2,
        explain: '(1 + 7)^(1/2) = 2.83; (2.83 − 1) ÷ 2 = 0.91. Bet 9.1, the pot becomes 28.3, then a 91% bet of 25.9 puts in the last 25.9.',
      },
      {
        kind: 'takeaway',
        points: [
          'SPR = stack ÷ pot. Single raised ≈ 18, 3bet ≈ 4.',
          'Lower SPR commits one pair hands.',
          'Geometric sizing spreads the stack evenly over the streets left.',
        ],
      },
    ],
  },
  {
    key: 'foundations/ranges/range-vs-range',
    level: 'advanced',
    minutes: 5,
    cover: { kind: 'figure', text: '≠' },
    reading: [JANDA_ADVANCED],
    steps: [
      {
        kind: 'intro',
        title: 'Averages hide the strategy',
        body: 'Two ranges can have exactly the same average equity and need completely different strategies. What matters is how that equity is spread.',
      },
      {
        kind: 'table',
        title: 'Same average, different shape',
        columns: ['Range', 'Equity of its hands', 'Average'],
        rows: [
          ['Polarized', 'Half at 90%, half at 10%', '50%'],
          ['Condensed', 'All near 50%', '50%'],
        ],
        note: 'An illustration of shape, not a real board.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What each shape wants',
        body: [
          'The polarized range wants to bet big. Its strong hands want maximum value and its weak hands can only win by bluffing.',
          'The condensed range wants to check and call. Betting big folds out worse hands and gets called by better ones.',
          'An equity distribution graph shows this: sort a range’s hands by equity against the other range and plot them. Steep at both ends means polarized; flat in the middle means condensed.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Your river range is all medium strength hands. The best default is',
        choices: ['Overbet for value', 'Check, and call some bets', 'Bluff with the weakest'],
        answer: 1,
        explain: 'A condensed range gets folds from worse and calls from better when it bets big. Check and bluff catch.',
      },
      {
        kind: 'takeaway',
        points: ['Look at the distribution, not just the average.', 'Polarized ranges bet big.', 'Condensed ranges check and catch.'],
      },
    ],
  },
  {
    key: 'foundations/ranges/advantages',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'KcKd' },
    reading: [JANDA_ADVANCED],
    steps: [
      {
        kind: 'intro',
        title: 'Two kinds of advantage',
        body: 'Range advantage is having more equity overall. Nut advantage is having more of the very best hands. They drive different decisions.',
      },
      {
        kind: 'table',
        title: 'What each advantage changes',
        columns: ['Advantage', 'Drives', 'Typical result'],
        rows: [
          ['Range', 'How often you bet', 'Bet a wide range, often small'],
          ['Nut', 'How big you bet', 'Larger bets and overbets'],
          ['Both', 'Both', 'Bet often, sizes can grow'],
          ['Neither', 'Checking', 'Check more, defend well'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'K72 rainbow, BTN vs BB',
        board: 'Ks7d2c',
        caption:
          'BB 3bets KK and AK preflop, so its calling range has almost none of the best top pairs. Against that range, **20%** of BTN hands have 80% equity or more, against **11%** of BB hands. BTN has both advantages and bets small with most of its range.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: '765 two tone, BTN vs BB',
        board: '7h6h5c',
        caption:
          'BB defends many more low connected hands: **9.6%** of its range already has two pair or better, against **5.0%** of BTN’s. BTN keeps the overpairs, but its overall equity edge is gone. BTN checks far more here.',
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'The numbers behind both boards',
        columns: ['Flop', 'BTN equity', 'Strong hands', 'Two pair+'],
        rows: [
          ['K♠7♦2♣', '54%', '20 vs 11%', '2.5 vs 2.9%'],
          ['7♥6♥5♣', '48%', '4 vs 6%', '5.0 vs 9.6%'],
        ],
        note: 'BTN vs BB in each column. Strong hands: share of the range with 80% or more equity against the other range. Computed by Monte Carlo from Felt’s starter charts (BTN 2.5bb open, BB calls).',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'The turn gives you many more nut hands, and villain’s check call capped their range. Your size family?',
        choices: ['Small and frequent', 'Large or overbet, polarized', 'Always check'],
        answer: 1,
        explain: 'Nut advantage against a capped range is exactly when big polarized bets earn the most.',
      },
      {
        kind: 'takeaway',
        points: [
          'Range advantage decides how often you bet.',
          'Nut advantage decides how big.',
          'Preflop ranges, especially who 3bets what, decide who has each.',
        ],
      },
    ],
  },
  {
    key: 'foundations/ranges/range-shapes',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'figure', text: '⟷' },
    reading: [JANDA_APPLICATIONS],
    steps: [
      {
        kind: 'intro',
        title: 'Linear, polarized, condensed',
        body: 'Every bet or check is a range with a shape. Naming the shape tells you what the range can do and how to attack it.',
      },
      {
        kind: 'table',
        title: 'Three shapes',
        columns: ['Shape', 'Contains', 'Used for'],
        rows: [
          ['Linear', 'Best hands down to a cutoff', 'Value betting against callers'],
          ['Polarized', 'Very strong hands and bluffs', 'Large bets, river bets'],
          ['Condensed', 'Mostly medium hands', 'Checking, calling'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Protect your checking range',
        body: [
          'If you bet every strong hand, your checks contain only weak and medium hands. Opponents can then bet into your checks with anything.',
          'Checking some strong hands keeps your checking range able to fight back. Equilibrium strategies do this all the time, especially out of position and when the betting range is small.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Facing a polarized bet',
        body: [
          'Against nuts or air, your medium hands are pure bluff catchers. Whether they call depends only on how often the bettor bluffs, which is what the bluff share and MDF numbers describe.',
        ],
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'Your river range after betting flop and turn is near nuts or busted draws. Which bet suits it?',
        choices: ['Small block bet', 'Large polarized bet', 'Check everything'],
        answer: 1,
        explain: 'A polarized range wants large bets: maximum value from the nuts, maximum fold equity for the bluffs.',
      },
      {
        kind: 'quiz',
        question: 'Why check back some strong hands on the flop?',
        choices: ['Only to trap', 'So your checking range is not capped and cannot be attacked freely', 'Betting strong hands loses value'],
        answer: 1,
        explain: 'Balance across actions keeps every line defensible. It is about the range, not the single hand.',
      },
      {
        kind: 'takeaway',
        points: ['Linear for value against callers.', 'Polarized for big bets.', 'Keep strong hands in your checks.'],
      },
    ],
  },
  {
    key: 'foundations/ranges/equity-realization',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: 'IP' },
    steps: [
      {
        kind: 'intro',
        title: 'Equity you actually collect',
        body: 'Raw equity assumes every hand reaches showdown. In real hands you fold some of it away. The share you keep is equity realization.',
      },
      {
        kind: 'formula',
        title: 'Realization',
        formula: 'Realized equity = raw equity × realization factor',
        example: 'A factor above 1 means a hand wins more than its raw share, through position and good play. Below 1 means it gets pushed off its equity.',
      },
      {
        kind: 'text',
        title: 'What drives it',
        body: [
          '**Position**: acting last you see villain’s action first, take free cards and control the pot size. In position hands can realize more than 100% of their raw equity.',
          '**Playability**: suited and connected hands make strong draws and nut hands; offsuit, disconnected and dominated hands get pushed off their equity.',
          '**Range strength**: a capped range realizes less because it cannot stand up to pressure.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Playability matters',
        cards: 'Ts9s',
        caption: 'T9s has less raw equity than many offsuit broadway hands, but flushes, straights and strong draws let it keep its equity on far more boards.',
      },
      {
        kind: 'quiz',
        question: 'Why does the big blind fold some hands that have more than the 27% raw equity it needs against a button open?',
        choices: ['Rake only', 'Out of position, those hands realize too little of that equity', 'MDF says so'],
        answer: 1,
        explain: 'Raw equity overstates what an out of position, poorly playable hand will actually win.',
      },
      {
        kind: 'takeaway',
        points: ['Realized equity = raw × realization.', 'Position and playability raise it.', 'Price calls against what you will realize.'],
      },
    ],
  },
];
