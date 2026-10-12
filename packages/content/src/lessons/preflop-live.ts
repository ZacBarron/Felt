import type { LessonContent } from './types';

export const PREFLOP_LIVE_LESSONS: LessonContent[] = [
  {
    key: 'preflop/stack-depth/depth',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'figure', text: '200bb' },
    steps: [
      {
        kind: 'intro',
        title: 'Same hand, different stack',
        body: 'A hand’s value depends on how much money sits behind it. Shallow stacks reward raw card strength. Deep stacks reward hands that can make the nuts.',
      },
      {
        kind: 'text',
        title: 'What depth changes',
        body: [
          'Preflop equity does not change with stack depth. What changes is how much you can win or lose after the flop, compared with what you paid to see it.',
          'Shallow, the stacks are only a few pots deep, so a single strong pair can often get all the money in. Deep, getting stacks in takes several large bets, and the hands willing to go that far are usually stronger than one pair.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'SPR in a 3bet pot',
        columns: ['Stacks', 'Behind', 'Pot', 'SPR'],
        rows: [
          ['40bb', '29', '22.5', '1.3'],
          ['60bb', '49', '22.5', '2.2'],
          ['100bb', '89', '22.5', '4.0'],
          ['200bb', '189', '22.5', '8.4'],
        ],
        note: 'BTN opens 2.5bb, BB 3bets to 11bb, BTN calls, SB folded. SPR is stack behind divided by pot, from core spr. The same sizes are used at every depth for comparison; real 3bets get smaller when shallow and bigger when deep (to 13bb at 200bb gives SPR 7.1).',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Shallow: high cards gain',
        body: [
          'At an SPR near 1 or 2, top pair with a good kicker is usually happy to get all in. Hands that make strong top pairs, like AJo, KQo and ATs, gain value.',
          'Small pairs and suited connectors lose value: they rarely flop a strong hand, and little is left to win when they do. At 40bb, a 3bet and a 4bet commit most of the stack, so 4bets are usually all in.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Set mining needs money behind',
        formula: 'Extra needed = call ÷ equity − (pot + call)',
        example:
          'You open 2.5bb, the button 3bets to 8bb, and you call 5.5bb with 5♠5♦. You flop a set or better **11.8%** of the time, so you need about **29bb** extra on average when you hit. At 40bb you have 32bb left: the 3bettor must stack off almost every time. At 100bb you have 92bb left. This treats a set as always winning and a miss as always folding, which flatters set mining.',
      },
      {
        kind: 'text',
        title: 'Deep: playability gains',
        body: [
          'At 200bb, suited connectors, suited aces and pairs gain value. When they make a strong hand, the pot can grow large enough to pay for all the misses.',
          'Offsuit broadways lose value: a hand like KJo makes second best hands that cost a lot when stacks are deep. Position is worth more, because there are more big bets left to play after the flop. 3bet and 4bet sizes grow with depth so the pot is not tiny compared with the stacks.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Shallow 3bets get called by jams',
        body: [
          'At 40bb, the BB 3bets to 9bb against a 2.5bb button open and faces an all in. Calling 31bb into a 49.5bb pot needs only **38.5%** equity, so the 3bettor calls with most of its range.',
          'A light 3bet that must fold to a jam just loses its chips. So shallow 3bet bluffs lean toward hands with decent all in equity, like Ax and big suited cards, rather than small suited connectors.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'BTN opens 2.5bb, BB 3bets to 11bb, BTN calls. Stacks started at 60bb. The flop SPR is about',
        choices: ['1', '2', '4', '8'],
        answer: 1,
        explain: '49bb behind divided by a 22.5bb pot is 2.2. At this SPR, top pair with a good kicker is usually a hand to get all in with.',
      },
      {
        kind: 'quiz',
        question: 'Which hand gains the most value going from 100bb to 200bb deep?',
        choices: ['KJo', 'AQo', '7♥6♥'],
        answer: 2,
        explain: 'Deep stacks pay off hands that make straights, flushes and two pair. KJo and AQo win mostly with one pair, which is worth less when the pot can grow to 200bb.',
      },
      {
        kind: 'takeaway',
        points: [
          'Shallow: high card strength gains, speculative hands lose.',
          'Deep: suited, connected hands and pairs gain; offsuit broadways lose.',
          'Check the SPR you will have after the flop before you call or 3bet.',
        ],
      },
    ],
  },
  {
    key: 'preflop/stack-depth/open-sizing',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '2.5' },
    steps: [
      {
        kind: 'intro',
        title: 'Size is part of the strategy',
        body: 'Every open sets the price for everyone behind you. Smaller opens risk less, larger opens charge more. The right size depends on your position, who is left to act and the players.',
      },
      {
        kind: 'table',
        title: 'The big blind’s price',
        columns: ['Open', 'BB calls', 'BB needs'],
        rows: [
          ['2bb', '1bb', '22.2%'],
          ['2.2bb', '1.2bb', '24.5%'],
          ['2.5bb', '1.5bb', '27.3%'],
          ['3bb', '2bb', '30.8%'],
          ['3.5bb', '2.5bb', '33.3%'],
        ],
        note: 'Folded to the opener, small blind folds. Needs = call ÷ (pot + call), from core potOdds. Raw equity, before position and realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What the open risks',
        body: [
          'A steal that never sees a flop must win the 1.5bb of blinds. A 2bb open needs folds **57.1%** of the time to break even with a hand that never wins when called. A 3bb open needs **66.7%**.',
          'Real hands win some pots when called, so they need fewer folds. But the bigger the open, the more a weak hand loses each time it is called.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Bigger opens, tighter ranges',
        body: [
          'A bigger open gives the big blind a worse price, so it defends less and with a stronger range. Your edge hands now risk more against stronger hands. Hands that profit at 2bb can lose at 3bb.',
          'That is why solver strategies for online games often open around 2bb to 2.5bb, with the widest ranges on the button.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'The small blind opens bigger',
        body: [
          'From the small blind only the big blind is left, but you are out of position on every street. A bigger open, about 3bb, wins the pot preflop more often and makes the big blind pay more to use its position. Against it, the big blind calls 2bb into 4bb and needs **33.3%**.',
          'Many solver solutions, especially with rake, also limp part of the small blind range. A raise only strategy is the simpler version.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Live games open bigger',
        body: [
          'In many live games, opens of 3bb to 5bb are common, and bigger after limpers. When players call opens too wide, a bigger size gets more value from worse hands and thins the field, so you play fewer multiway pots.',
          'Bigger is not free: you risk more with your weakest opens. If you size up, tighten up.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'text',
        title: '3bet bigger out of position',
        body: [
          'In position, 3bets are often about 3 times the open: 2.5bb to 7.5bb. Out of position, about 4 times or more: 2.5bb to 11bb.',
          'The player out of position realizes less equity, so it charges more. The opener needs **37.8%** to call the 11bb 3bet, against **30.3%** for the 7.5bb one. A called big 3bet also leaves a lower SPR, which shrinks the edge position gives.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'BTN opens to 3bb, SB folds. How much equity does the big blind need to call?',
        choices: ['22.2%', '27.3%', '30.8%', '40%'],
        answer: 2,
        explain: 'The BB calls 2bb into a 4.5bb pot: 2 ÷ 6.5 = 30.8%. A 2.5bb open would ask for 27.3%.',
      },
      {
        kind: 'quiz',
        question: 'BTN opens 2.5bb. You 3bet from the big blind. Which size fits the usual pattern?',
        choices: ['About 11bb', 'About 7.5bb', 'About 6bb'],
        answer: 0,
        explain: 'Out of position, 3bets are about 4 times the open or more. 7.5bb is the typical in position size; out of position it gives the button too good a price with position.',
      },
      {
        kind: 'takeaway',
        points: [
          'Open small from late position online: about 2bb to 2.5bb.',
          'Open bigger from the small blind and in loose live games, and tighten when you do.',
          '3bet about 3x in position, about 4x or more out of position.',
        ],
      },
    ],
  },
  {
    key: 'preflop/live-preflop/big-opens',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '8bb' },
    steps: [
      {
        kind: 'intro',
        title: 'The 8bb open',
        body: 'At a live 1/3 table you will see opens to $15 or $25: 5bb and about 8bb. The price, the depth after the flop and the right defending hands all change.',
      },
      {
        kind: 'table',
        title: 'Your price against bigger opens',
        columns: ['Open', 'BB needs', 'Cold call needs'],
        rows: [
          ['2.5bb', '27.3%', '38.5%'],
          ['5bb', '38.1%', '43.5%'],
          ['8bb', '42.4%', '45.7%'],
        ],
        note: 'One open, everyone else folds. The pot includes the 1.5bb of blinds. The BB calls the open minus its 1bb; a cold caller pays the full open. From core potOdds, before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'A worse price means fewer defends',
        body: [
          'Against 2.5bb the big blind needs 27.3%. Against 8bb it needs 42.4%. Many hands that clear the first price fall well short of the second, especially out of position, where you realize less of your equity.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'SPR after the call',
        columns: ['Open', 'Players', 'Pot', 'SPR'],
        rows: [
          ['2.5bb', '2', '6.5', '15'],
          ['5bb', '2', '11.5', '8.3'],
          ['8bb', '2', '17.5', '5.3'],
          ['8bb', '4', '33.5', '2.7'],
        ],
        note: '100bb stacks, blinds fold. SPR = stack behind ÷ pot, from core spr.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Set mining against 8bb',
        formula: 'Extra needed = call ÷ equity − (pot + call)',
        example:
          'Calling 8bb on the button with 4♣4♦, you flop a set or better **11.8%** of the time. You need about **51bb** extra on average when you hit, with 92bb behind. The same call against a 2.5bb open needs **15bb**. This assumes a set always wins and you fold every miss.',
      },
      {
        kind: 'text',
        title: 'Who pays off',
        body: [
          'Set mining a big open works only against players who stack off with one pair. Many live players who open big tend to get all in with overpairs and top pair at a low SPR. Against them, pairs stay a call, more so when others have already called.',
          'Against a tight player who can fold one pair, small pairs and suited connectors are folds. Keep calling with hands that make strong hands and dominate, like suited broadways and suited aces. Offsuit hands that make weak top pairs, like KTo and QJo, become folds.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'text',
        title: '3bet linear, for value',
        body: [
          'A 3bet against 8bb has to be big, about 24bb in position. A pure bluff risks 24bb to win 9.5bb and needs folds **71.6%** of the time, against **65.2%** for a 7.5bb 3bet over a 2.5bb open. If called, the SPR is about **1.5**.',
          'Live players who open big often call 3bets too wide and rarely fold after the flop at that SPR. So 3bet a linear value range, such as QQ+, AK and often JJ and AQ, and drop most light 3bets.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'quiz',
        question: 'A player opens to 8bb and it folds to your big blind. How much equity do you need to call?',
        choices: ['27%', '33%', '42%', '50%'],
        answer: 2,
        explain: 'You call 7bb into a 9.5bb pot: 7 ÷ 16.5 = 42.4%. Against a 2.5bb open you would need 27.3%.',
      },
      {
        kind: 'quiz',
        question: '100bb deep on the button with 5♠5♥. A tight player who folds one pair to pressure opens to 8bb. Your default?',
        choices: ['Call to set mine', '3bet as a bluff', 'Fold'],
        answer: 2,
        explain: 'You need about 51bb extra when you hit, from 92bb behind, and this player will not pay that often. A big 3bet bluff needs folds over 70% of the time.',
      },
      {
        kind: 'takeaway',
        points: [
          'Bigger opens give a worse price and a lower SPR.',
          'Call with hands that make strong hands; set mine only against players who pay off.',
          '3bet big and linear for value; cut light 3bets.',
        ],
      },
    ],
  },
  {
    key: 'preflop/live-preflop/straddles',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '50' },
    steps: [
      {
        kind: 'intro',
        title: 'A third blind',
        body: 'A straddle is an optional blind of 2bb, usually posted under the gun before the cards are dealt. It doubles the stakes of the hand while the stacks stay the same.',
      },
      {
        kind: 'text',
        title: 'The straddle is the new big blind',
        body: [
          'With an under the gun straddle, action starts with the player to the straddler’s left. Calling costs 2bb, the smallest raise is to 4bb, and the straddler acts last before the flop, like a big blind.',
          'After the flop the normal order returns: the straddler acts after the blinds, out of position against everyone else. Dead money before anyone acts is 3.5bb instead of 1.5bb.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Measure stacks in straddles',
        columns: ['Stack', 'Effective depth'],
        rows: [
          ['100bb', '50 straddles'],
          ['150bb', '75 straddles'],
          ['200bb', '100 straddles'],
        ],
        note: 'The straddle is the unit that matters. In straddles the blinds are 0.25, 0.5 and 1: 1.75 units of dead money instead of the usual 1.5.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Ranges play shallower',
        body: [
          'A 100bb stack in a straddled pot plays like a 50 deep game. High card hands that make strong top pairs gain value, and small pairs and suited connectors lose implied odds.',
          'Position matters a little less, because fewer big bets are left after the flop.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Opening into 3.5bb of dead money',
        columns: ['Open', 'In straddles', 'Steal needs'],
        rows: [
          ['5bb', '2.5', '58.8%'],
          ['6bb', '3', '63.2%'],
          ['7bb', '3.5', '66.7%'],
        ],
        note: 'Steal needs = open ÷ (dead money + open): how often everyone must fold for a hand that never wins when called. A normal 2.5bb open needs 62.5%.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Prices against a 6bb button open',
        columns: ['Player', 'Calls', 'Needs'],
        rows: [
          ['SB', '5.5bb', '36.7%'],
          ['BB', '5bb', '34.5%'],
          ['Straddle', '4bb', '29.6%'],
        ],
        note: 'Folded to the button, who opens to 3 straddles. Each blind has already posted its share. From core potOdds, before realization.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'More multiway, lower SPR',
        body: [
          'Live straddled pots tend to go multiway: the straddler gets a good price, and many players call because the bigger pot feels worth playing.',
          'With 100bb stacks, a 6bb open called by the straddle leaves an SPR of **7.0**. With a third player in who had not posted a blind, **4.8**. Value bet strong hands, play one pair carefully in multiway pots, and bluff less into several players.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'quiz',
        question: 'You have 120bb and the pot is straddled. How deep are you, measured in straddles?',
        choices: ['240', '120', '60', '30'],
        answer: 2,
        explain: 'The straddle is 2bb, so 120bb is 60 straddles. Play it like a 60 deep game.',
      },
      {
        kind: 'quiz',
        question: 'The button opens to 6bb in a straddled pot, and the blinds fold. How much equity does the straddler need to call?',
        choices: ['29.6%', '34.5%', '42.9%'],
        answer: 0,
        explain: 'The straddler calls 4bb into a 9.5bb pot: 4 ÷ 13.5 = 29.6%. The posted 2bb is why the price is good.',
      },
      {
        kind: 'takeaway',
        points: [
          'The straddle is a third blind and the new unit.',
          'Divide your stack by two: 100bb plays like 50 deep.',
          'Opens are bigger in big blinds, pots go multiway and SPRs are low.',
        ],
      },
    ],
  },
  {
    key: 'preflop/live-preflop/limped-pots',
    level: 'core',
    minutes: 7,
    cover: { kind: 'chart', chartId: '9max-100-iso-btn-vs-1limp' },
    practice: ['9max-100-iso-btn-vs-1limp'],
    steps: [
      {
        kind: 'intro',
        title: 'Three options behind a limper',
        body: 'When a player limps in front of you, you can raise to isolate, limp behind, or fold. Each hand has a best option, and it depends on how that hand wins pots.',
      },
      {
        kind: 'formula',
        title: 'Why small pairs like limped pots',
        formula: 'Extra needed = call ÷ equity − (pot + call)',
        example:
          'Limping 1bb behind one limper on the button, you call 1bb into 2.5bb and need **28.6%** on the price alone. With 3♠3♦ you flop a set or better **11.8%** of the time, so you need only about **5bb** extra when you hit. Calling a 2.5bb open cold needs about **15bb**. This assumes a set always wins and the blinds do not raise.',
      },
      {
        kind: 'text',
        title: 'Which hands overlimp',
        body: [
          'Overlimp hands that win big pots by making strong hands and lose little when they miss: small pairs make sets, suited connectors make straights and flushes, small suited aces make nut flushes and wheels. They like cheap, multiway flops with deep stacks behind.',
          'Iso raise hands that win as the best high card hand, like strong aces and broadways. They dominate a limping range and win more often heads up. Offsuit hands that do neither, like KTo or 76o, mostly fold.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'chart',
        chartId: '9max-100-iso-btn-vs-1limp',
        title: 'Button against one limper',
        caption:
          'Iso raise about 19%, overlimp about 8%. Pairs 22 to 66 split between both. Against one limper every suited ace raises; small suited aces join the overlimps when the pot is already multiway. Starter chart, approximate.',
        highlight: ['44', '65s', 'A5s'],
      },
      {
        kind: 'text',
        title: 'Iso raise size',
        body: [
          'In position, raise to about **4bb plus 1bb per limper**: 5bb against one, 6bb against two. Out of position from the blinds, go bigger: about 5bb plus 1bb per limper.',
          'A 5bb iso against one limper risks 5bb to win 2.5bb, so a pure steal needs everyone to fold **66.7%** of the time. Limpers often call, which is why the iso range is built from hands that do well when called.',
        ],
        evidence: 'exploit',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'The limp reraise',
        body: 'Some live players limp AA and KK hoping to reraise. When a limper reraises your iso big, their range is usually very strong. Without a read, fold most of your iso range, including hands like AQo and TT.',
      },
      {
        kind: 'text',
        title: 'Multiway limped pots after the flop',
        body: [
          'Four players in a limped pot with 100bb stacks make a pot of about 4.5bb and an SPR of **22**. One pair is rarely worth stacks: value bet strong hands, and play top pair as a medium hand.',
          'A bluff must get through everyone. If three players each fold 60% of the time on their own, all three fold only **21.6%** of the time. Bet less often, bluff less, and prefer bluffs that draw to the nuts.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'Button, one early limper, you hold 6♠5♠. What does the starter chart do?',
        choices: ['Iso raise', 'Overlimp', 'Fold'],
        answer: 1,
        explain: '65s wins big pots with straights and flushes and loses little when it misses. A cheap multiway flop suits it better than a raised pot.',
      },
      {
        kind: 'quiz',
        question: 'Two players limp. You are on the button with AQo. Iso raise to about',
        choices: ['3bb', '4bb', '6bb', '10bb'],
        answer: 2,
        explain: '4bb plus 1bb per limper: 6bb in position. Smaller lets the limpers call with a great price.',
      },
      {
        kind: 'takeaway',
        points: [
          'Iso raise high card hands to about 4bb plus 1bb per limper, more out of position.',
          'Overlimp small pairs, suited connectors and small suited aces when the price and stacks are good.',
          'Respect the limp reraise, and bluff less in multiway pots.',
        ],
      },
    ],
  },
];
