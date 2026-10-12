/**
 * Lesson content. Each lesson is a short sequence of steps: one idea per
 * screen, a visual wherever it helps, and quick checks that grade instantly.
 * Keys match the curriculum: `${trackId}/${moduleId}/${lessonId}`.
 *
 * Text supports **bold** for emphasis. Numbers here are exact unless a step
 * says otherwise; chart steps use the starter charts, which are approximate.
 */

export type LessonCover = { kind: 'figure'; text: string } | { kind: 'chart'; chartId: string } | { kind: 'cards'; cards: string };

export type LessonStep =
  | { kind: 'intro'; title: string; body: string }
  | { kind: 'text'; title: string; body: string[] }
  | { kind: 'formula'; title: string; formula: string; parts?: [string, string][]; example: string }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][]; note?: string }
  | { kind: 'chart'; chartId: string; title: string; caption: string; highlight?: string[] }
  | { kind: 'hand'; title: string; cards: string; board?: string; caption: string }
  | { kind: 'callout'; tone: 'tip' | 'exploit'; title: string; body: string }
  | { kind: 'quiz'; question: string; choices: string[]; answer: number; explain: string }
  | { kind: 'takeaway'; points: string[] };

export interface LessonContent {
  key: string;
  minutes: number;
  cover: LessonCover;
  steps: LessonStep[];
  /** Charts to drill after the lesson. */
  practice?: string[];
}

const LESSONS: LessonContent[] = [
  {
    key: 'foundations/math/pot-odds',
    minutes: 4,
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
          ['1/4 pot', '17%'],
          ['1/3 pot', '20%'],
          ['1/2 pot', '25%'],
          ['2/3 pot', '29%'],
          ['3/4 pot', '30%'],
          ['Pot', '33%'],
          ['2x pot', '40%'],
        ],
        note: 'Bigger bets ask for more equity, but never more than half.',
      },
      {
        kind: 'hand',
        title: 'Put a number on your hand',
        cards: 'AhKh',
        board: 'Qh7h2c9s',
        caption: 'A flush draw on the turn has 9 outs among 46 unseen cards: about **20%** to hit on the river.',
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
        question: 'Your flush draw (about 20%) faces a half pot bet (25% needed). On pot odds alone?',
        choices: ['Call, it is close', 'Fold, unless you win more when you hit', 'Always raise'],
        answer: 1,
        explain:
          'You are 5 points short of the price. A call only works if the money you win on later streets makes up the gap. That is implied odds.',
      },
      {
        kind: 'takeaway',
        points: [
          'Equity needed = call ÷ final pot.',
          'Half pot needs 25%, pot needs 33%, twice pot needs 40%.',
          'Short of the price? You need implied odds, fold equity, or a fold.',
        ],
      },
    ],
  },
  {
    key: 'foundations/math/mdf-alpha',
    minutes: 4,
    cover: { kind: 'figure', text: '50%' },
    steps: [
      {
        kind: 'intro',
        title: 'Two sides of one bet',
        body: 'Alpha is how often a bluff has to work. MDF is how often the defender must continue so bluffs cannot print money.',
      },
      {
        kind: 'formula',
        title: 'Alpha: what a bluff needs',
        formula: 'Alpha = bet ÷ (pot + bet)',
        example: 'Bet 50 into 100: 50 ÷ 150 = **33%**. A pure bluff profits if villain folds more than a third of the time.',
      },
      {
        kind: 'formula',
        title: 'MDF: what a defender owes',
        formula: 'MDF = pot ÷ (pot + bet) = 1 − alpha',
        example: 'Facing 50 into 100: 100 ÷ 150 = **67%**. Continue with at least two thirds of your range.',
      },
      {
        kind: 'table',
        title: 'Both at a glance',
        columns: ['Bet size', 'Alpha', 'MDF'],
        rows: [
          ['1/3 pot', '25%', '75%'],
          ['1/2 pot', '33%', '67%'],
          ['3/4 pot', '43%', '57%'],
          ['Pot', '50%', '50%'],
          ['2x pot', '67%', '33%'],
        ],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'A guide, not a law',
        body:
          'MDF assumes the bettor could be bluffing with anything. In live low stakes games big bets are mostly value, so folding more than MDF is often right.',
      },
      {
        kind: 'quiz',
        question: 'Villain bets pot on the river. By MDF, how much of your range should continue?',
        choices: ['25%', '33%', '50%', '67%'],
        answer: 2,
        explain: 'Pot ÷ (pot + bet) = 1 ÷ 2 = 50%.',
      },
      {
        kind: 'quiz',
        question: 'You bluff 3/4 pot with nothing. How often must villain fold to break even?',
        choices: ['33%', '43%', '57%', '75%'],
        answer: 1,
        explain: '0.75 ÷ 1.75 = 43%.',
      },
      {
        kind: 'takeaway',
        points: ['Alpha = bet ÷ (pot + bet).', 'MDF = 1 − alpha.', 'Pot sized bet: bluffs need 50%, defenders keep 50%.'],
      },
    ],
  },
  {
    key: 'foundations/math/combos',
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
        note: 'AK is almost three times as common as AA.',
      },
      {
        kind: 'text',
        title: 'Card removal',
        body: [
          'Every card you see removes combos. With one ace on the board, AA drops from 6 combos to **3**, and AK from 16 to **12**.',
          'This is why a hand that blocks villain’s strongest holdings makes a better bluff.',
        ],
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
        question: 'The board is K72 with different suits and you hold no king. How many combos of KK can villain have?',
        choices: ['1', '3', '4', '6'],
        answer: 1,
        explain: 'Three kings are left, and any two of them make KK: 3 combos.',
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
        points: ['Pairs 6, suited 4, offsuit 12.', 'Visible cards remove combos.', 'Bluff with hands that block villain’s best hands.'],
      },
    ],
  },
  {
    key: 'foundations/math/outs',
    minutes: 4,
    cover: { kind: 'figure', text: '×4' },
    steps: [
      {
        kind: 'intro',
        title: 'Count outs, then multiply',
        body: 'An out is a card that makes you the best hand. Turning outs into a percentage takes one multiplication.',
      },
      {
        kind: 'formula',
        title: 'The rule of 2 and 4',
        formula: 'Equity ≈ outs × 4 on the flop, outs × 2 on the turn',
        example: 'Nine flush outs on the flop: 9 × 4 = 36%. The exact figure is **35%**.',
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
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Discount dirty outs',
        body: 'A card that also helps villain is not a clean out. A heart that pairs the board can complete your flush and give villain a full house.',
      },
      {
        kind: 'quiz',
        question: 'Open ended straight draw on the turn. Roughly how often do you hit on the river?',
        choices: ['8%', '17%', '25%', '32%'],
        answer: 1,
        explain: '8 outs × 2 = 16%. Exactly 8 of 46 cards: 17.4%.',
      },
      {
        kind: 'takeaway',
        points: ['Outs × 4 on the flop, × 2 on the turn.', 'Flush draw: 35% by the river, 20% on one card.', 'Only count outs that make you the best hand.'],
      },
    ],
  },
  {
    key: 'foundations/ranges/equity-realization',
    minutes: 3,
    cover: { kind: 'figure', text: 'IP' },
    steps: [
      {
        kind: 'intro',
        title: 'Equity you actually collect',
        body: 'Raw equity assumes every hand sees showdown. In real hands you fold some of it away. How much you keep is equity realization.',
      },
      {
        kind: 'text',
        title: 'Why position is worth so much',
        body: [
          'Acting last, you see what villain does before you decide. You can check back to take a free card and you can control the size of the pot.',
          'Out of position you face bets that force folds, so the same hand wins less often.',
        ],
      },
      {
        kind: 'hand',
        title: 'Playability matters',
        cards: 'Ts9s',
        caption: 'Suited, connected hands make straights, flushes and strong draws. They keep their equity on more boards than offsuit, disconnected hands.',
      },
      {
        kind: 'quiz',
        question: 'Which seat realizes the most equity after the flop?',
        choices: ['Small blind', 'Big blind', 'Button', 'UTG'],
        answer: 2,
        explain: 'The button acts last on every postflop street.',
      },
      {
        kind: 'takeaway',
        points: ['Position turns raw equity into won pots.', 'Suited and connected hands realize more.', 'Play tighter out of position.'],
      },
    ],
  },
  {
    key: 'preflop/rfi/rfi-ep',
    minutes: 5,
    cover: { kind: 'chart', chartId: '9max-100-rfi-utg' },
    practice: ['9max-100-rfi-utg', '9max-100-rfi-utgp1', '9max-100-rfi-utgp2', '9max-100-rfi-lj'],
    steps: [
      {
        kind: 'intro',
        title: 'Eight players behind you',
        body: 'From the first seats, anyone behind can wake up with a big hand, and you will often play the pot out of position. Ranges start tight and widen one seat at a time.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-utg',
        title: 'UTG opens about 11%',
        caption: 'Pairs from 66, strong aces and the best suited broadways. The split cells are mixes: 55, A5s and T9s open about half the time.',
        highlight: ['55', 'A5s', 'T9s'],
      },
      {
        kind: 'text',
        title: 'Learn the edges, not 169 cells',
        body: [
          'For each family, remember the weakest hand that opens: the lowest pair, the lowest suited ace, the lowest offsuit ace, the lowest suited king.',
          'UTG: **66+**, **A9s+**, **KTs+**, **AJo+** and **KQo**. Everything inside those edges opens.',
        ],
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-lj',
        title: 'By LJ, about 17%',
        caption: 'Three seats later every suited ace opens, almost every pair, and more suited connectors join.',
      },
      {
        kind: 'table',
        title: 'How the range grows',
        columns: ['Seat', 'Opens'],
        rows: [
          ['UTG', '11.5%'],
          ['UTG+1', '12.7%'],
          ['UTG+2', '15.2%'],
          ['LJ', '17.4%'],
        ],
        note: 'Starter charts, approximate. Solver exact charts will replace them.',
      },
      {
        kind: 'quiz',
        question: '9-handed, 100bb, folded to you UTG with KJo.',
        choices: ['Raise', 'Fold'],
        answer: 1,
        explain: 'UTG opens KQo but not KJo. Offsuit kings are dominated too often from early position.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the LJ with A3s.',
        choices: ['Raise', 'Fold'],
        answer: 0,
        explain: 'Every suited ace opens from the LJ: nut flush potential and the ace blocks strong hands.',
      },
      {
        kind: 'takeaway',
        points: ['Early position: tight and strong.', 'Memorize the weakest hand in each family.', 'Each seat later adds a few hands at the edges.'],
      },
    ],
  },
  {
    key: 'preflop/rfi/rfi-lp',
    minutes: 5,
    cover: { kind: 'chart', chartId: '9max-100-rfi-btn' },
    practice: ['9max-100-rfi-hj', '9max-100-rfi-co', '9max-100-rfi-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'The money seats',
        body: 'Late position wins the most because you act last after the flop. With fewer players left behind, you can open far wider.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-co',
        title: 'Cutoff, about 28%',
        caption: 'Every pair, every suited ace, suited kings from K5s, and offsuit broadways down to KTo, QTo and JTo.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-btn',
        title: 'Button, about 43%',
        caption: 'Any suited king, every offsuit ace, and offsuit hands down to K8o, Q9o, J9o and T9o.',
      },
      {
        kind: 'text',
        title: 'Why so wide',
        body: [
          'Only the blinds are left, and they will play the hand out of position.',
          'The 1.5bb already in the pot makes stealing profitable even when you are called sometimes.',
        ],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live adjustment',
        body: 'When the blinds call too often and rarely 3bet, keep opening wide but size up a little, and drop the weakest offsuit hands.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you on the button with K5s.',
        choices: ['Raise', 'Fold'],
        answer: 0,
        explain: 'The button opens every suited king.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the cutoff with Q7s.',
        choices: ['Raise', 'Fold'],
        answer: 1,
        explain: 'Suited queens open from Q8s in the cutoff. Q7s waits for the button.',
      },
      {
        kind: 'takeaway',
        points: ['CO about 28%, BTN about 43%.', 'Suited kings and offsuit aces carry late position ranges.', 'Steal more when the blinds play badly out of position.'],
      },
    ],
  },
  {
    key: 'preflop/rfi/rfi-sb',
    minutes: 4,
    cover: { kind: 'chart', chartId: '9max-100-rfi-sb' },
    practice: ['9max-100-rfi-sb'],
    steps: [
      {
        kind: 'intro',
        title: 'One player left, but no position',
        body: 'Only the big blind remains, so the small blind can open wide. But you will act first on every street after the flop.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-rfi-sb',
        title: 'Raise only, about 42%',
        caption: 'Solvers mix in limps from the small blind. Felt starts with a raise only strategy: simpler, and strong in live games where the big blind rarely raises a limp correctly.',
      },
      {
        kind: 'text',
        title: 'Size it up',
        body: ['Open to about 3bb instead of 2.5bb. Out of position you want to win more pots preflop and play smaller ranges after.'],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Against a sticky big blind',
        body: 'If the big blind defends almost anything, raise bigger with value hands and fold the weakest offsuit holdings.',
      },
      {
        kind: 'quiz',
        question: 'Folded to you in the small blind with Q4s.',
        choices: ['Raise', 'Fold'],
        answer: 0,
        explain: 'Suited queens open from Q4s in the small blind.',
      },
      {
        kind: 'takeaway',
        points: ['Small blind opens about 42%.', 'Raise to about 3bb.', 'Tighten up against players who never fold.'],
      },
    ],
  },
  {
    key: 'preflop/vs-open/bb-defense',
    minutes: 5,
    cover: { kind: 'chart', chartId: '9max-100-bb-vs-btn' },
    practice: ['9max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'You already paid',
        body: 'The big blind is half invested and closes the action, so it gets the best price at the table. That makes it the widest defending seat.',
      },
      {
        kind: 'formula',
        title: 'Your price against a 2.5bb open',
        formula: '1.5 ÷ 5.5 = 27%',
        parts: [
          ['Pot before you act', '0.5 + 1 + 2.5 = 4bb'],
          ['You call', '1.5bb more'],
        ],
        example: 'A hand with **27%** equity breaks even on the call. Most hands have that against a button range.',
      },
      {
        kind: 'chart',
        chartId: '9max-100-bb-vs-btn',
        title: 'Defend more than half',
        caption: 'Against a button open, 3bet about 10% and call about 46%. The split cells mix 3bets and calls.',
        highlight: ['A5s', 'A4s', 'K9s'],
      },
      {
        kind: 'text',
        title: 'Why 3bet some weaker hands',
        body: [
          'Hands like A5s and K9s make good 3bets: the ace or king blocks the button’s strongest hands, and they still play well when called.',
          'Your value 3bets come from the top: QQ+, AK, AQs, and part of JJ, TT and AQo.',
        ],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Rake changes this',
        body: 'Live rake takes a big share of small pots. With a high drop, trim the weakest calls from the bottom of the range.',
      },
      {
        kind: 'quiz',
        question: 'Big blind against a 2.5bb button open with J6s.',
        choices: ['3bet', 'Call', 'Fold'],
        answer: 1,
        explain: 'Suited jacks call down to J4s. J6s is not strong enough to 3bet.',
      },
      {
        kind: 'quiz',
        question: 'Big blind against a button open with A4s. What does the chart do?',
        choices: ['Always 3bet', 'Mix 3bet and call', 'Always call', 'Fold'],
        answer: 1,
        explain: 'A5s to A2s 3bet about 60% of the time and call the rest.',
      },
      {
        kind: 'takeaway',
        points: ['You need about 27% against a 2.5bb open.', 'Defend more than half your hands against the button.', 'Mix blocker hands like A5s into your 3bets.'],
      },
    ],
  },
  {
    key: 'exploit/profiling/population',
    minutes: 4,
    cover: { kind: 'figure', text: '1/3' },
    steps: [
      {
        kind: 'intro',
        title: 'Play the players in front of you',
        body: 'GTO is your default. But a live 1/3 table is far from equilibrium, and its mistakes are predictable.',
      },
      {
        kind: 'table',
        title: 'Typical live low stakes leaks',
        columns: ['Tendency', 'Your adjustment'],
        rows: [
          ['Limps and calls too much', 'Value bet thinner, bluff less'],
          ['Big river bets are mostly value', 'Fold more bluff catchers'],
          ['Large, inconsistent opens', 'Tighten flats, 3bet for value'],
          ['Rarely 3bets light', 'Open a little wider, respect 3bets'],
        ],
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Verify, then exploit',
        body: 'These are starting assumptions. Your logged hands will show what your own pool actually does.',
      },
      {
        kind: 'quiz',
        question: 'A passive regular raises big on the river. You hold top pair. Your default?',
        choices: ['Call, they might be bluffing', 'Fold more often than the math says', 'Shove'],
        answer: 1,
        explain: 'Passive players rarely turn hands into big river bluffs. Their raises are weighted heavily to value.',
      },
      {
        kind: 'takeaway',
        points: ['Start from GTO, then adjust.', 'Value bet thin against callers.', 'Respect big bets from passive players.'],
      },
    ],
  },
  {
    key: 'exploit/adjustments/live-limpers',
    minutes: 4,
    cover: { kind: 'chart', chartId: '9max-100-iso-btn-vs-1limp' },
    practice: ['9max-100-iso-btn-vs-1limp'],
    steps: [
      {
        kind: 'intro',
        title: 'A limp is a weak range',
        body: 'Players who limp rarely hold premium hands, because they would raise those. Raising them out of the pot is one of the best edges in live poker.',
      },
      {
        kind: 'text',
        title: 'How big to raise',
        body: ['Raise to about **4bb plus 1bb for each limper**. Against one limper from early position, about 5bb.'],
      },
      {
        kind: 'chart',
        chartId: '9max-100-iso-btn-vs-1limp',
        title: 'Button against one limper',
        caption: 'Raise about 19% for value and initiative. Overlimp about 8%: small pairs and suited connectors that want a cheap flop.',
      },
      {
        kind: 'text',
        title: 'Why it works',
        body: [
          'You get position, initiative and the dead money in the pot.',
          'Limpers fold often to the raise, and when they call they play a weak, capped range out of position.',
        ],
      },
      {
        kind: 'quiz',
        question: 'Button against one early limper with 44.',
        choices: ['Iso raise', 'Overlimp', 'Mix both', 'Fold'],
        answer: 2,
        explain: 'Small pairs split between raising and overlimping to set mine cheaply.',
      },
      {
        kind: 'quiz',
        question: 'Button against one early limper with ATo.',
        choices: ['Iso raise', 'Overlimp', 'Fold'],
        answer: 0,
        explain: 'ATo dominates much of a limping range and plays well heads up in position.',
      },
      {
        kind: 'takeaway',
        points: ['Raise limpers to about 4bb plus 1bb each.', 'Raise strong hands, overlimp small pairs and suited connectors.', 'Position and initiative are the edge.'],
      },
    ],
  },
];

export const LESSON_CONTENT: ReadonlyMap<string, LessonContent> = new Map(LESSONS.map((l) => [l.key, l]));

export function lessonKey(trackId: string, moduleId: string, lessonId: string): string {
  return `${trackId}/${moduleId}/${lessonId}`;
}
