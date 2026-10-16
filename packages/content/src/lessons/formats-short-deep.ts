import type { LessonContent } from './types';

/**
 * Short handed (6-max) and deep stack lessons in the Other formats track.
 * Chart numbers come from Felt's starter charts, which are approximate.
 * Every number is recomputed in test/formats-short-deep.test.ts.
 */
export const FORMATS_SHORT_DEEP_LESSONS: LessonContent[] = [
  // Short handed (6-max) ------------------------------------------------------
  {
    key: 'formats/short-handed/fewer-players',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'table', seats: 6, button: 'BTN', hero: 'UTG', highlight: ['HJ', 'CO', 'BTN', 'SB', 'BB'], note: '5 players behind' },
    practice: ['6max-100-rfi-utg', '6max-100-rfi-hj'],
    steps: [
      {
        kind: 'intro',
        title: 'Same seat name, more hands',
        body: 'At 6-max you open far more hands from the first seat. The rules are the same. What changes is how many players act after you.',
      },
      {
        kind: 'visual',
        title: 'Count the players behind',
        art: { kind: 'table', seats: 6, button: 'BTN', hero: 'UTG', highlight: ['HJ', 'CO', 'BTN', 'SB', 'BB'], note: '5 players behind' },
        caption:
          'At 6-max, UTG has 5 players left to act. At a 9-handed table, UTG has 8. Each of them could wake up with a strong hand. Fewer players behind means fewer hands that can beat you.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Opens by players behind',
        columns: ['Players behind', '9-handed seat', '6-max seat', 'Opens'],
        rows: [
          ['8', 'UTG', 'None', '11.7%'],
          ['7', 'UTG+1', 'None', '12.9%'],
          ['6', 'UTG+2', 'None', '15.3%'],
          ['5', 'LJ', 'UTG', '17.9%'],
          ['4', 'HJ', 'HJ', '22.0%'],
          ['3', 'CO', 'CO', '28.2%'],
          ['2', 'BTN', 'BTN', '42.7%'],
          ['1', 'SB', 'SB', '42.2%'],
        ],
        note: 'Share of all hands that open in Felt’s starter charts, which are approximate. A 6-max seat uses the same chart as the 9-handed seat with the same players behind. The small blind opens a little less than the button. It plays out of position after the flop.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'The first seat at two tables',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'UTG 9-handed', value: 11.7, tone: 'gray' },
            { label: 'UTG 6-max', value: 17.9, tone: 'green' },
          ],
        },
        caption:
          'The first seat at 6-max opens **17.9%** of hands. The first seat 9-handed opens **11.7%**. The 6-max seat plays like the 9-handed LJ. Both have 5 players behind.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'How often someone behind is strong',
        formula: 'Chance someone holds it = 1 − chance that nobody does',
        example:
          'You hold J♠T♠. Take QQ+ and AK as the strong hands. One player holds one **2.8%** of the time. With 5 players behind it is **13.3%**. With 8 behind it is **20.7%**. These counts handle card removal between players exactly.',
      },
      {
        kind: 'visual',
        title: 'QQ+ or AK somewhere behind you',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '1 player', value: 2.8, tone: 'gray' },
            { label: '5 players', value: 13.3, tone: 'brass' },
            { label: '8 players', value: 20.7, tone: 'red' },
          ],
        },
        caption:
          'You hold J♠T♠. Each extra player adds another chance that a hand behind you is QQ+ or AK. Those hands 3bet you and win most big pots. So the first seat 9-handed must open tighter.',
        evidence: 'math',
      },
      {
        kind: 'chart',
        chartId: '6max-100-rfi-utg',
        title: 'The 6-max UTG chart',
        caption:
          'This is the same range as the 9-handed LJ. It opens every pair from 44 up. It opens AJo and KQo every time. Weaker offsuit hands are close calls or folds.',
      },
      {
        kind: 'text',
        title: 'Seats are about who is left',
        body: [
          'Seat names describe the order of play. Ranges depend on how many players are left to act.',
          'A 9-handed table with 3 empty seats plays like 6-max. Use the chart for the players behind you.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'At 6-max it folds to you UTG. Which 9-handed seat has the same players behind it?',
        choices: ['UTG', 'LJ', 'CO'],
        answer: 1,
        explain: 'Like the table showed, 6-max UTG has 5 players behind. So does the 9-handed LJ. That is why Felt uses the same chart for both.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You hold J♠T♠ with 5 players behind. How often does at least one of them hold QQ+ or AK?',
        cards: 'JsTs',
        choices: ['About 3%', 'About 13%', 'About 21%', 'About 34%'],
        answer: 1,
        explain: 'Like the bars showed, it is 13.3% with 5 players behind. About 3% is the chance for 1 player. About 21% is the chance with 8 players behind.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Folded to you UTG at 6-max. About how often does Felt’s chart open?',
        choices: ['About 12%', 'About 18%', 'About 28%', 'About 43%'],
        answer: 1,
        explain: 'Like the first seat bars showed, 6-max UTG opens 17.9% of hands. About 12% is the 9-handed UTG. About 28% is the cutoff and about 43% is the button.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Why does the first seat open more hands at 6-max than 9-handed?',
        choices: ['Fewer players can wake up with a strong hand', 'The pot is bigger before the flop', 'Players at 6-max fold more often'],
        answer: 0,
        explain: 'Like the QQ+ or AK bars showed, each extra player adds a chance of QQ+ or AK. The blinds are the same size at both tables. So the pot before the flop is the same too.',
        point: 1,
      },
      {
        kind: 'takeaway',
        points: [
          'Ranges depend on the players behind you. 6-max UTG plays like the 9-handed LJ.',
          'Each player behind adds a chance of a strong hand. With 5 behind, QQ+ or AK shows up 13.3% of the time.',
          'The first seat opens 17.9% of hands at 6-max and 11.7% at 9-handed.',
        ],
      },
    ],
  },
  {
    key: 'formats/short-handed/blind-battles',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'bars',
      unit: 'bb',
      bars: [
        { label: '9-handed', value: 16.7, tone: 'gray' },
        { label: '6-max', value: 25, tone: 'brass' },
      ],
    },
    practice: ['6max-100-sb-vs-btn', '6max-100-bb-vs-btn', '6max-100-btn-vs-3bet'],
    steps: [
      {
        kind: 'intro',
        title: 'The blinds come around faster',
        body: 'At 6-max you post the blinds every 6 hands. So they cost you more per 100 hands. Stealing and defending them matter more.',
      },
      {
        kind: 'visual',
        title: 'What the blinds cost',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: '9-handed', value: 16.7, tone: 'gray' },
            { label: '6-max', value: 25, tone: 'brass' },
          ],
        },
        caption:
          'You post 1.5bb of blinds each orbit. At 6-max an orbit is 6 hands, so that is **25bb** per 100 hands. At 9-handed it is **16.7bb**. Good steals and defense win part of it back.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'How often it folds to you',
        columns: ['Folded to', '6-max', '9-handed'],
        rows: [
          ['Button', '46.0%', '29.9%'],
          ['Small blind', '26.3%', '17.1%'],
        ],
        note: 'Our estimate from Felt’s starter charts. Each seat opens at its chart rate when all before it folded. This simple model treats seats as independent. It ignores card removal.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Folded to the button',
        art: { kind: 'table', seats: 6, button: 'BTN', hero: 'BTN', highlight: ['SB', 'BB'], note: 'Folded to you' },
        caption:
          'In the model, it folds to the 6-max button almost half the time. From there the button opens **42.7%** of hands. Each steal goes after the 1.5bb in the blinds.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: '3bets by spot',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'BB vs UTG 9-handed', value: 3, tone: 'gray' },
            { label: 'BTN vs CO', value: 7.8 },
            { label: 'BB vs CO', value: 8.7 },
            { label: 'BB vs BTN', value: 10.2 },
            { label: 'SB vs BTN', value: 17.4, tone: 'green' },
          ],
        },
        caption:
          'Share of all hands that 3bet in Felt’s starter charts. Later openers have wider ranges, so they face more 3bets. At 6-max more of the opens you face come from late seats.',
        evidence: 'solver',
      },
      {
        kind: 'chart',
        chartId: '6max-100-sb-vs-btn',
        title: 'Small blind against the button',
        caption:
          'Felt’s chart 3bets **17.4%** of hands and never calls. A call out of position invites the big blind to squeeze. So the small blind mostly 3bets or folds.',
      },
      {
        kind: 'text',
        title: 'Why 3bets rise',
        body: [
          'A wide open holds many hands that cannot stand a 3bet. So a 3bet wins the pot more often.',
          'That lets the blinds 3bet hands like KJo and A9o part of the time against the button.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'The button folds half its opens',
        art: { kind: 'ring', value: 0.475, label: 'Button opens that continue', caption: 'Facing a 3bet to 11bb' },
        caption:
          'Felt’s chart 4bets or calls with **47.5%** of the hands the button opened. It folds the rest. A wide range has many hands that must fold to a 3bet.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'At 6-max, how much do the blinds cost you per 100 hands?',
        choices: ['16.7bb', '25bb', '150bb'],
        answer: 1,
        explain: 'Like the blinds bars showed, you post 1.5bb every 6 hands. That is 25bb per 100 hands. 16.7bb is the cost at 9-handed.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'In the simple model, how often does it fold to the button at 6-max?',
        choices: ['About 30%', 'About 46%', 'About 70%'],
        answer: 1,
        explain: 'Like the table showed, it folds to the 6-max button 46.0% of the time. About 30% is the 9-handed number. Steal spots come up far more often at 6-max.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'The button opens 2.5bb. You hold K♠Q♦ in the small blind. What does Felt’s chart do?',
        cards: 'KsQd',
        choices: ['3bet', 'Call', 'Fold'],
        answer: 0,
        explain: 'Like the small blind chart showed, it 3bets or folds against the button. KQo is a strong hand against a wide open. So it 3bets every time.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Which open faces a 3bet most often in Felt’s charts?',
        choices: ['UTG at 9-handed', 'The cutoff', 'The button'],
        answer: 2,
        explain: 'Like the 3bet bars showed, the blinds 3bet the button most. The small blind 3bets 17.4% and the big blind 10.2%. The big blind 3bets UTG only 3.0% of the time.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'The blinds cost 25bb per 100 hands at 6-max and 16.7bb at 9-handed.',
          'It folds to the 6-max button about 46% of the time. Steal and defend more often.',
          'Wide opens face more 3bets. The small blind 3bets or folds against the button.',
        ],
      },
    ],
  },
  {
    key: 'formats/short-handed/postflop-6max',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'BTN', value: 28.9, tone: 'brass' },
        { label: 'BB', value: 18.8, tone: 'gray' },
      ],
    },
    practice: ['6max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'Wider ranges reach the flop',
        body: 'At 6-max more pots start from late seats. Both players bring wider ranges to the flop. That changes who should bet and how often.',
      },
      {
        kind: 'visual',
        title: 'Opens from the cutoff or button',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '9-handed', value: 27.2, tone: 'gray' },
            { label: '6-max', value: 44.4, tone: 'green' },
          ],
        },
        caption:
          'Share of all opens that come from the cutoff or button, in our simple model. These openers play in position against the blinds. So 6-max sees more pots in position after the flop.',
        evidence: 'math',
      },
      {
        kind: 'board',
        title: 'An ace high flop',
        board: 'Ah8d3c',
        caption: 'The button opened and the big blind called. The flop is rainbow, so nobody has a flush draw.',
      },
      {
        kind: 'visual',
        title: 'Top pair or better on A♥8♦3♣',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'UTG 9-handed', value: 39.1 },
            { label: 'UTG 6-max', value: 35.8 },
            { label: 'BTN', value: 28.9, tone: 'brass' },
            { label: 'BB calls vs BTN', value: 18.8, tone: 'gray' },
          ],
        },
        caption:
          'Share of each range with top pair or better, exact from Felt’s starter charts. Wider ranges hit this flop less often. The button still has a much larger share of top pairs. The big blind 3bets many of its best aces.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'High dry boards',
        body: [
          'On boards like this, solvers c-bet the button’s range often with a small size.',
          'The big blind holds few strong hands here. So the button can bet many hands at low risk.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A low connected flop',
        board: '7s6d5c',
        caption: 'Same players, a different flop. The big blind calls with many low suited and connected hands.',
      },
      {
        kind: 'visual',
        title: 'Two pair or better on 7♠6♦5♣',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'BTN', value: 4.5, tone: 'gray' },
            { label: 'BB calls vs BTN', value: 8.5, tone: 'green' },
          ],
        },
        caption: 'Strong hands here are straights, sets and two pair. Shares are exact from Felt’s starter charts. The big blind has nearly twice the button’s share of strong hands here.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Low connected boards',
        body: ['Here the roles flip. Solvers check much more from the button.', 'The big blind check raises more often. Its range holds more of the nuts.'],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Small bets need wide defense',
        art: { kind: 'ring', value: 0.75, label: 'Defend vs a 1/3 pot bet', caption: 'MDF against 1/3 pot' },
        caption:
          'Facing a bet of 1/3 pot, the big blind must continue **75%** of the time. Otherwise the button profits by betting any 2 cards. Yet **57.1%** of its calls have no pair on A♥8♦3♣.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Defending wide ranges',
        body: [
          'Solvers defend with pairs and with high cards that have backdoor draws.',
          'MDF is a guide, not a rule. When the board favors the bettor, solvers often fold a little more than MDF says.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'In the simple model, what share of opens come from the cutoff or button at 6-max?',
        choices: ['About 27%', 'About 44%', 'About 70%'],
        answer: 1,
        explain: 'Like the opens bars showed, it is 44.4% at 6-max. About 27% is the 9-handed share. Those openers play in position against the blinds.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'The button opens and the big blind calls. What do solvers usually do with the button’s range on this flop?',
        board: 'Ah8d3c',
        choices: ['Bet often with a small size', 'Check almost every hand', 'Bet big with only strong hands'],
        answer: 0,
        explain: 'Like the top pair bars showed, the button has 28.9% top pair or better. The big blind has 18.8%. That edge lets the button bet often and small.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Which flop is better for the big blind’s calling range against a button open?',
        choices: ['A♥8♦3♣', '7♠6♦5♣'],
        answer: 1,
        explain: 'Like the two pair bars showed, the big blind has 8.5% two pair or better on 7♠6♦5♣. The button has 4.5%. On A♥8♦3♣ the button has far more top pairs.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'The button bets 1/3 pot. How often must the big blind continue so any 2 cards cannot profit?',
        choices: ['25%', '50%', '75%'],
        answer: 2,
        explain: 'Like the ring showed, MDF is the pot ÷ (pot + bet). That is 1 ÷ (1 + 1/3), or 75%. 25% is how often a pure bluff needs folds.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'More 6-max pots start in late position. Wider ranges hit the flop less often.',
          'On high dry boards the button c-bets often and small.',
          'Low connected boards favor the big blind. The button checks more there.',
          'A 1/3 pot bet calls for 75% defense. Treat it as a guide, not a rule.',
        ],
      },
    ],
  },

  // Deep stacks ---------------------------------------------------------------
  {
    key: 'formats/deep-stacks/deep-changes',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Pot', bb: 22.5 },
        { label: 'Behind at 100bb', bb: 89 },
        { label: 'Behind at 200bb', bb: 189 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Twice the stack, twice the SPR',
        body: 'At 200bb the pot before the flop is the same size as at 100bb. The money behind it doubles. Every plan after the flop changes with it.',
      },
      {
        kind: 'table',
        title: 'SPR at 100bb and 200bb',
        columns: ['Pot', 'Pot size', 'SPR at 100bb', 'SPR at 200bb'],
        rows: [
          ['Single raised pot', '5.5bb', '17.7', '35.9'],
          ['3bet pot', '22.5bb', '4.0', '8.4'],
        ],
        note: 'The button opens 2.5bb. In the single raised pot the big blind calls. In the 3bet pot the big blind 3bets to 11bb and the button calls. The small blind’s 0.5bb is in the pot. SPR (stack to pot ratio) is the stack behind divided by the pot.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A 3bet pot at 200bb',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 22.5 },
            { label: 'Behind', bb: 189 },
          ],
        },
        caption: 'With 189bb behind a 22.5bb pot, the SPR is **8.4**. At 100bb the same pot has 89bb behind. That SPR is **4.0**.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Geometric sizing in a 3bet pot',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '100bb', value: 54, tone: 'gray' },
            { label: '200bb', value: 81, tone: 'brass' },
          ],
        },
        caption:
          'Bet the same share of the pot on the flop, turn and river. These sizes get the stacks in by the river. At 100bb that is **54%** of the pot. At 200bb it is **81%**. In a single raised pot it is **116%** and **159%**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why one pair suffers',
        body: [
          'In a 100bb 3bet pot, top pair can bet about half pot 3 times and be all in.',
          'At 200bb it needs much bigger bets. The hands that call those bets are usually better than one pair.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Set mining a 3bet',
        cards: '5s5d',
        caption: 'You open 5♠5♦ on the button. The big blind 3bets to 11bb and you call. You flop a set or better **11.8%** of the time.',
      },
      {
        kind: 'formula',
        title: 'What set mining needs',
        formula: 'Extra needed = call ÷ equity − (pot + call)',
        example:
          'You call 8.5bb into a 14bb pot. Divide 8.5 by the exact 11.8% and take away the 22.5bb pot. You need about **49.8bb** more on average when you hit. This treats a set as always winning and a miss as always folding. That flatters set mining.',
      },
      {
        kind: 'visual',
        title: 'Share of the stack you must win',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '100bb', value: 56, tone: 'red' },
            { label: '200bb', value: 26, tone: 'green' },
          ],
        },
        caption:
          'The extra you need is the same **49.8bb** at both depths. At 100bb only 89bb is left, so it is **56%** of what villain can pay. At 200bb it is **26%** of 189bb.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Suited connectors deep',
        art: { kind: 'cards', cards: '8s7s' },
        caption:
          'Hands like 8♠7♠ rarely flop big. When they make a straight or flush, deep stacks let them win much more. Solvers play more small pairs and suited connectors deep.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'The button opens 2.5bb and the big blind 3bets to 11bb. The button calls with 200bb stacks. What is the SPR?',
        choices: ['About 4', 'About 8.4', 'About 17.7', 'About 36'],
        answer: 1,
        explain: 'Like the SPR table showed, 189bb behind ÷ a 22.5bb pot is 8.4. About 4 is the same pot at 100bb. About 17.7 and 36 are single raised pots.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'At 200bb in a 3bet pot, what bet on each street gets the stacks in by the river?',
        choices: ['About 54% pot', 'About 81% pot', 'About 159% pot'],
        answer: 1,
        explain: 'Like the geometric bars showed, it is 81% of the pot each street. 54% is the 100bb size. 159% is a 200bb single raised pot.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Set mining a 3bet needs about 49.8bb extra when you hit. What share of a 189bb stack is that?',
        choices: ['About 11%', 'About 26%', 'About 56%'],
        answer: 1,
        explain: 'Like the stack bars showed, 49.8 ÷ 189 is about 26%. At 100bb the same 49.8bb is 56% of 89bb. Deep stacks make that money much easier to win.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'SPR doubles at 200bb. A 3bet pot goes from 4.0 to 8.4.',
          'Deep stacks need bigger bets to get all in. Hands that call them usually beat one pair.',
          'Implied odds grow deep. Small pairs and suited connectors gain value.',
        ],
      },
    ],
  },
  {
    key: 'formats/deep-stacks/one-pair-deep',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'cards', cards: 'Kh9d', board: 'Kd8c4s' },
    steps: [
      {
        kind: 'intro',
        title: 'Good hand, small pot',
        body: 'Top pair wins most small pots. It loses many of the biggest ones. Deep stacks make the biggest pots possible.',
      },
      {
        kind: 'hand',
        title: 'Top pair, weak kicker',
        cards: 'Kh9d',
        board: 'Kd8c4s',
        caption: 'You open K♥9♦ on the button and the big blind calls. You flop top pair with a 9 kicker.',
      },
      {
        kind: 'table',
        title: 'What the big blind can hold',
        columns: ['Hands', 'Combos', 'Against K9'],
        rows: [
          ['Two pair or better', '15.9', 'Ahead'],
          ['KQ, KJ and KT', '18.8', 'Ahead'],
          ['K9', '3.8', 'Tie'],
          ['K7 to K2', '26.4', 'Behind'],
          ['Everything else', '425.3', 'Behind'],
        ],
        note: 'Combos from the big blind’s calls in Felt’s 6-max chart against a button open. Each is weighted by how often the chart calls. Your cards and the board are removed. Two pair or better here means 88 and 44 or two pair with K8, K4 and 84s.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'K9 against each part',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'All calls', value: 82, tone: 'green' },
            { label: 'Top pair or better', value: 43.3, tone: 'gray' },
            { label: 'Two pair or better', value: 12.8, tone: 'red' },
          ],
        },
        caption:
          'Your equity, exact over every turn and river. Against all the big blind’s calls you win **82.0%**. Against its top pair or better you win **43.3%**. Against two pair or better you win **12.8%**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why depth hurts one pair',
        body: [
          'Players put big money in with strong hands. The more money goes in, the stronger their range gets.',
          'At 200bb the biggest pots need 3 or 4 large bets. Weaker top pairs fold before then. So the pots you play for stacks are mostly against better hands.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'An overpair',
        cards: 'QsQd',
        board: 'Jh8c3d',
        caption: 'You open Q♠Q♦ on the button and the big blind calls. Only **3.1%** of its calls beat you on this flop. They are sets and two pair.',
      },
      {
        kind: 'visual',
        title: 'Q♠Q♦ against each part',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'All calls', value: 83, tone: 'green' },
            { label: 'Top pair or better', value: 67, tone: 'gray' },
            { label: 'Two pair or better', value: 19.3, tone: 'red' },
          ],
        },
        caption:
          'Exact over every turn and river. The overpair holds up better than K9 against top pairs. Against two pair or better it still wins only **19.3%**.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Plan the pot size',
        body: [
          'This is reverse implied odds. One pair wins small pots and loses big ones.',
          'Deep, solvers bet one pair for value but rarely build a pot for all 200bb. A big raise deep rarely holds one pair for value.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'You hold K♥9♦ on K♦8♣4♠. What is your equity against the big blind’s top pair or better?',
        cards: 'Kh9d',
        board: 'Kd8c4s',
        choices: ['About 13%', 'About 43%', 'About 82%'],
        answer: 1,
        explain: 'Like the K9 bars showed, it is 43.3%. About 82% is against all the big blind’s calls. About 13% is against two pair or better.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Why does top pair lose value as stacks get deeper?',
        choices: ['The biggest pots come mostly from better hands', 'Top pair cannot bet the flop deep', 'The big blind calls fewer hands deep'],
        answer: 0,
        explain: 'Like the text on depth said, ranges get stronger as more money goes in. Deep stacks allow huge pots. Top pair gets paid most by better hands in those pots.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You hold Q♠Q♦ on J♥8♣3♦. How often does the big blind’s calling range beat you right now?',
        cards: 'QsQd',
        board: 'Jh8c3d',
        choices: ['About 3%', 'About 19%', 'About 33%'],
        answer: 0,
        explain: 'Like the overpair step showed, only 3.1% of its calls beat you. They are sets and two pair. Those are the hands that want to play for 200bb.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Deep, you face a big raise on the flop. What does it rarely hold for value?',
        choices: ['Sets', 'Two pair', 'One pair'],
        answer: 2,
        explain: 'Like the plan step said, a big raise deep rarely holds one pair for value. One pair cannot stand the bets that follow. Sets and two pair can.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'K9 on K♦8♣4♠ has 82.0% against all the calls. Against top pair or better it has 43.3%.',
          'Big pots come from strong ranges. Deep stacks allow big pots, so one pair loses value.',
          'A big raise deep rarely holds one pair for value. Plan pots you can win with one pair.',
        ],
      },
    ],
  },
  {
    key: 'formats/deep-stacks/preflop-deep',
    level: 'advanced',
    minutes: 8,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Pot', bb: 48.5 },
        { label: 'Behind', bb: 176 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Deeper stacks, bigger raises',
        body: 'At 200bb, 3bets and 4bets leave much more behind. Hands that make the nuts gain value. Hands that make one strong pair lose it.',
      },
      {
        kind: 'table',
        title: 'SPR after each raise',
        columns: ['Pot', '100bb', '200bb'],
        rows: [
          ['3bet to 11bb, called', '4.0', '8.4'],
          ['3bet to 13bb, called', '3.3', '7.1'],
          ['4bet to 24bb, called', '1.6', '3.6'],
        ],
        note: 'The button opens 2.5bb and the big blind 3bets. In the last row the 3bet is 11bb and the button 4bets to 24bb. The big blind calls. The small blind’s 0.5bb is dead.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A called 4bet at 200bb',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Pot', bb: 48.5 },
            { label: 'Behind', bb: 176 },
          ],
        },
        caption: 'At 100bb a called 4bet leaves an SPR of **1.6**, so the next raise is all in. At 200bb the SPR is **3.6**. There is real play left after the flop.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Sizes grow deep',
        body: ['Solvers use bigger 3bets and 4bets when stacks are deep.', 'A bigger raise lowers the SPR. It also charges hands that hope to hit a cheap flop.'],
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: '5bet bluffs need more folds',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '100bb', value: 71.5, tone: 'gray' },
            { label: '200bb', value: 84.2, tone: 'red' },
          ],
        },
        caption:
          'The big blind 3bets to 11bb and the button 4bets to 24bb. A 5bet shove adds 89bb at 100bb to win 35.5bb. At 200bb it adds 189bb. A pure bluff needs **71.5%** folds at 100bb and **84.2%** at 200bb.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Why AQo loses value',
        cards: 'AsQd',
        caption: 'A♠Q♦ wins big pots mostly with top pair. Against QQ+ and AK it is often dominated. AK has the same ace with a better kicker.',
      },
      {
        kind: 'visual',
        title: 'Equity against QQ+ and AK',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'K♠Q♦', value: 21, tone: 'red' },
            { label: 'A♠Q♦', value: 24, tone: 'gray' },
            { label: 'A♠Q♠', value: 29 },
            { label: '8♠7♠', value: 31, tone: 'green' },
          ],
        },
        caption:
          'Each hand’s equity against QQ+ and AK, exact over every board and rounded. The offsuit broadways are often dominated. 8♠7♠ shares no rank with these hands, so it does better.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Big hands by the river',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'A♠Q♦', value: 7.4, tone: 'gray' },
            { label: 'A♠Q♠', value: 11.8 },
            { label: '8♠7♦', value: 12.9 },
            { label: '8♠7♠', value: 16.9, tone: 'green' },
          ],
        },
        caption:
          'Chance to make a straight or better that uses your cards, if you see all 5 board cards. Exact over every board. Being suited adds about 4 points. Deep, those big hands can win whole stacks.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What solvers do deep',
        body: [
          'Deep, solvers 3bet and call with more suited hands. They play offsuit broadways like AQo and KQo less.',
          'Deep 5bet shoves are rarer. They lean on value hands like AA and KK.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'At 200bb the big blind 3bets to 11bb and the button 4bets to 24bb. The big blind calls. What is the SPR?',
        choices: ['About 1.6', 'About 3.6', 'About 8.4'],
        answer: 1,
        explain: 'Like the SPR table showed, the pot is 24 + 24 + 0.5 = 48.5bb with 176bb behind. 176 ÷ 48.5 is 3.6. About 1.6 is the same pot at 100bb.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'At 200bb you 3bet to 11bb and face a 4bet to 24bb. How often must a pure bluff shove get folds?',
        choices: ['About 61%', 'About 72%', 'About 84%'],
        answer: 2,
        explain: 'Like the 5bet bars showed, you add 189bb to win 35.5bb. 189 ÷ (35.5 + 189) is 84.2%. About 72% is the same shove at 100bb.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Which hand loses the most value going from 100bb to 200bb?',
        choiceCards: ['KsQd', '8s7s', '5s5d'],
        choices: ['K♠Q♦', '8♠7♠', '5♠5♦'],
        answer: 0,
        explain: 'Like the equity bars showed, K♠Q♦ has about 21% against QQ+ and AK. It wins big pots mostly with one pair. 8♠7♠ and 5♠5♦ make hidden big hands that deep stacks pay off.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Why does A♠Q♠ play better deep than A♠Q♦?',
        choices: ['It makes more flushes and straights', 'AK dominates it less often', 'It wins more pots with one pair'],
        answer: 0,
        explain: 'Like the river bars showed, A♠Q♠ makes a straight or better 11.8% of the time. A♠Q♦ does it 7.4% of the time. AK dominates both the same way.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Deep 3bet and 4bet pots keep more behind. A called 4bet at 200bb leaves an SPR of 3.6.',
          'A 5bet shove risks far more deep. A pure bluff needs 84.2% folds at 200bb.',
          'AQo and KQo lose value deep. Against QQ+ and AK they are often dominated.',
          'Suited hands gain value deep. Being suited adds about 4 points of straight or better.',
        ],
      },
    ],
  },
];
