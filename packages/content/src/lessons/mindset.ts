import type { LessonContent } from './types';

export const MINDSET_LESSONS: LessonContent[] = [
  {
    key: 'mindset/mental/tilt',
    level: 'core',
    minutes: 6,
    cover: {
      kind: 'tree',
      root: 'Tilt',
      branches: [{ label: 'Losing' }, { label: 'Injustice' }, { label: 'Entitlement' }, { label: 'Revenge' }],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Tilt is any drop from your A game',
        body: 'Tilt is not only rage after a bad beat. Most of it is quiet. It is a slightly wider call, or a bluff you would not make fresh. It is one more orbit you should not play. You cannot avoid the triggers, but you can catch tilt early.',
      },
      {
        kind: 'visual',
        title: 'Four common types',
        art: {
          kind: 'tree',
          root: 'What set it off',
          branches: [
            { label: 'Losing: down on the day', value: 'Plays to get even', tone: 'red' },
            { label: 'Injustice: bad beats, coolers', value: 'Feels owed, calls light', tone: 'red' },
            { label: 'Entitlement: losing to weaker players', value: 'Bluffs players who never fold', tone: 'red' },
            { label: 'Revenge: a player who needled you', value: 'Fights them with weak hands', tone: 'red' },
          ],
        },
        caption: 'Each trigger leads to a typical leak. This is a way to name what you feel, not a measured system. Most tilt mixes more than one type.',
      },
      {
        kind: 'visual',
        title: 'Early warning signs',
        art: {
          kind: 'tree',
          root: 'Tilt shows up first',
          branches: [
            { label: 'In your head', value: 'You replay a hand', tone: 'gray' },
            { label: 'In your body', value: 'Fast pulse, tight jaw', tone: 'gray' },
            { label: 'In your play', value: 'Fast calls and loose opens', tone: 'red' },
          ],
        },
        caption: 'The first signs come before your results change. You may want one player in particular to put chips in. Catch it there.',
      },
      {
        kind: 'visual',
        title: 'Illustration: a fifth of hands on tilt',
        art: {
          kind: 'bars',
          bars: [
            { label: 'A game, 80% of hands', value: 10, tone: 'green' },
            { label: 'On tilt, 20% of hands', value: -20, tone: 'red' },
            { label: 'Overall', value: 4 },
          ],
        },
        caption:
          'These are made up inputs in bb/100. 0.8 × 10 + 0.2 × (−20) = 4. One hand in five on tilt cuts the win rate by **60%**. The A game hands are fine. So the fix is to play fewer hands while tilted. Put in your own numbers.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'A stop loss and a reset routine',
        body: [
          'Set a stop loss before the session, for example 3 buy ins. Leave when you hit it. Decide it while calm, because a tilted mind always argues for one more orbit.',
          'For smaller triggers, reset. Stand up and walk for 2 minutes. Breathe slowly. Name the trigger in one sentence, like “I am annoyed about the river.” Then sit back down when your next decision would match the one you would make fresh.',
        ],
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Why a stop loss is not math',
        body: 'Being down does not make the next hand worse. The cards do not know your session result. A stop loss protects the one thing that does change, which is how well you play.',
      },
      {
        kind: 'quiz',
        question: 'Illustration: your A game wins 8bb/100. You are on tilt for 10% of your hands and lose 30bb/100 there. What is your overall win rate?',
        choices: ['+7.2bb/100', '+5.0bb/100', '+4.2bb/100', '−11.0bb/100'],
        answer: 2,
        explain:
          'Like the bars showed, weight each part by its share. 0.9 × 8 + 0.1 × (−30) = 7.2 − 3 = +4.2bb/100. The +5.0 answer forgets that tilted hands replace A game hands.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'Mid session you notice you are replaying a bad beat and acting fast. What is the best response?',
        choices: ['Keep playing and focus harder', 'Take a reset break before the next hand', 'Move up a stake to win it back faster'],
        answer: 1,
        explain:
          'Replaying a hand and fast actions are early warning signs. The next hands are the expensive ones. So reset first and come back when your decisions are back to normal.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'A weaker player keeps winning pots against you. You start bluffing them though they never fold. Which type of tilt fits best?',
        choices: ['Entitlement', 'Injustice', 'Revenge'],
        answer: 0,
        explain: 'Like the tree showed, losing to weaker players triggers entitlement. Its typical leak is bluffing players who never fold. Injustice comes from bad beats. Revenge comes from a player who needled you.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'When should you set your stop loss?',
        choices: ['Before the session, while calm', 'Once you are down 2 buy ins', 'When you first feel tilted'],
        answer: 0,
        explain: 'A tilted mind always argues for one more orbit. A limit set while calm does the judging for you. Then a reset handles the smaller triggers.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Name the type of tilt you feel. Each one has a typical leak.',
          'Catch the early signs before they reach your play.',
          'A small share of tilted hands can erase most of a win rate.',
          'Set the stop loss while calm. Reset at the first sign.',
        ],
      },
    ],
  },
  {
    key: 'mindset/mental/variance',
    level: 'core',
    minutes: 7,
    cover: {
      kind: 'curve',
      points: [
        [2.5, 39.2],
        [5, 27.7],
        [10, 19.6],
        [20, 13.9],
        [30, 11.3],
        [50, 8.8],
        [75, 7.2],
        [100, 6.2],
      ],
      xLabel: 'Hands played, thousands',
      yLabel: 'Range either side, bb/100',
      mark: [10, 19.6],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Short samples lie',
        body: 'A winning player can lose for months. A losing player can run hot just as long. Knowing how long the long run is keeps you calm in a downswing. It also keeps you honest in an upswing.',
      },
      {
        kind: 'text',
        title: 'Two numbers describe your results',
        body: [
          '**Win rate** is your average result per 100 hands, in bb/100.',
          '**SD** measures how much your results swing around that average. It uses the same units.',
          'The uncertainty in your measured win rate shrinks with the square root of your hands. That is why it shrinks so slowly.',
        ],
      },
      {
        kind: 'formula',
        title: '95% confidence interval',
        formula: 'Win rate ± 1.96 × SD ÷ √(N ÷ 100)',
        parts: [
          ['Win rate', 'measured, bb/100'],
          ['SD', 'how much results swing, bb/100'],
          ['N', 'hands played'],
          ['1.96', 'covers 95% of a bell curve'],
        ],
        example: 'Take SD 100bb/100 over 10,000 hands. √(10,000 ÷ 100) = 10, so 1.96 × 100 ÷ 10 = **19.6bb/100** either side of the win rate.',
      },
      {
        kind: 'table',
        title: 'True win rate 10, SD 100',
        columns: ['Hands', 'Live hours', '95% range', 'Below 0'],
        rows: [
          ['10,000', '≈333', '−9.6 to 29.6', '15.9%'],
          ['30,000', '1,000', '−1.3 to 21.3', '4.2%'],
          ['100,000', '≈3,333', '3.8 to 16.2', '0.1%'],
        ],
        note: 'We assume a true win rate of 10bb/100 and SD of 100bb/100. Live play runs about 30 hands an hour. The range is where 95% of measured win rates land, using a bell curve estimate. Below 0 is the chance the measured result is a loss.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'What the table says',
        art: {
          kind: 'curve',
          points: [
            [2.5, 39.2],
            [5, 27.7],
            [10, 19.6],
            [20, 13.9],
            [30, 11.3],
            [50, 8.8],
            [75, 7.2],
            [100, 6.2],
          ],
          xLabel: 'Hands played, thousands',
          yLabel: 'Range either side, bb/100',
          mark: [10, 19.6],
        },
        caption:
          'After 10,000 hands a real 10bb/100 winner still shows a loss **15.9%** of the time. That is about 333 live hours. Halving the uncertainty takes four times the hands. Most live players never reach a sample that pins their win rate down.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Chance of ever falling this far',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '5 buy ins', value: 36.8, tone: 'red' },
            { label: '10', value: 13.5, tone: 'red' },
            { label: '15', value: 5 },
            { label: '20', value: 1.8, tone: 'gray' },
          ],
        },
        caption:
          'This uses the same win rate and SD, with 100bb buy ins. The chance is exp(−2 × win rate × drop ÷ SD²). Over a career you start from many points. So you are far more likely to see drops like these at some point.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Results versus decisions',
        art: {
          kind: 'tree',
          root: 'Judge a month by',
          branches: [
            { label: 'Results', value: 'Mostly noise', tone: 'gray' },
            { label: 'Drill accuracy', value: 'You can check it', tone: 'green' },
            { label: 'Reviewed hands', value: 'You can check it', tone: 'green' },
          ],
        },
        caption: 'A losing month is normal for a winner. A month of sloppy decisions is a real problem, whatever the results say.',
      },
      {
        kind: 'quiz',
        question: 'True win rate 10bb/100, SD 100bb/100. After 10,000 hands, where do 95% of measured win rates land?',
        choices: ['8 to 12', '0 to 20', '−9.6 to 29.6', '5 to 15'],
        answer: 2,
        explain:
          'Like the formula showed, √(10,000 ÷ 100) = 10. Then 1.96 × 100 ÷ 10 = 19.6. So the range is 10 ± 19.6. The 0 to 20 answer forgets the 1.96.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'What does it take to cut the width of your confidence interval in half?',
        choices: ['Four times the hands', 'Twice the hands', 'Three times the hands'],
        answer: 0,
        explain: 'The width shrinks with the square root of your hands. For √N to double, N must grow 4 times. Twice the hands only narrows it by about 29%.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'True win rate 10bb/100, SD 100 and 100bb buy ins. What is the chance of ever falling 10 buy ins below where you start?',
        choices: ['About 13.5%', 'Under 1%', 'About 50%'],
        answer: 0,
        explain: 'Like the bars showed, a real winner falls 10 buy ins 13.5% of the time. Over a career you start from many points. So drops like this are normal.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'You had a losing month. What is the best way to judge it?',
        choices: ['Check your drill accuracy and reviewed hands', 'Assume your play has gotten worse', 'Look only at the money you lost'],
        answer: 0,
        explain: 'A month of results is mostly noise. Drill accuracy and reviewed hands are things you can check. A losing month is normal for a winner.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Interval = win rate ± 1.96 × SD ÷ √(N ÷ 100).',
          'Halving the range takes 4 times the hands. Even 30,000 hands leave a wide range.',
          'Big downswings are normal for winners.',
          'Judge decisions, not results.',
        ],
      },
    ],
  },
  {
    key: 'mindset/mental/bankroll',
    level: 'core',
    minutes: 7,
    cover: {
      kind: 'curve',
      points: [
        [2.5, 60.7],
        [5, 36.8],
        [7.5, 22.3],
        [10, 13.5],
        [15, 5],
        [20, 1.8],
        [25, 0.67],
        [30, 0.25],
        [40, 0.03],
      ],
      xLabel: 'Buy ins',
      yLabel: 'Risk of ruin, %',
      mark: [20, 1.8],
    },
    steps: [
      {
        kind: 'intro',
        title: 'A roll that survives downswings',
        body: 'A bankroll is money set aside only for poker. Its job is to let you play your best through normal downswings. It should never force you out of the game.',
      },
      {
        kind: 'text',
        title: 'Count in buy ins',
        body: [
          'Swings are measured in big blinds, so buy ins put every stake on the same scale. If you buy in deeper than 100bb, count the roll in big blinds for the risk math.',
        ],
      },
      {
        kind: 'visual',
        title: 'The same $3,000 in buy ins',
        art: {
          kind: 'bars',
          bars: [
            { label: '$1/$3, $300 buy in', value: 10, tone: 'red' },
            { label: '$0.50/$1, $100 buy in', value: 30, tone: 'green' },
          ],
        },
        caption: 'Measure your roll in buy ins at your stake, not in dollars. $3,000 is 10 buy ins at $1/$3. It is 30 buy ins at $0.50/$1.',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Risk of ruin',
        formula: 'RoR = exp(−2 × WR × B ÷ SD²)',
        parts: [
          ['WR', 'true win rate, bb/100'],
          ['B', 'bankroll, bb'],
          ['SD', 'how much results swing, bb/100'],
          ['RoR', 'chance of ever going broke'],
        ],
        example: 'Take WR 10, SD 100 and 20 buy ins of 100bb. 2 × 10 × 2,000 ÷ 10,000 = 4, and exp(−4) = **1.8%**.',
      },
      {
        kind: 'table',
        title: 'Risk of ruin, SD 100',
        columns: ['Buy ins', 'WR 10', 'WR 5', 'WR 2.5'],
        rows: [
          ['10', '13.5%', '36.8%', '60.7%'],
          ['20', '1.8%', '13.5%', '36.8%'],
          ['30', '0.2%', '5.0%', '22.3%'],
          ['40', 'under 0.1%', '1.8%', '13.5%'],
        ],
        note: 'We assume SD of 100bb/100 and 100bb buy ins, with win rates in bb/100. The model assumes a known, fixed win rate. It also assumes you never move down and never add or take out money.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'A guideline, not a law',
        body: 'A common guideline for live cash is **20 to 40 buy ins** for your stake. Lean toward 40 if your win rate is uncertain. Halving the win rate raises risk as much as halving the roll. The real danger is overestimating your win rate, and a live sample rarely pins it down.',
      },
      {
        kind: 'visual',
        title: 'More buy ins, less risk',
        art: {
          kind: 'curve',
          points: [
            [2.5, 60.7],
            [5, 36.8],
            [7.5, 22.3],
            [10, 13.5],
            [15, 5],
            [20, 1.8],
            [25, 0.67],
            [30, 0.25],
            [40, 0.03],
          ],
          xLabel: 'Buy ins',
          yLabel: 'Risk of ruin, %',
          mark: [20, 1.8],
        },
        caption: 'Risk of ruin at a true win rate of 10bb/100 and SD 100. It falls fast as the roll grows. 20 buy ins gives **1.8%**. The model assumes you know your true win rate.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Shot taking and moving down',
        body: [
          'Take a shot at the next stake with a budget set in advance. For example, allow 3 to 5 buy ins of the bigger game. If the budget is gone, move back down. That is the plan working, not a failure.',
          'Set a floor for each stake, for example 20 buy ins. Move down whenever the roll falls below it. Moving down keeps your real risk below what the formula shows, since the formula assumes you never do.',
        ],
      },
      {
        kind: 'visual',
        title: 'Keep the life roll separate',
        art: {
          kind: 'tree',
          root: 'Is it bankroll?',
          branches: [
            { label: 'Rent and bills', value: 'No', tone: 'red' },
            { label: 'Savings', value: 'No', tone: 'red' },
            { label: 'Money set aside only for poker', value: 'Yes', tone: 'green' },
          ],
        },
        caption:
          'If a downswing would touch money you need to live on, your roll is smaller than you think. The fear of losing it will bend your decisions. Take money out on a schedule. Recount your buy ins after every withdrawal.',
      },
      {
        kind: 'quiz',
        question: 'SD is 100bb/100 with 100bb buy ins. At a true win rate of 5bb/100, which roll matches the risk of 20 buy ins at 10bb/100?',
        choices: ['20 buy ins', '30 buy ins', '40 buy ins', '80 buy ins'],
        answer: 2,
        explain: 'In the formula, risk depends on win rate × bankroll. 5 × 40 = 10 × 20, so both give exp(−4) = 1.8%. Like the table showed, 30 buy ins at WR 5 gives 5.0%.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You take a planned shot at $2/$5 with 4 buy ins and lose all four. What is the best move?',
        choices: ['Buy in once more at $2/$5', 'Move back down and rebuild', 'Stay at $2/$5 until you are even'],
        answer: 1,
        explain:
          'The shot budget exists so a normal downswing at the new stake cannot hurt your main roll. Losing it is a short sample, not proof you cannot win there. One more buy in breaks the plan you made while calm.',
        point: 3,
      },
      {
        kind: 'quiz',
        question: 'You have $3,000 set aside only for poker. How many buy ins is that at $1/$3 with $300 buy ins?',
        choices: ['10', '30', '3'],
        answer: 0,
        explain: 'Like the bars showed, $3,000 ÷ $300 = 10 buy ins. The 30 answer is the count at $0.50/$1 with $100 buy ins.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You play live cash and your win rate is still uncertain. How big a roll does the guideline suggest?',
        choices: ['Toward 40 buy ins', 'About 10 buy ins', 'Exactly 20 buy ins'],
        answer: 0,
        explain: 'The common guideline is 20 to 40 buy ins. Lean toward 40 when your win rate is uncertain. The formula assumes you know it, and you rarely do.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Count only money set aside for poker. Count it in buy ins at your stake.',
          'RoR = exp(−2 × WR × B ÷ SD²). It assumes you know your win rate.',
          '20 to 40 buy ins is a guideline for live cash. Lean toward 40 when unsure.',
          'Take shots with a fixed budget. Move down at your floor.',
        ],
      },
    ],
  },
  {
    key: 'mindset/study/study-plan',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: '15', caption: 'minutes a day' },
    practice: ['9max-100-rfi-utg', '9max-100-rfi-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'Consistency beats intensity',
        body: 'For most players, 15 focused minutes a day builds more lasting skill than one long weekly session. The routine that works is the one you keep.',
      },
      {
        kind: 'text',
        title: 'Short daily sessions',
        body: [
          'Aced’s daily plan fits in about 15 minutes on a phone. Short sessions are easy to start, and starting is the hard part.',
          'Stop while you are still sharp. Drilling while tired trains slow, sloppy recall.',
        ],
      },
      {
        kind: 'visual',
        title: 'Spaced repetition',
        art: {
          kind: 'tree',
          root: 'When you review a card',
          branches: [
            { label: 'Just before you would forget', value: 'Strengthens it most', tone: 'green' },
            { label: 'When you know it cold', value: 'Adds little', tone: 'gray' },
            { label: 'Many times in one sitting', value: 'Cramming. Spacing beats it', tone: 'red' },
          ],
        },
        caption: 'Aced schedules every drill card this way. It grades drill answers on accuracy and speed, so you never grade yourself. A range you need 8 seconds to recall is not usable at the table.',
      },
      {
        kind: 'visual',
        title: 'The Aced loop',
        art: {
          kind: 'tree',
          root: 'One idea, all the way to the table',
          branches: [
            { label: '1. Learn', value: 'A short lesson on one idea', tone: 'brass' },
            { label: '2. Drill', value: 'Recall it under time', tone: 'brass' },
            { label: '3. Apply', value: 'Full hands, graded by EV loss', tone: 'brass' },
            { label: '4. Play', value: 'Log sessions and key hands', tone: 'brass' },
            { label: '5. Review', value: 'Misses feed tomorrow’s queue', tone: 'green' },
          ],
        },
        caption: 'Drill each idea until recall is automatic. Then the loop starts again.',
      },
      {
        kind: 'text',
        title: 'Start with the most common spots',
        body: [
          'Every hand starts with a preflop decision. So preflop errors repeat more than any other kind.',
          'A 3bet pot needs a raise and a reraise, so single raised pots come up far more often. Learn them first. In live games, add limped and isolated pots.',
          'River spots come up less often but carry big bets. A bet of the same pot fraction is larger on later streets, because the pot has grown.',
        ],
      },
      {
        kind: 'visual',
        title: 'Measure progress',
        art: {
          kind: 'tree',
          root: 'Two numbers to watch',
          branches: [
            { label: 'Accuracy', value: 'What you know', tone: 'green' },
            { label: 'EV loss', value: 'What your mistakes cost', tone: 'red' },
          ],
        },
        caption: '**Accuracy** is how often you pick an action GTO takes a meaningful share of the time. **EV loss** is how much you give up per decision, as a share of the pot. Watch both trends over weeks, not single sessions.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Make it automatic',
        body: 'Attach study to something you already do every day, like the first coffee. Study at the same time and place each day. Keep it small enough that you never skip it.',
      },
      {
        kind: 'quiz',
        question: 'You just finished a lesson. What should come next?',
        choices: ['Start the next lesson right away', 'Drill it until recall is automatic', 'Play a long session to test it'],
        answer: 1,
        explain:
          'Like the Aced loop showed, drill comes right after the lesson. A lesson read once fades fast. Starting the next lesson piles new ideas on ones that have not set yet.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You have 20 minutes today. What is the best use?',
        choices: ['Solve one unusual 4bet pot at 40bb', 'Reread lessons you already know', 'Due review cards, then a preflop drill'],
        answer: 2,
        explain:
          'Due cards come back just before you would forget. Preflop decisions come up every hand. Rare spots like a 4bet pot at 40bb can wait until the common ones are solid.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'For most players, which routine builds the most lasting skill?',
        choices: ['15 focused minutes every day', 'One 2 hour session each weekend', 'Long sessions whenever you feel like it'],
        answer: 0,
        explain: 'Consistency beats intensity. Short daily sessions are easy to start, and starting is the hard part. A fixed time makes it a habit.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Your drill accuracy dipped in one session. What should you watch?',
        choices: ['The trend in accuracy and EV loss over weeks', 'That one session', 'Only your results at the table'],
        answer: 0,
        explain: 'One session is noisy. Accuracy shows what you know, and EV loss shows what mistakes cost. Watch both trends over weeks.',
        point: 3,
      },
      {
        kind: 'takeaway',
        points: [
          'Study a little every day, at a fixed time.',
          'Learn, then drill. Review on a spaced schedule.',
          'Learn preflop and single raised pots first. Then add river decisions.',
          'Track accuracy and EV loss over weeks.',
        ],
      },
    ],
  },
  {
    key: 'mindset/study/hand-review',
    level: 'core',
    minutes: 6,
    cover: { kind: 'ring', value: 0.3, label: 'Bluffs needed', caption: 'To call 75 into 100' },
    steps: [
      {
        kind: 'intro',
        title: 'Your hands are your best study material',
        body: 'Your own hands are the spots you actually face, against the players you actually meet. The goal of a review is a better decision next time. It is not a verdict on what happened.',
      },
      {
        kind: 'visual',
        title: 'Pick hands with a filter',
        art: {
          kind: 'tree',
          root: 'Review these hands',
          branches: [
            { label: 'Big pots', value: 'Mistakes cost the most', tone: 'brass' },
            { label: 'Spots you were unsure', value: 'Doubt marks a gap', tone: 'brass' },
            { label: 'Spots that repeat', value: 'Small leaks add up', tone: 'brass' },
            { label: 'Hands that felt bad', value: 'Check for tilt or bias', tone: 'brass' },
          ],
        },
        caption: 'A short filter keeps reviews on the hands that teach the most.',
      },
      {
        kind: 'visual',
        title: 'Write the ranges, street by street',
        art: { kind: 'streets' },
        caption:
          'Before judging any action, write both ranges. Start with what each player opens or calls preflop. Then narrow them after each street. Do this before you look at what villain showed. Seeing their cards first anchors you to one hand.',
      },
      {
        kind: 'text',
        title: 'Baseline first, then the player',
        body: [
          'Compare your line with the GTO baseline first. What would an unexploitable strategy do with this hand here? That shows how far from sound you were.',
          'Then adjust for this opponent, but only with evidence. Logged hands or a clear pattern count. Write down the read and the change it justifies, so you can check it later.',
        ],
      },
      {
        kind: 'visual',
        title: 'River: call 75 into 100',
        art: {
          kind: 'bars',
          bars: [
            { label: '40% bluffs', value: 25, tone: 'green' },
            { label: '30% bluffs', value: 0, tone: 'gray' },
            { label: '20% bluffs', value: -25, tone: 'red' },
          ],
        },
        caption:
          'Your hand beats every bluff and loses to every value bet. You call 75 to win 250, so you need **30%** bluffs. EV = bluff share × 250 − 75.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Avoid results oriented thinking',
        body: [
          'Against 40% bluffs, the call earns +25 even though it loses 60% of the time. Against 20% bluffs, it loses 25 on average. That stays true on the nights villain shows a bluff.',
          'So never grade a decision by the cards villain turned over. Grade it by the range you estimated and the price you were offered.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Log what you learn',
        body: 'End each review with one line. Name the spot and what you found. Then write the rule you will use next time, and save the hand so it comes back.',
      },
      {
        kind: 'quiz',
        question: 'You call a river bet with a bluff catcher and villain shows the nuts. What does that tell you about the call?',
        choices: ['The call was a mistake', 'Villain rarely bluffs here', 'Very little on its own'],
        answer: 2,
        explain:
          'One hand is one sample from villain’s range. Like the river bars showed, the call is judged by the bluff share against the price. This one showdown does not settle it.',
        point: 3,
      },
      {
        kind: 'quiz',
        question: 'Which hand most deserves a review?',
        choices: ['A big river call you were unsure about', 'A small pot you won with the nuts', 'A standard preflop fold you made quickly'],
        answer: 0,
        explain: 'It is a big pot with real doubt. A mistake there would be expensive, and the doubt points at a gap you can fix. Small pots and easy folds teach little.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'When should you write down villain’s range in a review?',
        choices: ['Before you look at the cards they showed', 'After you see their cards', 'Only when you lost the pot'],
        answer: 0,
        explain: 'Seeing their cards first anchors you to one hand. So write both ranges street by street first. Then look at what they showed.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You think villain bluffs too much. How should your review use that read?',
        choices: ['Compare with the GTO baseline first, then adjust if you have evidence', 'Start from the read, since reads beat theory', 'Ignore it, since only GTO matters'],
        answer: 0,
        explain: 'The baseline shows how far from sound your line was. Then adjust for this player, but only with evidence like logged hands. Write the read down so you can check it.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Review big pots and spots you were unsure about.',
          'Write the ranges before you look at villain’s cards.',
          'Start from the GTO baseline. Then adjust with evidence.',
          'Grade decisions, not results. Log one lesson per hand.',
        ],
      },
    ],
  },
];
