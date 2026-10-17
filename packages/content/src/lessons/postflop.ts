import type { LessonContent } from './types';

export const POSTFLOP_LESSONS: LessonContent[] = [
  {
    key: 'postflop/textures/texture-classes',
    level: 'core',
    minutes: 6,
    cover: { kind: 'cards', cards: '', board: '7h6h5c' },
    steps: [
      {
        kind: 'intro',
        title: 'Read the board before your hand',
        body: 'Thousands of flops fall into a few families. Each family shifts equity and strong hands between the 2 ranges. That shift decides who should bet and what size to use.',
      },
      {
        kind: 'table',
        title: 'Flop families, BTN open vs BB call',
        columns: ['Family', 'Favors', 'C-bet'],
        rows: [
          ['High and dry: K♠7♦2♣', 'Raiser, strongly', 'Very often, small'],
          ['Broadway: K♥Q♦T♣', 'Raiser, but BB has strong hands too', 'Often, mixed sizes'],
          ['Paired: 8♠8♦3♣', 'Raiser, slightly', 'Very often, small'],
          ['Middling: 9♥8♥6♣', 'Close', 'Less often'],
          ['Low and connected: 7♥6♥5♣', 'Caller has more strong hands', 'Much less often'],
          ['Monotone: J♠8♠4♠', 'Close', 'Less often, small'],
        ],
        note: 'Typical solver patterns for single raised pots, not exact numbers. Real frequencies change with the ranges and the rake.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'Why high boards favor the raiser',
        board: 'Ks7d2c',
        caption:
          'The raiser has more big cards, like AA and AK. The big blind 3bets its best high card hands before the flop. So on K72 the raiser has more strong pairs. The caller has many hands that missed.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'Why low connected boards favor the caller',
        board: '7h6h5c',
        caption:
          'BB defends many hands that hit this flop hard. Hands like 84s and 43s make straights. 76o and 65s make two pair, and small pairs make sets. BTN has overpairs, but they rarely want to put in 3 big bets here.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'Static and dynamic',
        board: '9h7h6c',
        caption:
          'On a static board like K72 rainbow, the best hand on the flop usually stays best. On a dynamic board like this one, equities swing on every turn. Dry or wet does not set the size by itself. High dry boards get small, frequent bets. Low dry boards like 732 can take big bets with overpairs. Size follows thick value and the nut edge.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'BTN opens and BB calls. Which flop is worst for BTN?',
        choiceCards: ['KhKd4c', '6s5s4d', 'As8d3c'],
        choices: ['K♥ K♦ 4♣', '6♠ 5♠ 4♦', 'A♠ 8♦ 3♣'],
        answer: 1,
        explain:
          'Like the 765 board showed, low connected flops hit the big blind’s connectors and small pairs. BB makes more of the straights and two pair. Paired high boards like K♥K♦4♣ still favor BTN.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['QsQd5c', '7h6h5d', 'Ks9d4c'],
            choices: ['Q♠ Q♦ 5♣', '7♥ 6♥ 5♦', 'K♠ 9♦ 4♣'],
            answer: 1,
            explain: 'Like the 765 board showed, low connected flops hit the big blind’s connectors and small pairs. BB makes more of the straights and two pair. Paired high boards like Q♠Q♦5♣ still favor BTN.',
          },
          {
            choiceCards: ['Ac9d2h', 'JhJc3s', '8d7d6c'],
            choices: ['A♣ 9♦ 2♥', 'J♥ J♣ 3♠', '8♦ 7♦ 6♣'],
            answer: 2,
            explain: 'Like the 765 board showed, low connected flops hit the big blind’s connectors and small pairs. BB makes more of the straights and two pair. Paired high boards like J♥J♣3♠ still favor BTN.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'On a dry K72 rainbow flop, which c-bet size does the raiser tend to use?',
        board: 'Kd7s2h',
        choices: ['About 75% pot', 'About 125% pot', 'About 33% pot'],
        answer: 2,
        explain:
          'Like the table showed, high and dry boards get small bets very often. Few hands there are very strong. A 75% bet folds out the weak hands a small bet keeps in.',
        point: 0,
        shuffleSuits: true,
        variants: [
          {
            question: 'On a dry Q83 rainbow flop, which c-bet size does the raiser tend to use?',
            board: 'Qh8d3c',
          },
          {
            question: 'On a dry A72 rainbow flop, which c-bet size does the raiser tend to use?',
            board: 'Ad7s2h',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Which flop is dynamic, with equities that swing on many turns?',
        choiceCards: ['Kd7s2c', 'Th9h8c', 'AsAd4c'],
        choices: ['K♦ 7♠ 2♣', 'T♥ 9♥ 8♣', 'A♠ A♦ 4♣'],
        answer: 1,
        explain: 'Like the static and dynamic step showed, connected boards with a flush draw change on many turns. On K72 rainbow the best hand usually stays best. Neither fact sets the bet size alone. Size follows thick value and the nut edge.',
        point: 2,
        shuffleSuits: true,
        variants: [
          {
            choiceCards: ['Qs8d3c', 'AhAd6c', '9c8c7d'],
            choices: ['Q♠ 8♦ 3♣', 'A♥ A♦ 6♣', '9♣ 8♣ 7♦'],
            answer: 2,
            explain: 'Like the static and dynamic step showed, connected boards with a flush draw change on many turns. On Q83 rainbow the best hand usually stays best. Neither fact sets the bet size alone. Size follows thick value and the nut edge.',
          },
          {
            choiceCards: ['JdTd9s', 'Kc5h2d', '7s7h2c'],
            choices: ['J♦ T♦ 9♠', 'K♣ 5♥ 2♦', '7♠ 7♥ 2♣'],
            answer: 0,
            explain: 'Like the static and dynamic step showed, connected boards with a flush draw change on many turns. On K52 rainbow the best hand usually stays best. Neither fact sets the bet size alone. Size follows thick value and the nut edge.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'High, dry boards like K72 favor the raiser. It c-bets often and small.',
          'Low, connected boards like 765 favor the big blind caller.',
          'Dynamic boards swing on many turns. Size follows thick value and the nut edge, so low dry boards like 732 can take big bets.',
        ],
      },
    ],
  },
  {
    key: 'postflop/cbet/cbet-ip',
    level: 'core',
    minutes: 6,
    cover: { kind: 'cards', cards: 'AsQd' },
    steps: [
      {
        kind: 'intro',
        title: 'The button c-bet',
        body: 'A continuation bet (c-bet) is a flop bet by the preflop raiser. In position you are in a comfortable spot. The question is not whether to bet. It is which hands bet and which check back.',
      },
      {
        kind: 'board',
        title: 'Range bets on good boards',
        board: 'Kc7s2d',
        caption:
          'Some flops strongly favor you, like K72 rainbow. There, solvers often bet small with almost every hand. The small bet risks little with your weak hands. It denies equity to the big blind’s overcards and backdoor draws. It also gets value from weaker pairs.',
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'What a small bet asks of the big blind',
        formula: 'Alpha = bet ÷ (pot + bet) = ⅓ ÷ 1⅓ = 25%',
        parts: [
          ['alpha', 'how often a pure bluff needs folds to break even'],
          ['MDF', 'minimum defense frequency, the share BB must continue with'],
        ],
        example:
          'If BB folds more than **25%** to a third pot bet, any two cards profit as a bluff. So BB must continue with **75%** of its range. Much of that range is weak.',
      },
      {
        kind: 'visual',
        title: 'The big blind must defend 75%',
        art: { kind: 'ring', value: 0.75, label: 'MDF', caption: 'Facing a third pot bet' },
        caption: 'A third pot bet needs folds only **25%** of the time to profit as a bluff. So the big blind must continue with **75%** of its range.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What checks back',
        body: [
          'On boards that favor you less, the strategy splits. Strong hands and good draws bet.',
          'Medium hands with showdown value often check. They win at showdown often but cannot stand a raise. Second pair is a common example.',
          'Some strong hands check too. Then your checking range can still win big pots on later streets.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Middle pair: bet small or check',
        cards: 'Ts9s',
        board: 'Qd9c4h',
        caption:
          'When the strategy bets small with most hands, middle pair can bet for thin value and protection. When it uses a bigger size, middle pair checks. A big bet folds out worse hands and gets called by better ones.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'If the big blind never check raises',
        body: 'Some players only call or fold against c-bets. If your notes show that, bet thinner for value and protection. The raise that keeps medium hands checking is gone.',
      },
      {
        kind: 'quiz',
        question: 'BTN vs BB, flop A♠ 8♦ 3♣. What is the usual BTN strategy?',
        board: 'As8d3c',
        choices: ['Check most of the range', 'Bet big with most of the range', 'Bet big with strong hands only', 'Bet small with most of the range'],
        answer: 3,
        explain:
          'Like the K72 board showed, BTN bets small with almost everything on dry high flops. It has more aces and more strong hands here. Betting big with only strong hands folds out the weak hands you want calls from.',
        point: 0,
        shuffleSuits: true,
        variants: [
          {
            question: 'BTN vs BB, flop A♥ 7♣ 2♦. What is the usual BTN strategy?',
            board: 'Ah7c2d',
          },
          {
            question: 'BTN vs BB, flop K♦ 8♠ 3♥. What is the usual BTN strategy?',
            board: 'Kd8s3h',
            explain: 'Like the K72 board showed, BTN bets small with almost everything on dry high flops. It has more kings and more strong hands here. Betting big with only strong hands folds out the weak hands you want calls from.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Facing a third pot c-bet, how often must the big blind fold for a pure bluff to profit?',
        choices: ['More than 20%', 'More than 25%', 'More than 33%', 'More than 50%'],
        answer: 1,
        explain: 'Like the formula showed, alpha is bet ÷ (pot + bet). So ⅓ ÷ 1⅓ = 25%. The 20% figure is the equity BB needs to call, not the folds a bluff needs.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'On a flop that favors BTN less, which hand usually checks back?',
        choices: ['Second pair', 'A set', 'A flush draw'],
        answer: 0,
        explain: 'Like the check back step said, medium hands with showdown value often check. They win at showdown often but cannot stand a raise. Strong hands and good draws bet.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'On boards that favor you like K72, bet small with almost every hand.',
          'A third pot bet needs folds 25% of the time. So the big blind must defend 75%.',
          'On other boards, bet strong hands and draws. Check medium hands like second pair.',
        ],
      },
    ],
  },
  {
    key: 'postflop/cbet/sizing',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'curve',
      points: [
        [0.5, 13],
        [1, 22.1],
        [2, 35.5],
        [3, 45.6],
        [4, 54],
        [6, 67.6],
        [8, 78.6],
        [10, 87.9],
        [12, 96.2],
        [15, 107.1],
        [20, 122.4],
      ],
      xLabel: 'SPR',
      yLabel: 'Bet each street, % of pot',
      mark: [4, 54],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Size follows the shape of your range',
        body: 'A bet size says something about the hands you hold. Small bets suit wide ranges with many medium hands. Big bets suit polarized ranges of strong hands and bluffs.',
      },
      {
        kind: 'table',
        title: 'Three size families',
        columns: ['Size', 'Range shape', 'Typical spots'],
        rows: [
          ['25 to 40% pot', 'Wide and linear', 'High dry boards with a range advantage, and spots where value is thin'],
          ['60 to 80% pot', 'More polarized', 'Boards where value stays thick, like overpairs on 732'],
          ['100% pot or more', 'Polarized', 'Turns and rivers where you have the nut advantage'],
        ],
        note: 'Typical solver patterns, not exact rules. A wet board alone does not call for a big bet. The next lesson shows why.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Why small works with a wide range',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '⅓ pot bet', value: 25, tone: 'green' },
            { label: '¾ pot bet', value: 42.9, tone: 'red' },
          ],
        },
        caption:
          'Each bar is the folds a bluff needs at that size. A small bet needs few folds. It also gets called by many worse hands, so medium hands can bet for value. A big bet with a wide range gets called mostly by better hands.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Why nut advantage means bigger',
        art: {
          kind: 'tree',
          root: 'A big bet with more of the nuts',
          branches: [
            { label: 'Your nut hands', value: 'Win more', tone: 'green' },
            { label: 'Villain’s medium hands', value: 'Must call enough', tone: 'gray' },
            { label: 'Villain’s raises', value: 'Few strong hands', tone: 'gray' },
          ],
        },
        caption:
          'Big bets win more from villain’s medium hands. They cannot raise, and they must call often enough to stop your bluffs. That is the logic behind turn and river overbets. Villain’s line has removed most of their strongest hands.',
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Geometric sizing',
        formula: 'f = ((1 + 2 × stack ÷ pot)^(1/streets) − 1) ÷ 2',
        parts: [
          ['stack', 'effective stack behind'],
          ['pot', 'pot before the bet'],
          ['streets', 'bets left to make'],
        ],
        example:
          'In a single raised pot at 100bb, the flop pot is 5.5bb with 97.5bb behind. Bets of **116%** pot on each of 3 streets get the stacks in. In a 3bet pot of 22.5bb with 89bb behind, the size is **54%**. So deep polarized lines naturally include overbets.',
      },
      {
        kind: 'visual',
        title: 'Lower SPR, smaller bets',
        art: {
          kind: 'curve',
          points: [
            [0.5, 13],
            [1, 22.1],
            [2, 35.5],
            [3, 45.6],
            [4, 54],
            [6, 67.6],
            [8, 78.6],
            [10, 87.9],
            [12, 96.2],
            [15, 107.1],
            [20, 122.4],
          ],
          xLabel: 'SPR',
          yLabel: 'Bet each street, % of pot',
          mark: [4, 54],
        },
        caption: 'The geometric size over 3 streets for each SPR (stack to pot ratio). A 3bet pot near SPR 4 bets about **54%**. Above an SPR of 13, the size passes 100% of the pot.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'One size or two',
        body:
          'Solvers often use 2 sizes in the same spot. A simpler strategy with one size usually loses very little. Use one size on most flops. Add a second size where your range clearly splits into strong and weak.',
      },
      {
        kind: 'quiz',
        question: 'Your turn range is nut hands or busted draws. Villain’s range is capped at one pair. Which size fits best?',
        choices: ['50% pot', '125% pot', '33% pot'],
        answer: 1,
        explain:
          'Like the nut advantage tree showed, a polarized range against a capped range wins most with big sizes. Villain cannot raise. Their bluff catchers pay more each time they call.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'A 3bet pot has 22.5bb on the flop and 89bb behind. Which size per street gets stacks in over 3 streets?',
        choices: ['116%', '75%', '54%', '33%'],
        answer: 2,
        explain:
          'First, 1 + 2 × 89 ÷ 22.5 = 8.91. Its cube root is 2.07. Subtract 1 and halve it to get 0.54. The 116% size is for a single raised pot, where stacks are much deeper compared with the pot.',
        point: 1,
      },
      {
        kind: 'takeaway',
        points: [
          'Bet small with wide ranges. Bet big or overbet with nuts and bluffs against a capped range.',
          'Geometric sizing gets stacks in evenly. At SPR 4 over 3 streets it is about 54% pot.',
        ],
      },
    ],
  },
  {
    key: 'postflop/defense/vs-cbet',
    level: 'core',
    minutes: 6,
    cover: { kind: 'ring', value: 0.2, label: 'Equity to call', caption: 'Third pot c-bet' },
    steps: [
      {
        kind: 'intro',
        title: 'Defending the big blind after the flop',
        body: 'Out of position against a c-bet, you need a plan for every hand. The price and the shape of your range decide what each hand does.',
      },
      {
        kind: 'table',
        title: 'What each size costs you',
        columns: ['C-bet', 'Equity to call', 'MDF'],
        rows: [
          ['⅓ pot', '20.0%', '75.0%'],
          ['½ pot', '25.0%', '66.7%'],
          ['¾ pot', '30.0%', '57.1%'],
          ['Pot', '33.3%', '50.0%'],
        ],
        note: 'MDF (minimum defense frequency) is a river idea. On the flop, a weak range can fold a bit more than MDF. Against small bets it should not fold much more.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Which hands continue',
        art: {
          kind: 'tree',
          root: 'Facing a small c-bet',
          branches: [
            { label: 'Any pair', value: 'Continue', tone: 'green' },
            { label: 'Most gutshots', value: 'Continue', tone: 'green' },
            { label: 'Overcards with a backdoor flush draw', value: 'Continue', tone: 'green' },
            { label: 'Nothing now, little to draw to', value: 'Fold', tone: 'gray' },
          ],
        },
        caption:
          'Out of position you realize less of your equity. So the bare price is not enough. A weak high card hand with no backdoors often folds, even at 20%.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Overcards with backdoors',
        cards: 'QhJh',
        board: 'Ts6d2h',
        caption: 'You have 2 overcards plus backdoor flush and straight draws. That is plenty of equity to call a small bet. Many turns also give you a real draw to keep going.',
      },
      {
        kind: 'visual',
        title: 'Honest c-bets',
        art: {
          kind: 'tree',
          root: 'How does this player c-bet?',
          branches: [
            { label: 'Strong hands only', value: 'Fold more to big bets', tone: 'gray' },
            { label: 'Every flop', value: 'Defend wider, raise more', tone: 'green' },
          ],
        },
        caption: 'Some live players c-bet strong hands and check weak ones, especially multiway. Check your notes before you lean on either read.',
        evidence: 'exploit',
      },
      {
        kind: 'quiz',
        question: 'Facing a ½ pot c-bet, what equity do you need to call? Ignore later streets.',
        choices: ['17%', '20%', '25%', '33%'],
        answer: 2,
        explain: 'Like the table showed, you call 0.5 to win a final pot of 2. That is 25%. The 33% figure is the folds a half pot bluff needs, not your price to call.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'BB on T♠ 6♦ 2♥ faces a third pot bet. Which hand is the clearest fold?',
        board: 'Ts6d2h',
        choiceCards: ['Qc8d', 'QhJh', '6c5c'],
        choices: ['Q♣ 8♦', 'Q♥ J♥', '6♣ 5♣'],
        answer: 0,
        explain:
          'Like the tree showed, hands with nothing now and little to draw to fold. Q8o has one overcard and no backdoor flush draw. Q♥J♥ has 2 overcards plus backdoor draws. 6♣5♣ already has middle pair.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'BB on J♠ 7♦ 3♥ faces a third pot bet. Which hand is the clearest fold?',
            board: 'Js7d3h',
            choiceCards: ['Kc6d', 'QsTs', '7c6c'],
            choices: ['K♣ 6♦', 'Q♠ T♠', '7♣ 6♣'],
            explain: 'Like the tree showed, hands with nothing now and little to draw to fold. K6o has one overcard and no backdoor flush draw. Q♠T♠ has a backdoor flush draw. 7♣6♣ already has middle pair.',
          },
        ],
      },
      {
        kind: 'takeaway',
        points: [
          'Facing a ½ pot c-bet you need 25% equity. Facing ⅓ pot you need 20%.',
          'Against small bets, defend pairs and draws. Fold hands with nothing now and little to draw to.',
        ],
      },
    ],
  },
  {
    key: 'postflop/defense/check-raise',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '8h4h', board: '7h6c2h' },
    steps: [
      {
        kind: 'intro',
        title: 'The big blind’s weapon',
        body: 'The check raise is how the big blind fights back against frequent small c-bets. It builds the pot with strong hands. It also makes semi bluffs pay.',
      },
      {
        kind: 'board',
        title: 'Where it lives',
        board: '7c6h5h',
        caption:
          'Check raises are most common where the big blind has the nut advantage. Low and middling connected boards like this one are the main example. On boards like K72 or A83 rainbow, BB check raises much less. The raiser holds most of the strongest hands there.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Which hands raise',
        art: {
          kind: 'tree',
          root: 'Facing a small c-bet',
          branches: [
            { label: 'Sets and two pair', value: 'Raise for value', tone: 'red' },
            { label: 'Open enders, combo draws', value: 'Raise as a semi bluff', tone: 'red' },
            { label: 'Middle pair', value: 'Call', tone: 'green' },
          ],
        },
        caption:
          'On some boards, strong top pairs that need protection raise too. Hands with showdown value but little room to improve usually call. Raising them folds out worse and gets called by better.',
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A textbook semi bluff',
        cards: '8h4h',
        board: '7h6c2h',
        caption:
          'A flush draw plus a gutshot gives you 12 outs. Against Q♠Q♦ you have **48%** equity with 2 cards to come. When the raise does not win at once, the hand still does well when called.',
      },
      {
        kind: 'formula',
        title: 'Size',
        formula: 'Raise to about 3 to 4 times the c-bet',
        example: 'Facing a bet of 2bb into 6bb, raise to about 6bb to 8bb. Bigger raises suit hands that stay far ahead when called. Smaller ones keep in the weaker hands you beat.',
      },
      {
        kind: 'quiz',
        question: 'BB on 9♥ 8♥ 6♣ faces a small c-bet. Which hand is the best check raise semi bluff?',
        board: '9h8h6c',
        choiceCards: ['Ah2c', 'Kd6s', 'JhTh'],
        choices: ['A♥ 2♣', 'K♦ 6♠', 'J♥ T♥'],
        answer: 2,
        explain:
          'Like the tree showed, strong draws raise as semi bluffs. J♥T♥ has an open ender and a flush draw. A♥2♣ has only a backdoor flush draw. K♦6♠ is a weak pair that prefers to call.',
        point: 1,
        shuffleSuits: true,
        variants: [
          {
            question: 'BB on 8♠ 7♠ 3♦ faces a small c-bet. Which hand is the best check raise semi bluff?',
            board: '8s7s3d',
            choiceCards: ['Ad3c', '9s6s', 'KdJh'],
            choices: ['A♦ 3♣', '9♠ 6♠', 'K♦ J♥'],
            answer: 1,
            explain: 'Like the tree showed, strong draws raise as semi bluffs. 9♠6♠ has an open ender and a flush draw. A♦3♣ is a weak pair that prefers to call. K♦J♥ has only overcards.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'Why does the big blind check raise less on K♠7♦2♣ than on 7♥6♥5♣?',
        choices: ['BTN holds more of the strongest hands there', 'BB has more draws to raise with there', 'BTN c-bets less often on that board'],
        answer: 0,
        explain:
          'Check raises lean on a nut advantage. On K72, BTN has all the sets of kings and most of the best top pairs. BB 3bets KK and AK before the flop. On 765, BB holds more of the straights and two pair.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Check raise most where the big blind has the nut advantage, like 765.',
          'Raise sets, two pair and strong draws. Call with medium pairs that have showdown value.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/turn-cards',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'streets', active: 'turn' },
    steps: [
      {
        kind: 'intro',
        title: 'Every turn card moves the ranges',
        body: 'After a flop bet and call, both ranges are narrower. The turn card helps one of them more. That decides whether the bettor keeps firing, and how big.',
      },
      {
        kind: 'table',
        title: 'Turn cards after BTN bets and BB calls',
        columns: ['Turn', 'Usually helps', 'Why'],
        rows: [
          ['A or K overcard', 'Bettor', 'BB 3bets AA, KK and AK preflop'],
          ['Completes a draw', 'Depends', 'Whoever kept more of that draw'],
          ['Low and connecting', 'Caller', 'BB holds more low connected hands'],
          ['Pairs the board', 'Depends', 'Trips go to whoever has that rank'],
          ['Blank', 'Little change', 'Strong hands keep betting'],
        ],
        note: 'Typical solver patterns. An overcard here means a card higher than every flop card.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Equity, not just strength',
        art: {
          kind: 'tree',
          root: 'Barrel the turn?',
          branches: [
            { label: 'Strong pairs and sets', value: 'Bet for value', tone: 'red' },
            { label: 'Draws that picked up outs', value: 'Semi bluff', tone: 'red' },
            { label: 'Weak top pair, scary turn', value: 'Often check', tone: 'green' },
          ],
        },
        caption: 'Good barrels either beat the hands that call or have equity when called. Some hands do neither. They often check.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A turn ace on K72',
        board: 'Ks7d2cAh',
        caption:
          'BTN holds AK and AA far more often than BB, which 3bets most of them. So the ace is a good card to keep betting. BTN can bet its strong hands and bluff more, since BB rarely has a strong ace.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A low turn on K72',
        board: 'Ks7d2c6h',
        caption: 'A low card connects with the big blind’s calling range. Hands like 76 now hold two pair, and 65 holds a pair. So BTN slows down with more of its range.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'BTN bets 7♥ 6♥ 2♣ and BB calls. The turn is the 5♦. Who does it help more?',
        board: '7h6h2c5d',
        choices: ['BTN', 'BB', 'Both about equally'],
        answer: 1,
        explain: 'Like the turn table showed, low connecting cards help the caller. The 5 makes straights for hands like 84s and 43s. BB defends both, and BTN opens neither.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'BTN c-bets K♠7♦2♣ and BB calls. Which turn usually helps BTN most?',
        board: 'Ks7d2c',
        choiceCards: ['Ah', '6c', '5d'],
        choices: ['A♥', '6♣', '5♦'],
        answer: 0,
        explain: 'Like the turn ace step showed, BTN holds AK and AA far more often. BB 3bets them before the flop. Low cards like the 6 or 5 help BB’s connected hands more.',
        point: 0,
        shuffleSuits: true,
        variants: [
          {
            question: 'BTN c-bets Q♦7♣3♥ and BB calls. Which turn usually helps BTN most?',
            board: 'Qd7c3h',
            choiceCards: ['6s', 'Ks', '5c'],
            choices: ['6♠', 'K♠', '5♣'],
            answer: 1,
            explain: 'Like the turn ace step showed, high overcards favor BTN. It holds AK, KK and KQ far more often. Low cards like the 6 or 5 help BB’s connected hands more.',
          },
        ],
      },
      {
        kind: 'quiz',
        question: 'On the turn, which hand makes a good semi bluff barrel?',
        choices: ['A draw that just picked up outs', 'Weak top pair on a scary card', 'A hand with no pair and no draw'],
        answer: 0,
        explain: 'Like the barrel tree showed, good barrels beat calls or have equity when called. A draw that picked up outs has equity. The other two do neither, so they often check.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Overcard turns like an A or K usually favor the preflop raiser.',
          'Low connecting turns usually favor the big blind caller.',
          'Barrel hands that beat calls or have equity when called. Others often check.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/bluff-selection',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '7h6h', board: 'Kc8h5h2s2d' },
    steps: [
      {
        kind: 'intro',
        title: 'Which hands should bluff',
        body: 'On the river, a bluff has no equity. So 2 things decide a good bluff. It should have no chance to win at showdown. It should also remove the right cards from villain’s range.',
      },
      {
        kind: 'visual',
        title: 'Three rules',
        art: {
          kind: 'tree',
          root: 'A good river bluff',
          branches: [
            { label: 'No showdown value', value: 'Cannot win by checking', tone: 'brass' },
            { label: 'Blocks calls', value: 'Fewer calling hands', tone: 'brass' },
            { label: 'Unblocks folds', value: 'More folding hands', tone: 'brass' },
          ],
        },
        caption:
          'A hand that sometimes wins by checking should usually check. Holding cards villain needs to call makes those calls less likely. If you hold their busted draws, they more often have a hand that calls.',
      },
      {
        kind: 'board',
        title: 'The spot',
        board: 'Kc8h5h2s2d',
        caption: 'You bet the flop and turn with an open ended straight draw. The river missed. Villain called twice with pairs and draws. Their draws include flush draws that just missed.',
      },
      {
        kind: 'hand',
        title: '7♥6♥ or 7♣6♣?',
        cards: '7h6h',
        board: 'Kc8h5h2s2d',
        caption:
          'Both hands are 7 high with no showdown value. But 7♥6♥ holds 2 of the hearts villain needs. Villain’s two heart combos drop from **55** to **36**. About a third of their missed flush draws are gone, and those would have folded.',
      },
      {
        kind: 'table',
        title: 'Villain’s two heart combos',
        columns: ['You hold', 'Hearts left', 'Combos'],
        rows: [
          ['7♣ 6♣', '11', '55'],
          ['7♥ 6♥', '9', '36'],
        ],
        note: 'Combos of 2 hearts = hearts left × (hearts left − 1) ÷ 2. The board has 2 hearts.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'With 7♥6♥ in your hand, by how much do villain’s two heart combos shrink?',
        cards: '7h6h',
        board: 'Kc8h5h2s2d',
        choices: ['About 10%', 'About 20%', 'About 35%', 'About 50%'],
        answer: 2,
        explain: 'Like the combo table showed, they fall from 55 to 36. So 19 combos are gone, about 35%. Those were folding hands, so 7♣6♣ is the better bluff.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Your river bluff has no showdown value. It holds a card villain needs for many of their calls. How does that change the bluff?',
        choices: ['It makes the bluff better', 'It makes the bluff worse', 'It makes no difference'],
        answer: 0,
        explain: 'Like the 3 rules showed, blocking calls means villain holds fewer calling hands. So a fold is more likely. Blocking folds is what hurts a bluff.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Villain checks the river to you. You hold bottom pair, which sometimes wins at showdown. What usually fits?',
        choices: ['Check, since it can win at showdown', 'Bluff, since it is a weak hand', 'Bet big for value'],
        answer: 0,
        explain: 'Like the 3 rules showed, a good bluff has no showdown value. Bottom pair sometimes wins by checking. So it checks, and hands with nothing bluff instead.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Bluff with hands that cannot win at showdown. A hand that can win by checking should check.',
          'Prefer bluffs that block villain’s calls. Avoid bluffs that hold villain’s busted draws.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/bluff-catching',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'QhQd', board: 'AhKh7c4h2s' },
    steps: [
      {
        kind: 'intro',
        title: 'Which hands should call',
        body: 'A bluff catcher beats only bluffs. Among hands of similar strength, the best callers remove villain’s value hands. They also leave villain’s bluffs in.',
      },
      {
        kind: 'visual',
        title: 'The mirror of bluff selection',
        art: {
          kind: 'tree',
          root: 'A good bluff catcher',
          branches: [
            { label: 'Blocks value', value: 'Fewer value bets', tone: 'green' },
            { label: 'Unblocks bluffs', value: 'Bluffs stay in', tone: 'green' },
          ],
        },
        caption:
          'Against a balanced bettor, small blocker effects decide which bluff catchers call. Against an unbalanced one, how often they bluff matters far more.',
      },
      {
        kind: 'hand',
        title: 'Q♥Q♦ or Q♠Q♣?',
        cards: 'QhQd',
        board: 'AhKh7c4h2s',
        caption: 'Villain bets big on a board with 3 hearts. Queens are a pure bluff catcher here. Holding the **Q♥** removes a fifth of villain’s flushes.',
      },
      {
        kind: 'visual',
        title: 'Villain’s flush combos',
        art: {
          kind: 'bars',
          bars: [
            { label: 'You hold Q♠Q♣', value: 45, tone: 'red' },
            { label: 'You hold Q♥Q♦', value: 36, tone: 'green' },
          ],
        },
        caption: 'The board has 3 hearts, so a flush needs 2 more in villain’s hand. With no heart you leave 10 hearts and 10 × 9 ÷ 2 = 45 combos. The Q♥ leaves 9 hearts and 36 combos.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Blockers are a tiebreak, not a reason',
        body: 'Some players almost never bluff big on the river. Against them, even the best blocker loses money. First decide whether villain bluffs enough. Then use blockers to pick which hands call.',
      },
      {
        kind: 'quiz',
        question: 'With Q♥Q♦, how many flush combos can villain have?',
        cards: 'QhQd',
        board: 'AhKh7c4h2s',
        choices: ['21', '28', '36', '45'],
        answer: 2,
        explain: 'Like the bars showed, 9 cards of the flush suit are left. So 9 × 8 ÷ 2 = 36. You get 45 only when you hold none of that suit.',
        point: 1,
        shuffleSuits: true,
      },
      {
        kind: 'quiz',
        question: 'You face a big river bet with 2 bluff catchers of equal strength. One blocks value hands and one blocks likely bluffs. Which should call?',
        choices: ['The one that blocks bluffs', 'The one that blocks value', 'Either one, since they are equal'],
        answer: 1,
        explain:
          'Like the mirror tree showed, removing value combos raises the share of bluffs in villain’s range. So the hand that blocks value calls. Blocking bluffs makes calling worse.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Villain almost never bluffs big on the river. You hold the best blocker among your bluff catchers. What should you do?',
        choices: ['Fold', 'Call, since the blocker helps', 'Raise as a bluff'],
        answer: 0,
        explain: 'Like the callout said, blockers are only a tiebreak. Against a player who rarely bluffs, even the best blocker loses money. First decide whether villain bluffs enough.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Call with bluff catchers that block value and leave bluffs in.',
          'Count the blocked combos. With the Q♥, villain has 36 flushes instead of 45.',
          'First check how often villain bluffs. Use blockers second.',
        ],
      },
    ],
  },
];
