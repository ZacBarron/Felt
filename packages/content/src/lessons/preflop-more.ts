import type { LessonContent } from './types';

export const PREFLOP_MORE_LESSONS: LessonContent[] = [
  {
    key: 'preflop/vs-open/cold-3bet',
    level: 'core',
    minutes: 7,
    cover: { kind: 'cards', cards: 'As5s' },
    steps: [
      {
        kind: 'intro',
        title: 'Raise it or leave it',
        body: 'Facing an open from any seat but the big blind, modern cash strategies mostly 3bet or fold. Calling is kept for a few seats and a few hands. This lesson covers why, which hands 3bet, and how big.',
      },
      {
        kind: 'text',
        title: 'Why calling loses its place',
        body: [
          'A call leaves players behind you to act. They can squeeze, or call cheaply and make the pot multiway, where your medium hands do badly. A 3bet usually folds them out.',
          'A call also hands the initiative to the opener and caps your range, since your best hands would have 3bet. A 3bet can win the pot right away, which a call never does.',
          'From seats like the HJ or CO facing an early open, flatting shrinks to a small range or disappears. The small blind is the clearest case of all.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'What a 3bet bluff needs',
        formula: '7.5 ÷ (4 + 7.5) = 65.2%',
        parts: [
          ['Pot before you act', '0.5 + 1 + 2.5 = 4bb'],
          ['You risk', '7.5bb'],
        ],
        example:
          'A 3bet to 7.5bb with zero equity needs everyone to fold **65.2%** of the time. Real 3bet bluffs do not need that much: they have equity when called and play the flop with position or the initiative.',
      },
      {
        kind: 'table',
        title: 'Two shapes of 3bet range',
        columns: ['Shape', 'Contains', 'More common'],
        rows: [
          ['Linear', 'Best hands in order, down to hands like AJs, KQs, TT', 'Vs wide late opens; 3bet or fold seats'],
          ['Polarized', 'Premiums plus blocker hands like A5s, A4s', 'Vs tight early opens; when you also call'],
        ],
        note: 'Directional. Real ranges sit between the two and mix at the edges.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why the shape changes',
        body: [
          'Against a wide late open, many hands like AJs, KQs and 99 are well ahead of what calls the 3bet, so they 3bet for value. When you have no calling range, the hands that would have called have to go somewhere, and the best of them 3bet. That makes the range linear. In position you also realize your equity well when called, which helps these medium strong hands.',
          'Against a tight early open, those same hands are dominated by the range that continues. The 3bet range becomes premiums plus hands like A5s and A4s: the ace makes AA and AK less likely, and the hand still has straight and flush equity when called.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Sizing',
        columns: ['Spot', 'Size', 'Vs 2.5bb open'],
        rows: [
          ['In position', 'About 3x', '7.5bb'],
          ['Out of position', 'About 4x', '10bb, often up to 11 or 12bb'],
        ],
        note: 'Common conventions in line with solver outputs. Felt’s starter BB chart 3bets to 11bb against the button.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why bigger out of position',
        body: [
          'Out of position you realize less of your equity, so you charge more for the call and leave less room to play after the flop.',
          'A 3bet to 7.5bb that gets called leaves a pot of 16.5bb with 92.5bb behind: SPR **5.6**. A small blind 3bet to 10bb against the button, called, leaves 21bb with 90bb behind: SPR **4.3**.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'When openers call too much',
        body: 'Many live players call 3bets with dominated hands and rarely fold to them. If your logs show that, 3bet a wider value range, size up, and cut the pure bluffs. Against openers who fold too often, add more blocker bluffs.',
      },
      {
        kind: 'quiz',
        question: 'The HJ opens 2.5bb and you are in the cutoff. Why do modern strategies call so rarely here?',
        choices: [
          'Calling is always a losing play outside the big blind',
          'Players behind can squeeze or join, and your capped range plays the pot without the initiative',
          'A 3bet always wins more than a call with every hand',
        ],
        answer: 1,
        explain: 'Calling is not losing by rule. It loses value here because the button and blinds act behind you, and your flat range is capped because the best hands 3bet.',
      },
      {
        kind: 'quiz',
        question: 'UTG opens and you are on the button. Which hand is the typical polarized 3bet bluff?',
        choices: ['A♠5♠', 'K♦J♣', '7♥6♦'],
        answer: 0,
        explain: 'A5s makes AA and AK less likely and has straight and flush equity when called. KJo is dominated by an early range, and 76o has neither blockers nor playability.',
      },
      {
        kind: 'quiz',
        question: 'The cutoff opens 2.5bb. What is a common 3bet size from the button?',
        choices: ['5bb', '12.5bb', '7.5bb'],
        answer: 2,
        explain: 'In position about 3 times the open: 7.5bb. Out of position you would go to about 4 times, 10bb or a little more.',
      },
      {
        kind: 'takeaway',
        points: [
          'Outside the big blind, 3bet or fold is the default. Calls are the exception.',
          'Linear vs wide late opens; premiums plus blocker hands like A5s vs tight early opens.',
          'About 3x in position, about 4x out of position.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/flatting',
    level: 'core',
    minutes: 6,
    cover: { kind: 'cards', cards: '8h7h' },
    steps: [
      {
        kind: 'intro',
        title: 'Calling with a reason',
        body: 'Calling an open is a real option in two seats: the button and the big blind. Everywhere else it is small or gone. When you do call, choose hands that play well after the flop.',
      },
      {
        kind: 'text',
        title: 'Where calling is allowed',
        body: [
          '**Button**: only the blinds act behind you, and you have position on every later street against the opener.',
          '**Big blind**: you close the action and already have 1bb in, so the price is the best at the table.',
          'In the cutoff and earlier, players behind can squeeze or join, and calling ranges shrink to a few hands. In the small blind, the big blind still acts behind and you are out of position, so calling is rare.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Button vs a LJ open',
        columns: ['Hand', 'Usually', 'Why'],
        rows: [
          ['66', 'Call', 'Sets win big pots'],
          ['8♥7♥', 'Call', 'Straights and flushes, plays well in position'],
          ['A♠5♠', 'Mix 3bet', 'Blockers; still playable'],
          ['K♦J♣', 'Fold', 'Dominated by AK, KQ, AJ'],
          ['Q♣9♦', 'Fold', 'Dominated, few strong flops'],
        ],
        note: 'Directional. Exact mixes depend on rake and on how often the blinds squeeze.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'What makes a good flat',
        body: [
          'Good flats make strong hands that win big pots: pairs, suited connectors, suited broadways and suited aces below the 3bet range. They also keep their value when the pot stays small.',
          'Bad flats are offsuit hands that make second best pairs. KJo against an early open loses big pots to AK, KQ and AJ and wins small ones.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Set mining',
        formula: '1 − C(48,3) ÷ C(50,3) = 11.8%',
        example:
          'A pocket pair flops a set or better **11.8%** of the time, about 1 in 8.5. Calling 2.5bb to win 4bb with a set as your only plan needs about **14.8bb** more on average from later streets when you hit. Sets do not always win, and pairs win some pots unimproved, so treat this as a rough check.',
      },
      {
        kind: 'text',
        title: 'The squeeze risk',
        body: [
          'A flat is capped: your best hands would have 3bet. The blinds know that, and a squeeze against an open and a capped caller works often.',
          'When you are squeezed, most of your flats must fold, and the 2.5bb you put in is gone. The more often the blinds squeeze, the tighter the button should flat.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Rake hits called pots',
        body: 'In most games a pot that ends before the flop is not raked: no flop, no drop. Called pots see a flop and pay rake. That is one reason raked strategies prefer 3bet or fold, and why a high rake trims the weakest flats first.',
      },
      {
        kind: 'quiz',
        question: 'The LJ opens 2.5bb. On the button, which hand is the clearest flat?',
        choices: ['K♠T♦', 'Q♣9♦', '6♠6♥'],
        answer: 2,
        explain: 'A small pair flops a set about 12% of the time and plays well in position. KTo and Q9o are dominated by an early range and usually fold.',
      },
      {
        kind: 'quiz',
        question: 'How often does a pocket pair flop a set or better?',
        choices: ['About 4%', 'About 12%', 'About 25%'],
        answer: 1,
        explain: '1 − C(48,3) ÷ C(50,3) = 11.8%, about 1 in 8.5.',
      },
      {
        kind: 'quiz',
        question: 'Why is a button flat vulnerable to a squeeze from the blinds?',
        choices: ['It is capped, because your best hands would have 3bet', 'The button is out of position after the flop', 'Flats are always weaker than the blinds’ ranges'],
        answer: 0,
        explain: 'Your calling range lacks the top hands, so a squeeze folds out most of it. Position is not the issue: the button is in position against everyone.',
      },
      {
        kind: 'takeaway',
        points: [
          'Flat mainly from the button and the big blind.',
          'Good flats: pairs, suited connectors, suited broadways. Bad flats: dominated offsuit hands.',
          'Flats are capped and pay rake. Tighten them when the blinds squeeze or the rake is high.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/sb-vs-open',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: '33%' },
    steps: [
      {
        kind: 'intro',
        title: 'The worst seat to call from',
        body: 'The small blind facing an open is out of position for the whole hand, and the big blind still acts behind. In raked games, strategies here are mostly 3bet or fold.',
      },
      {
        kind: 'table',
        title: 'The blinds’ price against a 2.5bb open',
        columns: ['Seat', 'Calls', 'Pot after', 'Needs'],
        rows: [
          ['BB', '1.5bb', '5.5bb', '27.3%'],
          ['SB', '2bb', '6bb', '33.3%'],
        ],
        note: 'Raw equity, before realization. The small blind’s call also leaves the big blind to act.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why 3bet or fold',
        body: [
          'A call pays a worse price than the big blind, plays out of position against the opener, and invites the big blind in. It can squeeze you, or call cheaply and make the pot multiway with you first to act.',
          'A 3bet takes the initiative, often wins the pot at once, and usually folds the big blind out. Modern raked solutions keep at most a small calling range here.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'What the range looks like',
        body: [
          'Against a wide button open, the 3bet range is wide and fairly linear: strong pairs, broadways, suited aces and good suited hands.',
          'Against an early open it is much tighter, built on premiums plus some blocker hands like A5s. Most of the range folds.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Size it up',
        formula: '3bet to about 4 to 5 times the open',
        example:
          'Against a 2.5bb open, about 10 to 12bb. Out of position you want a lower SPR, and a bigger size makes it harder for the big blind to come along. A 3bet to 11bb with no equity risks 10.5 more to win 4, so it needs folds **72.4%** of the time. Equity when called makes up the rest.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Read the opener',
        body: 'If an opener rarely folds to 3bets, 3bet a wider value range and cut the bluffs. If an opener folds too often, 3bet more blocker hands. Check either read against your own logs before leaning on it.',
      },
      {
        kind: 'quiz',
        question: 'The button opens to 2.5bb. In the small blind, what raw equity does a call need?',
        choices: ['27%', '33%', '40%'],
        answer: 1,
        explain: 'You add 2bb to a 4bb pot: 2 ÷ 6 = 33.3%. The big blind gets 27% because it already has 1bb in.',
      },
      {
        kind: 'quiz',
        question: 'Button opens 2.5bb. What is a typical small blind 3bet size?',
        choices: ['11bb', '7.5bb', '6bb'],
        answer: 0,
        explain: 'Out of position the small blind uses about 4 to 5 times the open, 10 to 12bb. 7.5bb is an in position size.',
      },
      {
        kind: 'quiz',
        question: 'Which is not a reason the small blind rarely flats?',
        choices: ['The big blind acts behind and can squeeze', 'You are out of position for the whole hand', 'The small blind always has the best hand when it calls'],
        answer: 2,
        explain: 'The first two are why the call loses value. The third is false: a flat range is capped, since the best hands 3bet.',
      },
      {
        kind: 'takeaway',
        points: [
          'Small blind vs an open: mostly 3bet or fold.',
          'Calling needs 33% raw, out of position, with the big blind behind.',
          '3bet to about 4 to 5 times the open.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/squeeze',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'figure', text: '6.5' },
    steps: [
      {
        kind: 'intro',
        title: 'An open and a call is an invitation',
        body: 'When someone opens and another player calls, there is extra money in the pot and the caller has told you their range is capped. A squeeze is a 3bet that attacks both.',
      },
      {
        kind: 'formula',
        title: 'Dead money',
        formula: '2.5 + 2.5 + 0.5 + 1 = 6.5bb',
        parts: [
          ['CO opens', '2.5bb'],
          ['BTN calls', '2.5bb'],
          ['Blinds', '0.5bb + 1bb'],
        ],
        example: 'In the big blind you face a pot of **6.5bb**, against 4bb after an open alone. A squeeze that folds both players wins all of it.',
      },
      {
        kind: 'text',
        title: 'The capped caller',
        body: [
          'A player who flats an open would usually have 3bet their best hands. What is left is medium pairs, suited connectors and suited broadways, and most of it folds to a squeeze.',
          'The opener is caught in the middle: even a call leaves the caller still to act behind, so the opener continues tighter than against a plain 3bet.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Sizing',
        columns: ['Spot', 'Rule', 'One caller'],
        rows: [
          ['In position', '3x open + 1 open per caller', '7.5 + 2.5 = 10bb'],
          ['Out of position', '4x open + 1 open per caller', '10 + 2.5, about 13bb'],
        ],
        note: 'Common conventions in line with solver outputs. Each caller adds money and another player who can continue, so the size grows.',
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Folds a pure bluff needs',
        columns: ['Play', 'Risk', 'Pot', 'Folds'],
        rows: [
          ['BB 3bets 11 vs BTN', '10bb', '4bb', '71.4%'],
          ['BB squeezes 13 vs CO + BTN', '12bb', '6.5bb', '64.9%'],
        ],
        note: 'Zero equity when called. The folds figure is the chance that everyone folds. The extra dead money pays for the bigger size.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Hand selection',
        body: [
          'Value: QQ+ and AK, and against a late opener more strong hands like JJ, TT and AQ.',
          'Bluffs: suited aces like A5s to A2s and suited hands with blockers. They make AA and AK less likely and keep straight and flush equity when called.',
          'Avoid dominated offsuit hands. When a squeeze is called you usually play a big pot out of position: squeeze to 13bb, the opener calls, the button folds, and the pot is 29bb with 87bb behind, an SPR of **3**.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Know who traps',
        body: 'Some live players flat AA and KK to trap, so their calling range is not always capped. Others call almost any squeeze. Against frequent callers, squeeze more for value and bluff less. Check both tendencies against your logs.',
      },
      {
        kind: 'quiz',
        question: 'The CO opens 2.5bb and the button calls. How much is in the pot when the big blind acts?',
        choices: ['4bb', '5bb', '6.5bb', '7.5bb'],
        answer: 2,
        explain: '2.5 + 2.5 + 0.5 + 1 = 6.5bb. The big blind’s own 1bb counts, since it is in the pot.',
      },
      {
        kind: 'quiz',
        question: 'The HJ opens 2.5bb and the CO calls. Using 3x plus one open per caller, what is the button’s squeeze size?',
        choices: ['7.5bb', '10bb', '15bb'],
        answer: 1,
        explain: '3 × 2.5 = 7.5, plus 2.5 for the caller: 10bb.',
      },
      {
        kind: 'quiz',
        question: 'Why does a squeeze to 13bb need fewer folds than a 3bet to 11bb against a single open?',
        choices: ['More dead money in the pot pays for the bigger size', 'The caller always folds', 'Squeezes are never called'],
        answer: 0,
        explain: 'Risking 12 to win 6.5 needs 64.9% folds; risking 10 to win 4 needs 71.4%. Callers do not always fold, they fold often because their range is capped.',
      },
      {
        kind: 'takeaway',
        points: [
          'Open plus call means more dead money and a capped caller.',
          'Add about one open size per caller to your 3bet size.',
          'Value plus blocker bluffs like A5s; avoid dominated offsuit hands.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/vs-3bet',
    level: 'core',
    minutes: 7,
    cover: { kind: 'figure', text: '38%' },
    steps: [
      {
        kind: 'intro',
        title: 'Your open got 3bet',
        body: 'Now you choose between folding, calling and 4betting. The price, your position and how strong your opening range was decide the mix.',
      },
      {
        kind: 'table',
        title: 'The price to call',
        columns: ['Spot', 'Call', 'Pot after', 'Needs'],
        rows: [
          ['BTN vs BB 3bet to 11', '8.5bb', '22.5bb', '37.8%'],
          ['CO vs BTN 3bet to 7.5', '5bb', '16.5bb', '30.3%'],
        ],
        note: 'Opens of 2.5bb, other players folded. Raw equity before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'In position vs out of position',
        body: [
          'In position you realize more of your equity, so calling is the main way to continue. The out of position 3bettor sizes up, which makes your price worse, but position makes up for much of it.',
          'Out of position the price is often better, because the 3bettor sized small, but you realize less. Hands that need to realize equity, like small pairs and weak suited connectors, lose value, and the strategy leans more on folding and 4betting.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Lower SPR after a call',
        body: [
          'BTN calls a 3bet to 11bb: pot 22.5bb, 89bb behind, SPR **4.0**. CO calls a 3bet to 7.5bb: pot 16.5bb, 92.5bb behind, SPR **5.6**.',
          'At these SPRs a good top pair often gets all in by the river, so hands that make strong top pairs and nut draws gain value.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Continue in three ways',
        columns: ['Action', 'Typical hands'],
        rows: [
          ['4bet value', 'QQ+ and AK, some of them mixed with calls'],
          ['4bet bluff', 'Suited wheel aces like A5s, A4s'],
          ['Call', 'Medium pairs, AQ, AJs, KQs, suited connectors (more in position)'],
          ['Fold', 'Weak offsuit hands and the worst suited hands'],
        ],
        note: 'Directional, for a late open facing a 3bet at 100bb. Seats, sizes and rake shift the mix.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Early opens fold less',
        body: [
          'A UTG range is already strong. In Felt’s starter charts, QQ+ and AK are **22%** of the UTG range but only **6%** of the button range. Most of a button range is hands that were fine to open and cannot stand a 3bet.',
          'So early openers continue with a larger share of their range against a 3bet, and button openers fold a larger share.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 3bets',
        body: 'In many live games, 3bets lean heavily toward value, especially from players who rarely 3bet. Against them, fold more and call less with dominated hands. Against frequent 3bettors, call more in position and add 4bet bluffs. Verify with your logs.',
      },
      {
        kind: 'quiz',
        question: 'You open the button to 2.5bb and the big blind 3bets to 11bb. What raw equity does a call need?',
        choices: ['27%', '38%', '50%'],
        answer: 1,
        explain: 'Call 8.5 into a pot of 14 (11 + 2.5 + 0.5): 8.5 ÷ 22.5 = 37.8%.',
      },
      {
        kind: 'quiz',
        question: 'Why does a UTG opener fold a smaller share of its range to a 3bet than a button opener?',
        choices: ['UTG is always in position', 'The 3bet is always smaller against UTG', 'Its range is much stronger to begin with'],
        answer: 2,
        explain: 'In Felt’s charts, QQ+ and AK are 22% of the UTG range and 6% of the button range. The button opened many hands that cannot continue.',
      },
      {
        kind: 'quiz',
        question: 'You open K♣9♦ on the button and the big blind 3bets to 11bb. The usual play?',
        choices: ['Fold', 'Call', '4bet'],
        answer: 0,
        explain: 'K9o is dominated by much of a 3bet range, has no blocker value worth a 4bet, and plays poorly in a bloated pot.',
      },
      {
        kind: 'takeaway',
        points: [
          'Price: about 38% to call a big blind 3bet to 11, about 30% against a 3bet to 7.5.',
          'In position, call more. Out of position, fold and 4bet more.',
          'Strong early ranges continue more often than wide button ranges.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/4bet',
    level: 'advanced',
    minutes: 8,
    cover: { kind: 'figure', text: '27' },
    steps: [
      {
        kind: 'intro',
        title: 'Four bets in, stacks are next',
        body: 'At 100bb a 4bet commits a large share of the stack. Ranges get narrow, blockers matter a lot, and the 5bet is all in.',
      },
      {
        kind: 'text',
        title: 'What 4bets',
        body: [
          'Value: mostly QQ+ and AK. Against wide 3bettors, more hands join; against tight ones, even QQ and AK often prefer to call.',
          'Bluffs: mostly suited aces like A5s and A4s. They make the 3bettor’s best hands less likely and keep equity when called.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Blockers, counted',
        columns: ['Your hand', 'QQ+, AK left', 'AA left'],
        rows: [
          ['None', '34', '6'],
          ['A♠5♠', '27', '3'],
          ['K♠5♠', '27', '6'],
          ['7♠6♠', '34', '6'],
        ],
        note: 'Exact combo counts after removing your two cards.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why the ace, not the king',
        body: [
          'A5s and K5s remove the same 7 combos of QQ+ and AK. But the ace halves AA, the hand that never folds, and the ace plays better when called.',
          'A♠5♠ has about **30%** equity against QQ+ and AK. K♠5♠ has about **24%**, and so does A♠Q♦, which is dominated by AK, AA and QQ.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Sizing',
        columns: ['Spot', 'Size', 'Example'],
        rows: [
          ['In position', 'About 2.2 to 2.5x the 3bet', '11bb 3bet: 4bet to about 25bb'],
          ['Out of position', 'Larger, often near 3x', '7.5bb 3bet: 4bet to about 22bb'],
        ],
        note: 'Common conventions in line with solver outputs.',
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'What a 4bet bluff needs',
        formula: '22.5 ÷ (14.5 + 22.5) = 60.8%',
        parts: [
          ['Pot before you act', '11 + 2.5 + 1 = 14.5bb'],
          ['You add', '22.5bb'],
        ],
        example: 'BTN opens 2.5bb, SB 3bets to 11bb, BB folds, BTN 4bets to 25bb. A pure bluff needs **60.8%** folds. A5s gets some of the rest back with its equity when called.',
      },
      {
        kind: 'text',
        title: 'SPR makes the 5bet all in',
        body: [
          'If the small blind calls the 4bet to 25bb, the pot is 51bb with 75bb behind: SPR **1.5**. There is no room for a smaller 5bet, so the 5bet is a shove.',
          'Facing that shove, the button calls 75bb into a pot of 126bb and needs **37.3%**. A♠5♠ has only about **29%** against KK+ and AK, so the bluff folds.',
          'Calling a 4bet at this SPR commits you on most flops. Continue with hands that are happy to get the money in, or shove.',
        ],
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You hold A♠5♠. How many combos of QQ+ and AK can villain hold?',
        choices: ['34', '27', '24', '21'],
        answer: 1,
        explain: 'AA drops from 6 to 3 and AK from 16 to 12. KK and QQ stay at 6 each: 3 + 6 + 6 + 12 = 27.',
      },
      {
        kind: 'quiz',
        question: 'At 100bb, a 4bet to 25bb is called with 1bb dead. What is the SPR?',
        choices: ['About 1.5', 'About 4', 'About 10'],
        answer: 0,
        explain: 'Pot 25 + 25 + 1 = 51bb, 75bb behind: 75 ÷ 51 = 1.5. That is why the 5bet is all in.',
      },
      {
        kind: 'quiz',
        question: 'Why is A5s a better 4bet bluff than K5s, though both remove 7 combos of QQ+ and AK?',
        choices: ['K5s has more equity when called', 'A5s is strong enough to call a shove', 'The ace halves AA and plays better when called'],
        answer: 2,
        explain: 'A5s cuts AA from 6 combos to 3 and has about 30% against QQ+ and AK, against 24% for K5s. It still folds to a shove, needing 37.3% with about 29%.',
      },
      {
        kind: 'takeaway',
        points: [
          'Value: QQ+ and AK. Bluffs: suited wheel aces.',
          'Count blockers: A5s leaves 27 combos of QQ+ and AK, and only 3 of AA.',
          'About 2.2 to 2.5x in position, larger out of position. After a called 4bet, SPR is about 1.5 and the 5bet is all in.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/bvb',
    level: 'core',
    minutes: 6,
    cover: { kind: 'chart', chartId: '9max-100-rfi-sb' },
    practice: ['9max-100-rfi-sb'],
    steps: [
      {
        kind: 'intro',
        title: 'Two players, wide ranges',
        body: 'When everyone folds to the small blind, the two blinds fight over a pot neither chose to enter. Ranges are the widest in the game, and the big blind has position.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-sb',
        title: 'Small blind raise only, about 42%',
        caption: 'Felt’s starter chart raises to 3bb and folds the rest. It leaves out limping, which solvers also use.',
      },
      {
        kind: 'text',
        title: 'Raise size',
        body: [
          'The small blind acts first on every later street, so it raises a bit bigger than a 2.5bb open: about 3bb in a raise only strategy.',
          'A bigger raise charges the big blind more to use its position and wins more pots right away.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'The big blind’s price',
        columns: ['Open', 'BB calls', 'Needs', 'BB is'],
        rows: [
          ['BTN 2.5bb', '1.5bb', '27.3%', 'Out of position'],
          ['SB 3bb', '2bb', '33.3%', 'In position'],
        ],
        note: 'Raw equity. Position changes how much of it the big blind realizes.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'The big blind fights back',
        body: [
          'The price against the small blind is worse, but the big blind has position and faces a very wide range. So it still defends very wide.',
          'It also 3bets more than it does against the button, with a fairly linear range, to about 3 times the open: 9bb against a 3bb raise. The small blind then calls 6 into 12 and needs 33.3%, out of position.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Limps are part of the real strategy',
        body: [
          'With rake, solver strategies for the small blind limp a large part of the range, some strong hands included. Against a limp, the big blind raises often in position and checks the rest.',
          'Raise only is a simpler baseline that gives up a little EV. It is the fair starting point until you can balance a limping range.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Blind tendencies to check',
        body: 'Some players fold the small blind far too often, and some big blinds rarely 3bet or raise limps. Against a passive big blind, open and limp the small blind wider. Against one who 3bets a lot, tighten opens and 4bet more. Confirm with your logs.',
      },
      {
        kind: 'quiz',
        question: 'The small blind raises to 3bb. What raw equity does the big blind need to call?',
        choices: ['27%', '40%', '33%'],
        answer: 2,
        explain: 'Call 2bb into a 4bb pot: 2 ÷ 6 = 33.3%.',
      },
      {
        kind: 'quiz',
        question: 'The big blind needs more equity against a 3bb SB raise than against a 2.5bb button open. Why does it still defend very wide?',
        choices: ['It has position and faces a very wide range', 'The small blind never c-bets', 'Raw equity is all that matters'],
        answer: 0,
        explain: 'Position lets the big blind realize more of its equity, and the small blind opens a very wide range.',
      },
      {
        kind: 'quiz',
        question: 'The small blind raises to 3bb. A common big blind 3bet size?',
        choices: ['6bb', '9bb', '15bb'],
        answer: 1,
        explain: 'In position, about 3 times the open: 9bb.',
      },
      {
        kind: 'takeaway',
        points: [
          'Small blind raise only: about 42%, to about 3bb.',
          'Big blind needs 33% against a 3bb raise but defends very wide from position, and 3bets more.',
          'Solvers also limp the small blind with rake. Raise only is the simple baseline.',
        ],
      },
    ],
  },
];
