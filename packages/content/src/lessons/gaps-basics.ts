import type { LessonContent } from './types';

/**
 * Poker basics gaps: side pots when a player is all in, and reading the board
 * for the nuts. Every pot size is exact and every hand claim is checked with
 * the evaluator in packages/content/test/gaps2.test.ts.
 */
export const GAPS_BASICS_LESSONS: LessonContent[] = [
  {
    key: 'basics/rules/side-pots',
    level: 'core',
    minutes: 5,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Player A', bb: 20 },
        { label: 'Player B', bb: 50 },
        { label: 'Player C', bb: 100 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Nobody is forced out',
        body: 'You can always go all in for what you have. Then you can win only the chips you matched. This lesson shows how the chips split into pots.',
      },
      {
        kind: 'visual',
        title: 'Three stacks, all in',
        art: {
          kind: 'chips',
          stacks: [
            { label: 'Player A', bb: 20 },
            { label: 'Player B', bb: 50 },
            { label: 'Player C', bb: 100 },
          ],
        },
        caption: 'Three players get all their chips in before the flop. A has 20bb and B has 50bb. C has 100bb. We leave out the blinds to keep it simple.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Build the pots in layers',
        body: [
          'The smallest stack sets the first layer. Each player puts in up to 20bb. That is the **main pot**, and all 3 players can win it.',
          'The next layer goes up to the middle stack. Only B and C can match it. That layer is a **side pot**.',
          'Chips that nobody can match go back to their owner.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Main pot and side pot',
        art: {
          kind: 'bars',
          unit: 'bb',
          bars: [
            { label: 'Main pot', value: 60, tone: 'brass' },
            { label: 'Side pot', value: 60, tone: 'green' },
            { label: 'Back to C', value: 50, tone: 'gray' },
          ],
        },
        caption: 'The main pot is 3 × 20 = **60bb**. B and C each add 30bb more, so the side pot is 2 × 30 = **60bb**. Nobody can match C’s last 50bb. It goes back to C.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Who can win what',
        art: {
          kind: 'tree',
          root: 'Pots at showdown',
          branches: [
            { label: 'Player A', value: 'Main pot only', tone: 'brass' },
            { label: 'Player B', value: 'Main and side pot', tone: 'green' },
            { label: 'Player C', value: 'Main and side pot', tone: 'green' },
          ],
        },
        caption: 'Each pot goes to the best hand among the players in it. A can win at most 60bb here. B and C can win up to 120bb.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Your stack sets your limit',
        body: 'All in for 20bb, A can win at most 20bb from each caller. With A’s own 20bb back, that makes 60bb.',
      },
      {
        kind: 'hand',
        title: 'The showdown',
        cards: 'AsAh',
        board: '9c7d4s2h3c',
        caption: 'A shows A♠A♥. B has K♠K♥ and C has Q♦Q♣. Aces are best, so A wins the 60bb main pot. B beats C for the 60bb side pot. Each pot is settled on its own.',
      },
      {
        kind: 'quiz',
        question: 'A is all in for 20bb. At showdown C has the best hand and A beats B. Who wins the side pot?',
        choices: ['A', 'B', 'C'],
        answer: 2,
        explain: 'C has the best hand of all, so C wins the main pot and the side pot. A beating B does not matter here. A cannot win the side pot.',
      },
      {
        kind: 'quiz',
        question: 'A is all in for 25bb. B and C have 80bb each and get all in too. How big is the side pot?',
        choices: ['75bb', '110bb', '160bb', '185bb'],
        answer: 1,
        explain: 'The main pot is 3 × 25 = 75bb. B and C each have 55bb left. So the side pot is 2 × 55 = 110bb. The 185bb answer is every chip in the hand.',
      },
      {
        kind: 'quiz',
        question: 'You are all in for 30bb. Two players with bigger stacks call. What is the most you can win?',
        choices: ['30bb', '60bb', '90bb', 'Every chip in the hand'],
        answer: 2,
        explain: 'You win 30bb from each caller plus your own 30bb back. That is 90bb. Anything they bet past that goes to a side pot.',
      },
      {
        kind: 'takeaway',
        points: [
          'The smallest all in stack sets the main pot.',
          'Chips past it build side pots for the players who can match them.',
          'You can win only what you matched from each player.',
          'Chips nobody can match go back to their owner.',
        ],
      },
    ],
  },
  {
    key: 'basics/first-strategy/the-nuts',
    level: 'core',
    minutes: 5,
    cover: { kind: 'cards', cards: '9c9s', board: 'Ks9d4cTs9h' },
    steps: [
      {
        kind: 'intro',
        title: 'Strong compared with what?',
        body: 'A hand is only as strong as the board allows. The best possible hand on a board is called **the nuts**. Find it and you know how worried to be.',
      },
      {
        kind: 'visual',
        title: 'A dry flop',
        art: { kind: 'cards', cards: '', board: 'Ks9d4c' },
        caption: 'No 3 cards share a suit. No 3 fit inside one straight. So the nuts is three kings, from a pair of kings in hand.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Three questions for every board',
        body: [
          '**Is the board paired?** Then full houses and four of a kind are possible.',
          '**Do 3 cards share a suit?** Then flushes are possible.',
          '**Do 3 cards fit inside one straight?** Then straights are possible. For example 9, T and K fit in 9 T J Q K.',
          'If all 3 answers are no, the nuts is three of a kind with the top card.',
        ],
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'The turn adds a straight',
        art: { kind: 'cards', cards: '', board: 'Ks9d4cTs' },
        caption: 'The T♠ puts 9, T and K inside one straight. Now QJ makes a straight to the king. Three kings are no longer the nuts.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'A paired river',
        art: { kind: 'cards', cards: '9c9s', board: 'Ks9d4cTs9h' },
        caption: 'The 9♥ pairs the board. Full houses and four of a kind are now possible. The nuts is four nines. Only 9♣9♠ makes it.',
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Strong hand, weak spot',
        cards: 'AhKd',
        board: 'Ks9d4cTs9h',
        caption: 'You hold two pair, kings and nines with an ace. That sounds strong. Yet any 9 beats you. So does QJ, and so do full houses like K9.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Judge your hand against the board',
        body: 'Two pair can be the nuts on one board and weak on the next. Ask which hands could beat you. Then ask how likely they are.',
      },
      {
        kind: 'quiz',
        question: 'The board has 4 hearts. You hold top pair with an ace kicker. How strong is it?',
        cards: 'AsKc',
        board: 'Kh8h5h2h',
        choices: ['The nuts', 'Strong, with the best kicker', 'Weak, since any heart makes a flush'],
        answer: 2,
        explain: 'Any player with 1 heart has a flush. Your top pair loses to all of them. On this board even a small heart beats you.',
      },
      {
        kind: 'quiz',
        question: 'The river pairs the board. What becomes possible?',
        board: 'Ks9d4cTs9h',
        choices: ['Full houses and four of a kind', 'Flushes', 'Nothing new'],
        answer: 0,
        explain: 'A paired board lets a player hold three of a kind plus a pair. That is a full house. A pocket pair that matches the board pair makes four of a kind.',
      },
      {
        kind: 'quiz',
        question: 'Which hand is the nuts on this board?',
        board: 'QhJd8c4s2h',
        choiceCards: ['QcQs', 'Th9h', 'AcQd', 'KsTs'],
        choices: ['Q♣ Q♠', 'T♥ 9♥', 'A♣ Q♦', 'K♠ T♠'],
        answer: 1,
        explain: 'Q, J and 8 fit inside one straight. T9 fills it for a straight from 8 to Q. The board has no pair and only 2 hearts. So that straight is the nuts. Three queens is strong but not the nuts.',
      },
      {
        kind: 'takeaway',
        points: [
          'The nuts is the best hand possible on this board.',
          'Ask 3 questions. Is it paired? Do 3 cards share a suit? Do 3 fit one straight?',
          'Judge your hand against the board, not the rankings list.',
        ],
      },
    ],
  },
];
