import type { LessonContent } from './types';

export const POSTFLOP_MORE_LESSONS: LessonContent[] = [
  {
    key: 'postflop/textures/who-it-favors',
    level: 'advanced',
    minutes: 7,
    cover: { kind: 'figure', text: '58%' },
    practice: ['9max-100-rfi-btn', '9max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'Count before you bet',
        body: 'Saying a board favors the raiser is a claim about 2 ranges. You can check it. First ask which range has more equity. Then ask which has more of the hands that win big pots.',
      },
      {
        kind: 'text',
        title: 'Two kinds of advantage',
        body: [
          '**Range advantage** means your whole range has more equity than theirs.',
          '**Nut advantage** means you hold more of the strongest hands, like sets and straights.',
          'The 2 often point the same way, but not always. Range advantage mostly sets how often you bet. Nut advantage mostly sets how big you can bet.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'What each range holds',
        body: [
          'In Felt’s charts, BTN opens every ace and most big cards. It folds its weakest offsuit hands.',
          'BB 3bets AA to QQ and AK. It calls with many small connected hands, suited and offsuit.',
          'So BTN usually has more top pairs and overpairs on high boards. BB has more low and middle cards. Those make two pair and straights on low connected boards.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Equity and strong hands, BTN vs BB',
        columns: ['Flop', 'BTN equity', 'BTN strong', 'BB strong'],
        rows: [
          ['A♠8♦3♣', '56.6%', '5.5%', '3.7%'],
          ['Q♥J♦T♣', '57.7%', '16.0%', '10.0%'],
          ['8♠8♦3♣', '53.3%', '7.1%', '11.0%'],
          ['9♥8♥6♣', '51.5%', '5.4%', '5.2%'],
          ['7♥6♥5♣', '48.1%', '5.0%', '9.6%'],
        ],
        note:
          'Computed exactly with Felt’s core over every turn and river. BTN uses its opening chart. BB uses its calling chart, with 3bets removed. These starter charts are approximations. Strong means two pair or better. On 8♠8♦3♣ every pocket pair makes two pair, so there it means trips or better. Equity here is raw equity, before position.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Top pair or better',
        columns: ['Flop', 'BTN', 'BB'],
        rows: [
          ['A♠8♦3♣', '30.1%', '19.2%'],
          ['Q♥J♦T♣', '28.8%', '19.6%'],
          ['9♥8♥6♣', '23.8%', '16.8%'],
          ['7♥6♥5♣', '18.8%', '23.8%'],
          ['8♠8♦3♣ (overpair or trips)', '14.1%', '13.4%'],
        ],
        note: 'Same ranges and method. This counts top pair and overpairs. It also counts two pair or better.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Reading the numbers',
        body: [
          'A♠8♦3♣ and Q♥J♦T♣ favor BTN on every count. On Q♥J♦T♣, BTN has more straights. That is largely because BB 3bets AK instead of calling.',
          'On 8♠8♦3♣ the counts split. BTN has more equity and more overpairs, **6.9%** to **2.4%**. But BB holds more trips or better, **11.0%** to **7.1%**. It defends more hands with an eight.',
          '9♥8♥6♣ is close to even. On 7♥6♥5♣, BB leads on every count.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'From counts to strategy',
        body: [
          'On boards like A83, the raiser leads on both counts. Neither side has many strong hands. There small, frequent bets are the norm.',
          'On boards like 765, the caller holds more strong hands. The raiser checks much more, and BB check raises more.',
          'On paired boards like 883, the raiser’s equity edge still supports frequent small bets. Big bets run into the caller’s extra trips.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'With Felt’s charts, BTN opens and BB calls. On 8♠8♦3♣, who holds more trips or better?',
        choices: ['BTN, because it has more equity', 'BB, because it defends more eights', 'Both hold about the same'],
        answer: 1,
        explain:
          'BB holds 11.0% trips or better against BTN’s 7.1%. That is true even though BTN has more equity and more overpairs. Range advantage and nut advantage can point different ways.',
      },
      {
        kind: 'quiz',
        question: 'On which flop does the BB calling range have more raw equity than the BTN opening range?',
        choices: ['7♥6♥5♣', '8♠8♦3♣', 'Q♥J♦T♣', 'A♠8♦3♣'],
        answer: 0,
        explain:
          'On 7♥6♥5♣, BTN has 48.1% equity. So BB has 51.9%. Low connected cards hit BB’s small connected hands and pairs. On 8♠8♦3♣, BB has more trips. But BTN still has 53.3% equity.',
      },
      {
        kind: 'takeaway',
        points: [
          'Range advantage sets how often you bet.',
          'Nut advantage sets how big you bet.',
          'High boards favor the raiser, and low connected boards favor the caller.',
          'Paired boards can split. The raiser has the equity, but the caller can have more trips.',
          'These are raw equities. Position changes how much each side realizes.',
        ],
      },
    ],
  },
  {
    key: 'postflop/cbet/cbet-oop',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'figure', text: 'OOP' },
    practice: ['9max-100-rfi-co'],
    steps: [
      {
        kind: 'intro',
        title: 'Raising first, acting first',
        body: 'You open the cutoff and the button calls. Or you 3bet from the blinds and get called. Now you have the stronger range but act first on every street. That changes how often you bet.',
      },
      {
        kind: 'text',
        title: 'Why you bet less often',
        body: [
          'Out of position, you realize less of your equity. The caller realizes more of theirs.',
          'Medium hands that bet can face a raise and lose value. So they prefer to check.',
          'A button that flats a cutoff open has 3bet many of its best hands. It has also folded its worst. So its calling range is mostly medium strength.',
          'It holds fewer trash hands than a big blind defending against the button. Fewer of its hands fold to any bet.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'In position vs out of position',
        columns: ['Topic', 'Raiser in position', 'Raiser out of position'],
        rows: [
          ['Bet frequency', 'Higher', 'Lower'],
          ['Range bets', 'Common on good boards', 'Rarer'],
          ['Medium hands', 'Often bet thin', 'Check more'],
          ['Checking range', 'Mostly weak and medium', 'Keeps more strong hands'],
        ],
        note: 'Typical solver patterns for single raised pots. Exact frequencies change with the ranges and the board.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Protect your checks',
        body: [
          'Say you bet every strong hand and check only weak ones. Then the caller can bet every time you check. You will have to fold too often.',
          'So solver strategies out of position check some strong hands, like sets and good top pairs. Those hands can check raise or check call. That makes betting behind your check costly.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Choosing a size',
        body: [
          'Some boards keep a big range advantage for you, like dry ace or king high flops. There, small bets with a wide range still work out of position.',
          'On middling and connected boards, you bet less often. Those bets lean toward strong hands and good draws, often with a bigger size.',
          'As the 3bettor out of position, your range advantage over the caller is large. So you c-bet more often than as a single raiser. On high boards the bet is often small.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Second pair often checks',
        cards: '9s9d',
        board: 'Qh7c4d',
        caption:
          'The cutoff opens and the button calls. 99 has good showdown value but hates a raise. Out of position it often checks and plans to call a bet. Betting thin runs into a range with many queens.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Against players who always stab',
        body: 'Some players bet whenever the raiser checks. If your notes show this, check more strong hands. Then check raise or check call. Against players who check back too much, bet more thin value and protection hands yourself.',
      },
      {
        kind: 'quiz',
        question: 'CO opens and BTN calls. Compared with BTN c-betting against BB, how often does CO usually c-bet?',
        choices: ['Less often, since it acts first', 'More often, since its range is stronger', 'Just as often, with a different size'],
        answer: 0,
        explain:
          'Out of position you realize less equity. The button’s calling range is also condensed, with few hands that fold to any bet. Both push toward more checking. A stronger range alone does not make up for acting first.',
      },
      {
        kind: 'quiz',
        question: 'Why does the out of position raiser check some sets on the flop?',
        choices: ['Because sets lose value when they bet', 'To protect its checking range', 'To keep the pot small for the river'],
        answer: 1,
        explain:
          'Strong hands in your checks let you check raise or check call. Without them, the caller can bet every time you check. Sets do not lose value by betting. Checking some of them keeps your checks hard to attack.',
      },
      {
        kind: 'takeaway',
        points: [
          'Out of position, c-bet less often.',
          'Check more medium hands.',
          'Keep some strong hands in your checking range.',
          'Small bets still work on boards with a big range advantage, especially as the 3bettor.',
        ],
      },
    ],
  },
  {
    key: 'postflop/defense/probe',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '8h' },
    practice: ['9max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'When the raiser checks back',
        body: 'BTN opens and BB calls. BB checks the flop, and BTN checks behind. If BB bets the turn, that bet is a probe. It attacks a range that has just told you something.',
      },
      {
        kind: 'text',
        title: 'The check back is capped',
        body: [
          'In position, the raiser bets most of its strongest hands on the flop. Its checks are mostly medium and weak hands. Only some strong hands stay back.',
          'How capped it is depends on the board. Where BTN bets small with almost everything, its checks are very weak. Where BTN checks a lot, its checks keep more strength.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Probe often, and with many hands',
        body: [
          'Against a capped range, BB probes the turn often. Sizes run from medium to large. Large bets show up on the turns that help BB most.',
          'A checked back range has fewer hands that can stand a bet. So BB’s value bets get called by worse, and its bluffs get more folds.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Which BB hands probe',
        columns: ['Hand', 'Usually', 'Why'],
        rows: [
          ['Sets, turned two pair', 'Probe', 'Few better hands left'],
          ['Top or middle pair', 'Probe', 'Value and protection against a capped range'],
          ['Straight and flush draws', 'Probe', 'Equity plus fold equity'],
          ['Bottom pair, ace high', 'Check', 'Showdown value, little to gain'],
          ['Air with no draw', 'Mixed', 'Some bluffs, many give ups'],
        ],
        note: 'Typical solver patterns, not exact frequencies.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A probe spot',
        board: 'Qs7d3c8h',
        caption:
          'On this flop, BTN bets most of its queens and sets. Its check back holds more small pairs and ace high hands. BB can probe its sevens and eights for value. Draws like T9 and 65 probe too, since the 8 gave them open enders.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Delayed c-bets',
        body: [
          'Say BB checks the turn again. BTN can bet now, which is a delayed c-bet. After 2 checks BB’s range is weak too, since it probes with much of its strength.',
          'The delayed c-bet range holds hands that checked the flop to trap or for showdown. It also holds hands that improved, plus draws.',
          'Out of position raisers do the same. They check the flop and bet the turn after the caller checks back.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Know who checks back',
        body: 'Some live players check back strong hands on dry flops to trap. Against them, the check back is not capped. Probe with value and fewer bluffs. Other players bet every good hand and check every hand they give up on. Against them, probe often. Use your notes to tell which type you face.',
      },
      {
        kind: 'quiz',
        question: 'BTN checks back the flop. Why can BB probe the turn with a wide range?',
        choices: ['BB gains equity on every turn card', 'BB wins more pots by betting first', 'BTN’s range is capped after it checks'],
        answer: 2,
        explain:
          'BTN bets most of its strong hands on the flop. Its check back cannot defend well against bets. So BB’s value bets get paid by weaker hands, and its bluffs get folds. Many turn cards do not help BB at all.',
      },
      {
        kind: 'quiz',
        question: 'On Q♠7♦3♣ 8♥ after a flop check back, which BB hand most clearly wants to probe for value?',
        choices: ['4♠3♠, bottom pair', '8♣7♣, two pair', 'A♦5♣, ace high'],
        answer: 1,
        explain:
          'Two pair is strong against a capped range and wants to build the pot. Bottom pair has some showdown value and gains little by betting. Ace high is not a value hand.',
      },
      {
        kind: 'takeaway',
        points: [
          'A check back from the raiser is usually capped.',
          'Probe often with value hands, protection hands and draws.',
          'If BB checks again, the raiser can make a delayed c-bet.',
          'Against players who trap on the flop, the check back is not capped.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/barreling',
    level: 'core',
    minutes: 7,
    cover: { kind: 'figure', text: '184%' },
    steps: [
      {
        kind: 'intro',
        title: 'Keep firing, or stop',
        body: 'You bet the flop and got called. Every later street asks the same question. Do this card and this hand still want to bet? Good barrels depend on the turn card and your hand’s equity.',
      },
      {
        kind: 'text',
        title: 'Which turns to keep betting',
        body: [
          'Barrel more on turns that help your range more than theirs.',
          'Those include overcards you hold more of, like an ace or king on a low board. Blanks that change little are good too.',
          'Slow down on turns that help the caller. Low connecting cards can complete their straights. Flush cards help them when they hold more of that draw.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Turn bluffs need equity',
        body: [
          'Your turn bets are strong hands that beat what calls, plus bluffs with equity.',
          'The best turn bluffs are flush draws and open enders. Gutshots with overcards work too. When called, they can still win on the river.',
          'Hands with no pair and no draw mostly give up. Medium hands with showdown value mostly check. A bet folds out worse and gets called by better.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A natural turn barrel',
        cards: 'JhTh',
        board: 'Kh7d2c4h',
        caption:
          'BTN bet the flop with backdoor hearts and got called. The 4♥ gives a flush draw with 9 outs. Your chance to make a flush on the river is 9 ÷ 46, or **19.6%**. A 7♥ or 2♥ also pairs the board, so not every out is clean.',
      },
      {
        kind: 'text',
        title: 'River barrels and blockers',
        body: [
          'By the river, draws have hit or missed. Missed draws make natural bluffs, since they have no showdown value.',
          'Prefer bluffs that block the hands that call you. Avoid bluffs that block the hands that fold. On an ace high river, holding an ace removes some of their top pairs.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Geometric sizing on the turn',
        formula: 'f = ((1 + 2 × stack ÷ pot)^(1/streets) − 1) ÷ 2',
        parts: [
          ['stack', 'effective stack behind'],
          ['pot', 'pot before the bet'],
          ['streets', 'bets left, here turn and river'],
        ],
        example:
          'In a single raised pot, a third pot flop bet gets called. The turn pot is 9.17bb with 95.67bb behind. Two bets of **184%** pot get it all in. In a 3bet pot of 37.5bb with 81.5bb behind, the size is **66%**.',
      },
      {
        kind: 'text',
        title: 'What escalation tells you',
        body: [
          'Bets grow every street because the pot grows. Geometric sizing is the natural reference for a polarized range. That range wants the stacks in by the river.',
          'Deep in a single raised pot, a small flop bet leaves only overbets to get stacks in. Most hands do not want that. So medium hands bet smaller or check. Only the polarized part of the range keeps growing its bets.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'On K♥7♦2♣ 4♥, BTN bet the flop and got called. Which hand is the best turn bluff?',
        choices: ['J♥T♥', 'Q♣J♣', '8♣8♠'],
        answer: 0,
        explain:
          'J♥T♥ now has a flush draw, so it wins sometimes when called. Q♣J♣ has no draw and little equity when called. 8♣8♠ has showdown value, so it usually checks.',
      },
      {
        kind: 'quiz',
        question: '3bet pot. The turn pot is 37.5bb with 81.5bb behind. Which size per street gets stacks in over the turn and river?',
        choices: ['184%', '100%', '66%', '33%'],
        answer: 2,
        explain:
          'First, 1 + 2 × 81.5 ÷ 37.5 = 5.35. Its square root is 2.31. Subtract 1 and halve it to get about 0.66. The 184% size is for a single raised pot, where stacks are deeper compared with the pot.',
      },
      {
        kind: 'takeaway',
        points: [
          'Barrel turns that help your range.',
          'Slow down on turns that help theirs.',
          'Turn bluffs need equity. Hands with nothing mostly give up.',
          'River bluffs block calls and unblock folds.',
          'Geometric sizing is the reference for a polarized line.',
        ],
      },
    ],
  },
  {
    key: 'postflop/multiway/multiway',
    level: 'core',
    minutes: 6,
    cover: { kind: 'figure', text: '13%' },
    steps: [
      {
        kind: 'intro',
        title: 'Every extra player changes the math',
        body: 'Heads up theory assumes 1 opponent. Add a second or third, and the math changes. Bluffs need more folds. Your hand’s equity drops. The range edges behind heads up strategy shrink.',
      },
      {
        kind: 'table',
        title: 'Chance that everyone folds',
        columns: ['Opponents', 'Each folds 50%', 'Each folds 60%', 'Each folds 70%'],
        rows: [
          ['1', '50.0%', '60.0%', '70.0%'],
          ['2', '25.0%', '36.0%', '49.0%'],
          ['3', '12.5%', '21.6%', '34.3%'],
          ['4', '6.3%', '13.0%', '24.0%'],
        ],
        note: 'This is the fold chance to the power of the number of players. It assumes each player folds independently with the same chance. Real hands are less simple, since later players see earlier folds.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Bluffs work far less',
        body: [
          'A half pot bluff needs everyone to fold **33.3%** of the time.',
          'Heads up, an opponent who folds 50% makes it profitable.',
          'Against 3 players who each fold 60%, all 3 fold only **21.6%** of the time. The bluff loses.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Top pair, good kicker vs more hands',
        columns: ['Opponents', 'K♠Q♦ on K♥8♣4♦'],
        rows: [
          ['1', '86.4%'],
          ['2', '74.8%'],
          ['3', '64.9%'],
          ['4', '56.5%'],
        ],
        note: 'Computed with Felt’s core against random hands. The 1 opponent row is exact. The other rows use 24 million random deals each, accurate to within 0.1%. Real calling ranges beat random hands, so the true numbers are lower.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Stronger hands to bet, less range advantage',
        body: [
          'To bet for value, your hand must beat the hands that call. With more players, someone more often has connected. So solver ranges bet less often, and with stronger hands.',
          'The preflop raiser’s range advantage also matters less. The chance that at least one opponent hit the board grows with each player.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Defense is shared',
        body: [
          'Against a pot sized bet, the group must continue **50%** of the time together. Each player does not need 50% alone.',
          'With 2 players defending independently, each needs only **29.3%**. That comes from 1 − (1 − x)² = 0.5. With 3 players, each needs **20.6%**.',
          'Like MDF (minimum defense frequency), this is a river idea and a simplification. But the direction holds. Each player can fold more than heads up.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live multiway pots',
        body: 'Many live low stakes games have lots of multiway pots. Players there often call wide and bluff little. If your notes agree, bet strong hands for value and often bigger. Cut multiway bluffs hard, and respect raises.',
      },
      {
        kind: 'quiz',
        question: 'Three opponents each fold 60% of the time, independently. How often do all 3 fold?',
        choices: ['13.0%', '21.6%', '36.0%', '60.0%'],
        answer: 1,
        explain: 'Multiply 0.6 × 0.6 × 0.6 to get 0.216, or 21.6%. The 36.0% figure is for 2 opponents. Each extra player multiplies the chance again.',
      },
      {
        kind: 'quiz',
        question: 'You bluff half pot into 2 opponents. Each folds 50% of the time, independently. How often does the bluff win?',
        choices: ['75%, so it profits', '50%, so it profits', '25%, so it loses'],
        answer: 2,
        explain:
          'Both must fold, and 0.5 × 0.5 = 25%. A half pot bluff needs 33.3% folds, so it loses. The 75% figure is the chance that at least one player folds, which does not win the pot.',
      },
      {
        kind: 'takeaway',
        points: [
          'Bluffs need everyone to fold, and that gets rare fast.',
          'Your equity drops with each extra player.',
          'Bet stronger hands for value.',
          'Range advantage matters less, and defense is shared.',
        ],
      },
    ],
  },
  {
    key: 'postflop/multiway/multiway-cbet',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'figure', text: '3way' },
    steps: [
      {
        kind: 'intro',
        title: 'C-betting into two players',
        body: 'You open and 2 players call. Small bets with your whole range work well heads up. Multiway, that habit mostly stops working. The player in the middle and the check raiser face new problems too.',
      },
      {
        kind: 'text',
        title: 'Bet less, and bet stronger',
        body: [
          'Multiway, solver strategies c-bet much less often than heads up. The range bet mostly disappears.',
          'The bets that remain lean toward strong made hands and good draws. Medium hands check more. They rarely beat 2 calling ranges.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Size depends on the board',
        body: [
          'There is no single multiway size. On dry boards where few hands can continue, smaller bets still appear.',
          'On wet boards, your strong hands face several draws at once. Protection is worth more there. So bigger bets that charge those draws are more common.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Facing a c-bet, by seat',
        columns: ['Seat', 'Situation', 'Tends to'],
        rows: [
          ['In the middle', 'A player still to act', 'Continue tighter, raise mostly strong'],
          ['Last to act', 'Closes the action', 'Call somewhat wider at a good price'],
        ],
        note: 'Typical solver patterns. The middle player can be raised behind. Its call must also hold up against 2 ranges.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Check raises signal strength',
        body: [
          'A multiway bluff check raise needs 2 players to fold. That is much harder. So multiway check raises lean toward strong hands. Strong draws are the main semi bluffs.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Share the defense',
        body: [
          'Heads up on the river, you defend roughly MDF (minimum defense frequency). Multiway, the defense is shared.',
          'Against a pot sized bet with 2 defenders acting independently, each needs only **29.3%**. That keeps the bettor from profiting with any bluff.',
          'This is a simplification. But it is why each multiway defender can fold more than heads up.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live multiway raises',
        body: 'In many live pools, a multiway check raise very often means two pair or better. Multiway c-bets there are often honest too. If your notes agree, fold one pair more to multiway raises. Float multiway c-bets less.',
      },
      {
        kind: 'quiz',
        question: 'Three way pot. BTN c-bets and BB is still to act behind you. Compared with heads up, what should you usually do?',
        choices: ['Continue tighter, since BB can still raise', 'Call wider, since the pot is bigger', 'Raise more often, since BTN may be weak'],
        answer: 0,
        explain:
          'Your call does not close the action. It also has to hold up against 2 ranges. So the middle player continues tighter and raises mostly strong hands. The bigger pot does not make up for that.',
      },
      {
        kind: 'quiz',
        question: 'In a multiway pot, BB check raises the flop c-bet. What does that range mostly hold?',
        choices: ['Mostly pure bluffs', 'Strong hands and strong draws', 'Medium pairs that want protection'],
        answer: 1,
        explain:
          'A bluff needs 2 players to fold, so multiway check raises lean toward value. Strong draws are the main semi bluffs. Medium pairs usually call, since a raise folds out worse hands.',
      },
      {
        kind: 'takeaway',
        points: [
          'Multiway, c-bet less often and with stronger hands.',
          'Bet small on dry boards and bigger where draws need charging.',
          'The middle player continues tighter.',
          'The last player can call a bit wider.',
          'Multiway check raises are mostly strong.',
        ],
      },
    ],
  },
];
