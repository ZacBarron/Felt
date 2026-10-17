import type { LessonContent } from './types';

/**
 * Defending against opens from every seat: the big blind against early
 * opens, middle seats against early opens, cold calls in position and how
 * open size changes the defense. Every price is exact and recomputed in
 * thin-spots.test.ts. Strategy claims are directional and labelled.
 */
export const PREFLOP_DEFENSE_LESSONS: LessonContent[] = [
  {
    key: 'preflop/vs-open/bb-vs-early',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['UTG'], note: 'UTG opens 2.5bb' },
    steps: [
      {
        kind: 'intro',
        title: 'Same price, stronger range',
        body: 'Against a 2.5bb open, the big blind pays the same price from any seat. What changes is the range you face. An early open is strong, so you defend far fewer hands.',
      },
      {
        kind: 'visual',
        title: 'UTG opens, everyone folds',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['UTG'], note: '7 players folded' },
        caption: 'UTG opened and 7 players folded. UTG had 8 players behind, so it opened only strong hands. You face the tightest opening range at the table.',
      },
      {
        kind: 'visual',
        title: 'The price does not change',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'UTG opens 2.5bb', value: 27.3, tone: 'brass' },
            { label: 'BTN opens 2.5bb', value: 27.3, tone: 'brass' },
            { label: 'UTG opens 3bb', value: 30.8, tone: 'gray' },
          ],
        },
        caption: 'Against any 2.5bb open you call 1.5bb to win 4bb. That needs **27.3%** raw equity. A 3bb open asks for **30.8%**.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Raw equity clears the price',
        columns: ['Hand', 'Against a tight early range', 'Against a wide late range'],
        rows: [
          ['K♠J♦', '33%', '47%'],
          ['A♦9♣', '35%', '49%'],
          ['7♥6♥', '33%', '38%'],
          ['J♣6♣', '30%', '38%'],
        ],
        note: 'We estimate these from simulated runouts. The tight range is 77+ and the best broadways, about 9% of hands. The wide range holds about 26% of hands.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why you still fold',
        body: [
          'Raw equity assumes you see all 5 cards and never fold. Out of position against a strong range, you keep much less of it.',
          'Offsuit hands get dominated. K♠J♦ makes top pair and loses big pots to AK, KQ and overpairs.',
          'So keep the hands that make strong hands. Pairs and suited aces defend well against any seat.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Dominated, not drawing',
        cards: 'KsJd',
        board: 'Kh8c3d',
        caption: 'K♠J♦ flops top pair here. Against an early range it often faces AK or KQ. It wins small pots and loses big ones.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-bb-vs-utg',
        title: 'Aced’s chart against UTG',
        caption: 'The chart defends pairs, suited aces and the stronger suited hands. Offsuit hands below KQo and AJo mostly fold. The button chart calls far more suited hands.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live early opens',
        body: 'Many live players open only strong hands from early seats. Some open bigger too. Against them, defend tighter still. Check how often they show weak hands in your logs.',
      },
      {
        kind: 'quiz',
        question: 'UTG opens 3bb and the small blind folds. What raw equity does a big blind call need?',
        choices: ['About 27%', 'About 31%', 'About 40%'],
        answer: 1,
        explain: 'You call 2bb to win 4.5bb. So 2 ÷ 6.5 = 30.8%. About 27% is the price against a 2.5bb open.',
        point: 0,
        variants: [
          {
            question: 'The LJ opens 2.5bb and the small blind folds. What raw equity does a big blind call need?',
            answer: 0,
            explain: 'You call 1.5bb to win 4bb. So 1.5 ÷ 5.5 = 27.3%. The seat of the opener does not change the price.',
          },
          {
            question: 'UTG+1 opens 2bb and the small blind folds. What raw equity does a big blind call need?',
            choices: ['About 22%', 'About 27%', 'About 31%'],
            answer: 0,
            explain: 'You call 1bb to win 3.5bb. So 1 ÷ 4.5 = 22.2%. Smaller opens give you a better price.',
          },
          {
            question: 'UTG+2 opens 3bb and the small blind folds. What raw equity does a big blind call need?',
            explain: 'You call 2bb to win 4.5bb. So 2 ÷ 6.5 = 30.8%. The seat of the opener does not change the price.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'UTG opens 2.5bb. In the big blind, which hand does Aced’s chart fold?',
        choiceCards: ['Jc6c', '7h7d', 'As5s'],
        choices: ['J♣6♣', '7♥7♦', 'A♠5♠'],
        answer: 0,
        explain: 'J6s calls against a button open. Against UTG it is dominated and plays poorly out of position, so it folds. 77 calls to make sets. A5s mixes 3bets and calls.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['5c5d', 'Td6d', 'Ah4h'],
            choices: ['5♣5♦', 'T♦6♦', 'A♥4♥'],
            answer: 1,
            explain: 'T6s calls against a button open, but not against UTG. It is dominated and rarely makes the best hand. 55 calls to make sets. A4s mixes 3bets and calls.',
          },
          {
            choiceCards: ['8s8c', 'JhTh', 'Qc8d'],
            choices: ['8♠8♣', 'J♥T♥', 'Q♣8♦'],
            answer: 2,
            explain: 'Q8o folds against UTG. It is an offsuit hand that makes dominated pairs. 88 and JTs call, since they make strong hands.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'K♠J♦ has about 33% raw equity against a tight UTG range. That clears the 27.3% price. Why does it still fold most of the time?',
        cards: 'KsJd',
        choices: ['It is dominated and keeps little of its equity out of position', 'Any hand under 40% raw equity folds', 'UTG never folds after the flop'],
        answer: 0,
        explain: 'Raw equity counts every runout to the river. Out of position against AK and KQ, KJo wins small pots and loses big ones. So it realizes much less than 33%.',
        point: 2,
        shuffleSuits: true,
      },
      {
        kind: 'takeaway',
        points: [
          'The price against a 2.5bb open is 27.3% from any seat. Bigger opens raise it.',
          'Against early opens, fold dominated offsuit hands and weak suited hands. Keep pairs and suited aces.',
          'Raw equity is not enough out of position. Domination cuts how much of it you keep.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/vs-early-open',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'KdQc' },
    steps: [
      {
        kind: 'intro',
        title: 'Two ranges to beat',
        body: 'An early open is strong. The players behind you can still wake up with a big hand. From the middle seats you mostly 3bet or fold.',
      },
      {
        kind: 'visual',
        title: 'Players still to act',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'HJ', highlight: ['UTG', 'CO', 'BTN', 'SB', 'BB'], note: 'UTG opens, 4 players behind you' },
        caption: 'UTG opened and you sit in the hijack. 4 players still act after you. Any of them can squeeze or hold a premium.',
      },
      {
        kind: 'visual',
        title: 'Someone behind holds QQ+ or AK',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '2 players behind', value: 5.5, tone: 'green' },
            { label: '4 players behind', value: 10.8, tone: 'brass' },
            { label: '6 players behind', value: 15.8, tone: 'red' },
          ],
        },
        caption: 'Exact chances that at least one player behind holds QQ+ or AK. You hold 8♥7♥ and their cards are dealt at random. More players behind means more danger after a call.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why calls shrink',
        body: [
          'A call leaves 2 problems. The opener has a strong range, and the players behind can squeeze.',
          'Medium offsuit hands lose to both. KQo and AJo are dominated by much of an early range.',
          'A 3bet takes the initiative. It also folds out most of the players behind.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Middle seats against UTG',
        columns: ['Hand', 'Usually', 'Why'],
        rows: [
          ['QQ+ and AK', '3bet for value', 'Ahead of the hands that continue'],
          ['A5s and A4s', 'Mix 3bet and fold', 'Blocks AA and AK, plays well when called'],
          ['JJ down to 77', 'Mix call and 3bet', 'Sets win big pots, even multiway'],
          ['AQs and KQs', 'Mix call and 3bet', 'Suited and rarely dominated'],
          ['KQo and AJo', 'Mostly fold', 'Dominated by AK, AQ and KK'],
        ],
        note: 'Directional, 9-handed at 100bb against a 2.5bb UTG open. Seats closer to the button call a little more.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A hand to let go',
        cards: 'KdQc',
        caption: 'K♦Q♣ looks strong. Against an early range it is often dominated by AK and KK. From the middle seats it mostly folds.',
      },
      {
        kind: 'visual',
        title: 'How big to 3bet',
        art: {
          kind: 'tree',
          root: 'You 3bet in position',
          branches: [
            { label: 'Against a 2.5bb open', value: 'About 7.5 to 8bb', tone: 'green' },
            { label: 'Against a 3bb open', value: 'About 9bb', tone: 'green' },
          ],
        },
        caption: 'In position, 3bet about 3 times the open. A little larger keeps the players behind from calling cheaply.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live cold callers',
        body: 'Live players behind you often call 3bets cold with hands like KQo. Against them, size up and cut bluffs. Your value hands earn more from those calls.',
      },
      {
        kind: 'quiz',
        question: 'UTG opens 2.5bb. You are in the HJ with K♦Q♣. What do you usually do?',
        cards: 'KdQc',
        choices: ['Fold most of the time', 'Call to see a flop', '3bet every time'],
        answer: 0,
        explain: 'KQo is dominated by AK, AQ and KK in an early range. 4 players behind can still squeeze. So it mostly folds.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'UTG+1 opens 2.5bb. You are in the LJ with A♥J♣. What do you usually do?',
            cards: 'AhJc',
            explain: 'AJo is dominated by AK, AQ and AA in an early range. 5 players behind can still squeeze. So it mostly folds.',
          },
          {
            question: 'UTG opens 3bb. You are in the CO with A♦T♣. What do you usually do?',
            cards: 'AdTc',
            explain: 'ATo is dominated by every better ace in an early range. The button and blinds can still squeeze. So it mostly folds.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'You hold 8♥7♥ in the HJ after a UTG open. How often does at least one of the 4 players behind hold QQ+ or AK?',
        choices: ['About 3%', 'About 11%', 'About 25%'],
        answer: 1,
        explain: 'Like the bars showed, the exact chance is 10.8%. With 6 players behind it rises to 15.8%.',
        point: 0,
        shuffleSuits: true,
        variants: [
          {
            question: 'You hold 8♥7♥ in the CO after a UTG open. How often does at least one of the 3 players behind hold QQ+ or AK?',
            choices: ['About 3%', 'About 8%', 'About 20%'],
            explain: 'The exact chance is 8.2%. Each player behind adds about 2.5 points.',
          },
          {
            question: 'You hold 8♥7♥ in the UTG+2 seat after a UTG open. How often does at least one of the 6 players behind hold QQ+ or AK?',
            choices: ['About 6%', 'About 16%', 'About 35%'],
            explain: 'Like the bars showed, the exact chance is 15.8%. That is why early seats play so tight.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'UTG opens 2.5bb and you 3bet from the cutoff. What size fits?',
        choices: ['5bb', 'About 8bb', '15bb'],
        answer: 1,
        explain: 'In position, 3bet about 3 times the open. That is 7.5bb, often a little more. 5bb gives too good a price and 15bb risks too much.',
        point: 2,
        variants: [
          {
            question: 'UTG+1 opens 3bb and you 3bet from the HJ. What size fits?',
            choices: ['6bb', 'About 9bb', '18bb'],
            explain: 'In position, 3bet about 3 times the open. That makes 9bb. 6bb gives too good a price and 18bb risks too much.',
          },
          {
            question: 'UTG+2 opens 2.5bb and you 3bet from the LJ. What size fits?',
            explain: 'In position, 3bet about 3 times the open. That is 7.5bb, often a little more. Five players still act behind you.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'More players behind means more squeezes and more premiums waiting.',
          'Against early opens, 3bet or fold most hands. Fold dominated offsuit hands like KQo and AJo.',
          '3bet about 3 times the open in position.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/cold-call-ip',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'ring', value: 2.5 / 6.5, label: 'Equity to cold call', caption: 'Against a 2.5bb open' },
    steps: [
      {
        kind: 'intro',
        title: 'The best seat to call from',
        body: 'A cold call means calling an open with no chips in yet. You pay the full price. It works best on the button, where position lasts the whole hand.',
      },
      {
        kind: 'visual',
        title: 'You pay the full price',
        art: { kind: 'ring', value: 2.5 / 6.5, label: 'Equity to cold call', caption: 'Against a 2.5bb open' },
        caption: 'Against a 2.5bb open you call 2.5bb to win 4bb. That needs **38.5%** raw equity. The big blind needs only 27.3%, since it has 1bb in.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Only the blinds behind',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BTN', highlight: ['CO', 'SB', 'BB'], note: 'CO opens, 2 players behind you' },
        caption: 'On the button only the 2 blinds act after you. You also act last on every street after the flop.',
      },
      {
        kind: 'text',
        title: 'Why position pays for the call',
        body: [
          'In position you see each move before you choose. You bet when they check and fold cheaply when they bet big.',
          'So you keep more of your equity than the raw number suggests. Out of position the same hands keep less.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Seat by seat',
        columns: ['Your seat', 'Opener', 'Players behind', 'Cold calls'],
        rows: [
          ['BTN', 'CO', '2', 'The most'],
          ['CO', 'HJ', '3', 'Fewer'],
          ['HJ', 'LJ', '4', 'Few'],
          ['LJ', 'UTG', '5', 'Almost none'],
        ],
        note: 'Directional, 9-handed at 100bb. Each player behind can squeeze, and a squeeze folds most cold calls.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A good cold call',
        cards: '8s7s',
        caption: '8♠7♠ makes straights and flushes. In position it also wins pots when it misses, by betting when checked to.',
      },
      {
        kind: 'visual',
        title: 'What happens after you call',
        art: {
          kind: 'tree',
          root: 'You cold call on the button',
          branches: [
            { label: 'Both blinds fold', value: 'Heads up in position', tone: 'green' },
            { label: 'A blind calls', value: 'Three way pot', tone: 'brass' },
            { label: 'A blind squeezes', value: 'Fold most hands', tone: 'red' },
          ],
        },
        caption: 'Most of the time you play heads up with position. A squeeze is the risk, and it is why cold calls stay tight in earlier seats.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live open sizes',
        body: 'Live opens are often 4 to 6bb. Your price gets worse, but deep stacks pay off sets. Cold call pairs and suited hands. Fold offsuit hands that make second best pairs.',
      },
      {
        kind: 'quiz',
        question: 'The CO opens 2.5bb. How much raw equity does a cold call on the button need?',
        choices: ['27.3%', '38.5%', '50%'],
        answer: 1,
        explain: 'You call 2.5bb to win 4bb. So 2.5 ÷ 6.5 = 38.5%. 27.3% is the big blind’s price, since it already has 1bb in.',
        point: 0,
        variants: [
          {
            question: 'The HJ opens 3bb. How much raw equity does a cold call in the cutoff need?',
            choices: ['30.8%', '40%', '46.2%'],
            explain: 'You call 3bb to win 4.5bb. So 3 ÷ 7.5 = 40%. Bigger opens raise the price.',
          },
          {
            question: 'A live player in the LJ opens 5bb. How much raw equity does a cold call on the button need?',
            choices: ['40%', '43.5%', '55%'],
            explain: 'You call 5bb to win 6.5bb. So 5 ÷ 11.5 = 43.5%. Big live opens make cold calls expensive.',
          },
          {
            question: 'UTG+1 opens 2.5bb. How much raw equity does a cold call in the LJ need?',
            explain: 'You call 2.5bb to win 4bb. So 2.5 ÷ 6.5 = 38.5% from any seat. In the LJ you also have 5 players behind, so cold calls are rare.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Which seat cold calls an open most often?',
        choices: ['UTG+2', 'HJ', 'CO', 'BTN'],
        answer: 3,
        explain: 'The button has only the blinds behind and position on every street. Earlier seats leave more players who can squeeze.',
        point: 1,
        variants: [
          {
            question: 'The HJ opens. Which seat behind it cold calls less often?',
            choices: ['CO', 'BTN'],
            answer: 0,
            explain: 'The cutoff still has the button and both blinds behind. The button has only the blinds behind, and it has position.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The CO opens 2.5bb. On the button, which hand is the best cold call?',
        choiceCards: ['8s7s', 'Kh9c', 'Qd8c'],
        choices: ['8♠7♠', 'K♥9♣', 'Q♦8♣'],
        answer: 0,
        explain: 'Suited connectors make straights and flushes and play well in position. K9o and Q8o make second best pairs against a cutoff range. They fold.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['KdTc', '6h6c', 'Js8d'],
            choices: ['K♦T♣', '6♥6♣', 'J♠8♦'],
            answer: 1,
            explain: '66 makes sets that win big pots in position. KTo and J8o make dominated pairs, so they mostly fold.',
          },
          {
            choiceCards: ['Ad8c', 'QcTd', 'AsTs'],
            choices: ['A♦8♣', 'Q♣T♦', 'A♠T♠'],
            answer: 2,
            explain: 'ATs makes the nut flush and strong top pairs. A8o and QTo are offsuit hands that get dominated, so they fold.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'A cold call pays the full price. Against a 2.5bb open it needs 38.5% raw equity.',
          'Cold call most from the button. Every player behind you can squeeze.',
          'Cold call pairs and suited hands. Fold offsuit hands that make second best pairs.',
        ],
      },
    ],
  },
  {
    key: 'preflop/vs-open/defend-by-size',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'curve',
      points: [
        [2, 57.1],
        [2.5, 62.5],
        [3, 66.7],
        [4, 72.7],
        [5, 76.9],
      ],
      xLabel: 'Open size (bb)',
      yLabel: 'Folds a steal needs (%)',
      mark: [2.5, 62.5],
    },
    steps: [
      {
        kind: 'intro',
        title: 'What the opener risks',
        body: 'An open risks chips to win the blinds. The bigger the open, the more folds it needs. That tells you how much the table must defend.',
      },
      {
        kind: 'formula',
        title: 'Folds a steal needs',
        formula: '2.5 ÷ (2.5 + 1.5) = 62.5%',
        parts: [
          ['Open', '2.5bb risked'],
          ['Blinds', '1.5bb to win'],
        ],
        example:
          'A 2.5bb steal with no equity needs **62.5%** folds. So the players behind must defend about **37.5%** together. Real opens have equity when called, so the true number is lower.',
      },
      {
        kind: 'visual',
        title: 'Bigger opens need more folds',
        art: {
          kind: 'curve',
          points: [
            [2, 57.1],
            [2.5, 62.5],
            [3, 66.7],
            [4, 72.7],
            [5, 76.9],
          ],
          xLabel: 'Open size (bb)',
          yLabel: 'Folds a steal needs (%)',
          mark: [2.5, 62.5],
        },
        caption: 'Each point is open ÷ (open + 1.5). A 2bb open needs **57.1%** folds. A 5bb live open needs **76.9%**.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Open size and the big blind',
        columns: ['Open', 'Table defends', 'Big blind price'],
        rows: [
          ['2bb', '42.9%', '22.2%'],
          ['2.5bb', '37.5%', '27.3%'],
          ['3bb', '33.3%', '30.8%'],
          ['4bb', '27.3%', '35.3%'],
        ],
        note: 'Exact math. Table defends is the share that must continue so a no equity steal only breaks even. The big blind price assumes the small blind folds.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Who does the defending',
        body: [
          'Everyone behind shares the defense. Against a button open only the 2 blinds are left.',
          'The big blind does most of it. It has the best price and closes the action.',
          'The small blind defends less. It is out of position with the big blind still behind it.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Small opens, wide defense',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'BB', highlight: ['BTN'], note: 'BTN opens 2bb' },
        caption: 'Online buttons often open 2bb. The big blind then calls 1bb to win 3.5bb. That needs only **22.2%**, so it defends very wide.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'The same hand, two sizes',
        cards: '9c6c',
        caption: '9♣6♣ is an easy defend against a 2bb button open. Against a 4bb open it is close, since the price rises to 35.3%.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Do not fold everything to big opens',
        body: 'Big live opens need many folds to win the blinds. They also come from stronger ranges. So fold more, but not everything. 3bet your best hands for value.',
      },
      {
        kind: 'quiz',
        question: 'The button opens 3bb and the blinds have 1.5bb in. How often must the blinds fold for a no equity steal to break even?',
        choices: ['50%', '62.5%', '66.7%', '75%'],
        answer: 2,
        explain: 'The open risks 3bb to win 1.5bb. So 3 ÷ 4.5 = 66.7%. 62.5% is the number for a 2.5bb open.',
        point: 0,
        variants: [
          {
            question: 'The cutoff opens 2bb. How often must the players behind fold for a no equity steal to break even?',
            choices: ['42.9%', '57.1%', '62.5%', '66.7%'],
            answer: 1,
            explain: 'The open risks 2bb to win 1.5bb. So 2 ÷ 3.5 = 57.1%. Smaller opens need fewer folds, so you must defend more.',
          },
          {
            question: 'A live HJ opens 5bb. How often must everyone behind fold for a no equity steal to break even?',
            choices: ['62.5%', '71.4%', '76.9%', '83.3%'],
            answer: 2,
            explain: 'The open risks 5bb to win 1.5bb. So 5 ÷ 6.5 = 76.9%. Big opens need many folds to work as bluffs.',
          },
          {
            question: 'UTG+2 opens 2.5bb. How often must everyone behind fold for a no equity steal to break even?',
            choices: ['57.1%', '62.5%', '66.7%', '75%'],
            answer: 1,
            explain: 'The open risks 2.5bb to win 1.5bb. So 2.5 ÷ 4 = 62.5%. Six players share that defense, so each one defends far less.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'The button opens 2bb and the small blind folds. What raw equity does a big blind call need?',
        choices: ['22.2%', '27.3%', '33.3%'],
        answer: 0,
        explain: 'You call 1bb to win 3.5bb. So 1 ÷ 4.5 = 22.2%. 27.3% is the price against a 2.5bb open.',
        point: 1,
        variants: [
          {
            question: 'The button opens 4bb and the small blind folds. What raw equity does a big blind call need?',
            choices: ['27.3%', '35.3%', '42.9%'],
            answer: 1,
            explain: 'You call 3bb to win 5.5bb. So 3 ÷ 8.5 = 35.3%. A bigger open gives you a worse price.',
          },
          {
            question: 'The cutoff opens 3bb and the small blind folds. What raw equity does a big blind call need?',
            choices: ['27.3%', '30.8%', '37.5%'],
            answer: 1,
            explain: 'You call 2bb to win 4.5bb. So 2 ÷ 6.5 = 30.8%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Against a button open, which blind does most of the defending?',
        choices: ['The small blind', 'The big blind', 'Both about the same'],
        answer: 1,
        explain: 'The big blind has the best price and closes the action. The small blind is out of position with the big blind still behind it.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A no equity steal needs open ÷ (open + 1.5) folds. That is 62.5% for a 2.5bb open.',
          'Bigger opens need more folds but give you a worse price. Smaller opens mean a wider defense.',
          'The big blind does most of the defending. The small blind defends less.',
        ],
      },
    ],
  },
];
