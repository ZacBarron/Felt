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
        body: 'A 3bet is a raise over an open. Facing an open from the cutoff or earlier, raked strategies mostly 3bet or fold. The small blind does the same. Only the button and the big blind keep a real calling range.',
      },
      {
        kind: 'visual',
        title: 'Players still behind you',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['LJ', 'BTN', 'SB', 'BB'], note: 'LJ opens, 3 players behind you' },
        caption: 'The LJ opens and you are in the cutoff. The button and both blinds still act. If you call, they can squeeze or call cheaply and make the pot multiway.',
      },
      {
        kind: 'text',
        title: 'Why calling loses its place',
        body: [
          'Your medium hands do badly in multiway pots. A 3bet usually folds out the players behind.',
          'A call also hands the initiative to the opener. It caps your range, since your best hands would have 3bet.',
          'A 3bet can win the pot right away. A call never can.',
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
          'A 3bet to 7.5bb with zero equity needs everyone to fold **65.2%** of the time. Real 3bet bluffs need less. They have equity when called, and they play the flop with the initiative.',
      },
      {
        kind: 'table',
        title: 'Two shapes of 3bet range',
        columns: ['Shape', 'Contains', 'More common'],
        rows: [
          ['Linear', 'The best hands in order, down to hands like AJs, KQs and TT', 'Against wide late opens, and in 3bet or fold seats'],
          ['Polarized', 'Premiums plus blocker hands like A5s and A4s', 'Against tight early opens, and when you also call'],
        ],
        note: 'Directional. Real ranges sit between the two shapes. Close calls mix.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why the shape changes',
        body: [
          'Against a wide late open, hands like AJs and 99 are well ahead of what calls a 3bet. So they 3bet for value.',
          'With no calling range, the hands that would have called must go somewhere. The best of them 3bet, which makes the range linear.',
          'In position you also realize your equity well when called. That helps these medium strong hands.',
          'Against a tight early open, those same hands are dominated by what continues. So the 3bet range becomes premiums plus hands like A5s and A4s.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A blocker 3bet',
        cards: 'Ad5d',
        caption: 'The ace makes AA and AK less likely. A5s still has straight and flush equity when called.',
      },
      {
        kind: 'table',
        title: 'Sizing',
        columns: ['Spot', 'Size', 'Against a 2.5bb open'],
        rows: [
          ['In position', 'About 3x', '7.5bb'],
          ['Out of position', 'About 4x', '10bb, often up to 11 or 12bb'],
        ],
        note: 'Common sizes in line with solver outputs. Aced’s starter charts 3bet to 11 or 12bb from the blinds.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why bigger out of position',
        body: ['Out of position you realize less of your equity. So you charge more for the call and leave less room to play after the flop.'],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'What the size does to SPR',
        art: {
          kind: 'bars',
          bars: [
            { label: 'In position, 3bet to 7.5bb', value: 5.6, tone: 'green' },
            { label: 'Small blind, 3bet to 10bb', value: 4.3, tone: 'brass' },
          ],
        },
        caption: 'A called 3bet to 7.5bb leaves 92.5bb behind a 16.5bb pot. That is an SPR (stack to pot ratio) of **5.6**. A small blind 3bet to 10bb against the button leaves 90bb behind 21bb, an SPR of **4.3**.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'When openers call too much',
        body: 'Some live players call 3bets with dominated hands and rarely fold to them. If your logs show that, 3bet a wider value range and size up. Cut the pure bluffs. Against openers who fold too often, add more blocker bluffs.',
      },
      {
        kind: 'quiz',
        question: 'The HJ opens 2.5bb and you are in the cutoff. Why do raked strategies rarely call here?',
        choices: [
          'You are out of position against the HJ after the flop',
          'Players behind can squeeze, and a call caps your range',
          'The HJ always holds a premium hand',
        ],
        answer: 1,
        explain: 'Like the table showed, 3 players behind you can squeeze or join. Your calls also lack the best hands, which 3bet. Position is not the problem. The cutoff acts after the HJ on every street.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'UTG opens and you are on the button. Which hand is the typical polarized 3bet bluff?',
        choiceCards: ['As5s', 'AdJc', 'KdJc'],
        choices: ['A♠5♠', 'A♦J♣', 'K♦J♣'],
        answer: 0,
        explain: 'Like the blocker hand showed, A5s makes AA and AK less likely and can make straights and flushes. AJo also holds an ace, but a tight early range dominates it. When called, it makes too many second best hands.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'The cutoff opens 2.5bb. What is a common 3bet size from the button?',
        choices: ['5bb', '7.5bb', '12.5bb'],
        answer: 1,
        explain: 'Like the sizing table showed, 3bet about 3 times the open in position. That makes 7.5bb. 12.5bb is 5 times the open, bigger than even the blinds use. 5bb gives the opener too good a price.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Outside the button and big blind, 3bet or fold. Players behind can squeeze, and a call caps your range.',
          'Go linear against wide late opens. Against tight early opens, 3bet premiums plus blockers like A5s.',
          '3bet about 3x the open in position and about 4x out of position.',
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
        body: 'Calling an open is a real option in 2 seats, the button and the big blind. Elsewhere it is small or gone. When you do call, choose hands that play well after the flop.',
      },
      {
        kind: 'visual',
        title: 'The 2 calling seats',
        art: { kind: 'table', seats: 9, button: 'BTN', highlight: ['BTN', 'BB'], note: 'Flat from these 2 seats' },
        caption: 'On the **button** only the blinds act behind you, and you have position on the opener. In the **big blind** you close the action with 1bb already in. Your price is the best at the table.',
        evidence: 'solver',
      },
      {
        kind: 'chart',
        chartId: '9max-100-btn-vs-co',
        title: 'Where calling is allowed',
        caption:
          'Aced’s button chart against a cutoff open calls about 11% of hands. It 3bets about 8%. In the cutoff and earlier, players behind can squeeze or join. So calling ranges there shrink to a few hands. In the small blind, calling is rare.',
      },
      {
        kind: 'table',
        title: 'Button against a LJ open',
        columns: ['Hand', 'Usually', 'Why'],
        rows: [
          ['66', 'Call', 'Sets win big pots'],
          ['8♥7♥', 'Call', 'Makes straights and flushes in position'],
          ['A♠5♠', 'Mix 3bet and call', 'Blocks AA and AK, still playable'],
          ['K♦J♣', 'Fold', 'Dominated by AK, KQ and AJ'],
          ['Q♣9♦', 'Fold', 'Dominated, few strong flops'],
        ],
        note: 'Directional. Exact mixes depend on rake and on how often the blinds squeeze.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'What makes a good flat',
        body: [
          'Good flats make strong hands that win big pots. Pairs and suited connectors are the core. Suited broadways and suited aces below the 3bet range join them.',
          'These hands also keep their value when the pot stays small.',
          'Bad flats are offsuit hands that make second best pairs. Against an early open, KJo loses big pots to AK and KQ. It wins only small ones.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Set mining',
        formula: '1 − C(48,3) ÷ C(50,3) = 11.8%',
        parts: [
          ['C(48,3)', 'Flops with no card of your rank'],
          ['C(50,3)', 'All possible flops'],
        ],
        example:
          'A pocket pair flops a set or better **11.8%** of the time, about 1 in 8.5. Say you call 2.5bb to win 4bb, with a set as your only plan. You need about **15bb** more on average from later streets when you hit. Sets do not always win, and pairs win some pots without improving. So treat this as a rough check.',
      },
      {
        kind: 'visual',
        title: 'The flop you are hoping for',
        art: { kind: 'cards', cards: '6d6c', board: 'Ks6h2d' },
        caption: 'A pocket pair flops a set or better **11.8%** of the time. That is about 1 in 8.5. Sets win big pots, so the rest of the time you often fold cheaply.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'The squeeze risk',
        body: [
          'A flat is capped, because your best hands would have 3bet. The blinds know that. A squeeze against an open and a capped caller works often.',
          'When you are squeezed, most of your flats must fold. The 2.5bb you put in is lost.',
          'The more often the blinds squeeze, the tighter the button should flat.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Rake hits called pots',
        body: 'In most games, a pot that ends before the flop pays no rake. Called pots see a flop and pay it. That is one reason raked strategies prefer 3bet or fold. It is also why a high rake trims the weakest flats first.',
      },
      {
        kind: 'quiz',
        question: 'The LJ opens 2.5bb. On the button, which hand is the clearest flat?',
        choiceCards: ['KsTd', '6s6h', 'Qc9d'],
        choices: ['K♠T♦', '6♠6♥', 'Q♣9♦'],
        answer: 1,
        explain: 'Like the table showed, 66 is a call. It flops a set or better 11.8% of the time and plays well in position. KTo looks playable, but AK and KQ dominate it. Q9o is dominated too and folds.',
        point: 0,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'How often does a pocket pair flop a set or better?',
        choices: ['About 4%', 'About 8%', 'About 12%', 'About 25%'],
        answer: 2,
        explain: 'Like the set mining step showed, a pair flops a set or better 11.8% of the time. That is about 1 in 8.5. So most of the time you miss and fold cheaply.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Why is a button flat open to a squeeze from the blinds?',
        choices: [
          'Your flats are capped, since your best hands 3bet',
          'The button is out of position after the flop',
          'Your flats are too strong to fold',
        ],
        answer: 0,
        explain: 'Like the squeeze step said, your calling range lacks the top hands. So a squeeze folds out most of it. Position is not the problem. The button is in position against everyone.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Flat from the button and the big blind with pairs and suited hands. Fold dominated offsuit hands.',
          'A pocket pair flops a set or better about 12% of the time.',
          'Flats are capped and pay rake. Tighten them when the blinds squeeze or the rake is high.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/sb-vs-open',
    level: 'core',
    minutes: 5,
    cover: { kind: 'ring', value: 1 / 3, label: 'Equity to call', caption: 'Small blind against a 2.5bb open' },
    steps: [
      {
        kind: 'intro',
        title: 'The worst seat to call from',
        body: 'Facing an open, the small blind is out of position for the whole hand. The big blind still acts behind it. In raked games, strategies here are mostly 3bet or fold.',
      },
      {
        kind: 'table',
        title: 'The blinds’ price against a 2.5bb open',
        columns: ['Seat', 'Calls', 'Pot after', 'Needs'],
        rows: [
          ['BB', '1.5bb', '5.5bb', '27.3%'],
          ['SB', '2bb', '6bb', '33.3%'],
        ],
        note: 'Raw equity, before realization. A small blind call also leaves the big blind to act.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Stuck in the middle',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'SB', highlight: ['BTN', 'BB'], note: 'The big blind acts behind you' },
        caption: 'The button opened and the big blind still acts behind you. After the flop you act first against both.',
      },
      {
        kind: 'visual',
        title: 'Why 3bet or fold',
        art: {
          kind: 'tree',
          root: 'Small blind facing an open',
          branches: [
            { label: '3bet', value: 'Often wins at once', tone: 'purple' },
            { label: 'Call', value: 'Worse price, BB behind', tone: 'green' },
            { label: 'Fold', value: 'Most hands', tone: 'gray' },
          ],
        },
        caption:
          'A call pays a worse price than the big blind gets. It plays out of position and invites the big blind to squeeze or join. A 3bet takes the initiative and usually folds the big blind out too. Solver strategies with rake keep at most a small calling range here.',
        evidence: 'solver',
      },
      {
        kind: 'chart',
        chartId: '9max-100-sb-vs-btn',
        title: 'Small blind against a button open',
        caption: 'Aced’s starter chart never calls here. It 3bets about 17% and folds the rest. Aced’s starter charts are approximate.',
      },
      {
        kind: 'text',
        title: 'What the range looks like',
        body: [
          'Against a wide button open, the 3bet range is wide and fairly linear. It takes the strongest hands in order, down to hands like K8s and ATo.',
          'Against an early open it is much tighter. Premiums plus some blocker hands like A5s 3bet. Most of the range folds.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Size it up',
        formula: '3bet to about 4 to 5 times the open',
        example:
          'Against a 2.5bb open, that is about 10 to 12bb. Out of position you want a lower SPR (stack to pot ratio). A bigger size also makes it harder for the big blind to come along. A 3bet to 11bb risks 10.5bb more to win 4bb. With no equity, it needs folds **72.4%** of the time. Equity when called makes up the rest.',
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
        choices: ['27.3%', '33.3%', '38.5%'],
        answer: 1,
        explain: 'Like the price table showed, you add 2bb to a 4bb pot. So 2 ÷ 6 = 33.3%. 38.5% forgets that your 0.5bb is already in. The big blind needs only 27.3% because it has 1bb in.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'The button opens 2.5bb. What is a typical small blind 3bet size?',
        choices: ['11bb', '7.5bb', '6bb'],
        answer: 0,
        explain: 'Like the sizing step showed, the small blind 3bets about 4 to 5 times the open. That is 10 to 12bb. Aced’s starter chart uses 11bb. 7.5bb is an in position size.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'The button opens 2.5bb. Why does the small blind rarely just call?',
        choices: [
          'A call wins the pot at once more often than a 3bet',
          'The button folds too often to small blind 3bets',
          'The big blind acts behind, and you are out of position',
        ],
        answer: 2,
        explain: 'Like the picture showed, the big blind can squeeze or join after your call. You also act first on every street. A call never wins the pot at once, but a 3bet often does.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'The small blind facing an open mostly 3bets or folds. The big blind still acts behind it.',
          'A small blind call needs 33.3% raw equity against a 2.5bb open.',
          '3bet to about 4 to 5 times the open, about 11bb.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/squeeze',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Open', bb: 2.5 },
        { label: 'Call', bb: 2.5 },
        { label: 'Blinds', bb: 1.5 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'An open and a call is an invitation',
        body: 'Someone opens and another player calls. Now there is extra money in the pot. The caller has also told you their range is capped. A squeeze is a 3bet that attacks both.',
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
        example: 'In the big blind you face a pot of **6.5bb**. After an open alone it would be 4bb. A squeeze that folds both players wins all of it.',
      },
      {
        kind: 'visual',
        title: 'Dead money and a capped caller',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['CO', 'BTN'], note: '6.5bb in the pot' },
        caption: 'The cutoff opened and the button called. In the big blind you face **6.5bb** of dead money. The caller’s range is capped.',
      },
      {
        kind: 'visual',
        title: 'The capped caller',
        art: {
          kind: 'tree',
          root: 'You squeeze',
          branches: [
            { label: 'The caller', value: 'Capped, mostly folds', tone: 'gray' },
            { label: 'The opener', value: 'Caught in the middle', tone: 'red' },
          ],
        },
        caption:
          'A player who flats would usually 3bet their best hands. What is left is medium pairs and suited hands. Even if the opener calls, the caller still acts behind it. So the opener continues tighter than against a plain 3bet.',
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Sizing',
        columns: ['Spot', 'Rule', 'One caller'],
        rows: [
          ['In position', '3x open, plus 1 open per caller', '7.5 + 2.5 = 10bb'],
          ['Out of position', '4x open, plus 1 open per caller', '10 + 2.5 = 12.5, about 13bb'],
        ],
        note: 'Common sizes in line with solver outputs. Each caller adds money and another player who can continue. So the size grows.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Folds a pure bluff needs',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '3bet to 11bb', value: 71.4, tone: 'gray' },
            { label: 'Squeeze to 13bb', value: 64.9 },
          ],
        },
        caption:
          'A big blind 3bet to 11bb risks 10bb to win 4bb. A squeeze to 13bb risks 12bb to win 6.5bb. With zero equity when called, everyone must fold this often. The extra dead money pays for the bigger size.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Hand selection',
        body: [
          'For value, squeeze QQ+ and AK. Against a late opener, add hands like JJ and AQ.',
          'For bluffs, use suited aces from A5s down to A2s and other suited hands with blockers. They make AA and AK less likely. They keep straight and flush equity when called.',
          'Avoid dominated offsuit hands. A called squeeze usually means a big pot out of position.',
          'Say you squeeze to 13bb, the opener calls and the button folds. The pot is 29bb with 87bb behind. That is an SPR (stack to pot ratio) of **3.0**.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Know who traps',
        body: 'Some live players flat AA and KK to trap. Their calling range is not always capped. Others call almost any squeeze. Against frequent callers, squeeze more for value and bluff less. Check both habits against your logs.',
      },
      {
        kind: 'quiz',
        question: 'The CO opens 2.5bb and the button calls. How much is in the pot when the big blind acts?',
        choices: ['4bb', '5.5bb', '6.5bb', '7.5bb'],
        answer: 2,
        explain: 'Like the dead money step showed, 2.5 + 2.5 + 0.5 + 1 = 6.5bb. Your own 1bb counts, since it is already in the pot. Leaving it out gives 5.5bb.',
        point: 0,
        variants: [
          {
            question: 'UTG opens 3bb and the HJ calls. How much is in the pot when the big blind acts?',
            choices: ['4.5bb', '6.5bb', '7.5bb', '8.5bb'],
            explain: 'Like the dead money step showed, add every chip in. 3 + 3 + 0.5 + 1 = 7.5bb. Your own 1bb counts, since it is already in the pot.',
          },
          {
            question: 'The LJ opens 2.5bb and both the CO and the button call. How much is in the pot when the big blind acts?',
            choices: ['6.5bb', '8bb', '9bb', '10.5bb'],
            explain: 'Like the dead money step showed, 2.5 + 2.5 + 2.5 + 0.5 + 1 = 9bb. Each caller adds another 2.5bb of dead money.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The HJ opens 2.5bb and the CO calls. Using 3x plus one open per caller, what is the button’s squeeze size?',
        choices: ['7.5bb', '10bb', '12.5bb'],
        answer: 1,
        explain: 'Like the sizing table showed, 3 × 2.5 = 7.5bb. Add 2.5bb for the caller to make 10bb. 12.5bb uses the out of position rule. The button has position, so 3x is enough.',
        point: 1,
        variants: [
          {
            question: 'UTG+1 opens 3bb and the LJ calls. Using 3x plus one open per caller, what is the HJ’s squeeze size?',
            choices: ['9bb', '12bb', '15bb'],
            explain: 'Like the sizing table showed, 3 × 3 = 9bb. Add 3bb for the caller to make 12bb. 15bb uses the out of position rule.',
          },
          {
            question: 'The LJ opens 2.5bb and 2 players call. Using 3x plus one open per caller, what is the button’s squeeze size?',
            choices: ['10bb', '12.5bb', '15bb'],
            explain: 'Like the sizing table showed, 3 × 2.5 = 7.5bb. Add 2.5bb for each caller to make 12.5bb. More callers means a bigger squeeze.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Why does a squeeze to 13bb need fewer folds than a 3bet to 11bb against one open?',
        choices: ['More dead money pays for the bigger size', 'The capped caller folds more often', 'The squeeze risks less than the 3bet'],
        answer: 0,
        explain: 'Like the bars showed, risking 12bb to win 6.5bb needs 64.9% folds. Risking 10bb to win 4bb needs 71.4%. How often the caller folds changes how often you win. It does not change the folds you need.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'The CO opens and the button calls. In the big blind, which hand is a typical squeeze bluff?',
        choiceCards: ['As4s', 'KdJc', 'Qh9d'],
        choices: ['A♠4♠', 'K♦J♣', 'Q♥9♦'],
        answer: 0,
        explain: 'Like the hand selection step said, suited aces from A5s down to A2s make good squeeze bluffs. They block AA and AK and keep straight and flush equity. Dominated offsuit hands like KJo and Q9o make poor squeezes.',
        point: 3,
        shuffleSuits: true,
      },
      {
        kind: 'takeaway',
        points: [
          'An open plus a call means 6.5bb of dead money and a capped caller.',
          'Squeeze 3x the open in position or 4x out of position. Add one open per caller.',
          'More dead money means a squeeze needs fewer folds than a plain 3bet.',
          'Squeeze QQ+ and AK for value. Bluff with suited aces like A5s down to A2s.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/vs-3bet',
    level: 'core',
    minutes: 7,
    cover: { kind: 'ring', value: 8.5 / 22.5, label: 'Equity to call', caption: 'Against a 3bet to 11bb' },
    steps: [
      {
        kind: 'intro',
        title: 'Your open got 3bet',
        body: 'A raise over your open is a 3bet. Now you choose between folding, calling and 4betting. Your price and your position shape the mix. So does how strong your opening range was.',
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
        kind: 'visual',
        title: 'In position vs out of position',
        art: {
          kind: 'tree',
          root: 'Your open gets 3bet',
          branches: [
            { label: 'In position', value: 'Call more', tone: 'green' },
            { label: 'Out of position', value: 'Fold and 4bet more', tone: 'purple' },
          ],
        },
        caption:
          'In position you face bigger 3bets but realize more of your equity. Out of position the price is often better, but you realize less. Small pairs and weak suited connectors lose the most value there.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Lower SPR after a call',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 22.5 },
            { label: 'Behind', bb: 89 },
          ],
        },
        caption: 'The button calls a 3bet to 11bb. The pot is 22.5bb with 89bb behind, an SPR (stack to pot ratio) of **4.0**. After a 3bet to 7.5bb it would be **5.6**. At these SPRs a good top pair often gets all in by the river.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Your 4 options',
        columns: ['Action', 'Typical hands'],
        rows: [
          ['4bet for value', 'QQ+ and AK, some mixed with calls'],
          ['4bet as a bluff', 'Suited wheel aces like A5s and A4s'],
          ['Call', 'Medium pairs, AQ, AJs, KQs and suited connectors, more in position'],
          ['Fold', 'Weak offsuit hands like K9o and the worst suited hands'],
        ],
        note: 'Directional, for a late open facing a 3bet at 100bb. Seats, sizes and rake shift the mix.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Early opens fold less',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '9-handed UTG', value: 22, tone: 'green' },
            { label: '6-max UTG', value: 14, tone: 'brass' },
            { label: '9-handed button', value: 6, tone: 'gray' },
          ],
        },
        caption: 'Each bar is the share of an opening range that is QQ+ or AK, in Aced’s starter charts. Most of a button range was fine to open but cannot stand a 3bet. So early openers continue with a larger share.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 3bets',
        body: 'In many live games, 3bets lean heavily toward value. This is most true of players who rarely 3bet. Against them, fold more and call less with dominated hands. Against frequent 3bettors, call more in position and add 4bet bluffs. Check these reads against your logs.',
      },
      {
        kind: 'quiz',
        question: 'You open the button to 2.5bb and the big blind 3bets to 11bb. What raw equity does a call need?',
        choices: ['27.3%', '37.8%', '43.6%'],
        answer: 1,
        explain: 'Like the price table showed, the pot holds 11 + 2.5 + 0.5 = 14bb. You call 8.5bb, so 8.5 ÷ 22.5 = 37.8%. 43.6% leaves out your own 2.5bb and the small blind’s 0.5bb.',
        point: 0,
        variants: [
          {
            question: 'You open the CO to 2.5bb and the button 3bets to 7.5bb. The blinds fold. What raw equity does a call need?',
            choices: ['24%', '30.3%', '37.8%'],
            explain: 'Like the price table showed, the pot holds 7.5 + 2.5 + 1.5 = 11.5bb. You call 5bb, so 5 ÷ 16.5 = 30.3%. 37.8% is the price against a big blind 3bet to 11bb.',
          },
          {
            question: 'You open the HJ to 2.5bb and the small blind 3bets to 12bb. The big blind folds. What raw equity does a call need?',
            choices: ['31%', '38%', '45%'],
            explain: 'The pot holds 12 + 2.5 + 1 = 15.5bb, since the big blind’s 1bb stays in. You call 9.5bb, so 9.5 ÷ 25 = 38%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Why does a UTG opener fold a smaller share of its range to a 3bet than a button opener?',
        choices: ['Its opening range is much stronger to begin with', 'UTG is in position against most 3bettors', 'UTG faces smaller 3bets from the blinds'],
        answer: 0,
        explain: 'Like the bars showed, QQ+ and AK are 22% of the 9-handed UTG range. They are only 6% of the button range. UTG is actually out of position against most players who 3bet it.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You open K♣9♦ on the button and the big blind 3bets to 11bb. What does Aced’s chart do?',
        cards: 'Kc9d',
        choices: ['Call', '4bet', 'Fold'],
        answer: 2,
        explain: 'Like the options table showed, weak offsuit hands like K9o fold. AK and KQ dominate it, and it has no blocker value worth a 4bet. Aced’s chart folds it every time.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            question: 'You open K♥8♠ on the button and the big blind 3bets to 11bb. What does Aced’s chart do?',
            cards: 'Kh8s',
            explain: 'Like the options table showed, weak offsuit hands like K8o fold. AK and KQ dominate it, and it has no blocker value worth a 4bet. Aced’s chart folds it every time.',
          },
          {
            question: 'You open Q♦9♣ on the button and the big blind 3bets to 11bb. What does Aced’s chart do?',
            cards: 'Qd9c',
            explain: 'Like the options table showed, weak offsuit hands like Q9o fold. AQ and KQ dominate it, and it has no blocker value worth a 4bet. Aced’s chart folds it every time.',
          },
          {
            question: 'You open J♠9♥ on the button and the big blind 3bets to 11bb. What does Aced’s chart do?',
            cards: 'Js9h',
            explain: 'Like the options table showed, weak offsuit hands like J9o fold. AJ and KJ dominate it, and it has no blocker value worth a 4bet. Aced’s chart folds it every time.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'On the button, calling a 3bet to 11bb needs 37.8% raw equity.',
          'Strong early ranges continue more often than wide button ranges.',
          'Fold weak offsuit hands like K9o. Call medium pairs and suited hands, more in position.',
        ],
      },
    ],
  },
  {
    key: 'preflop/3bet-pots/4bet',
    level: 'advanced',
    minutes: 8,
    cover: {
      kind: 'bars',
      bars: [
        { label: '7♠6♠', value: 34, tone: 'gray' },
        { label: 'A♠5♠', value: 27 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Four bets in, stacks are next',
        body: 'A 4bet is a raise over a 3bet. At 100bb it commits a large share of the stack. Ranges get narrow and blockers matter a lot. A 5bet raises once more and is all in.',
      },
      {
        kind: 'visual',
        title: 'What 4bets',
        art: {
          kind: 'tree',
          root: 'Your 4bet range',
          branches: [
            { label: 'Value', value: 'QQ+ and AK', tone: 'purple' },
            { label: 'Bluffs', value: 'A5s, A4s', tone: 'purple' },
          ],
        },
        caption:
          'Against wide 3bettors, more value hands join. Against tight ones, even QQ and AK often prefer to call. Suited aces make the 3bettor’s best hands less likely. They also keep equity when called.',
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Blockers, counted',
        columns: ['Your hand', 'QQ+ and AK left', 'AA left'],
        rows: [
          ['None', '34', '6'],
          ['A♠5♠', '27', '3'],
          ['K♠5♠', '27', '6'],
          ['7♠6♠', '34', '6'],
        ],
        note: 'Exact combo counts after removing your 2 cards.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Why the ace, not the king',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'A♠5♠', value: 30, tone: 'green' },
            { label: 'K♠5♠', value: 24, tone: 'gray' },
            { label: 'A♠Q♦', value: 24, tone: 'gray' },
          ],
        },
        caption:
          'The bars show each hand’s equity against QQ+ and AK, rounded. A5s and K5s remove the same 7 combos. But the ace halves AA, the hand that never folds. A♠Q♦ does no better because AK dominates it.',
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
        note: 'Common sizes in line with solver outputs. Aced’s starter charts use 24bb in position and 22bb out of position.',
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
        example:
          'The button opens 2.5bb and the small blind 3bets to 11bb. The big blind folds, and the button 4bets to 25bb. A pure bluff needs **60.8%** folds. A5s wins some of the rest back with its equity when called.',
      },
      {
        kind: 'visual',
        title: 'After a called 4bet',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 51 },
            { label: 'Behind', bb: 75 },
          ],
        },
        caption: 'Say the small blind calls the 4bet to 25bb. The pot is 51bb with 75bb behind, an SPR (stack to pot ratio) of **1.5**. There is no room for a smaller 5bet, so the 5bet is a shove.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'SPR makes the 5bet all in',
        body: [
          'Facing a 5bet shove, the button calls 75bb into a pot of 126bb. It needs **37.3%** equity.',
          'A♠5♠ has only about **29%** against KK+ and AK, so the bluff folds.',
          'Calling a 4bet at this SPR commits you on most flops. Continue with hands that are happy to get the money in, or shove.',
        ],
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'You hold A♠5♠. How many combos of QQ+ and AK can villain hold?',
        cards: 'As5s',
        choices: ['21', '24', '27', '34'],
        answer: 2,
        explain: 'Like the blocker table showed, AA drops from 6 combos to 3. AK drops from 16 to 12. KK and QQ stay at 6 each, so 3 + 6 + 6 + 12 = 27. 34 is the count before your cards come out.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'At 100bb, a 4bet to 25bb is called with 1bb dead. What is the SPR?',
        choices: ['About 1.5', 'About 3', 'About 4'],
        answer: 0,
        explain: 'Like the chips showed, the pot is 25 + 25 + 1 = 51bb with 75bb behind. 75 ÷ 51 = 1.5, so the 5bet is all in. About 3 comes from dividing by one 4bet instead of the whole pot.',
        point: 2,
        variants: [
          {
            question: 'At 100bb, a 4bet to 22bb is called with 1.5bb dead. What is the SPR?',
            choices: ['About 1.7', 'About 3', 'About 4'],
            explain: 'Like the chips showed, add the whole pot. 22 + 22 + 1.5 = 45.5bb with 78bb behind. 78 ÷ 45.5 = 1.7.',
          },
          {
            question: 'At 150bb, a 4bet to 30bb is called with 1bb dead. What is the SPR?',
            choices: ['About 1.5', 'About 2', 'About 4'],
            answer: 1,
            explain: 'Like the chips showed, the pot is 30 + 30 + 1 = 61bb with 120bb behind. 120 ÷ 61 = 2. Deeper stacks leave a little more room.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Why is A5s a better 4bet bluff than K5s, though both remove 7 combos of QQ+ and AK?',
        choices: ['A5s is strong enough to call a shove', 'The ace halves AA and plays better when called', 'K5s blocks fewer of the hands that call'],
        answer: 1,
        explain: 'Like the bars showed, A5s cuts AA from 6 combos to 3. It has about 30% against QQ+ and AK, against about 24% for K5s. It still folds to a shove, since it needs 37.3% and has about 29%.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          '4bet QQ+ and AK for value. Bluff with suited wheel aces like A5s, since the ace halves AA.',
          'Count blockers. With A5s, villain has 27 combos of QQ+ and AK and only 3 of AA.',
          'After a called 4bet the SPR is about 1.5. So the 5bet is all in.',
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
        body: 'When everyone folds to the small blind, the 2 blinds fight over a pot neither chose to enter. Ranges are the widest in the game. The big blind has position.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-sb',
        title: 'Small blind raise only, about 42%',
        caption: 'Aced’s starter chart raises to 3bb and folds the rest. It leaves out limping, which solvers also use.',
      },
      {
        kind: 'text',
        title: 'Raise size',
        body: [
          'The small blind acts first on every later street. So it raises a bit bigger than a 2.5bb open, to about 3bb.',
          'A bigger raise charges the big blind more to use its position. It also wins more pots right away.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'The big blind has position',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['SB'], note: 'You act last after the flop' },
        caption: 'Blind against blind, the small blind acts first on every street after the flop. The big blind acts last.',
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
          'The price against the small blind is worse. But the big blind has position and faces a very wide range. So it still defends very wide.',
          'It also 3bets more often than it does against the button. The range is fairly linear and the size is about 3 times the open.',
          'Against a 3bb raise, that is 9bb. The small blind then calls 6bb into 12bb and needs **33.3%**, out of position.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Limps are part of the real strategy',
        art: {
          kind: 'tree',
          root: 'The small blind limps',
          branches: [
            { label: 'Big blind raises', value: 'Often, from position', tone: 'brass' },
            { label: 'Big blind checks', value: 'The rest', tone: 'gray' },
          ],
        },
        caption: 'With rake, solver strategies limp a large part of the small blind range. Some strong hands limp too. Raise only is a simpler baseline that gives up a little EV.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Blind habits to check',
        body: 'Some players fold the small blind far too often. Some big blinds rarely 3bet or raise limps. Against a passive big blind, open and limp the small blind wider. Against one who 3bets a lot, tighten your opens and 4bet more. Confirm these reads with your logs.',
      },
      {
        kind: 'quiz',
        question: 'The small blind raises to 3bb. What raw equity does the big blind need to call?',
        choices: ['27.3%', '33.3%', '40%'],
        answer: 1,
        explain: 'Like the price table showed, you call 2bb into a 4bb pot. So 2 ÷ 6 = 33.3%. 40% comes from leaving your own 1bb out of the pot.',
        point: 0,
        variants: [
          {
            question: 'The small blind raises to 2.5bb. What raw equity does the big blind need to call?',
            choices: ['25%', '30%', '37.5%'],
            explain: 'Like the price table showed, you call 1.5bb into a 3.5bb pot. So 1.5 ÷ 5 = 30%.',
          },
          {
            question: 'The small blind raises to 3.5bb. What raw equity does the big blind need to call?',
            choices: ['30%', '35.7%', '45%'],
            explain: 'Like the price table showed, you call 2.5bb into a 4.5bb pot. So 2.5 ÷ 7 = 35.7%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The big blind needs more equity against a 3bb small blind raise than against a 2.5bb button open. Why does it still defend very wide?',
        choices: ['It has position and faces a very wide range', 'The small blind range is mostly bluffs', 'The small blind rarely c-bets the flop'],
        answer: 0,
        explain: 'Like the fight back step said, position lets the big blind realize more of its equity. The small blind also opens about 42% of hands. That range is wide, but it holds mostly real hands.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'The small blind raises to 3bb. What is a common big blind 3bet size?',
        choices: ['6bb', '7.5bb', '9bb', '12bb'],
        answer: 2,
        explain: 'Like the fight back step said, the big blind 3bets about 3 times the open. That makes 9bb. 12bb is an out of position size, and the big blind has position here.',
        point: 1,
        variants: [
          {
            question: 'The small blind raises to 2.5bb. What is a common big blind 3bet size?',
            choices: ['5bb', '7.5bb', '10bb', '12bb'],
            answer: 1,
            explain: 'Like the fight back step said, the big blind 3bets about 3 times the open. That makes 7.5bb.',
          },
          {
            question: 'The small blind raises to 3.5bb. What is a common big blind 3bet size?',
            choices: ['7bb', '10.5bb', '14bb'],
            answer: 1,
            explain: 'Like the fight back step said, the big blind 3bets about 3 times the open. That makes 10.5bb.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'The big blind needs 33.3% raw equity to call a 3bb small blind raise.',
          'From position the big blind still defends very wide. It 3bets to about 3 times the open.',
        ],
      },
    ],
  },
];
