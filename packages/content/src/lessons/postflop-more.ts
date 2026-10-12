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
        body: 'Saying a board favors the raiser is a claim about two ranges. You can check it: which range has more equity, and which has more of the hands that win big pots.',
      },
      {
        kind: 'text',
        title: 'Two kinds of advantage',
        body: [
          '**Range advantage**: your whole range has more equity than theirs. **Nut advantage**: you hold more of the strongest hands, like sets, two pair and straights.',
          'They often point the same way, but not always. Range advantage mostly drives how often you bet. Nut advantage mostly drives how big you can bet.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'What each range holds',
        body: [
          'BTN opens every ace and most big cards, but folds its weakest offsuit hands. BB 3bets AA to QQ and AK, and calls with many small suited and offsuit connected hands.',
          'So BTN usually has more top pairs and overpairs on high boards. BB holds more of the low and middle cards, which make two pair and straights on low connected boards.',
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
          'Computed with Felt’s core from the starter charts, which are approximations: BTN open range vs BB calling range (3bets removed), board cards removed. Equity is each BTN combo’s Monte Carlo equity against the BB range (6,000 runouts per combo), averaged by combo weight. It is raw equity, not realized equity. Strong means two pair or better; on 8♠8♦3♣, where every pocket pair already makes two pair, it means trips or better.',
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
        note: 'Same ranges and method. Top pair or better counts top pair, overpairs, and two pair or better.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Reading the numbers',
        body: [
          'A♠8♦3♣ and Q♥J♦T♣ favor BTN on every count. On Q♥J♦T♣ BTN has more straights largely because BB 3bets AK instead of calling.',
          'On 8♠8♦3♣ the counts split. BTN has more equity and more overpairs, **6.9%** to **2.4%**, but BB holds more trips, **11.0%** to **7.1%**, because it defends more hands with an eight.',
          '9♥8♥6♣ is close to even. On 7♥6♥5♣, BB leads in equity, top pairs and strong hands.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'From counts to strategy',
        body: [
          'Where the raiser leads on both counts with few strong hands overall, like A83, small and frequent bets are the norm. Where the caller holds more strong hands, like 765, the raiser checks much more and the big blind check raises more.',
          'On paired boards like 883, the raiser’s equity edge usually still supports frequent small bets, but big bets run into the caller’s extra trips.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'With Felt’s charts, BTN opens and BB calls. On 8♠8♦3♣, who holds more trips or better?',
        choices: ['BTN, because it has more equity', 'BB, because it defends more hands with an eight', 'About the same'],
        answer: 1,
        explain: 'BB holds 11.0% trips or better against BTN’s 7.1%, even though BTN has more equity and more overpairs. Range advantage and nut advantage can point different ways.',
      },
      {
        kind: 'quiz',
        question: 'On which flop does the BB calling range have more raw equity than the BTN opening range?',
        choices: ['Q♥J♦T♣', 'A♠8♦3♣', '7♥6♥5♣', '8♠8♦3♣'],
        answer: 2,
        explain: 'On 7♥6♥5♣ BTN has 48.1% equity, so BB is ahead. Low connected cards hit BB’s many small connected hands and small pairs.',
      },
      {
        kind: 'takeaway',
        points: [
          'Range advantage sets how often you bet; nut advantage sets how big.',
          'High boards favor the raiser in both; low connected boards favor the caller.',
          'Paired boards can split: raiser has the equity, caller can have more trips.',
          'All of these numbers are raw equity; position changes how much is realized.',
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
        body: 'You open the cutoff and the button calls. Or you 3bet from the blinds and get called. Now you have the stronger range but act first on every street, and that changes how often you bet.',
      },
      {
        kind: 'text',
        title: 'Why you bet less often',
        body: [
          'Out of position, you realize less of your equity, and the caller realizes more of theirs. Medium hands lose value when they bet and face a raise, so they prefer to check.',
          'A button that flats a cutoff open has usually 3bet many of its best hands and folded its worst, so its calling range is mostly medium strength. It holds fewer trash hands that fold to any bet than a big blind defending against the button.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'In position vs out of position',
        columns: ['Topic', 'Raiser IP', 'Raiser OOP'],
        rows: [
          ['Bet frequency', 'Higher', 'Lower'],
          ['Range bets', 'Common on good boards', 'Rarer'],
          ['Medium hands', 'Often bet thin', 'Check more'],
          ['Checking range', 'Mostly weak and medium', 'Keeps more strong hands'],
        ],
        note: 'Directional patterns from equilibrium solutions of single raised pots. Exact frequencies depend on ranges, board and stack depth.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Protect your checks',
        body: [
          'If you bet every strong hand and check only weak ones, the caller can bet behind every time you check and you have to fold too often.',
          'So equilibrium strategies out of position check some strong hands, like sets and good top pairs. They can check raise or check call, which makes a bet behind your check costly.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Choosing a size',
        body: [
          'On boards where you keep a big range advantage, like ace or king high dry boards, small bets with a wide range still work out of position.',
          'On middling and connected boards, you bet less often, and the bets lean toward strong hands and good draws, often with a bigger size.',
          'As the 3bettor out of position, your range advantage over a flatting range is large, so you c-bet more often than as a single raiser, frequently small on high boards.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Second pair often checks',
        cards: '9s9d',
        board: 'Qh7c4d',
        caption: 'Cutoff vs button call. 99 has good showdown value and hates a raise. Out of position it often checks and plans to call a bet, rather than betting thin into a range that holds many queens.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Against players who always stab',
        body: 'Some live players bet whenever the raiser checks. If your notes show this, check more strong hands and check raise or check call. Against players who check back too much, bet more of your thin value and protection hands yourself.',
      },
      {
        kind: 'quiz',
        question: 'CO opens, BTN calls. Compared with BTN c-betting against BB, the CO usually c-bets',
        choices: ['More often, since the CO range is stronger', 'Less often, being out of position against a narrower range', 'Just as often, only the size changes'],
        answer: 1,
        explain: 'Out of position you realize less equity, and the button’s flatting range is condensed, with fewer hands that fold to any bet. Both push toward more checking.',
      },
      {
        kind: 'quiz',
        question: 'Why does the out of position raiser check some sets on the flop?',
        choices: ['So a bet behind its check is not free against a range of only weak hands', 'Because sets lose value when they bet', 'To keep the pot small for the river'],
        answer: 0,
        explain: 'A checking range with strong hands in it lets you check raise or check call. Without them, the caller can bet every time you check.',
      },
      {
        kind: 'takeaway',
        points: [
          'Out of position, c-bet less and check more medium hands.',
          'Keep strong hands in your checking range.',
          'Small range bets still work on boards with a big range advantage, especially as the 3bettor.',
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
        body: 'BTN opens, BB calls, BB checks the flop and BTN checks behind. When BB bets the turn, that is a probe. It attacks a range that has just told you something.',
      },
      {
        kind: 'text',
        title: 'The check back is capped',
        body: [
          'In position, the raiser bets most of its strongest hands on the flop. The hands it checks are mostly medium and weak, with only some strong hands kept back.',
          'How capped it is depends on the board. Where BTN bets small with almost everything, its checks are very weak. Where BTN checks a lot, its checks keep more strength.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Probe often, and with many hands',
        body: [
          'Against a capped range, BB probes the turn often. Sizes run from medium to large, and on turns that help BB the most, large bets appear.',
          'A checked back range has fewer hands that can stand a bet, so BB’s value bets get called by worse and its bluffs get more folds.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'Which BB hands probe',
        columns: ['Hand', 'Usually', 'Why'],
        rows: [
          ['Sets, turned two pair', 'Probe', 'Few better hands left'],
          ['Top or middle pair', 'Probe', 'Value and protection vs a capped range'],
          ['Straight and flush draws', 'Probe', 'Equity plus fold equity'],
          ['Bottom pair, ace high', 'Check', 'Showdown value, little to gain'],
          ['Air with no draw', 'Mixed', 'Some bluffs, many give ups'],
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'A probe spot',
        board: 'Qs7d3c8h',
        caption:
          'BTN mostly bets its queens and sets on this flop, so its check back holds many sevens, small pairs and ace high. BB can probe its 7x and 8x for value, and draws like T9 and 65, which are open ended after the 8.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Delayed c-bets',
        body: [
          'If BB checks the turn again, BTN can bet now: a delayed c-bet. BB’s twice checked range is weak too, because it probes with much of its strength.',
          'The delayed c-bet range is hands that checked the flop for showdown or to trap, hands that improved, and draws. Out of position raisers do the same: check the flop, then bet the turn when the caller checks back.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Know who checks back',
        body: 'Some live players check back strong hands on dry flops to trap. Against them, the check back is not capped, so probe with value and fewer bluffs. Against players who bet every good hand and check every give up, probe aggressively. Verify which type you face with your notes.',
      },
      {
        kind: 'quiz',
        question: 'BTN checks back the flop. Why can BB probe the turn with a wide range?',
        choices: ['BB has position on the turn', 'BB always has more equity on the turn', 'BTN bets most of its strong hands on the flop, so its checks are capped'],
        answer: 2,
        explain: 'A check back range missing most strong hands cannot defend well against bets, so BB’s value bets get paid by weaker hands and its bluffs get folds.',
      },
      {
        kind: 'quiz',
        question: 'On Q♠7♦3♣ 8♥ after a flop check back, which BB hand most clearly wants to probe for value?',
        choices: ['8♣7♣, turned two pair', '4♣3♦, bottom pair', 'A♦5♣, ace high'],
        answer: 0,
        explain: 'Two pair is strong against a capped range and wants to build the pot. Bottom pair and ace high have some showdown value and gain little by betting.',
      },
      {
        kind: 'takeaway',
        points: [
          'A check back from the raiser is usually capped.',
          'Probe often: value, protection, draws and some bluffs.',
          'If BB checks again, the raiser can delay c-bet.',
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
        body: 'You bet the flop and got called. Every later street asks the same question: does this card and this hand still want to bet? Good barrels follow the turn card, your hand’s equity, and the sizes you need to finish.',
      },
      {
        kind: 'text',
        title: 'Which turns to keep betting',
        body: [
          'Barrel more on turns that help your range more than theirs: overcards you hold more of, like an ace or king on a low board, and blanks that change little.',
          'Slow down on turns that help the caller: low connecting cards that complete straights in their range, and flush cards their calling range holds more of.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Turn bluffs need equity',
        body: [
          'Your turn bets are strong hands that still beat what calls, and bluffs with equity: flush draws, open enders, and gutshots with overcards. When called, they can still win on the river.',
          'Hands with no pair and no draw mostly give up. Medium hands with showdown value mostly check, because a bet folds out worse and gets called by better.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'A natural turn barrel',
        cards: 'JhTh',
        board: 'Kh7d2c4h',
        caption: 'BTN bet the flop with backdoor hearts and was called. The 4♥ gives a flush draw: 9 outs, about 9 ÷ 46 = 19.6% to make a flush on the river. A 7♥ or 2♥ also pairs the board, so not every out is clean.',
      },
      {
        kind: 'text',
        title: 'River barrels and blockers',
        body: [
          'By the river, draws have either hit or missed. Missed draws make natural bluffs: they have no showdown value.',
          'Prefer bluffs that block the hands that call you, and that do not block the hands that fold. For example, holding an ace on an ace high river removes some of their top pairs.',
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
          'Single raised pot, a third pot flop bet called: turn pot 9.17bb, 95.67bb behind. Two equal bets of **184%** pot get it in. In a 3bet pot, pot 37.5bb with 81.5bb behind: **66%**.',
      },
      {
        kind: 'text',
        title: 'What escalation tells you',
        body: [
          'Bets grow every street because the pot grows. Geometric sizing is the natural reference for a polarized range of strong hands and bluffs that wants stacks in by the river.',
          'Deep in a single raised pot, small flop bets leave overbets as the only way to get stacks in. Most hands do not want that, so medium strength hands bet smaller or check, and only the polarized part of the range escalates.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'On K♥7♦2♣ 4♥, BTN bet the flop and got called. Which hand is the best turn bluff?',
        choices: ['Q♣J♣', '8♣8♠', 'J♥T♥'],
        answer: 2,
        explain: 'J♥T♥ now has a flush draw, so it wins sometimes when called. 88 has showdown value and checks. Q♣J♣ has no draw and little equity when called.',
      },
      {
        kind: 'quiz',
        question: '3bet pot, turn pot 37.5bb, 81.5bb behind. What geometric size gets stacks in over turn and river?',
        choices: ['33%', '66%', '100%', '184%'],
        answer: 1,
        explain: '1 + 2 × 81.5 ÷ 37.5 = 5.35. Its square root is 2.31, minus 1, halved: 0.66.',
      },
      {
        kind: 'takeaway',
        points: [
          'Barrel turns that help your range; slow down on turns that help theirs.',
          'Turn bluffs need equity; hands with nothing mostly give up.',
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
        body: 'Heads up theory assumes one opponent. Add a second or third and bluffs need more folds, your hand’s equity drops, and the range edges that drive heads up strategy shrink.',
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
        note: 'p to the power n, assuming each player folds independently with the same chance. A simplification: in real hands, later players see earlier folds, so their choices are linked.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Bluffs work far less',
        body: [
          'A half pot bluff needs everyone to fold **33.3%** of the time. Heads up, an opponent who folds 50% makes it profitable. Against three players who each fold 60%, all three fold only **21.6%** of the time, and the bluff loses.',
        ],
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Top pair, good kicker vs more hands',
        columns: ['Opponents', 'K♠Q♦ on K♥8♣4♦'],
        rows: [
          ['1', '86.3%'],
          ['2', '74.9%'],
          ['3', '64.9%'],
          ['4', '56.8%'],
        ],
        note: 'Computed with Felt’s core: Monte Carlo, 200,000 deals per row, against random hands. Real calling ranges are stronger than random hands, so the true numbers are lower.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Stronger hands to bet, less range advantage',
        body: [
          'To bet for value, your hand must beat the hands that call, and with more players someone is more likely to have connected. So equilibrium ranges bet less often and bet stronger hands.',
          'The preflop raiser’s range advantage matters less, because the chance that at least one opponent hit the board grows with each player.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Defense is shared',
        body: [
          'Against a pot sized bet, the group needs to continue **50%** of the time together, not each player alone. If two players defend independently, each needs only **29.3%**, from 1 − (1 − x)² = 0.5. With three, **20.6%** each.',
          'Like MDF itself, this is a river idea and a simplification, but the direction holds: each player can fold more than heads up.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live multiway pots',
        body: 'Many live low stakes pools see lots of multiway pots, call wide and bluff little. Tendencies to verify: if so, bet your strong hands for value, often bigger, cut multiway bluffs hard, and give real respect to raises.',
      },
      {
        kind: 'quiz',
        question: 'Three opponents each fold 60% of the time, independently. How often do all three fold?',
        choices: ['60%', '36%', '21.6%', '13.0%'],
        answer: 2,
        explain: '0.6 × 0.6 × 0.6 = 0.216. Each extra player multiplies the chance again.',
      },
      {
        kind: 'quiz',
        question: 'You bluff half pot into two opponents who each fold 50%, independently. Is it profitable?',
        choices: ['No: both fold only 25%, below the 33.3% needed', 'Yes: each folds half the time, above 33.3%'],
        answer: 0,
        explain: 'The bluff needs the whole table to fold. 0.5 × 0.5 = 25%, short of the 33.3% a half pot bet needs.',
      },
      {
        kind: 'takeaway',
        points: [
          'Bluffs need everyone to fold, and that gets rare fast.',
          'Your equity drops with each player; bet stronger hands for value.',
          'Range advantage matters less; defense is shared between players.',
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
        body: 'You open, two players call. The flop habits that work heads up, like small bets with your whole range, mostly stop working here. The player in the middle and the player who check raises face new problems too.',
      },
      {
        kind: 'text',
        title: 'Bet less, and bet stronger',
        body: [
          'Multiway, equilibrium strategies c-bet much less often than heads up. The range bet mostly disappears.',
          'The bets that remain lean toward strong made hands and good draws. Medium hands check more, because they rarely beat two calling ranges.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Size depends on the board',
        body: [
          'There is no single multiway size. On dry boards where few hands can continue, smaller bets still appear.',
          'On wet boards, your strong hands face several draws at once, so protection is worth more, and bigger bets that charge those draws are more common.',
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
        note: 'The middle player can be raised behind, and its call must stand up against two ranges.',
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Check raises signal strength',
        body: [
          'A bluff check raise multiway needs both the bettor and the player left to act to fold. That is much harder, so multiway check raising ranges are weighted toward strong hands, with strong draws as the main semi bluffs.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'Defending: share the load',
        body: [
          'Heads up you defend roughly MDF on the river. Multiway the defense is shared: against a pot sized bet with two defenders acting independently, each needs only **29.3%** to keep the bettor from profiting with any bluff.',
          'That is a simplification, but it is why each multiway defender can fold more than heads up.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live multiway raises',
        body: 'In many live pools, a multiway check raise very often means two pair or better, and multiway c-bets are often honest. Tendencies to verify: if your notes agree, fold one pair more to multiway raises, and float multiway c-bets less.',
      },
      {
        kind: 'quiz',
        question: 'Three way pot. BTN c-bets, you are in the middle, and BB is still to act. Compared with heads up, you should usually',
        choices: ['Call wider, because the pot is bigger', 'Continue tighter, because a player behind can still raise', 'Raise more often as a bluff'],
        answer: 1,
        explain: 'Your call does not close the action, and it has to hold up against two ranges. Middle position continues tighter and raises mostly strong hands.',
      },
      {
        kind: 'quiz',
        question: 'In a multiway pot, the BB check raises the flop c-bet. What does that range mostly hold?',
        choices: ['Strong hands and strong draws', 'Mostly pure bluffs', 'Medium pairs protecting'],
        answer: 0,
        explain: 'A bluff needs two players to fold, so multiway check raises are weighted toward value, with strong draws as the main semi bluffs.',
      },
      {
        kind: 'takeaway',
        points: [
          'Multiway, c-bet less and with stronger hands.',
          'Size by board: small on dry boards, bigger where draws need charging.',
          'The middle player continues tighter; the last player can call a bit wider.',
          'Multiway check raises are mostly strong.',
        ],
      },
    ],
  },
];
