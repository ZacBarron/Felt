import type { LessonContent } from './types';

export const POSTFLOP_MORE_LESSONS: LessonContent[] = [
  {
    key: 'postflop/textures/who-it-favors',
    level: 'advanced',
    minutes: 8,
    cover: { kind: 'cards', cards: '', board: '8s8d3c' },
    practice: ['9max-100-rfi-btn', '9max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'Count before you bet',
        body: 'Saying a board favors the raiser is a claim about 2 ranges. You can check it. First ask which range has more equity. Then ask which has more of the hands that win big pots.',
      },
      {
        kind: 'visual',
        title: 'Two kinds of advantage',
        art: {
          kind: 'tree',
          root: 'Who has the advantage?',
          branches: [
            { label: 'Range advantage', value: 'Sets how often you bet', tone: 'green' },
            { label: 'Nut advantage', value: 'Sets how big you bet', tone: 'brass' },
          ],
        },
        caption: '**Range advantage** means your whole range has more equity than theirs. **Nut advantage** means you hold more of the strongest hands, like sets and straights. The 2 often point the same way, but not always.',
        evidence: 'solver',
      },
      {
        kind: 'chart',
        chartId: '9max-100-bb-vs-btn',
        title: 'What each range holds',
        caption:
          'BB 3bets AA to QQ and AK. It calls with many small connected hands, suited and offsuit. BTN opens every suited ace and most big cards. So BTN has more top pairs and overpairs on high boards. BB has more low and middle cards.',
      },
      {
        kind: 'table',
        title: 'Equity and strong hands, BTN vs BB',
        columns: ['Flop', 'BTN equity', 'BTN strong', 'BB strong'],
        rows: [
          ['A♠8♦3♣', '56.3%', '5.2%', '3.9%'],
          ['Q♥J♦T♣', '57.1%', '15.5%', '10.0%'],
          ['8♠8♦3♣', '53.5%', '7.1%', '10.2%'],
          ['9♥8♥6♣', '51.7%', '4.9%', '6.1%'],
          ['7♥6♥5♣', '48.9%', '4.7%', '8.6%'],
        ],
        note:
          'Computed exactly with Suited’s core over every turn and river. BTN uses its opening chart. BB uses its calling chart, with 3bets removed. These starter charts are approximations. Strong means two pair or better. On 8♠8♦3♣ every pocket pair makes two pair, so there it means trips or better. Equity here is raw equity, before position.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Top pair or better',
        columns: ['Flop', 'BTN', 'BB'],
        rows: [
          ['A♠8♦3♣', '28.9%', '18.8%'],
          ['Q♥J♦T♣', '29.0%', '20.0%'],
          ['9♥8♥6♣', '22.3%', '17.1%'],
          ['7♥6♥5♣', '19.4%', '22.8%'],
          ['8♠8♦3♣ (overpair or trips)', '14.0%', '12.4%'],
        ],
        note: 'Same ranges and method. This counts top pair and overpairs. It also counts two pair or better.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Reading the numbers',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'BTN overpairs', value: 6.9 },
            { label: 'BB overpairs', value: 2.2, tone: 'green' },
            { label: 'BTN trips+', value: 7.1 },
            { label: 'BB trips+', value: 10.2, tone: 'green' },
          ],
        },
        caption:
          'On 8♠8♦3♣ the counts split. BTN has more equity and more overpairs. BB holds more trips or better because it defends more hands with an eight. A♠8♦3♣ and Q♥J♦T♣ favor BTN on every count. 9♥8♥6♣ is close to even. On 7♥6♥5♣, BB leads on every count.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'From counts to strategy',
        art: {
          kind: 'tree',
          root: 'BTN opens, BB calls',
          branches: [
            { label: 'A83: BTN leads both counts', value: 'Small, frequent bets', tone: 'brass' },
            { label: '765: BB has more strong hands', value: 'BTN checks much more', tone: 'green' },
            { label: '883: the counts split', value: 'Small bets, few big ones', tone: 'brass' },
          ],
        },
        caption:
          'On 765, BB also check raises more. On 883 the raiser’s equity edge still supports frequent small bets. Big bets run into the caller’s extra trips.',
        evidence: 'solver',
      },
      {
        kind: 'visual',
        title: 'Wet is not the reason',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '732: UTG', value: 2.1 },
            { label: '732: BB', value: 4.1, tone: 'green' },
            { label: '754: UTG', value: 3.4 },
            { label: '754: BB', value: 7.7, tone: 'green' },
          ],
        },
        caption:
          'UTG opens and BB calls. The bars show two pair or better. On 7♦5♣4♠, BB holds more than twice as much. On 7♦3♣2♠ the gap is small, and UTG holds most overpairs. So UTG can bet bigger on 732 and bets less on 754. Both flops are low. The nut edge decided it, not how wet the board is.',
        evidence: 'solver',
      },
      {
        kind: 'quiz',
        question: 'With Suited’s charts, BTN opens and BB calls. On 8♠8♦3♣, who holds more trips or better?',
        board: '8s8d3c',
        choices: ['BTN, because it has more equity', 'BB, because it defends more eights', 'Both hold about the same'],
        answer: 1,
        explain:
          'Like the bars showed, BB holds 10.2% trips or better against BTN’s 7.1%. BTN still has more equity and more overpairs. Range advantage and nut advantage can point different ways.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'On which flop does the BB calling range have more raw equity than the BTN opening range?',
        choiceCards: ['7h6h5c', '8s8d3c', 'QhJdTc', 'As8d3c'],
        choices: ['7♥6♥5♣', '8♠8♦3♣', 'Q♥J♦T♣', 'A♠8♦3♣'],
        answer: 0,
        explain:
          'Like the equity table showed, BTN has 48.9% on 7♥6♥5♣. So BB has 51.1%. Low connected cards hit BB’s small connected hands and pairs. On 8♠8♦3♣, BTN still has 53.5% equity.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'UTG opens and BB calls. On which flop can UTG bet bigger?',
        choiceCards: ['7d5c4s', '7d3c2s'],
        choices: ['7♦5♣4♠', '7♦3♣2♠'],
        answer: 1,
        explain:
          'Like the 732 and 754 bars showed, BB holds 7.7% two pair or better on 754 against UTG’s 3.4%. On 732 the gap is small, and UTG holds most overpairs. Bet size follows the nut edge.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Range advantage sets how often you bet. On 765 the big blind has more equity.',
          'Nut advantage sets how big you bet. On 883 BTN has more equity, but BB has more trips.',
          'A wet board does not decide the size. Count who holds the nuts, as on 732 and 754.',
        ],
      },
    ],
  },
  {
    key: 'postflop/cbet/cbet-oop',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN'], note: 'You act first after the flop' },
    practice: ['9max-100-rfi-co'],
    steps: [
      {
        kind: 'intro',
        title: 'Raising first, acting first',
        body: 'You open the cutoff and the button calls. Or you 3bet from the blinds and get called. Now you have the stronger range but act first on every street. That changes how often you bet.',
      },
      {
        kind: 'visual',
        title: 'Why you bet less often',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN'], note: 'You act first after the flop' },
        caption:
          'Out of position you realize less of your equity. Medium hands that bet can face a raise, so they prefer to check. A button that flats a cutoff open has 3bet many of its best hands. It has also folded its worst. So fewer of its hands fold to any bet.',
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
        kind: 'visual',
        title: 'Protect your checks',
        art: {
          kind: 'tree',
          root: 'You check out of position',
          branches: [
            { label: 'Only weak hands', value: 'They bet every time', tone: 'red' },
            { label: 'Some sets and good top pairs', value: 'Check raise or call', tone: 'green' },
          ],
        },
        caption: 'If your checks hold only weak hands, you will have to fold too often. So solver strategies out of position check some strong hands. That makes betting behind your check costly.',
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
          'Like the first picture said, out of position you realize less equity. The button’s calling range also has few hands that fold to any bet. Both push toward more checking.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'Why does the out of position raiser check some sets on the flop?',
        choices: ['Because sets lose value when they bet', 'To protect its checking range', 'To keep the pot small for the river'],
        answer: 1,
        explain:
          'Like the tree showed, strong hands in your checks let you check raise or check call. Without them, the caller can bet every time you check. Sets do not lose value by betting.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You 3bet from the big blind and the button calls. The flop is K♠7♦2♣. What does your strategy usually do?',
        board: 'Ks7d2c',
        choices: ['C-bet often with a small size', 'Check almost every hand', 'Overbet with sets only'],
        answer: 0,
        explain: 'Like the sizing step said, the 3bettor has a large range advantage. On dry high boards, small bets with a wide range still work out of position. Checking everything gives that edge away.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Out of position, c-bet less often. Check more medium hands like second pair.',
          'Keep some strong hands in your checks. Then a bet behind your check is costly.',
          'Small bets still work on dry high boards, especially as the 3bettor.',
        ],
      },
    ],
  },
  {
    key: 'postflop/defense/probe',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'cards', cards: '', board: 'Qs7d3c8h' },
    practice: ['9max-100-bb-vs-btn'],
    steps: [
      {
        kind: 'intro',
        title: 'When the raiser checks back',
        body: 'BTN opens and BB calls. BB checks the flop, and BTN checks behind. If BB bets the turn, that bet is a probe. It attacks a range that has just told you something.',
      },
      {
        kind: 'visual',
        title: 'Checked flop, then a turn bet',
        art: { kind: 'streets', active: 'turn' },
        caption: 'BB checks the flop and BTN checks behind. On the turn BB acts first again. A bet now is a **probe**.',
      },
      {
        kind: 'visual',
        title: 'The check back is capped',
        art: {
          kind: 'tree',
          root: 'BTN’s flop check back holds',
          branches: [
            { label: 'Medium and weak hands', value: 'Most of it', tone: 'gray' },
            { label: 'Strong hands', value: 'Only some', tone: 'red' },
          ],
        },
        caption:
          'In position, the raiser bets most of its strongest hands on the flop. How capped the check is depends on the board. Where BTN bets small with almost everything, its checks are very weak. Where BTN checks a lot, they keep more strength.',
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
          'Like the tree showed, BTN bets most of its strong hands on the flop. Its check back cannot defend well against bets. Many turn cards do not help BB at all.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'On Q♠7♦3♣ 8♥ after a flop check back, which BB hand most clearly wants to probe for value?',
        board: 'Qs7d3c8h',
        choiceCards: ['4s3s', '8c7c', 'Ad5c'],
        choices: ['4♠3♠, bottom pair', '8♣7♣, two pair', 'A♦5♣, ace high'],
        answer: 1,
        explain:
          'Like the probe table showed, two pair is strong against a capped range and wants to build the pot. Bottom pair and ace high check. They have showdown value but gain little by betting.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'BB checks the flop and BTN checks back. BB checks the turn too. Why can BTN now bet many hands?',
        choices: ['BB probes most of its strength, so its range is weak too', 'BTN’s flop check made its range stronger', 'BB can no longer raise on the turn'],
        answer: 0,
        explain: 'Like the delayed c-bet step said, after 2 checks BB’s range is weak too. So BTN can bet hands that checked to trap or for showdown. It also bets hands that improved and draws.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'A flop check back from the raiser is usually capped. So BB can probe the turn often.',
          'Probe with value hands, protection hands and draws. Check bottom pair and ace high.',
          'If BB checks the turn too, its range is weak. The raiser can then make a delayed c-bet.',
        ],
      },
    ],
  },
  {
    key: 'postflop/later-streets/barreling',
    level: 'core',
    minutes: 7,
    cover: { kind: 'cards', cards: 'JhTh', board: 'Kh7d2c4h' },
    steps: [
      {
        kind: 'intro',
        title: 'Keep firing, or stop',
        body: 'You bet the flop and got called. Every later street asks the same question. Do this card and this hand still want to bet? Good barrels depend on the turn card and your hand’s equity.',
      },
      {
        kind: 'board',
        title: 'Barrel on turns that help you',
        board: '8c6d2sAh',
        caption: 'You bet this flop and got called. The ace is an overcard you hold more of than the caller. Barrel more on turns like this. Blanks that change little are good too.',
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'Slow down on turns that help them',
        board: '8c6d2s5h',
        caption: 'Low connecting cards like this 5 can complete the caller’s straights. Flush cards help them too when they hold more of that draw.',
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
        board: 'Kh7d2c4h',
        choiceCards: ['JhTh', 'QcJc', '8c8s'],
        choices: ['J♥T♥', 'Q♣J♣', '8♣8♠'],
        answer: 0,
        explain:
          'Like the turn barrel hand showed, J♥T♥ now has a flush draw. So it wins sometimes when called. Q♣J♣ has no draw and little equity. 8♣8♠ has showdown value, so it usually checks.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: '3bet pot. The turn pot is 37.5bb with 81.5bb behind. Which size per street gets stacks in over the turn and river?',
        choices: ['184%', '100%', '66%', '33%'],
        answer: 2,
        explain:
          'First, 1 + 2 × 81.5 ÷ 37.5 = 5.35. Its square root is 2.31. Subtract 1 and halve it to get about 0.66. The 184% size is for a single raised pot, where stacks are deeper compared with the pot.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'You bet 8♣ 6♦ 2♠ and got called. Which turn is the best card to keep betting?',
        board: '8c6d2s',
        choiceCards: ['Ah', '5h', '4c'],
        choices: ['A♥', '5♥', '4♣'],
        answer: 0,
        explain: 'Like the turn boards showed, the ace is an overcard you hold more of than the caller. Low connecting cards like the 5 or 4 can complete the caller’s straights.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Barrel turns that help your range, like an overcard. Slow down on low cards that help theirs.',
          'Turn bluffs need equity. Bet flush draws and open enders, and give up hands with nothing.',
          'Geometric sizing is the reference for a polarized line. At SPR 2.2, two bets of about 66% get stacks in.',
        ],
      },
    ],
  },
  {
    key: 'postflop/multiway/multiway',
    level: 'core',
    minutes: 6,
    cover: {
      kind: 'bars',
      unit: '%',
      bars: [
        { label: 'Heads up', value: 60 },
        { label: '3 way', value: 36 },
        { label: '4 way', value: 21.6 },
        { label: '5 way', value: 13 },
      ],
    },
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
        kind: 'visual',
        title: 'Bluffs work far less',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Folds a half pot bluff needs', value: 33.3, tone: 'gray' },
            { label: '1 player who folds 50%', value: 50, tone: 'green' },
            { label: '3 players who fold 60% each', value: 21.6, tone: 'red' },
          ],
        },
        caption: 'Heads up, an opponent who folds 50% makes a half pot bluff profitable. Against 3 players who each fold 60%, all 3 fold only **21.6%** of the time. The bluff loses.',
        evidence: 'math',
      },
      {
        kind: 'visual',
        title: 'Top pair, good kicker vs more hands',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: '1 opponent', value: 86.4, tone: 'green' },
            { label: '2', value: 74.8 },
            { label: '3', value: 64.9 },
            { label: '4', value: 56.5, tone: 'red' },
          ],
        },
        caption:
          'This is K♠Q♦ on K♥8♣4♦ against random hands. The heads up number is exact. The rest come from 24 million random deals each. Real calling ranges beat random hands, so the true numbers are lower.',
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
        kind: 'visual',
        title: 'Each player defends less',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Heads up', value: 50, tone: 'gray' },
            { label: 'Each of 2 players', value: 29.3, tone: 'brass' },
            { label: 'Each of 3 players', value: 20.6, tone: 'green' },
          ],
        },
        caption:
          'Against a pot sized bet, the group must continue **50%** of the time together. With 2 players each needs **29.3%**, since 1 − (1 − x)² = 0.5. With 3 players each needs **20.6%**. Like MDF this is a river idea and a simplification. But each player can fold more than heads up.',
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
        explain: 'Like the table showed, multiply 0.6 × 0.6 × 0.6 to get 21.6%. The 36.0% figure is for 2 opponents. Each extra player multiplies the chance again.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'You bluff half pot into 2 opponents. Each folds 50% of the time, independently. How often does the bluff win?',
        choices: ['75%, so it profits', '50%, so it profits', '25%, so it loses'],
        answer: 2,
        explain:
          'Both must fold, and 0.5 × 0.5 = 25%. A half pot bluff needs 33.3% folds, so it loses. The 75% figure is the chance that at least one player folds, which does not win the pot.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'K♠Q♦ on K♥8♣4♦ has 86.4% against one random hand. About how much does it have against 4?',
        cards: 'KsQd',
        board: 'Kh8c4d',
        choices: ['About 86%', 'About 57%', 'About 25%'],
        answer: 1,
        explain: 'Like the bars showed, it falls to about 56.5% against 4 random hands. With more players, someone more often connects. So multiway you bet stronger hands for value.',
        point: 1,
      },
      {
        kind: 'takeaway',
        points: [
          'A bluff needs everyone to fold. Three players who each fold 60% all fold only 21.6%.',
          'Your equity drops with each extra player. So bet stronger hands for value.',
        ],
      },
    ],
  },
  {
    key: 'postflop/multiway/multiway-cbet',
    level: 'advanced',
    minutes: 6,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN', 'BB'], note: 'Three way pot' },
    steps: [
      {
        kind: 'intro',
        title: 'C-betting into two players',
        body: 'You open and 2 players call. Small bets with your whole range work well heads up. Multiway, that habit mostly stops working. The player in the middle and the check raiser face new problems too.',
      },
      {
        kind: 'visual',
        title: 'A three way pot',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['BTN', 'BB'], note: 'Three way pot' },
        caption: 'You open the cutoff. The button and the big blind call. The big blind acts first after the flop, and the button acts last.',
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
        kind: 'visual',
        title: 'Size depends on the board',
        art: {
          kind: 'tree',
          root: 'Multiway c-bet size',
          branches: [
            { label: 'Dry board, few hands continue', value: 'Smaller bets', tone: 'brass' },
            { label: 'Wet board, several draws', value: 'Bigger bets', tone: 'red' },
          ],
        },
        caption:
          'There is no single multiway size. On wet boards your strong hands face several draws at once. Protection is worth more there. This is a multiway idea. Heads up, size follows thick value instead.',
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
        kind: 'visual',
        title: 'Share the defense',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Heads up', value: 50, tone: 'gray' },
            { label: 'Each of 2 defenders', value: 29.3, tone: 'brass' },
          ],
        },
        caption: 'Against a pot sized river bet, heads up you defend roughly MDF (minimum defense frequency). With 2 defenders acting independently, each needs only **29.3%**. This is a simplification. But it is why each multiway defender can fold more.',
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
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'In a multiway pot, BB check raises the flop c-bet. What does that range mostly hold?',
        choices: ['Mostly pure bluffs', 'Strong hands and strong draws', 'Medium pairs that want protection'],
        answer: 1,
        explain:
          'Like the check raise step said, a bluff needs 2 players to fold. So multiway check raises lean toward value. Strong draws are the main semi bluffs. Medium pairs usually call.',
        point: 2,
      },
      {
        kind: 'quiz',
        question: 'You open the cutoff. The button and the big blind call. Compared with heads up, how do you c-bet?',
        choices: ['Less often, with stronger hands', 'Small with the whole range', 'More often, to fold out 2 players'],
        answer: 0,
        explain: 'Like the bet less step said, the range bet mostly disappears multiway. The bets that remain lean toward strong made hands and good draws. Medium hands check more.',
        point: 0,
      },
      {
        kind: 'takeaway',
        points: [
          'Multiway, c-bet less often and with stronger hands.',
          'The middle player continues tighter. The last player can call a bit wider.',
          'Multiway check raises are mostly strong hands and strong draws.',
        ],
      },
    ],
  },
];
