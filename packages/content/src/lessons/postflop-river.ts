import type { LessonContent } from './types';

export const POSTFLOP_RIVER_LESSONS: LessonContent[] = [
  {
    key: 'postflop/river/thin-value',
    level: 'core',
    minutes: 7,
    cover: { kind: 'cards', cards: 'KhJc', board: 'Ks9d8c3h2s' },
    steps: [
      {
        kind: 'intro',
        title: 'Value from worse hands',
        body: 'A thin value bet uses a hand that is not the nuts. It only needs to win more often than not when called. Missing these bets is a common leak.',
      },
      {
        kind: 'text',
        title: 'The rule',
        body: [
          'You are in position on the river, and villain checks. If you check, the hand goes to showdown.',
          'A bet only changes the result against hands that call. You win 1 extra bet from each worse hand that calls. You lose 1 bet to each better hand that calls.',
          'Ignoring raises, a bet makes money when you beat **more than half** of the calls. Chops cancel out. Worse hands that fold change nothing. A better hand that folds is a bonus.',
        ],
        evidence: 'math',
      },
      {
        kind: 'hand',
        title: 'The spot',
        cards: 'KhJc',
        board: 'Ks9d8c3h2s',
        caption:
          'BTN vs BB in a single raised pot. Villain called your flop and turn bets, then checked the river. You hold top pair with a jack kicker. Do you bet half pot or check back?',
      },
      {
        kind: 'table',
        title: 'A regular calls with a king or better',
        columns: ['Calls with', 'Combos', 'Vs K♥J♣'],
        rows: [
          ['KQ, K9s, K8s, K3s, K2s, 98s', '16', 'Behind'],
          ['99, 88, 33, 22', '12', 'Behind'],
          ['KJ', '6', 'Chop'],
          ['KT, K7s to K4s', '16', 'Ahead'],
        ],
        note:
          'This is an assumed calling range. BB 3bet AK before the flop and folded offsuit kings below KT earlier. Combos are exact, with your cards and the board removed. You are ahead of 16 and behind 28. Felt’s BB chart also defends K9o to K5o. Adding them gives 34 ahead and 38 behind, which is still a check.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'A station also calls with these',
        columns: ['Calls with', 'Combos', 'Vs K♥J♣'],
        rows: [
          ['QQ, JJ, TT', '15', 'Ahead'],
          ['A9, Q9s, J9s, T9s', '20', 'Ahead'],
          ['Plus the regular’s calls', '50', '16 ahead, 28 behind'],
        ],
        note: 'The station calls with everything the regular does. It adds second pair and more pocket pairs. In total you are ahead of 51 and behind 28, with 6 chops.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Same hand, two answers',
        body: [
          'Against the regular, you beat 16 of the 44 calls that do not chop. That is about **36%**. Betting loses 1 bet 28 times for every 16 times it wins 1. Check back.',
          'Against the station, you beat 51 of 79 calls. That is about **65%**, so bet.',
          'Thin value depends on who calls, not on how strong your hand feels.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How raises change it',
        body: [
          'Say villain raises only with better hands, and you fold. Nothing changes, since you lose 1 bet either way.',
          'Raises hurt in 2 ways. A bluff raise makes you fold the best hand. You lose your bet and a pot you would have won by checking.',
          'And if you call a value raise, you lose more than 1 bet. The more often villain raises, the further ahead of the calls you need to be.',
          'The tables above count sets and two pair as calls. If they raise and you fold, the count still holds. If villain also bluff raises, check more medium hands.',
        ],
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'The rule assumes a free showdown',
        body: 'Out of position, checking does not promise a showdown. Villain may bet or bluff. So compare betting with your plan after a check, like check and call.',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live callers',
        body: 'Many live low stakes players call rivers with any pair and rarely bluff raise. If a player fits that, bet thinner than a solver would. Against players who only call with strong hands, check medium hands back. Confirm both tendencies in your logs.',
      },
      {
        kind: 'quiz',
        question: 'Villain never raises. Your bet would get called by 14 worse combos and 12 better ones. Another 4 combos chop. Bet or check?',
        choices: ['It is exactly break even', 'Check, since you are behind too often', 'Bet, since you beat most of the calls'],
        answer: 2,
        explain:
          'Leave out the chops. You beat 14 of 26 calls, about 54%. Betting gains 2 bets over those 26 calls. Counting the chops as losses is the usual mistake.',
      },
      {
        kind: 'quiz',
        question: 'Two players call with the same 10 better combos. Player A also calls with 8 worse combos, and player B with 14. Neither raises. Who should you bet against?',
        choices: ['Only player B', 'Only player A', 'Both of them', 'Neither of them'],
        answer: 0,
        explain: 'You beat 8 of 18 calls from A, so check. You beat 14 of 24 from B, so bet. The hand is the same. The calling range decides.',
      },
      {
        kind: 'visual',
        title: 'Share of calls you beat',
        art: {
          kind: 'bars',
          unit: '%',
          bars: [
            { label: 'Regular’s calls', value: 36.4, tone: 'red' },
            { label: 'Station’s calls', value: 64.6, tone: 'green' },
          ],
        },
        caption: 'A thin value bet must beat more than half of the calls. K♥J♣ beats **36.4%** of the regular’s calls. It beats **64.6%** of the station’s.',
        evidence: 'math',
      },
      {
        kind: 'takeaway',
        points: [
          'Bet when you beat more than half of the hands that call.',
          'Bluff raises make thin bets worse. So do value raises you call.',
          'Count this opponent’s calling range, not a generic one.',
        ],
      },
    ],
  },
  {
    key: 'postflop/river/overbets',
    level: 'advanced',
    minutes: 7,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'Pot', value: 100, tone: 'gray' },
        { label: 'Overbet', value: 200, tone: 'red' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Bet more than the pot',
        body: 'An overbet is a bet bigger than the pot. It fits one situation. Your range holds many more of the strongest hands than villain’s. And villain’s line has capped their range.',
      },
      {
        kind: 'text',
        title: 'Nut advantage against a capped range',
        body: [
          'A range is capped when the line has removed most of its strongest hands. Those hands would have raised earlier, for example.',
          'If you hold many nut hands and villain holds few, villain cannot punish a big bet with raises. Their best hands are medium bluff catchers. A bigger bet charges those hands more each time they call.',
          'This is why overbets show up mostly on turns and rivers. Ranges are narrower there, and the gap in nut hands is widest.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'table',
        title: 'What big bets ask of the caller',
        columns: ['Bet', 'Bluff needs', 'MDF', 'Bluff share'],
        rows: [
          ['½ pot', '33.3%', '66.7%', '25.0%'],
          ['Pot', '50.0%', '50.0%', '33.3%'],
          ['1.5x pot', '60.0%', '40.0%', '37.5%'],
          ['2x pot', '66.7%', '33.3%', '40.0%'],
        ],
        note:
          'Bluff needs (alpha) = bet ÷ (pot + bet). MDF (minimum defense frequency) = pot ÷ (pot + bet). Bluff share = bet ÷ (pot + 2 × bet). It is the share of bluffs that makes a bluff catcher break even. These are river ideas.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'What villain needs',
        body: [
          'Facing a 2x pot bet, villain calls 2 to win 3. So a call needs **40.0%** equity. At 1.5x pot, it needs **37.5%**.',
          'In return, you may bluff more. At 2x pot, 40.0% of your betting range can be bluffs. That is 2 bluffs for every 3 value bets.',
          'MDF falls to 33.3% at 2x pot. So villain may fold up to 66.7% of their range. If they fold more than that, your bluffs profit.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Polar, not merged',
        body: [
          'An overbet range is polar. It holds very strong hands and bluffs.',
          'Medium hands do not overbet. Worse hands fold to a big bet and better hands call. So the bet only loses value.',
          'Value overbets need hands that almost always beat the bluff catchers that call. Bluffs need no showdown value and the right blockers.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Choosing the bluff',
        cards: 'Ad3d',
        board: 'JhTs4d2cQc',
        caption:
          'AK makes the nut straight here. Holding an ace cuts villain’s AK from **16** combos to **12**. The nuts never folds to an overbet and may raise. So a missed hand with an ace makes a better bluff than one without.',
      },
      {
        kind: 'text',
        title: 'When not to overbet',
        body: [
          'Skip the overbet when villain is not capped and holds as many strong hands as you.',
          'Skip it when your range is full of medium hands that want calls from worse.',
          'Skip it when a smaller bet already gets the stacks in by the river.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Adjust the mix, not the size',
        body: 'Some players call big bets with any pair. Against them, overbet your nut hands often and bluff rarely. Other players fold most hands to big bets. Against them, overbet bluffs gain. Confirm both tendencies in your logs.',
      },
      {
        kind: 'quiz',
        question: 'You bet 1.5 times the pot as a pure bluff. How often must villain fold for it to break even?',
        choices: ['40.0%', '50.0%', '60.0%', '66.7%'],
        answer: 2,
        explain: 'Alpha is 1.5 ÷ (1 + 1.5), which is 60.0%. The 40.0% figure is the MDF, the share villain must continue with.',
      },
      {
        kind: 'quiz',
        question: 'Villain’s range is capped at one pair. Which of your hands should overbet the river?',
        choices: ['Top pair, weak kicker', 'The nut straight', 'Second pair'],
        answer: 1,
        explain:
          'Overbets are polar. The nuts gets the most from villain’s bluff catchers. Top pair with a weak kicker gains little from worse hands. At a big size it mostly gets called by better.',
      },
      {
        kind: 'quiz',
        question: 'At a 2x pot river bet, what share of a balanced betting range can be bluffs?',
        choices: ['20.0%', '25.0%', '33.3%', '40.0%'],
        answer: 3,
        explain:
          'Bluff share is 2 ÷ (1 + 2 × 2), which is 40.0%. A bluff catcher then breaks even. It calls 2 to win 3 and wins 40.0% of the time. The 33.3% figure is the MDF, not the bluff share.',
      },
      {
        kind: 'takeaway',
        points: [
          'Overbet with a nut advantage against a capped range.',
          'Overbet ranges are polar, with nut hands and well chosen bluffs.',
          'At 2x pot, villain needs 40.0% equity to call. You may bluff with 40.0% of your range.',
        ],
      },
    ],
  },
  {
    key: 'postflop/river/block-bets',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'Pot', value: 40, tone: 'gray' },
        { label: 'Block bet', value: 10, tone: 'red' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Small river bets',
        body: 'A bet of a quarter to a third of the pot does different jobs from a big one. It can set your own price out of position. It can also get thin value from many worse hands. Its weakness is the raise.',
      },
      {
        kind: 'table',
        title: 'The price a small bet gives',
        columns: ['Bet', 'Call needs', 'Bluff needs', 'MDF'],
        rows: [
          ['¼ pot', '16.7%', '20.0%', '80.0%'],
          ['⅓ pot', '20.0%', '25.0%', '75.0%'],
          ['½ pot', '25.0%', '33.3%', '66.7%'],
          ['¾ pot', '30.0%', '42.9%', '57.1%'],
        ],
        note: 'Call needs = bet ÷ (pot + 2 × bet). Bluff needs = bet ÷ (pot + bet). MDF (minimum defense frequency) = pot ÷ (pot + bet).',
        evidence: 'math',
      },
      {
        kind: 'formula',
        title: 'The block bet',
        formula: 'Lead 10 into 40 instead of facing 30',
        example:
          'Out of position with a medium hand, you check. Villain bets 30 into 40, and calling needs **30.0%** equity. Lead 10 instead. If villain just calls, the hand costs you 10. You chose the price.',
      },
      {
        kind: 'text',
        title: 'Small bets as merged value',
        body: [
          'A small bet gets called by far more hands than a big one. Many of those hands are worse.',
          'That lets medium hands bet for value. A big bet would fold out everything worse.',
          'Solver strategies often use small river bets with wide ranges. Those hold many medium and strong value hands, plus some bluffs.',
          'The thin value rule still applies. Beat more than half of what calls.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'text',
        title: 'The risk is the raise',
        body: [
          'A small bet invites a raise. Say you lead 10 into 40 and villain raises to 40. Their bluff risks 40 to win 50. It needs folds only **44.4%** of the time.',
          'Say your small bets are all medium hands. Then you fold too often, and villain can raise any two cards.',
          'You lose your bet and a pot you might have won at showdown. Some strong hands in your small bets keep raises honest.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Facing a small bet',
        body: ['At a quarter pot, you need only **16.7%** equity to call. MDF is **80.0%**.'],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'How to respond',
        body: [
          'Against a balanced player, folding a bluff catcher to a small bet is rarely right.',
          'Raise for value when you beat more than half of the hands that call a raise. Raise as a bluff only when you expect many medium hands to fold.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live small bets',
        body: 'In many live low stakes games, small river bets are often medium hands. Those players want a cheap showdown. Some players bet tiny with the nuts to get called, though. Learn which type each player is. Some players rarely raise the river without a strong hand. Against them, block betting medium hands is cheap. When they do raise, fold most of those hands.',
      },
      {
        kind: 'quiz',
        question: 'Villain bets a quarter of the pot on the river. What equity do you need to call?',
        choices: ['16.7%', '20.0%', '25.0%', '33.3%'],
        answer: 0,
        explain: 'You call 0.25 to win a final pot of 1.5. That is 0.25 ÷ 1.5, or 16.7%. The 20.0% figure is the folds a quarter pot bluff needs, not your price.',
      },
      {
        kind: 'quiz',
        question: 'Your river leads are always 25% pot with medium hands, and you fold to raises. What is the best counter for a thinking opponent?',
        choices: ['Call your leads more often', 'Fold to your leads more often', 'Raise more often as a bluff'],
        answer: 2,
        explain:
          'Your small bet range is capped and folds too much to raises. Against a lead of 10 into 40, a raise to 40 needs only 44.4% folds. Just calling lets you reach a cheap showdown, which is what you want.',
      },
      {
        kind: 'takeaway',
        points: [
          'Small bets set your price and get thin value from many worse hands.',
          'Their weakness is the raise. Keep some strong hands in the range.',
          'Facing a quarter pot bet, you need only 16.7% equity.',
        ],
      },
    ],
  },
  {
    key: 'postflop/river/river-raises',
    level: 'advanced',
    minutes: 6,
    cover: {
      kind: 'bars',
      bars: [
        { label: 'Pot', value: 100, tone: 'gray' },
        { label: 'Bet', value: 50, tone: 'red' },
        { label: 'Raise to', value: 150, tone: 'purple' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Raising a river bet',
        body: 'A river raise comes after villain has already chosen to bet. Their bluffs fold to it, and only their value hands call. So a value raise must beat that value. A bluff raise must find enough folds.',
      },
      {
        kind: 'formula',
        title: 'What a bluff raise needs',
        formula: 'Folds needed = raise ÷ (pot + bet + raise)',
        parts: [
          ['pot', 'the pot before villain’s bet'],
          ['bet', 'villain’s bet'],
          ['raise', 'the total you raise to'],
        ],
        example: 'The pot is 100 and villain bets 50. You raise to 150, risking 150 to win 150. Villain must fold **50.0%** of the time.',
      },
      {
        kind: 'table',
        title: 'Raising to 3 times the bet',
        columns: ['Villain bets', 'Raise to', 'Bluff needs', 'Villain needs'],
        rows: [
          ['25', '75', '37.5%', '20.0%'],
          ['50', '150', '50.0%', '25.0%'],
          ['75', '225', '56.3%', '27.3%'],
          ['100', '300', '60.0%', '28.6%'],
        ],
        note: 'The pot is 100 before villain’s bet. Bluff needs is the fold rate that makes a zero equity raise break even. Villain needs is the equity villain needs to call the raise.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Size choices',
        body: [
          'Smaller raises are cheaper bluffs, but they give villain a better price.',
          'Against a bet of 50 into 100, a raise to 100 needs **40.0%** folds. Villain then needs only **16.7%** to call.',
          'A raise to 200 needs **57.1%** folds. Villain then needs **30.0%** to call.',
          'When the stack behind is small compared with the pot, all in is usually the natural raise.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'The value raise threshold',
        body: [
          'Compare raising with calling. Bluffs fold to the raise, so you win the same pot as by calling.',
          'Against hands that call the raise, you win the extra amount from each worse hand. You lose it to each better hand.',
          'So raise for value only when you beat **more than half of the hands that call a raise**. If villain can reraise, the bar is higher still.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Why the bar is so high',
        body: [
          'The hands that call a river raise are the value part of villain’s betting range. Beating half of those usually takes one of the best few hands on the board.',
          'Strong hands that are not near the nuts often just call. Top two pair on a wet board is an example.',
          'This is why solver river raise ranges are polar and very strong.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live river raises are rarely bluffs',
        body: 'In many live low stakes pools, river raises are mostly strong value. Bluff raises are rare, especially from passive players. If that fits the player, fold one pair and many two pair hands to a river raise. Call with hands that beat their value. Confirm this with your own logged hands.',
      },
      {
        kind: 'quiz',
        question: 'The pot is 100. Villain bets 75 and you raise to 225 as a bluff. How often must villain fold?',
        choices: ['37.5%', '42.9%', '50.0%', '56.3%'],
        answer: 3,
        explain: 'Folds needed are 225 ÷ (100 + 75 + 225). That is 225 ÷ 400, or 56.3%. The 42.9% figure is what villain’s own bet of 75 needed.',
      },
      {
        kind: 'quiz',
        question: 'Villain bets the river. Of the hands that would call your raise, you beat 5 combos and lose to 7. Villain never reraises. Raise or call?',
        choices: ['Raise, since bluffs fold either way', 'Call, since you beat fewer than half', 'Raise, since 5 of 12 is close enough'],
        answer: 1,
        explain:
          'Bluffs fold to a raise, but you win the same pot by calling. Against the 12 hands that call, you win the extra 5 times and lose it 7 times. So the raise only adds a loss.',
      },
      {
        kind: 'quiz',
        question: 'A passive live regular raises your river value bet. You hold top pair, top kicker. What is the default play?',
        choices: ['Call', 'Reraise all in', 'Fold'],
        answer: 2,
        explain:
          'This rests on a pool assumption. Passive players rarely bluff raise the river, and their value raises beat one pair. Calling to keep them honest loses if they almost never bluff. Fold unless your notes show this player bluff raises.',
      },
      {
        kind: 'takeaway',
        points: [
          'Folds a bluff raise needs = raise ÷ (pot + bet + raise).',
          'Value raise only when you beat more than half of the hands that call it.',
          'In most live pools, river raises are mostly value. Fold one pair by default and check your notes.',
        ],
      },
    ],
  },
  {
    key: 'postflop/3bet-postflop/cbet-3bp',
    level: 'core',
    minutes: 6,
    cover: {
      kind: 'chips',
      stacks: [
        { label: 'Pot', bb: 22.5 },
        { label: 'Behind', bb: 89 },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Bigger pot, shorter stacks',
        body: 'In a 3bet pot, the pot is large and the stacks behind are small next to it. Both ranges are narrower. The 3bettor holds most of the premium hands. That changes how often and how big to c-bet.',
      },
      {
        kind: 'table',
        title: 'Stack to pot ratio on the flop',
        columns: ['Pot', 'Pot size', 'Behind', 'SPR'],
        rows: [
          ['Single raised, BTN vs BB', '5.5', '97.5', '17.7'],
          ['BB 3bets BTN to 11', '22.5', '89', '4.0'],
          ['BTN 3bets CO to 7.5', '16.5', '92.5', '5.6'],
        ],
        note: 'Stacks are 100bb and opens are 2.5bb. The 3bet gets called, and blinds that fold stay in the pot. SPR (stack to pot ratio) = stack behind ÷ pot.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Two different ranges',
        body: [
          'The 3bettor’s range holds most of the AA to QQ and AK. It adds some bluffs like suited aces and suited connectors.',
          'The caller’s range is condensed. It 4bets many of its best hands and folds its weakest. What is left is mostly medium pairs and suited hands.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'board',
        title: 'High boards favor the 3bettor',
        board: 'AsKd7c',
        caption:
          'The 3bettor has more of the top sets and AK. So it has both the range and the nut advantage. The caller has many weaker aces and kings, plus lower pairs. Solvers usually c-bet here very often, mostly small.',
        evidence: 'solver',
      },
      {
        kind: 'formula',
        title: 'Why small is enough',
        formula: 'Flop ⅓ pot, then about 66% twice',
        example:
          'The pot is 22.5bb with 89bb behind. Bet 7.5bb and get called. The pot is now 37.5bb with 81.5bb behind, an SPR of **2.2**. Two bets of about **66%** pot on the turn and river get the stacks in. A small flop bet leaves no money stranded.',
      },
      {
        kind: 'text',
        title: 'Smaller and more often',
        body: [
          'On boards that favor the 3bettor, solvers often c-bet a large share of the range. The usual size is small, around a third of the pot or less.',
          'The caller’s condensed range has many medium hands that must call. It has few hands that can raise.',
          'On low and middling connected boards like 7♥6♥5♣, the caller’s pairs and suited connectors connect. The 3bettor bets less often there.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'callout',
        tone: 'exploit',
        title: 'Live 3bet callers',
        body: 'Many live players call 3bets with small pairs and suited connectors. Then they rarely fold a pair. If your notes show this, value bet top pair and overpairs on all 3 streets. Bluff less.',
      },
      {
        kind: 'quiz',
        question: 'The pot is 22.5bb on the flop with 89bb behind. What is the SPR?',
        choices: ['About 2', 'About 4', 'About 9', 'About 18'],
        answer: 1,
        explain: 'SPR is 89 ÷ 22.5, which is 3.96. About 18 is the SPR of a single raised pot.',
      },
      {
        kind: 'quiz',
        question: 'BB 3bet and BTN called. Which flop does BB c-bet most often?',
        choiceCards: ['9s8s6d', '7h6h5c', 'AsKd7c'],
        choices: ['9♠ 8♠ 6♦', '7♥ 6♥ 5♣', 'A♠ K♦ 7♣'],
        answer: 2,
        explain:
          'An ace king high flop favors the 3bettor’s big pairs and AK. Low and middling connected boards hit the caller’s pairs and suited connectors.',
      },
      {
        kind: 'takeaway',
        points: [
          '3bet pots start near SPR 4 to 6 at 100bb.',
          'On high boards, the 3bettor has the range and nut advantage. Bet often and small.',
          'The caller’s range is condensed. Low connected boards favor it.',
        ],
      },
    ],
  },
  {
    key: 'postflop/3bet-postflop/low-spr',
    level: 'core',
    minutes: 7,
    cover: { kind: 'cards', cards: 'QhQd', board: 'Js7d3c' },
    steps: [
      {
        kind: 'intro',
        title: 'When one pair is a big hand',
        body: 'The lower the stack to pot ratio, the fewer bets are left to make. At low SPR, hands that would play a small pot deep now want to get all in.',
      },
      {
        kind: 'table',
        title: 'Typical SPRs at 100bb',
        columns: ['Pot', 'Pot size', 'Behind', 'SPR'],
        rows: [
          ['Single raised, BTN vs BB', '5.5', '97.5', '17.7'],
          ['3bet, BB vs BTN', '22.5', '89', '4.0'],
          ['4bet, CO 4bets BTN to 20', '41.5', '80', '1.9'],
        ],
        note: 'Opens are 2.5bb. BB 3bets to 11bb, and BTN 3bets to 7.5bb. CO 4bets to 20bb. Blinds that fold stay in the pot.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Geometric bet sizes',
        columns: ['SPR', '2 streets', '3 streets'],
        rows: [
          ['1', '36.6%', '22.1%'],
          ['2', '61.8%', '35.5%'],
          ['3', '82.3%', '45.6%'],
          ['4', '100.0%', '54.0%'],
        ],
        note: 'Each size is the same pot fraction on every street that gets the stacks in by the river. f = ((1 + 2 × SPR)^(1/streets) − 1) ÷ 2.',
        evidence: 'math',
      },
      {
        kind: 'table',
        title: 'Calling an all in',
        columns: ['SPR', 'Equity needed'],
        rows: [
          ['1', '33.3%'],
          ['2', '40.0%'],
          ['3', '42.9%'],
          ['4', '44.4%'],
        ],
        note: 'Villain shoves SPR × pot before you have bet. You need SPR ÷ (1 + 2 × SPR). The price gets closer to 50% as SPR grows.',
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Bet, then shoved on',
        body: [
          'Take a pot of 1 with 4 behind. You bet a third of the pot and villain shoves. You call 3.67 to win a final pot of 9. You need **40.7%** equity.',
          'Once you put money in, the price to call the rest keeps getting better. So commitment is decided early. If you will not call a shove, think hard before betting into a low SPR pot.',
        ],
        evidence: 'math',
      },
      {
        kind: 'text',
        title: 'Top pair and overpairs',
        body: [
          'Say the SPR is below about 3 to 4. Top pair with a good kicker usually plans to get the stacks in. Overpairs do too.',
          'Villain’s range that puts money in includes worse pairs and draws. The price for the last bets is also good.',
          'At SPR 10 or more, the same hands more often play a smaller pot. When stacks go in deep, villain more often holds two pair or better.',
        ],
        evidence: 'solver',
      },
      {
        kind: 'hand',
        title: 'Overpair at SPR 4',
        cards: 'QhQd',
        board: 'Js7d3c',
        caption:
          'You 3bet and got called. The pot is 22.5bb with 89bb behind, an SPR of 3.96. Bet about **54%** on 3 streets, or about **99%** on 2. Either way the stacks go in by the river. Villain has many jacks and smaller pairs, so queens are happy to get it in.',
      },
      {
        kind: 'callout',
        tone: 'theory',
        title: 'Deep stacks change the plan',
        body: 'At 200bb, the same 3bet pot of 22.5bb leaves 189bb behind. That is an SPR of 8.4. Overpairs are no longer automatically committed. Check the stacks before you plan the hand.',
      },
      {
        kind: 'quiz',
        question: 'SPR 2 on the turn. What pot fraction on the turn and river gets the stacks in?',
        choices: ['33.3%', '50.0%', '61.8%', '100.0%'],
        answer: 2,
        explain: 'The size is (√5 − 1) ÷ 2 = 0.618. Each bet grows the pot by 1 + 2 × 0.618 = 2.236. And 2.236² = 5, which is 1 + 2 × SPR.',
      },
      {
        kind: 'quiz',
        question: 'Villain shoves 3 times the pot, and you have not bet. What equity do you need to call?',
        choices: ['33.3%', '42.9%', '50.0%', '75.0%'],
        answer: 1,
        explain: 'You call 3 to win a final pot of 7. That is 3 ÷ 7, or 42.9%. The 75.0% figure is the folds villain’s shove needs as a bluff, not your price.',
      },
      {
        kind: 'quiz',
        question: 'At which SPR is getting all in on the flop with top pair, top kicker most natural?',
        choices: ['SPR 2', 'SPR 8', 'SPR 12'],
        answer: 0,
        explain:
          'At SPR 2, only 2 pots are left behind. Villain’s calling and shoving ranges include many worse hands. Deeper, a big pot more often comes from hands that beat one pair.',
      },
      {
        kind: 'visual',
        title: 'Lower SPR, cheaper calls',
        art: {
          kind: 'curve',
          points: [
            [0.5, 25],
            [1, 33.3],
            [1.5, 37.5],
            [2, 40],
            [3, 42.9],
            [4, 44.4],
            [6, 46.2],
            [8, 47.1],
            [10, 47.6],
          ],
          xLabel: 'SPR',
          yLabel: 'Equity to call a shove, %',
          mark: [4, 44.4],
        },
        caption: 'Facing a shove of SPR times the pot, you need SPR ÷ (1 + 2 × SPR). That is **33.3%** at SPR 1 and **44.4%** at SPR 4.',
        evidence: 'math',
      },
      {
        kind: 'takeaway',
        points: [
          'Below about SPR 3 to 4, top pair and overpairs usually get the stacks in.',
          'Geometric sizes shrink as SPR falls. At SPR 4 it is 54.0% over 3 streets.',
          'Calling a shove needs SPR ÷ (1 + 2 × SPR) equity. That is 33.3% at SPR 1 and 44.4% at SPR 4.',
        ],
      },
    ],
  },
];
