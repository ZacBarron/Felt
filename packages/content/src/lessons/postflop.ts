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
        kind: 'text',
        title: 'Why high boards favor the raiser',
        body: [
          'The preflop raiser has more big cards. Hands like AA and AK sit mostly in its range.',
          'The big blind calls with more small and connected hands. It 3bets its best high card hands before the flop.',
          'So on a high disconnected flop, the raiser has more strong pairs. The caller has many hands that missed.',
        ],
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
        kind: 'callout',
        tone: 'theory',
        title: 'Static and dynamic',
        body:
          'On a static board like K72 rainbow, the best hand on the flop usually stays best. So a small bet does most of the work. On a dynamic board like 976 two tone, equities swing on every turn. That pushes strategies toward bigger bets or more checks.',
      },
      {
        kind: 'quiz',
        question: 'BTN opens and BB calls. Which flop is worst for BTN?',
        choices: ['K♥ K♦ 4♣', '6♠ 5♠ 4♦', 'A♠ 8♦ 3♣'],
        answer: 1,
        explain:
          'Low connected flops hit the big blind’s connectors and small pairs. BB makes more of the straights and two pair here. K♥K♦4♣ looks scary, but paired high boards still favor BTN.',
      },
      {
        kind: 'quiz',
        question: 'On a dry K72 rainbow flop, which c-bet size does the raiser tend to use?',
        choices: ['About 75% pot', 'About 125% pot', 'About 33% pot'],
        answer: 2,
        explain:
          'BTN has the range advantage, but neither player has many very strong hands. A small bet with most of the range does the job. A 75% bet folds out the weak hands a small bet keeps in.',
      },
      {
        kind: 'takeaway',
        points: [
          'High, dry boards favor the raiser.',
          'Low, connected boards favor the caller.',
          'Static boards suit small bets.',
          'Dynamic boards push toward bigger bets or more checks.',
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
        body: 'In position as the preflop raiser, you are in a comfortable spot. The question is not whether to bet. It is which hands bet and which check back.',
      },
      {
        kind: 'text',
        title: 'Range bets on good boards',
        body: [
          'Some flops strongly favor you, like K72 or A83 rainbow. There, solvers often bet small with almost every hand.',
          'The small bet risks little with your weak hands. It denies equity to the big blind’s overcards and backdoor draws.',
          'It also gets value from weaker pairs that have to call.',
        ],
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
        choices: ['Check most of the range', 'Bet big with most of the range', 'Bet big with strong hands only', 'Bet small with most of the range'],
        answer: 3,
        explain:
          'On a dry ace high flop, BTN has more aces and more strong hands. Small, frequent bets win the most. Betting big with only strong hands folds out the weak hands you want calls from.',
      },
      {
        kind: 'quiz',
        question: 'Facing a third pot c-bet, how often must the big blind fold for a pure bluff to profit?',
        choices: ['More than 20%', 'More than 25%', 'More than 33%', 'More than 50%'],
        answer: 1,
        explain: 'Alpha is bet ÷ (pot + bet), so ⅓ ÷ 1⅓ = 25%. The 20% figure is the equity BB needs to call, not the folds a bluff needs.',
      },
      {
        kind: 'takeaway',
        points: [
          'On boards that favor you, bet small with almost everything.',
          'Elsewhere, bet strong hands and draws.',
          'Check medium hands that have showdown value.',
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
        body: 'A bet size says something about the hands you hold. Small bets suit wide ranges with many medium hands. Big bets suit polarized ranges of strong hands and bluffs.',
      },
      {
        kind: 'table',
        title: 'Three size families',
        columns: ['Size', 'Range shape', 'Typical spots'],
        rows: [
          ['25 to 40% pot', 'Wide and linear', 'Static boards where you have the range advantage'],
          ['60 to 80% pot', 'More polarized', 'Dynamic boards where value needs protection'],
          ['100% pot or more', 'Polarized', 'Turns and rivers where you have the nut advantage'],
        ],
        note: 'Typical solver patterns, not exact rules.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Why small works with a wide range',
        body: [
          'A small bet gets called by many worse hands. So medium hands can bet for value. It also needs few folds to work as a bluff.',
          'A big bet with a wide range gets called mostly by better hands. It folds out the worse hands you want calls from.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why nut advantage means bigger',
        body: [
          'Say you hold many more of the strongest hands than villain. Big bets then win more from their medium hands. They cannot raise, and they must call often enough to stop your bluffs.',
          'That is the logic behind turn and river overbets. Villain’s line has removed most of their strongest hands. So the bettor can size up with the nuts and the best bluffs.',
        ],
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
          'A polarized range against a capped range wins most with big sizes. Villain cannot raise, and their bluff catchers pay more each time they call. A 50% bet lets those bluff catchers call too cheaply.',
      },
      {
        kind: 'quiz',
        question: 'A 3bet pot has 22.5bb on the flop and 89bb behind. Which size per street gets stacks in over 3 streets?',
        choices: ['116%', '75%', '54%', '33%'],
        answer: 2,
        explain:
          'First, 1 + 2 × 89 ÷ 22.5 = 8.91. Its cube root is 2.07. Subtract 1 and halve it to get 0.54. The 116% size is for a single raised pot, where stacks are much deeper compared with the pot.',
      },
      {
        kind: 'takeaway',
        points: [
          'Bet small with wide ranges and big with polarized ones.',
          'Overbets belong where you have the nut advantage against a capped range.',
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
        kind: 'text',
        title: 'Which hands continue',
        body: [
          'Against a small bet, continue with any pair and most gutshots. Also continue with overcards that have a backdoor flush draw.',
          'Fold hands that have nothing now and little to draw to.',
          'Out of position, you realize less of your equity. So the bare price is not enough. A weak high card hand with no backdoors often folds, even at 20%.',
        ],
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
        kind: 'callout',
        tone: 'exploit',
        title: 'Honest c-bets',
        body: 'Some live players c-bet strong hands and check weak ones, especially multiway. If your notes show that, fold more to their big c-bets. Against players who c-bet every flop, defend wider and check raise more.',
      },
      {
        kind: 'quiz',
        question: 'Facing a ½ pot c-bet, what equity do you need to call? Ignore later streets.',
        choices: ['17%', '20%', '25%', '33%'],
        answer: 2,
        explain: 'You call 0.5 to win a final pot of 2, which is 25%. The 33% figure is the folds a half pot bluff needs, not your price to call.',
      },
      {
        kind: 'quiz',
        question: 'BB on T♠ 6♦ 2♥ faces a third pot bet. Which hand is the clearest fold?',
        choices: ['Q♣ 8♦', 'Q♥ J♥', '6♣ 5♣'],
        answer: 0,
        explain:
          'Q8o has one overcard and no backdoor flush draw. Q♥J♥ looks similar but has 2 overcards plus backdoor flush and straight draws. 6♣5♣ already has middle pair.',
      },
      {
        kind: 'takeaway',
        points: [
          'Small bets call for wide defense with pairs and draws.',
          'Fold hands with nothing now and little to draw to.',
          'Out of position, weigh the price against the equity you will realize.',
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
        body: 'The check raise is how the big blind fights back against frequent small c-bets. It builds the pot with strong hands. It also makes semi bluffs pay.',
      },
      {
        kind: 'text',
        title: 'Where it lives',
        body: [
          'Check raises are most common where the big blind has the nut advantage. That means low and middling connected boards like 765 or 986. There BB holds more of the strongest hands.',
          'On boards like K72 or A83 rainbow, BB check raises much less. The raiser holds most of the strongest hands there.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Which hands raise',
        body: [
          '**Value** comes from the strongest hands, like sets and two pair. On some boards, strong top pairs that need protection raise too.',
          '**Semi bluffs** are draws with real equity. Open enders and combo draws are best, like a gutshot with a flush draw.',
          'Hands with showdown value but little room to improve usually call instead. Middle pair is an example. Raising it folds out worse and gets called by better.',
        ],
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
        example: 'Facing a bet of 2bb into 6bb, raise to about 6bb to 8bb. Bigger raises suit dynamic boards where hands need protection. Smaller ones suit static boards.',
      },
      {
        kind: 'quiz',
        question: 'BB on 9♥ 8♥ 6♣ faces a small c-bet. Which hand is the best check raise semi bluff?',
        choices: ['A♥ 2♣', 'K♦ 6♠', 'J♥ T♥'],
        answer: 2,
        explain:
          'J♥T♥ has an open ender and a flush draw. That is a lot of equity with many good turns. A♥2♣ has only a backdoor flush draw. K♦6♠ is a weak pair that prefers to call.',
      },
      {
        kind: 'quiz',
        question: 'Why does the big blind check raise less on K♠7♦2♣ than on 7♥6♥5♣?',
        choices: ['BTN holds more of the strongest hands there', 'BB has more draws to raise with there', 'BTN c-bets less often on that board'],
        answer: 0,
        explain:
          'Check raises lean on a nut advantage. On K72, BTN has all the sets of kings and most of the best top pairs. BB 3bets KK and AK before the flop. On 765, BB holds more of the straights and two pair.',
      },
      {
        kind: 'takeaway',
        points: [
          'Check raise most where the big blind has the nut advantage.',
          'Raise sets and two pair for value.',
          'Semi bluff with strong draws.',
          'Call with medium hands that have showdown value.',
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
        kind: 'text',
        title: 'Equity, not just strength',
        body: [
          'Good barrels either beat the hands that call or have equity when called.',
          'Strong pairs and sets barrel for value. Draws that picked up outs barrel as semi bluffs.',
          'Some hands neither beat a call nor improve much. Weak top pairs on scary turns are an example. They often check.',
        ],
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
        kind: 'quiz',
        question: 'BTN bets 7♥ 6♥ 2♣ and BB calls. The turn is the 5♦. Who does it help more?',
        choices: ['BTN', 'BB', 'Both about equally'],
        answer: 1,
        explain: 'The 5 makes straights for hands like 84s and 43s. BTN opens neither, but BB defends both. So BTN should slow down with many hands.',
      },
      {
        kind: 'quiz',
        question: 'BTN c-bets K♠7♦2♣ and BB calls. Which turn usually helps BTN most?',
        choices: ['A♥', '6♣', '5♦'],
        answer: 0,
        explain: 'BTN holds AK and AA far more often, since BB 3bets them before the flop. Low cards like the 6 or 5 help BB’s connected hands more.',
      },
      {
        kind: 'takeaway',
        points: [
          'High cards usually favor the preflop raiser.',
          'Low connecting cards usually favor the caller.',
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
        body: 'On the river, a bluff has no equity. So 2 things decide a good bluff. It should have no chance to win at showdown. It should also remove the right cards from villain’s range.',
      },
      {
        kind: 'text',
        title: 'Three rules',
        body: [
          '**No showdown value.** A hand that sometimes wins by checking should usually check.',
          '**Block calls.** Holding cards villain needs to call makes those calls less likely.',
          '**Unblock folds.** Avoid holding the cards in villain’s folding hands. If you hold their busted draws, they more often have a hand that calls.',
        ],
        evidence: 'math',
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
        choices: ['About 10%', 'About 20%', 'About 35%', 'About 50%'],
        answer: 2,
        explain: 'They fall from 55 to 36, so 19 combos are gone. That is 19 ÷ 55, or about 35%. Those were folding hands, so 7♣6♣ is the better bluff.',
      },
      {
        kind: 'quiz',
        question: 'Your river bluff has no showdown value. It holds a card villain needs for many of their calls. How does that change the bluff?',
        choices: ['It makes the bluff better', 'It makes the bluff worse', 'It makes no difference'],
        answer: 0,
        explain: 'Blocking calls means villain holds fewer calling hands. So a fold is more likely. Blocking folds is what hurts a bluff.',
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
        body: 'A bluff catcher beats only bluffs. Among hands of similar strength, the best callers remove villain’s value hands. They also leave villain’s bluffs in.',
      },
      {
        kind: 'text',
        title: 'The mirror of bluff selection',
        body: [
          '**Block value.** Cards villain needs for value bets make those bets less likely.',
          '**Unblock bluffs.** Avoid holding the cards villain bluffs with.',
          'Against a balanced bettor, small blocker effects decide which bluff catchers call. Against an unbalanced one, how often they bluff matters far more.',
        ],
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'Q♥Q♦ or Q♠Q♣?',
        cards: 'QhQd',
        board: 'AhKh7c4h2s',
        caption: 'Villain bets big on a board with 3 hearts. Queens are a pure bluff catcher here. Holding the **Q♥** removes a fifth of villain’s flushes.',
      },
      {
        kind: 'table',
        title: 'Villain’s flush combos',
        columns: ['You hold', 'Hearts left', 'Flush combos'],
        rows: [
          ['Q♠ Q♣', '10', '45'],
          ['Q♥ Q♦', '9', '36'],
        ],
        note: 'The board has 3 hearts. A flush needs 2 more in villain’s hand.',
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
        choices: ['21', '28', '36', '45'],
        answer: 2,
        explain: 'Nine hearts are left, so 9 × 8 ÷ 2 = 36. You get 45 only when you hold no heart.',
      },
      {
        kind: 'quiz',
        question: 'You face a big river bet with 2 bluff catchers of equal strength. One blocks value hands and one blocks likely bluffs. Which should call?',
        choices: ['The one that blocks bluffs', 'The one that blocks value', 'Either one, since they are equal'],
        answer: 1,
        explain:
          'Removing value combos raises the share of bluffs in villain’s range. So the hand that blocks value calls. Blocking bluffs does the opposite and makes calling worse.',
      },
      {
        kind: 'takeaway',
        points: [
          'Call with hands that block value.',
          'Avoid calling with hands that block bluffs.',
          'Check how often villain bluffs first. Use blockers second.',
        ],
      },
    ],
  },
];
