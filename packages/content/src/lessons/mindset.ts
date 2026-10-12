import type { LessonContent } from './types';

export const MINDSET_LESSONS: LessonContent[] = [
  {
    key: 'mindset/mental/tilt',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '−6' },
    steps: [
      {
        kind: 'intro',
        title: 'Tilt is any drop from your A game',
        body: 'Tilt is not only rage after a bad beat. Most of it is quiet: a slightly wider call, a bluff you would not make fresh, one more orbit you should not play. You cannot avoid the triggers, but you can catch it early and stop it costing you.',
      },
      {
        kind: 'table',
        title: 'Four common types',
        columns: ['Type', 'Trigger', 'Typical leak'],
        rows: [
          ['Losing', 'Being down on the day', 'Playing to get even'],
          ['Injustice', 'Bad beats, coolers', 'Feels owed, calls light'],
          ['Entitlement', 'Losing to weaker players', 'Bluffs players who never fold'],
          ['Revenge', 'A player who needled you', 'Fights them with weak hands'],
        ],
        note: 'A way to name what you feel, not a measured classification. Most tilt mixes more than one type.',
      },
      {
        kind: 'text',
        title: 'Early warning signs',
        body: [
          'Tilt shows up in your body and your thinking before it shows up in your results: replaying a hand in your head, a faster pulse, a tight jaw, wanting one particular player to put chips in.',
          'Then it shows up in your play: acting fast without a plan, calling “to see it”, opening hands you know are folds, rebuying the moment you lose a stack.',
        ],
      },
      {
        kind: 'table',
        title: 'Illustration: what tilt costs',
        columns: ['Hands', 'Share', 'Win rate'],
        rows: [
          ['A game', '80%', '+10bb/100'],
          ['On tilt', '20%', '−20bb/100'],
          ['Overall', '100%', '+4bb/100'],
        ],
        note: 'Illustrative inputs, not a statistic about any player or pool: 0.8 × 10 + 0.2 × (−20) = 4. Put in your own numbers.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'A small share does the damage',
        body: [
          'In this illustration, one hand in five on tilt cuts the win rate by **60%**, from 10 to 4bb/100. The A game hands are fine. The loss is concentrated in the hands played badly.',
          'So the fix is not to play better while tilted. It is to play fewer hands while tilted.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'A stop loss and a reset routine',
        body: [
          'Set a stop loss before the session, for example 3 buy ins, and leave when you hit it. Decide it while calm, because a tilted mind always argues for one more orbit.',
          'For smaller triggers, reset: stand up, walk for two minutes, breathe slowly, and name the trigger in one sentence (“I am annoyed about the river”). Sit back down only when your next decision would be the same one you would make fresh.',
        ],
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Why a stop loss is not math',
        body: 'Being down does not make the next hand worse in itself: the cards do not know your session result. A stop loss protects the one thing that does change, how well you play.',
      },
      {
        kind: 'quiz',
        question: 'Illustration: your A game wins 8bb/100. On tilt, 10% of your hands, you lose 30bb/100. Your overall win rate?',
        choices: ['+5.0bb/100', '+4.2bb/100', '+7.2bb/100', '−2.2bb/100'],
        answer: 1,
        explain: '0.9 × 8 + 0.1 × (−30) = 7.2 − 3 = 4.2bb/100. One hand in ten on tilt costs almost half the win rate. The inputs are made up; the shape of the result is the point.',
      },
      {
        kind: 'quiz',
        question: 'Mid session you notice you are replaying a bad beat and acting fast. Best response?',
        choices: ['Keep playing and focus harder', 'Move up to win it back faster', 'Take a reset break before the next hand'],
        answer: 2,
        explain: 'Warning signs mean the next hands are the expensive ones. Reset first, and come back only when your decisions are back to normal. Trying harder while tilted rarely works.',
      },
      {
        kind: 'takeaway',
        points: [
          'Name the type: losing, injustice, entitlement or revenge.',
          'Catch the early signs before they reach your play.',
          'A small share of tilted hands can erase most of a win rate.',
          'Set the stop loss while calm, and reset at the first sign.',
        ],
      },
    ],
  },
  {
    key: 'mindset/mental/variance',
    level: 'core',
    minutes: 7,
    cover: { kind: 'figure', text: '1.96' },
    steps: [
      {
        kind: 'intro',
        title: 'Short samples lie',
        body: 'A winning player can lose for months, and a losing player can run hot for just as long. Knowing how long the long run really is keeps you calm in a downswing and honest in an upswing.',
      },
      {
        kind: 'text',
        title: 'Two numbers describe your results',
        body: [
          '**Win rate** is your average result per 100 hands, in bb/100. **Standard deviation** (SD) measures how widely results swing around that average, in the same units.',
          'The uncertainty in your measured win rate shrinks with the square root of the number of hands, not with the number of hands. That is why it shrinks so slowly.',
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: '95% confidence interval',
        formula: 'Win rate ± 1.96 × SD ÷ √(N ÷ 100)',
        parts: [
          ['Win rate', 'measured, bb/100'],
          ['SD', 'standard deviation, bb/100'],
          ['N', 'hands played'],
          ['1.96', 'covers 95% of a normal distribution'],
        ],
        example: 'SD 100bb/100 over 10,000 hands: √(10,000 ÷ 100) = 10, so 1.96 × 100 ÷ 10 = **19.6bb/100** either side of the win rate.',
      },
      {
        kind: 'table',
        title: 'True win rate 10, SD 100',
        columns: ['Hands', 'Live hours', '95% range', 'Below 0'],
        rows: [
          ['10,000', '≈333', '−9.6 to 29.6', '15.9%'],
          ['30,000', '1,000', '−1.3 to 21.3', '4.2%'],
          ['100,000', '≈3,333', '3.8 to 16.2', '0.08%'],
        ],
        note: 'Assumed inputs: true win rate 10bb/100, SD 100bb/100, about 30 hands an hour live. The range is where 95% of measured win rates land after N hands (normal approximation). Below 0 is the chance the measured result is a loss.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What the table says',
        body: [
          'After 10,000 hands, about 333 live hours, a real 10bb/100 winner is still showing a loss about **16%** of the time. Even after 30,000 hands the range runs from a small loss to a big win.',
          'Halving the uncertainty takes four times the hands. Most live players never reach a sample that pins their win rate down tightly.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Chance of ever falling this far',
        columns: ['Drop', 'Buy ins', 'Chance'],
        rows: [
          ['500bb', '5', '36.8%'],
          ['1,000bb', '10', '13.5%'],
          ['1,500bb', '15', '5.0%'],
          ['2,000bb', '20', '1.8%'],
        ],
        note: 'Same assumed win rate and SD, 100bb buy ins. Chance that results ever fall this far below any given starting point: exp(−2 × win rate × drop ÷ SD²). Over a career you start from many points, so seeing drops like these at some point is far more likely.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Results versus decisions',
        body: [
          'With noise this large, a month of results says very little about how well you played. Judge yourself by what you can check: drill accuracy, EV loss in scenarios, and reviewed hands.',
          'A losing month is normal for a winner. A month of sloppy decisions is a real problem, whatever the results say.',
        ],
      },
      {
        kind: 'quiz',
        question: 'True win rate 10bb/100, SD 100bb/100. After 10,000 hands, 95% of measured win rates land in about',
        choices: ['5 to 15', '−9.6 to 29.6', '0 to 20', '8 to 12'],
        answer: 1,
        explain: '√(10,000 ÷ 100) = 10, and 1.96 × 100 ÷ 10 = 19.6. So 10 ± 19.6: anything from a loss to a huge win.',
      },
      {
        kind: 'quiz',
        question: 'To cut the width of your confidence interval in half, you need',
        choices: ['Twice the hands', 'Three times the hands', 'Four times the hands'],
        answer: 2,
        explain: 'The width shrinks with 1 ÷ √N. For √N to double, N must grow four times.',
      },
      {
        kind: 'takeaway',
        points: [
          'Interval: win rate ± 1.96 × SD ÷ √(N ÷ 100).',
          'Tens of thousands of hands still leave a wide range.',
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
    cover: { kind: 'figure', text: '1.8%' },
    steps: [
      {
        kind: 'intro',
        title: 'A roll that survives downswings',
        body: 'A bankroll is money set aside only for poker. Its job is to let you keep playing your best through normal downswings without ever being forced out of the game.',
      },
      {
        kind: 'text',
        title: 'Count in buy ins',
        body: [
          'Measure your roll in buy ins at the stake you play, not in dollars. $3,000 is 10 buy ins at 1/3 with a $300 buy in, and 30 buy ins at 0.5/1 with a $100 buy in.',
          'Swings are measured in big blinds, so buy ins put every stake on the same scale. If you buy in deeper than 100bb, count the roll in big blinds for the risk math.',
        ],
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'Risk of ruin',
        formula: 'RoR = exp(−2 × WR × B ÷ SD²)',
        parts: [
          ['WR', 'true win rate, bb/100'],
          ['B', 'bankroll, bb'],
          ['SD', 'standard deviation, bb/100'],
          ['RoR', 'chance of ever going broke'],
        ],
        example: 'WR 10, SD 100, 20 buy ins of 100bb: 2 × 10 × 2,000 ÷ 10,000 = 4, and exp(−4) = **1.8%**.',
      },
      {
        kind: 'table',
        title: 'Risk of ruin, SD 100',
        columns: ['Buy ins', 'WR 10', 'WR 5', 'WR 2.5'],
        rows: [
          ['10', '13.5%', '36.8%', '60.7%'],
          ['20', '1.8%', '13.5%', '36.8%'],
          ['30', '0.25%', '5.0%', '22.3%'],
          ['40', '0.03%', '1.8%', '13.5%'],
        ],
        note: 'Assumed inputs: SD 100bb/100, 100bb buy ins, win rates in bb/100. The model assumes a known, fixed win rate, no moving down, and no money added or taken out.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'A guideline, not a law',
        body: 'A common conservative guideline for live cash is **20 to 40 buy ins** for your stake. Lean toward 40 if your win rate is uncertain, since halving the win rate raises risk as much as halving the roll. The real danger is overestimating your win rate, which a live sample rarely pins down.',
      },
      {
        kind: 'text',
        title: 'Shot taking and moving down',
        body: [
          'Take a shot at the next stake with a budget set in advance, for example 3 to 5 buy ins of the bigger game. If the budget is gone, move back down. That is the plan working, not a failure.',
          'Set a floor for each stake, for example 20 buy ins, and move down whenever the roll falls below it. Moving down keeps your real chance of going broke below what the formula shows, since the formula assumes you never do.',
        ],
      },
      {
        kind: 'text',
        title: 'Keep the life roll separate',
        body: [
          'Rent, bills and savings are not bankroll. If a downswing would touch money you need to live, your roll is smaller than you think, and the fear of losing it will bend your decisions.',
          'Take money out on a schedule, and recount your buy ins after every withdrawal.',
        ],
      },
      {
        kind: 'quiz',
        question: 'SD 100bb/100, 100bb buy ins. At a true win rate of 5bb/100, which roll matches the risk of 20 buy ins at 10bb/100?',
        choices: ['20 buy ins', '30 buy ins', '40 buy ins', '80 buy ins'],
        answer: 2,
        explain: 'Risk depends on win rate × bankroll. 5 × 40 = 10 × 20, so both give exp(−4), about 1.8%.',
      },
      {
        kind: 'quiz',
        question: 'You take a planned shot at 2/5 with 4 buy ins and lose all four. Best move?',
        choices: ['Move back down and rebuild', 'Stay at 2/5 to win it back', 'Take a bigger shot at 5/10'],
        answer: 0,
        explain: 'The shot budget exists so a normal downswing at the new stake cannot hurt your main roll. Losing it is a short sample, not proof you cannot win there. Rebuild and try again later.',
      },
      {
        kind: 'takeaway',
        points: [
          'Count the roll in buy ins, or in big blinds for deep games.',
          'RoR = exp(−2 × WR × B ÷ SD²), and it assumes you know your win rate.',
          '20 to 40 buy ins is a guideline for live cash, not a law.',
          'Shot with a fixed budget; move down at your floor.',
          'Keep life money out of the roll.',
        ],
      },
    ],
  },
  {
    key: 'mindset/study/study-plan',
    level: 'core',
    minutes: 5,
    cover: { kind: 'figure', text: '15m' },
    practice: ['9max-100-rfi-utg', '9max-100-rfi-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'Consistency beats intensity',
        body: 'Twenty focused minutes every day usually builds more lasting skill than one long session a week. The routine that works is the one you actually keep.',
      },
      {
        kind: 'text',
        title: 'Short daily sessions',
        body: [
          'Felt’s daily queue is built to fit 15 to 30 minutes on a phone. Short sessions are easy to start, and starting is the hard part.',
          'Stop while you are still sharp. Drilling while tired trains slow, sloppy recall.',
        ],
      },
      {
        kind: 'text',
        title: 'Spaced repetition',
        body: [
          'Memory fades over time, and a review just before you would forget strengthens it more than a review of something you already know cold. Spacing reviews out beats cramming them together.',
          'Felt schedules every card this way and grades each answer from accuracy and response time, with no self grading. A range you need eight seconds to recall is not usable at the table.',
        ],
      },
      {
        kind: 'table',
        title: 'The Felt loop',
        columns: ['Step', 'What you do'],
        rows: [
          ['Learn', 'A short lesson on one idea'],
          ['Drill', 'Recall it under time until automatic'],
          ['Apply', 'Full hands, graded by EV loss'],
          ['Play', 'Log sessions and key hands'],
          ['Review', 'Misses feed tomorrow’s queue'],
        ],
      },
      {
        kind: 'text',
        title: 'Start with the most common spots',
        body: [
          'Every hand starts with a preflop decision, so preflop errors repeat more than any other. A 3bet pot needs a raise and a reraise, so single raised pots come up far more often: learn them first. Live, add limped and isolated pots.',
          'River spots come up less often but carry big bets: a bet of the same pot fraction is larger on later streets because the pot has grown.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Measure progress',
        body: [
          '**Accuracy** is how often you choose an action GTO takes at a meaningful frequency. **EV loss** is how much you give up per decision, as a share of the pot. Accuracy shows what you know. EV loss shows what your mistakes cost.',
          'Watch both trends over weeks, not single sessions. A few blunders can cost more than many small inaccuracies.',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Make it automatic',
        body: 'Attach study to something you already do every day, like the first coffee or the commute. Same time, same place, small enough that you never skip it.',
      },
      {
        kind: 'quiz',
        question: 'You just finished a lesson. What should come next?',
        choices: ['Drill it until recall is automatic', 'Start the next lesson', 'Play a long session to test it'],
        answer: 0,
        explain: 'Learn, then drill, then review. A lesson read once fades fast; drilling it and reviewing it on a spaced schedule is what makes it usable at the table.',
      },
      {
        kind: 'quiz',
        question: 'You have 20 minutes today. Best use?',
        choices: ['Solve one unusual 4bet pot at 40bb', 'Due review cards, then a preflop drill', 'Reread lessons you already know'],
        answer: 1,
        explain: 'Due cards are scheduled at the moment review helps most, and preflop decisions come up every hand. Rare spots can wait until the common ones are solid.',
      },
      {
        kind: 'takeaway',
        points: [
          'Short, daily, at a fixed time.',
          'Learn, drill, then review on a spaced schedule.',
          'Preflop and single raised pots first, then river decisions.',
          'Track accuracy and EV loss over weeks.',
        ],
      },
    ],
  },
  {
    key: 'mindset/study/hand-review',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '30%' },
    steps: [
      {
        kind: 'intro',
        title: 'Your hands are your best study material',
        body: 'Your own hands are the spots you actually face, against the players you actually meet. The goal of a review is a better decision next time, not a verdict on what happened.',
      },
      {
        kind: 'table',
        title: 'Pick hands with a filter',
        columns: ['Filter', 'Why'],
        rows: [
          ['Big pots', 'Mistakes cost the most'],
          ['Spots you were unsure', 'Doubt marks a gap'],
          ['Spots that repeat', 'Small leaks add up'],
          ['Hands that felt bad', 'Check for tilt or bias'],
        ],
      },
      {
        kind: 'text',
        title: 'Write the ranges, street by street',
        body: [
          'Before judging any action, write both ranges: what each player opens or calls preflop, then what is left after each flop, turn and river action.',
          'Do it before you look at what villain showed. Seeing their cards first anchors you to one hand instead of a range.',
        ],
      },
      {
        kind: 'text',
        title: 'Baseline first, then the player',
        body: [
          'Compare your line with the GTO baseline first: what would an unexploitable strategy do with this hand here? That tells you how far from sound you were.',
          'Then adjust for this opponent, but only with evidence such as logged hands or a clear pattern. Write the read and the change it justifies, so you can check it later.',
        ],
      },
      {
        kind: 'table',
        title: 'River: call 75 into 100',
        columns: ['Villain bluffs', 'Call EV'],
        rows: [
          ['40% of bets', '+25'],
          ['30% of bets', '0'],
          ['20% of bets', '−25'],
        ],
        note: 'A bluff catcher that beats every bluff and loses to every value bet. You need 75 ÷ 250 = 30%. EV = bluff share × 250 − 75.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Avoid results oriented thinking',
        body: [
          'Against 40% bluffs the call earns +25 even though it loses 60% of the time. Against 20% bluffs it loses 25 on average even on the nights villain shows a bluff.',
          'So never grade a decision by the card villain turned over. Grade it by the range you estimated and the price you were offered.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Log what you learn',
        body: 'End each review with one line: the spot, what you found, and the rule you will use next time. Flag the hand for review so the lesson comes back.',
      },
      {
        kind: 'quiz',
        question: 'You call a river bet with a bluff catcher and villain shows the nuts. What does that tell you about the call?',
        choices: ['It was a mistake', 'Very little on its own', 'Villain never bluffs'],
        answer: 1,
        explain: 'One hand is one sample from villain’s range. The call was right or wrong depending on how often that line is a bluff compared with the price, not on this showdown.',
      },
      {
        kind: 'quiz',
        question: 'Which hand most deserves a review?',
        choices: ['A big river call you were unsure about', 'A small pot you won with the nuts', 'AA that won the blinds preflop'],
        answer: 0,
        explain: 'Big pot and real doubt: the mistake, if there was one, was expensive, and the uncertainty points at a gap you can fix.',
      },
      {
        kind: 'takeaway',
        points: [
          'Filter: big pots and spots you were unsure about.',
          'Write the ranges before you look at villain’s cards.',
          'GTO baseline first, then adjust with evidence.',
          'Grade decisions, not results, and log one lesson per hand.',
        ],
      },
    ],
  },
];
