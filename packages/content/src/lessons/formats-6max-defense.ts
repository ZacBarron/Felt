import type { LessonContent } from './types';

/**
 * Defending at 6-max: fewer players behind each open, so opens and defenses
 * are wider, while the price to defend stays the same. Prices and the chance
 * that someone behind holds a premium are exact and recomputed in
 * thin-spots.test.ts. Chart claims are checked against Aced's charts.
 */
export const FORMATS_6MAX_DEFENSE_LESSONS: LessonContent[] = [
  {
    key: 'formats/short-handed/6max-defense',
    level: 'advanced',
    minutes: 5,
    cover: { kind: 'table', seats: 6, button: 'BTN', hero: 'BB', highlight: ['CO'], note: 'CO opens 2.5bb' },
    steps: [
      {
        kind: 'intro',
        title: 'Wider opens, wider defense',
        body: 'At 6-max the first seat has only 5 players behind. Opens are wider from every seat. So you defend wider against each of them.',
      },
      {
        kind: 'visual',
        title: 'Six seats, fewer behind',
        art: { kind: 'table', seats: 6, button: 'BTN', hero: 'BB', highlight: ['UTG'], note: 'UTG opens, 4 players folded' },
        caption: 'At 6-max UTG sits where the LJ sits at a 9-handed table. It has the same 5 players behind. So it opens about the same hands.',
      },
      {
        kind: 'visual',
        title: 'Someone behind holds QQ+ or AK',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '6-max UTG, 5 behind', value: 13.3, tone: 'brass' },
            { label: '9-handed UTG, 8 behind', value: 20.7, tone: 'red' },
          ],
        },
        caption: 'Exact chances, with your 8♥7♥ removed and the other cards dealt at random. Fewer players behind means fewer big hands to run into.',
        evidence: 'math',
      },
      {
        kind: 'chart',
        chartId: '6max-100-bb-vs-co',
        title: 'Big blind against a cutoff open',
        caption: 'Aced’s chart defends most suited hands and many offsuit broadways against a cutoff open. Against a tight early open the defense is far tighter.',
      },
      {
        kind: 'text',
        title: 'Seat by seat at 6-max',
        body: [
          'Against UTG, defend about like you would against a 9-handed LJ. The ranges are close.',
          'Against the cutoff and button, defend wide from the big blind. 3bet more from every seat.',
          'The small blind still mostly 3bets or folds. It is out of position with the big blind behind.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'The price does not change',
        columns: ['Spot', 'You call', 'Needs'],
        rows: [
          ['BB vs 2.5bb open', '1.5bb', '27.3%'],
          ['SB vs 2.5bb open', '2bb', '33.3%'],
          ['BTN cold call vs 2.5bb open', '2.5bb', '38.5%'],
          ['BB vs 2bb open', '1bb', '22.2%'],
        ],
        note: 'Raw equity before realization, other players folded. The price is the same at 6-max and 9-handed. The ranges are not.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Defend this at 6-max',
        cards: 'Qd9c',
        caption: 'Q♦9♣ in the big blind defends against a button open. Against a 9-handed UTG open it folds.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Short handed live games',
        body: 'A 9-handed table that shrinks to 6 players plays like 6-max. Widen your opens and your defense as seats empty.',
      },
      {
        kind: 'quiz',
        question: 'At 6-max, how many players are left to act behind a UTG open?',
        choices: ['3', '5', '8'],
        answer: 1,
        explain: 'Six players minus the opener leaves 5 behind. At 9-handed, UTG has 8 behind. Fewer players behind means wider opens.',
        point: 0,
        variants: [
          {
            question: 'At 6-max, how many players are left to act behind a cutoff open?',
            choices: ['2', '3', '5'],
            explain: 'The button and both blinds are left, so 3 players. That is why the cutoff opens wide.',
          },
          {
            question: 'At a 9-handed table, how many players act behind a HJ open?',
            choices: ['3', '4', '6'],
            explain: 'That leaves 4 players. They are the cutoff, the button and both blinds. A 6-max HJ also has 4 behind.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'At 6-max the cutoff opens 2.5bb and the small blind folds. What raw equity does a big blind call need?',
        choices: ['22.2%', '27.3%', '33.3%'],
        answer: 1,
        explain: 'You call 1.5bb to win 4bb. So 1.5 ÷ 5.5 = 27.3%, the same as at a 9-handed table.',
        point: 1,
        variants: [
          {
            question: 'At 6-max UTG opens 2bb and the small blind folds. What raw equity does a big blind call need?',
            answer: 0,
            explain: 'You call 1bb to win 3.5bb. So 1 ÷ 4.5 = 22.2%. Small online opens give the big blind a great price.',
          },
          {
            question: 'At 6-max the button opens 3bb and the small blind folds. What raw equity does a big blind call need?',
            choices: ['27.3%', '30.8%', '37.5%'],
            answer: 1,
            explain: 'You call 2bb to win 4.5bb. So 2 ÷ 6.5 = 30.8%.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Big blind with Q♦9♣. Which open does Aced’s chart defend against?',
        cards: 'Qd9c',
        choices: ['A 6-max button open', 'A 9-handed UTG open', 'Both', 'Neither'],
        answer: 0,
        explain: 'Q9o calls against a wide button range. Against a tight UTG range it is dominated, so it folds.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            question: 'Big blind with K♠8♦. Which open does Aced’s chart defend against?',
            cards: 'Ks8d',
            explain: 'K8o calls against a wide button range. Against a tight UTG range it is dominated, so it folds.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'At 6-max even UTG has only 5 players behind. Opens and defenses are wider.',
          'The price to defend does not change with table size. A 2.5bb open still asks the big blind for 27.3%.',
          'Defend hands like Q9o against late opens. Fold them against early 9-handed opens.',
        ],
      },
    ],
  },
];
