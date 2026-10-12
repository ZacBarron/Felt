import type { LessonContent } from './types';

export const POSTFLOP_LESSONS: LessonContent[] = [
  {
    key: 'postflop/textures/texture-classes',
    level: 'core',
    minutes: 6,
    cover: { kind: 'cards', cards: 'Ks7d' },
    steps: [
      {
        kind: 'intro',
        title: 'Read the board before your hand',
        body: 'Thousands of flops collapse into a handful of families. Each family shifts equity and nut hands between the ranges in a predictable way, and that decides who bets, how often and how big.',
      },
      {
        kind: 'table',
        title: 'Flop families, BTN open vs BB call',
        columns: ['Family', 'Favors', 'C-bet'],
        rows: [
          ['High, dry: K♠7♦2♣', 'Raiser, strongly', 'Very often, small'],
          ['Broadway: K♥Q♦T♣', 'Raiser; nuts shared', 'Often, mixed sizes'],
          ['Paired: 8♠8♦3♣', 'Raiser, slightly', 'Very often, small'],
          ['Middling: 9♥8♥6♣', 'Close', 'Less often'],
          ['Low, connected: 7♥6♥5♣', 'Caller in nut hands', 'Check a lot'],
          ['Monotone: J♠8♠4♠', 'Close', 'Small, moderate'],
        ],
        note: 'Directional patterns from equilibrium solutions of single raised pots. Exact frequencies vary with ranges and rake.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why high boards favor the raiser',
        body: [
          'The preflop raiser has more of the big cards: AA, KK, AK and strong broadways. The big blind calls with more small and connected hands, and 3bets its strongest high card hands before the flop.',
          'So when the flop is high and disconnected, the raiser has more strong pairs and the caller has many hands that missed completely.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'Why low connected boards favor the caller',
        board: '7h6h5c',
        caption:
          'BB defends hands like 86s, 54s, 43s, 98o, 76o and every small pair. They make straights, sets and two pair here. BTN still has overpairs, but overpairs do not want to put in three big bets on this board.',
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Static and dynamic',
        body:
          'On a static board like K72 rainbow, the best hand on the flop is usually the best hand on the river, so a small bet does most of the work. On a dynamic board like 976 two tone, equities swing on every turn card, which pushes strategies toward bigger bets or more checks.',
      },
      {
        kind: 'quiz',
        question: 'BTN opens, BB calls. Which flop is worst for BTN?',
        choices: ['A♠ 8♦ 3♣', 'K♥ K♦ 4♣', '6♠ 5♠ 4♦'],
        answer: 2,
        explain: 'Low connected flops hit the big blind’s suited and offsuit connectors, small pairs and two pair combos. The raiser’s high card advantage barely matters.',
      },
      {
        kind: 'quiz',
        question: 'On a dry K72 rainbow flop, what size does the raiser tend to use?',
        choices: ['Small, about a third of the pot', 'Pot sized', 'Overbet'],
        answer: 0,
        explain: 'Range advantage with few nut hands for either player: a small bet with most of the range.',
      },
      {
        kind: 'takeaway',
        points: [
          'High, dry boards favor the raiser.',
          'Low, connected boards favor the caller.',
          'Static boards suit small bets; dynamic boards push toward bigger bets or checks.',
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
        body: 'In position as the preflop raiser you have the easiest job in poker. The question is not whether to bet, but which hands to bet and which to check back.',
      },
      {
        kind: 'text',
        title: 'Range bets on good boards',
        body: [
          'On flops that strongly favor you, like K72 rainbow or A83 rainbow, equilibrium strategies bet small with nearly the whole range.',
          'The bet is cheap, so it risks little with your weak hands. It denies equity to the many overcards and backdoor draws in the big blind’s range, and it gets value from weaker pairs that must call.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'What a small bet asks of the big blind',
        formula: 'Bet ⅓ pot: alpha 25%, MDF 75%',
        example: 'If BB folds more than **25%** to a third pot bet, any two cards profit as a bluff. BB must continue with three quarters of its range, much of which is weak.',
      },
      {
        kind: 'text',
        title: 'What checks back',
        body: [
          'On boards that favor you less, the strategy splits. Strong hands and good draws bet. Medium hands with showdown value, like second pair, often check: they win at showdown often but cannot stand a raise.',
          'Some strong hands check too, so your checking range can still win big pots when the turn brings a bet.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Middle pair: bet small or check',
        cards: 'Ts9s',
        board: 'Qd9c4h',
        caption: 'Against a small range bet, middle pair can bet for thin value and protection. When the strategy uses a bigger size, it checks: a big bet folds out worse and gets called by better, while checking keeps its showdown value.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Against a big blind who never check raises',
        body: 'If the big blind only calls or folds, bet thinner for value and protection: the risk that keeps medium hands checking is gone.',
      },
      {
        kind: 'quiz',
        question: 'BTN vs BB, flop A♠ 8♦ 3♣. What is the default BTN strategy?',
        choices: ['Bet small with most of the range', 'Check most of the range', 'Bet big with strong hands only'],
        answer: 0,
        explain: 'Ace high dry: BTN has more aces and more strong hands overall. Small, frequent bets.',
      },
      {
        kind: 'quiz',
        question: 'Facing a third pot c-bet, how often must the big blind fold before any bluff is profitable?',
        choices: ['More than 20%', 'More than 25%', 'More than 33%', 'More than 50%'],
        answer: 1,
        explain: 'Alpha = 0.33 ÷ 1.33 = 25%.',
      },
      {
        kind: 'takeaway',
        points: [
          'On favorable boards, bet small with almost everything.',
          'Elsewhere, bet strong hands and draws, check medium showdown hands.',
          'Keep some strong hands in your checks.',
        ],
      },
    ],
  },
  {
    key: 'postflop/cbet/sizing',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'figure', text: '⅓ ¾' },
    steps: [
      {
        kind: 'intro',
        title: 'Size follows the shape of your range',
        body: 'A bet size is a statement about which hands you hold. Small bets suit wide ranges with many medium hands. Big bets suit polarized ranges of strong hands and bluffs.',
      },
      {
        kind: 'table',
        title: 'Three size families',
        columns: ['Size', 'Range shape', 'Typical spots'],
        rows: [
          ['25 to 40%', 'Wide, linear', 'Range advantage, few nut hands, static boards'],
          ['60 to 80%', 'Polarizing', 'Dynamic boards, value that needs protection'],
          ['100%+', 'Polarized', 'Nut advantage against a capped range, turns and rivers'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why small works with a wide range',
        body: [
          'A small bet gets called by many worse hands, so medium hands can bet for value. It also needs few folds to work as a bluff.',
          'A big bet with a wide range would be called mostly by better hands and fold out the worse hands you want calls from.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why nut advantage means bigger',
        body: [
          'If you hold many more of the strongest hands than villain, big bets win more from their medium hands. They cannot raise, and they must call often enough to stop your bluffs.',
          'That is the logic behind turn and river overbets: when villain’s line has removed most of their nut hands, the bettor can size up with the nuts and the best bluffs.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Geometric sizing',
        formula: 'f = ((1 + 2 × stack ÷ pot)^(1/streets) − 1) ÷ 2',
        example:
          'Single raised pot, 100bb, pot 5.5 on the flop: **116%** per street gets stacks in by the river. In a 3bet pot at SPR 4: **54%**. Big polarized lines in deep pots naturally include overbets.',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'One size or two',
        body:
          'Solvers often use two sizes in the same spot. Simplified strategies with one size usually lose very little EV. Use one size on most flops, and add a second where the range clearly splits into strong and weak.',
      },
      {
        kind: 'quiz',
        question: 'Your turn range is nuts or busted draws, and villain’s range is capped at one pair. Best size family?',
        choices: ['25%', '50%', '125%'],
        answer: 2,
        explain: 'A polarized range against a capped range gets the most from large and overbet sizes.',
      },
      {
        kind: 'quiz',
        question: 'Pot 22.5bb in a 3bet pot, 89bb behind, three streets. The geometric size is closest to',
        choices: ['33%', '54%', '75%', '116%'],
        answer: 1,
        explain: '(1 + 2 × 89 ÷ 22.5) = 8.91. Its cube root is 2.07, minus 1, halved: 0.54.',
      },
      {
        kind: 'takeaway',
        points: [
          'Small with wide ranges, large with polarized ones.',
          'Nut advantage against a capped range is where overbets live.',
          'Geometric sizing is the natural size for a polarized line.',
        ],
      },
    ],
  },
  {
    key: 'postflop/defense/vs-cbet',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '20%' },
    steps: [
      {
        kind: 'intro',
        title: 'Defending the big blind after the flop',
        body: 'Out of position against a c-bet you need a plan for every hand: raise, call or fold. The price and your range’s shape decide which.',
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
        note: 'MDF is a river concept. On the flop the big blind may fold more than MDF when its range is weak, but not by much against small bets.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Which hands continue',
        body: [
          'Against a small bet, continue with any pair, most gutshots, overcards with a backdoor flush draw, and good backdoor combinations. Fold hands with no pair, no draw and no backdoors.',
          'Hands that need to realize equity over two more streets out of position need more than the bare price: a weak ace high with no backdoors often folds even at 20%.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Overcards with a backdoor',
        cards: 'QhJh',
        board: 'Ts6d2h',
        caption: 'Gutshot, two overcards and a backdoor flush draw. Plenty of equity to call a small bet, and plenty of good turns to continue on.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live c-bets are often honest',
        body: 'Many live players c-bet strong hands and check weak ones, especially multiway. Against them, fold more to big c-bets and float less. Against players who c-bet every flop, defend wider and check raise more.',
      },
      {
        kind: 'quiz',
        question: 'Facing a ½ pot c-bet, what equity do you need to call, ignoring later streets?',
        choices: ['20%', '25%', '33%', '50%'],
        answer: 1,
        explain: 'Call 0.5 into a final pot of 2: 25%.',
      },
      {
        kind: 'quiz',
        question: 'BB on T♠ 6♦ 2♥ facing a third pot bet. Which hand is the clearest fold?',
        choices: ['Q♥ J♥', '6♣ 5♣', 'Q♣ 8♦'],
        answer: 2,
        explain: 'Q8o has one overcard, no draw and no backdoor flush. QJ has a gutshot, two overcards and a backdoor flush; 65 has a pair.',
      },
      {
        kind: 'takeaway',
        points: [
          'Small bets demand wide defense: pairs, draws, good backdoors.',
          'Fold hands with no pair, no draw and no backdoors.',
          'Out of position, price your call against realized equity.',
        ],
      },
    ],
  },
  {
    key: 'postflop/defense/check-raise',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '8h4h' },
    steps: [
      {
        kind: 'intro',
        title: 'The big blind’s weapon',
        body: 'The check raise is how the big blind fights back against frequent small c-bets. It builds the pot with strong hands and makes semi bluffs pay.',
      },
      {
        kind: 'text',
        title: 'Where it lives',
        body: [
          'Check raises are most frequent where the big blind has the nut advantage: low and middling connected boards like 765 or 986, where it holds more sets, two pair and straights.',
          'On boards like K72 or A83 rainbow, the big blind check raises much less, because the raiser holds most of the strongest hands.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Which hands raise',
        body: [
          '**Value**: sets, two pair, straights, and on some boards strong top pairs that need protection.',
          '**Semi bluffs**: draws with real equity, best when they also have backdoors or overcards. Open enders, combo draws, gutshots with a flush draw.',
          'Hands with showdown value but little room to improve, like middle pair, usually call instead: raising folds out worse and gets called by better.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A textbook semi bluff',
        cards: '8h4h',
        board: '7h6c2h',
        caption: 'Flush draw plus gutshot: about **47%** equity against an overpair with both cards to come. If the raise does not win immediately, it wins often enough when called.',
      },
      {
        kind: 'formula',
        title: 'Size',
        formula: 'Raise to about 3 to 4 times the c-bet',
        example: 'Against a third pot bet of 2 into 6, a raise to about 7 or 8. Bigger raises suit dynamic boards where hands need protection; smaller ones suit static boards.',
      },
      {
        kind: 'quiz',
        question: 'BB on 9♥ 8♥ 6♣ facing a small c-bet. Which hand is the best check raise semi bluff?',
        choices: ['A♣ 2♦', 'J♥ T♥', 'K♦ 6♠'],
        answer: 1,
        explain: 'J♥T♥ has an open ended straight draw and a flush draw: huge equity and good turns. A2 has almost nothing; K6 is a weak pair that prefers to call.',
      },
      {
        kind: 'quiz',
        question: 'Why does the big blind check raise less on K♠7♦2♣ than on 7♥6♥5♣?',
        choices: ['K72 has more draws to semi bluff with', 'The raiser holds most of the strongest hands on K72', 'Check raises are only for monotone boards'],
        answer: 1,
        explain: 'Check raises lean on a nut advantage. On K72 the raiser has the sets of kings and the best top pairs; on 765 the big blind holds more straights, sets and two pair.',
      },
      {
        kind: 'takeaway',
        points: [
          'Check raise most where the big blind has the nut advantage.',
          'Value from sets and two pair; bluffs from strong draws.',
          'Medium showdown hands call instead.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/turn-cards',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'Ah' },
    steps: [
      {
        kind: 'intro',
        title: 'Every turn card moves the ranges',
        body: 'After a flop bet and call, both ranges are narrower. The turn card helps one of them more, and that decides whether the bettor keeps firing, and how big.',
      },
      {
        kind: 'table',
        title: 'Turn cards after BTN bets and BB calls',
        columns: ['Turn', 'Usually helps', 'Why'],
        rows: [
          ['A or K overcard', 'Bettor', 'BB 3bets AA, KK and AK preflop'],
          ['Completes a draw', 'Depends', 'Whoever kept more of that draw'],
          ['Low, connecting', 'Caller', 'BB holds more low connectors'],
          ['Pairs the board', 'Depends', 'Trips go to whoever has that rank'],
          ['Blank', 'Little change', 'Strong hands keep betting'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Equity, not just strength',
        body: [
          'Good barrels are hands that either beat what calls or have equity when called: strong pairs, sets, and draws that picked up more outs.',
          'Hands that neither beat a call nor improve much, like weak top pairs that become bluff catchers on scary turns, often check.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A turn ace on K72',
        board: 'Ks7d2cAh',
        caption: 'The button holds AK and AA far more often than the big blind, which 3bet most of them. The ace is a strong card to keep betting, with value and with bluffs that now hold an ace.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'BTN bets 7♥ 6♥ 2♣ and BB calls. The turn is the 5♦. Who does it help more?',
        choices: ['BTN', 'BB', 'Neither'],
        answer: 1,
        explain: 'The 5 completes straights for 84, 43 and 98 hands, and BB defends far more of those. BTN should slow down with many hands.',
      },
      {
        kind: 'quiz',
        question: 'BTN c-bets K♠7♦2♣ and BB calls. Which turn usually helps BTN most?',
        choices: ['6♣', 'A♥', '5♦'],
        answer: 1,
        explain: 'An ace is a high card that BTN holds far more often in strong combinations like AK and AA, which BB 3bets preflop. Low cards help the caller’s range.',
      },
      {
        kind: 'takeaway',
        points: [
          'High cards usually favor the preflop raiser.',
          'Low connecting cards favor the caller.',
          'Barrel hands that beat calls or have equity when called.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/bluff-selection',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '7h6h' },
    steps: [
      {
        kind: 'intro',
        title: 'Which hands should bluff',
        body: 'On the river, bluffs have no equity. All that separates a good bluff from a bad one is which hands it removes from villain’s range, and whether it could have won at showdown.',
      },
      {
        kind: 'text',
        title: 'Three rules',
        body: [
          '**No showdown value**: a hand that sometimes wins by checking should usually check.',
          '**Block calls**: holding cards that villain needs to call makes those calls less likely.',
          '**Unblock folds**: avoid holding cards that make up villain’s folding hands. If you hold their busted draws, they are more likely to have something that calls.',
        ],
        evidence: 'math',
      },
      {
        kind: 'board',
        title: 'The spot',
        board: 'Kc8h5h2s2d',
        caption: 'You barreled flop and turn with an open ended straight draw. The river missed. Villain check called twice with pairs and draws, including flush draws that just missed.',
      },
      {
        kind: 'hand',
        title: '7♥6♥ or 7♣6♣?',
        cards: '7h6h',
        board: 'Kc8h5h2s2d',
        caption:
          'Both are seven high with no showdown value. But 7♥6♥ holds two of villain’s hearts. Villain’s possible two heart combos drop from **55** to **36**: a third of their busted flush draws, which would have folded, are gone.',
      },
      {
        kind: 'table',
        title: 'Villain’s two heart combos',
        columns: ['You hold', 'Hearts left', 'Combos'],
        rows: [
          ['7♣ 6♣', '11', '55'],
          ['7♥ 6♥', '9', '36'],
        ],
        note: 'Combos of two hearts = hearts left × (hearts left − 1) ÷ 2. Two hearts are on the board.',
        evidence: 'math',
      },
      {
        kind: 'quiz',
        question: 'With 7♥6♥ in your hand, by how much do villain’s two heart combos shrink?',
        choices: ['About 10%', 'About 20%', 'About 35%', 'About 50%'],
        answer: 2,
        explain: 'From 55 to 36: 19 fewer, about 35%. Those were folding hands, so 7♣6♣ is the better bluff.',
      },
      {
        kind: 'quiz',
        question: 'Your river bluff has no showdown value and holds a card villain needs for many of their calls. That makes it',
        choices: ['A worse bluff', 'A better bluff', 'No different'],
        answer: 1,
        explain: 'Blocking calls makes a fold more likely. The best bluffs block calls and unblock folds.',
      },
      {
        kind: 'takeaway',
        points: [
          'Bluff with hands that cannot win at showdown.',
          'Prefer bluffs that block villain’s calls.',
          'Avoid bluffs that block villain’s folds.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/bluff-catching',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: 'QhQd' },
    steps: [
      {
        kind: 'intro',
        title: 'Which hands should call',
        body: 'A bluff catcher beats only bluffs. Among hands of similar strength, the best callers are the ones that remove villain’s value hands and leave the bluffs in.',
      },
      {
        kind: 'text',
        title: 'The mirror of bluff selection',
        body: [
          '**Block value**: cards that villain needs for their value bets make those bets less likely.',
          '**Unblock bluffs**: avoid holding the cards villain bluffs with.',
          'Against a balanced bettor, small blocker differences decide which bluff catchers call and which fold. Against an unbalanced one, the bluff frequency matters far more than blockers.',
        ],
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Q♥Q♦ or Q♠Q♣?',
        cards: 'QhQd',
        board: 'AhKh7c4h2s',
        caption: 'Villain bets big on a board with three hearts. Queens are a pure bluff catcher. Holding the **Q♥** removes a fifth of villain’s flushes.',
      },
      {
        kind: 'table',
        title: 'Villain’s flush combos',
        columns: ['You hold', 'Hearts left', 'Flush combos'],
        rows: [
          ['Q♠ Q♣', '10', '45'],
          ['Q♥ Q♦', '9', '36'],
        ],
        note: 'Three hearts on board; a flush needs two more in villain’s hand.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Blockers are a tiebreak, not a reason',
        body: 'Against a player who never bluffs big on the river, even the best blocker loses money. Decide first whether villain bluffs enough, then use blockers to pick which hands call.',
      },
      {
        kind: 'quiz',
        question: 'With Q♥Q♦, how many flush combos can villain have?',
        choices: ['28', '36', '45', '55'],
        answer: 1,
        explain: 'Nine hearts left: 9 × 8 ÷ 2 = 36.',
      },
      {
        kind: 'quiz',
        question: 'Facing a big river bet with two bluff catchers of equal strength: one blocks villain’s value hands, the other blocks villain’s likely bluffs. Which should call?',
        choices: ['The one that blocks bluffs', 'The one that blocks value'],
        answer: 1,
        explain: 'Removing value combos raises the share of bluffs in villain’s range, so the hand that blocks value calls.',
      },
      {
        kind: 'takeaway',
        points: [
          'Call with hands that block value.',
          'Avoid calling with hands that block bluffs.',
          'Bluff frequency first, blockers second.',
        ],
      },
    ],
  },
];
