/**
 * Poker terms in plain words. Every abbreviation and piece of jargon a
 * lesson uses is here (the content tests enforce it), so the app can explain
 * any term wherever it appears: tap an underlined term for its meaning, or
 * browse them all on the Glossary page.
 */
export interface GlossaryTerm {
  id: string;
  /** How the term is written, like "TAG" or "pot odds". */
  term: string;
  /** Other ways a lesson writes it, like "TAGs" or "tight aggressive". */
  aliases?: string[];
  /** One or two short plain sentences. */
  short: string;
  /** The lesson that teaches it, when one does. */
  lesson?: string;
  /**
   * False for everyday words a reader meets in the first lesson (pot, fold).
   * They stay on the Glossary page but are not underlined in lessons.
   */
  link?: boolean;
  /**
   * Phrases where a spelling means something else, like "your turn" for the
   * turn card or "set aside" for a set. They are never matched.
   */
  except?: string[];
}

/*
 * Spellings with a capital letter match only as written ("TAG", "BB", "Nash"),
 * so add a capitalised alias where a mixed case term starts a sentence
 * ("Chip EV"). Spellings in lower case match in any case. Spellings that
 * start with "bb" or "mbb" also match right after a number ("2.5bb").
 */
export const GLOSSARY: GlossaryTerm[] = [
  // The game and the table
  {
    id: 'nlhe',
    term: 'No Limit Hold’em',
    aliases: ['No Limit', 'Hold’em', 'NLH', 'NLHE'],
    short: 'The poker game Felt teaches. Each player gets 2 private cards and may bet any amount up to all their chips.',
    lesson: 'basics/rules/goal',
  },
  {
    id: 'pot',
    term: 'pot',
    aliases: ['pots'],
    short: 'All the chips bet in a hand, piled in the middle. The winner of the hand takes it.',
    lesson: 'basics/rules/goal',
    link: false,
  },
  {
    id: 'chips',
    term: 'chips',
    aliases: ['chip'],
    short: 'The tokens players bet with. In a cash game each one is worth real money.',
    lesson: 'basics/rules/goal',
    link: false,
  },
  {
    id: 'hand',
    term: 'hand',
    aliases: ['hands'],
    short: 'Your best 5 cards from your 2 private cards and the 5 shared ones. It also means one deal from start to finish.',
    lesson: 'basics/rules/goal',
    link: false,
  },
  {
    id: 'board',
    term: 'board',
    aliases: ['boards', 'community cards'],
    short: 'The shared cards dealt face up in the middle. Every player can use them.',
    lesson: 'basics/rules/goal',
    link: false,
  },
  {
    id: 'hole-cards',
    term: 'hole cards',
    aliases: ['hole card'],
    short: 'Your 2 private cards, dealt face down. Only you can see them.',
    lesson: 'basics/rules/goal',
  },
  {
    id: 'dealer',
    term: 'dealer',
    aliases: ['dealers'],
    short: 'The person who shuffles, deals and moves chips into the pot. Card rooms hire one for each table.',
    lesson: 'basics/money/card-room',
    link: false,
  },
  {
    id: 'fold',
    term: 'fold',
    aliases: ['folds', 'folded', 'folding'],
    short: 'To give up your hand and any chips you already put in. You cannot win that pot.',
    lesson: 'basics/rules/actions',
    link: false,
  },
  {
    id: 'check',
    term: 'check',
    aliases: ['checks', 'checked', 'checking'],
    short: 'To pass without putting in chips. You can only do it when there is no bet for you to match.',
    lesson: 'basics/rules/actions',
    link: false,
  },
  {
    id: 'bet',
    term: 'bet',
    aliases: ['bets', 'betting', 'bettor', 'bettors'],
    short: 'To put chips in when nobody has yet this round. The others must match it to stay in.',
    lesson: 'basics/rules/actions',
    link: false,
  },
  {
    id: 'call',
    term: 'call',
    aliases: ['calls', 'called', 'calling', 'caller', 'callers'],
    short: 'To match the current bet and stay in the hand.',
    lesson: 'basics/rules/actions',
    link: false,
  },
  {
    id: 'raise',
    term: 'raise',
    aliases: ['raises', 'raised', 'raising', 'raiser', 'raisers'],
    short: 'To match the current bet and add more. The others must match the new total.',
    lesson: 'basics/rules/actions',
    link: false,
  },
  {
    id: 'reraise',
    term: 'reraise',
    aliases: ['reraises', 'reraised', 'reraising', 're-raise'],
    short: 'A raise over another player’s raise.',
    lesson: 'basics/rules/actions',
  },
  {
    id: 'min-raise',
    term: 'min raise',
    aliases: ['min raises', 'minraise', 'min-raise'],
    short: 'The smallest raise the rules allow. It adds as much as the last bet or raise.',
    lesson: 'basics/rules/actions',
  },
  {
    id: 'all-in',
    term: 'all in',
    link: false,
    aliases: ['all ins', 'all-in', 'going all in'],
    short: 'Betting every chip you have in front of you. You can then win only what you matched from each player.',
    lesson: 'basics/rules/side-pots',
  },
  {
    id: 'shove',
    term: 'shove',
    link: false,
    aliases: ['shoves', 'shoved', 'shoving', 'shover', 'jam', 'jams', 'jammed'],
    short: 'To go all in with a bet or raise. It puts your whole stack in at once.',
    lesson: 'tournaments/mtt-basics/push-fold',
  },
  {
    id: 'blinds',
    term: 'blinds',
    link: false,
    aliases: ['blind'],
    short: 'The 2 forced bets posted before any cards are dealt. They give every pot something to win.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'small-blind',
    term: 'small blind',
    link: false,
    aliases: ['SB', 'small blinds'],
    short: 'The smaller forced bet, posted by the seat just left of the button. The player in that seat is the SB.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'big-blind',
    term: 'big blind',
    link: false,
    aliases: ['BB', 'big blinds'],
    short: 'The larger forced bet, posted 2 seats left of the button. The player in that seat is the BB.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'bb',
    term: 'bb',
    short: 'Short for big blinds, the unit Felt counts in. A 10bb bet is 10 times the big blind at any stakes.',
    lesson: 'basics/first-strategy/big-blinds',
  },
  {
    id: 'ante',
    term: 'ante',
    aliases: ['antes'],
    short: 'A small forced bet posted before the deal on top of the blinds. Antes are common in tournaments.',
    lesson: 'tournaments/mtt-basics/antes',
  },
  {
    id: 'bb-ante',
    term: 'big blind ante',
    aliases: ['BB ante', 'big blind antes'],
    short: 'One ante paid by the big blind for the whole table. It replaces a small ante from every player.',
    lesson: 'tournaments/mtt-basics/antes',
  },
  {
    id: 'straddle',
    term: 'straddle',
    link: false,
    aliases: ['straddles', 'straddled', 'straddler', 'straddling'],
    short: 'An optional third blind of 2bb, usually posted under the gun before the deal. It doubles the stakes of the hand.',
    lesson: 'preflop/live-preflop/straddles',
  },
  {
    id: 'dead-money',
    term: 'dead money',
    short: 'Chips already in the pot before you act, such as the blinds and antes. You win them all if everyone folds.',
    lesson: 'preflop/vs-open/squeeze',
  },
  {
    id: 'button',
    term: 'button',
    link: false,
    aliases: ['BTN', 'buttons', 'dealer button'],
    short: 'The seat marked by a disc that moves 1 seat left each hand. It acts last after the flop and is written BTN.',
    lesson: 'basics/first-strategy/position',
    except: ['call button'],
  },
  {
    id: 'street',
    term: 'street',
    link: false,
    aliases: ['streets'],
    short: 'One round of betting. A hand has 4 of them, from preflop to the river.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'preflop',
    term: 'preflop',
    link: false,
    aliases: ['pre-flop'],
    short: 'The first betting round. It comes after the hole cards are dealt and before the flop.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'flop',
    term: 'flop',
    link: false,
    aliases: ['flops', 'flopped', 'flopping'],
    short: 'The first 3 shared cards, dealt face up together. It also names the betting round that follows.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'turn',
    term: 'turn',
    link: false,
    aliases: ['turn card', 'turn cards', 'turned'],
    short: 'The 4th shared card. It also names the betting round that follows.',
    lesson: 'basics/rules/hand-flow',
    except: [
      'your turn',
      'their turn',
      'my turn',
      'in turn',
      'turns',
      'turn both',
      'turn into',
      'turned over',
      'turns into',
      'turn a bet',
    ],
  },
  {
    id: 'river',
    term: 'river',
    link: false,
    aliases: ['rivers', 'rivered'],
    short: 'The 5th and last shared card. It also names the last betting round.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'postflop',
    term: 'postflop',
    link: false,
    aliases: ['post-flop', 'after the flop'],
    short: 'Every betting round once the flop is dealt. That is the flop, turn and river.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'showdown',
    term: 'showdown',
    link: false,
    aliases: ['showdowns', 'show down', 'shows down'],
    short: 'When the players left after the last bet show their cards. The best hand wins the pot.',
    lesson: 'basics/rules/hand-flow',
  },
  {
    id: 'muck',
    term: 'muck',
    aliases: ['mucked', 'mucks', 'the muck'],
    short: 'The pile of folded cards. A hand that lands there is dead and cannot win.',
    lesson: 'basics/rules/table-rules',
  },
  {
    id: 'string-bet',
    term: 'string bet',
    aliases: ['string bets'],
    short: 'Putting chips out in 2 motions without first saying raise. The dealer usually rules it a call.',
    lesson: 'basics/rules/table-rules',
  },
  {
    id: 'one-chip-rule',
    term: 'one chip rule',
    aliases: ['one chip'],
    short: 'Facing a bet, 1 big chip put out without a word counts only as a call.',
    lesson: 'basics/rules/table-rules',
  },
  {
    id: 'binding',
    term: 'binding',
    short: 'An action you must stand by once you say it. In most rooms your words on your turn count this way.',
    lesson: 'basics/rules/table-rules',
  },
  {
    id: 'out-of-turn',
    term: 'out of turn',
    short: 'Acting before the action reaches you. It can give away information and may still count.',
    lesson: 'basics/rules/table-rules',
  },
  {
    id: 'table-stakes',
    term: 'table stakes',
    short: 'The rule that you can only bet the chips in front of you. Money in your pocket cannot join a hand.',
    lesson: 'basics/rules/table-rules',
  },
  {
    id: 'side-pot',
    term: 'side pot',
    aliases: ['side pots'],
    short: 'An extra pot for chips that a player who is all in cannot match. Only the players who matched them can win it.',
    lesson: 'basics/rules/side-pots',
  },
  {
    id: 'main-pot',
    term: 'main pot',
    aliases: ['main pots'],
    short: 'The pot every player in the hand can win. The smallest all in stack sets its size.',
    lesson: 'basics/rules/side-pots',
  },
  {
    id: 'split-pot',
    term: 'split pot',
    aliases: ['split the pot', 'chop', 'chops', 'chopped'],
    short: 'When 2 or more best hands tie and share the pot equally. Suits never break a tie.',
    lesson: 'basics/rules/best-five',
  },
  {
    id: 'playing-the-board',
    term: 'playing the board',
    aliases: ['play the board', 'plays the board'],
    short: 'When the 5 board cards are your best hand. Everyone still in can do the same.',
    lesson: 'basics/rules/best-five',
  },

  // Hand rankings and made hands
  {
    id: 'high-card',
    term: 'high card',
    link: false,
    aliases: ['high cards'],
    short: 'A hand with no pair or better. The highest card decides it.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'ace-high',
    term: 'ace high',
    aliases: ['king high', 'jack high', 'queen high'],
    short: 'With an ace as the highest card. For a hand it means no pair, just an ace on top.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'pair',
    term: 'one pair',
    link: false,
    aliases: ['pair', 'pairs'],
    short: '2 cards of the same rank, like 2 kings. It ranks just above high card.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'two-pair',
    term: 'two pair',
    link: false,
    aliases: ['top two pair'],
    short: '2 cards of one rank and 2 of another, like kings and nines.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'trips',
    term: 'trips',
    aliases: ['three of a kind'],
    short: '3 cards of the same rank, also called three of a kind. Often it means a board pair plus 1 of your cards.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'set',
    term: 'set',
    aliases: ['sets'],
    short: 'Three of a kind made with a pocket pair and 1 matching card on the board. It is well hidden and strong.',
    lesson: 'basics/rules/rankings',
    except: [
      'set aside',
      'set of',
      'set a',
      'set the',
      'sets the',
      'sets a',
      'sets how',
      'sets its',
      'sets your',
      'you set',
      'they set',
      'rooms set',
      'room sets',
      'set in',
      'set it',
      'set them',
      'set for',
      'set your',
      'set 3',
      'not set',
    ],
  },
  {
    id: 'straight',
    term: 'straight',
    link: false,
    aliases: ['straights'],
    short: '5 cards of ranks in a row in any suits, like 9 T J Q K. The ace can be high or low.',
    lesson: 'basics/rules/rankings',
    except: ['straight line'],
  },
  {
    id: 'flush',
    term: 'flush',
    link: false,
    aliases: ['flushes'],
    short: '5 cards of the same suit in any order. It beats a straight.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'full-house',
    term: 'full house',
    link: false,
    aliases: ['full houses', 'boat'],
    short: '3 cards of one rank and 2 of another. It beats a flush.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'quads',
    term: 'quads',
    aliases: ['four of a kind'],
    short: 'All 4 cards of one rank. Only a straight flush beats it.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'straight-flush',
    term: 'straight flush',
    aliases: ['straight flushes', 'royal flush'],
    short: '5 cards in a row of one suit. The best one is A K Q J T of one suit, the royal flush.',
    lesson: 'basics/rules/rankings',
  },
  {
    id: 'kicker',
    term: 'kicker',
    link: false,
    aliases: ['kickers'],
    short: 'Your highest card outside a pair or other made hand. It breaks ties between equal hands.',
    lesson: 'basics/rules/best-five',
  },
  {
    id: 'top-pair',
    term: 'top pair',
    aliases: ['top pairs'],
    short: 'A pair made with the highest card on the board.',
    lesson: 'basics/first-strategy/the-nuts',
  },
  {
    id: 'second-pair',
    term: 'second pair',
    aliases: ['middle pair', 'second pairs'],
    short: 'A pair made with the second highest card on the board. It often wins at showdown but rarely wants a big pot.',
    lesson: 'postflop/later-streets/pot-control',
  },
  {
    id: 'bottom-pair',
    term: 'bottom pair',
    short: 'A pair made with the lowest card on the board.',
    lesson: 'postflop/defense/probe',
  },
  {
    id: 'overpair',
    term: 'overpair',
    aliases: ['overpairs'],
    short: 'A pocket pair higher than every card on the board, like QQ on J72.',
    lesson: 'postflop/3bet-postflop/low-spr',
  },
  {
    id: 'underpair',
    term: 'underpair',
    aliases: ['underpairs'],
    short: 'A pocket pair lower than every card on the board.',
  },
  {
    id: 'the-nuts',
    term: 'the nuts',
    aliases: ['nuts', 'nut hand', 'nut hands', 'nutted'],
    short: 'The best possible hand on the board so far. On the river it cannot lose, though it can tie.',
    lesson: 'basics/first-strategy/the-nuts',
  },
  {
    id: 'nut-flush',
    term: 'nut flush',
    aliases: ['nut flushes'],
    short: 'The highest possible flush on the board. Usually it holds the ace of that suit.',
    lesson: 'foundations/math/combos',
  },
  {
    id: 'wheel',
    term: 'wheel',
    aliases: ['wheels'],
    short: 'The lowest straight, 5 4 3 2 A. Small suited aces like A5s can make it.',
    lesson: 'basics/rules/rankings',
  },

  // Starting hands
  {
    id: 'starting-hand',
    term: 'starting hand',
    aliases: ['starting hands'],
    short: 'Your 2 hole cards before the flop. There are 169 different kinds.',
    lesson: 'basics/first-strategy/starting-hands',
  },
  {
    id: 'pocket-pair',
    term: 'pocket pair',
    aliases: ['pocket pairs'],
    short: 'Hole cards of the same rank, like 77. It makes a set or better on the flop 11.8% of the time.',
    lesson: 'basics/first-strategy/starting-hands',
  },
  {
    id: 'set-mining',
    term: 'set mining',
    aliases: ['set mine', 'set mines', 'set miner'],
    short: 'Calling with a small pocket pair mainly to flop a set. It pays only when stacks are deep.',
    lesson: 'preflop/vs-open/flatting',
  },
  {
    id: 'suited',
    term: 'suited',
    link: false,
    short: 'Hole cards of the same suit, written with an s. AKs is ace king of one suit.',
    lesson: 'basics/first-strategy/starting-hands',
  },
  {
    id: 'offsuit',
    term: 'offsuit',
    link: false,
    short: 'Hole cards of different suits, written with an o. AKo is ace king of 2 suits.',
    lesson: 'basics/first-strategy/starting-hands',
  },
  {
    id: 'ax',
    term: 'Ax',
    short: 'An ace with any other card. The x stands for any rank.',
    lesson: 'basics/first-strategy/starting-hands',
  },
  {
    id: 'suited-connector',
    term: 'suited connector',
    aliases: ['suited connectors', 'connector', 'connectors'],
    short: 'Hole cards next to each other in rank and of one suit, like 8♥7♥. They make straights and flushes.',
    lesson: 'basics/first-strategy/starting-hands',
  },
  {
    id: 'broadway',
    term: 'broadway',
    aliases: ['broadways'],
    short: 'The 5 cards from ten up to ace. Hands like KQ hold 2 of them.',
    lesson: 'preflop/rfi/rfi-ep',
  },
  {
    id: 'premium',
    term: 'premium',
    aliases: ['premiums', 'premium hand', 'premium hands'],
    short: 'One of the very best starting hands, like AA or AK.',
    lesson: 'preflop/vs-open/cold-3bet',
  },
  {
    id: 'speculative',
    term: 'speculative hand',
    aliases: ['speculative hands', 'speculative'],
    short: 'A hand like a small pair or suited connector that must improve to win. It wants deep stacks.',
    lesson: 'preflop/stack-depth/depth',
  },
  {
    id: 'domination',
    term: 'domination',
    aliases: ['dominated', 'dominate', 'dominates', 'dominating'],
    short: 'When 2 hands share a card and one has the better kicker, like AK against AQ. The weaker one rarely wins.',
    lesson: 'foundations/theory/equity-benchmarks',
  },
  {
    id: 'playability',
    term: 'playability',
    aliases: ['playable'],
    short: 'How easily a hand keeps going after the flop. Hands that make draws and strong hands play well.',
    lesson: 'foundations/ranges/equity-realization',
  },
  {
    id: 'combo',
    term: 'combo',
    aliases: ['combos', 'combination', 'combinations', 'combinatorics'],
    short: 'One exact pair of hole cards, like A♠K♦. AK can be dealt 16 ways and AA only 6.',
    lesson: 'foundations/math/combos',
  },

  // Seats and position
  {
    id: 'position',
    term: 'position',
    link: false,
    aliases: ['positions'],
    short: 'Where you sit compared with the button. It decides when you act, and acting later is an edge.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'in-position',
    term: 'in position',
    aliases: ['IP', 'in-position'],
    short: 'Acting after your opponent on each street after the flop. You see what they do before you choose.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'out-of-position',
    term: 'out of position',
    aliases: ['OOP', 'out-of-position'],
    short: 'Acting before your opponent on each street after the flop. You must choose before you see what they do.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'utg',
    term: 'UTG',
    aliases: ['under the gun'],
    short: 'Under the gun. The seat just left of the big blind, which acts first before the flop.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'utg1',
    term: 'UTG+1',
    short: 'Under the gun plus 1. The seat just left of UTG at a 9-handed table.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'utg2',
    term: 'UTG+2',
    short: 'Under the gun plus 2. The third seat left of the big blind at a 9-handed table.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'lj',
    term: 'LJ',
    aliases: ['lojack'],
    short: 'Lojack. The seat 3 to the right of the button.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'hj',
    term: 'HJ',
    aliases: ['hijack'],
    short: 'Hijack. The seat 2 to the right of the button.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'co',
    term: 'CO',
    aliases: ['cutoff', 'cutoffs'],
    short: 'Cutoff. The seat just to the right of the button.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'early-position',
    term: 'early position',
    aliases: ['EP', 'early seats', 'early opens', 'early open'],
    short: 'The first seats to act before the flop, from UTG to UTG+2. Many players still act behind them.',
    lesson: 'preflop/rfi/rfi-ep',
  },
  {
    id: 'middle-position',
    term: 'middle position',
    aliases: ['MP'],
    short: 'The seats between early and late position. At a 9-handed table they are the LJ and HJ.',
    lesson: 'basics/first-strategy/position',
  },
  {
    id: 'late-position',
    term: 'late position',
    aliases: ['LP', 'late seats', 'late opens', 'late open'],
    short: 'The cutoff and the button. They act last after the flop, so they can play the most hands.',
    lesson: 'preflop/rfi/rfi-lp',
  },
  {
    id: 'bvb',
    term: 'BvB',
    aliases: ['blind vs blind', 'blind against blind'],
    short: 'Blind versus blind. Everyone folds to the small blind, who plays only the big blind.',
    lesson: 'preflop/3bet-pots/bvb',
  },
  {
    id: 'heads-up',
    term: 'heads up',
    link: false,
    aliases: ['heads-up'],
    short: 'A pot or game with only 2 players.',
    lesson: 'postflop/multiway/multiway',
  },
  {
    id: 'multiway',
    term: 'multiway',
    aliases: ['multi-way', 'multiway pot', 'multiway pots', 'three way pot', '3 way', '4 way', '5 way'],
    short: 'A pot with 3 or more players in it. Bluffs work less and you need stronger hands to bet.',
    lesson: 'postflop/multiway/multiway',
  },
  {
    id: 'orbit',
    term: 'orbit',
    aliases: ['orbits'],
    short: 'One trip of the button around the table. Each player posts each blind once.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'close-the-action',
    term: 'close the action',
    aliases: ['closes the action', 'closing the action'],
    short: 'To be the last player to act in a betting round. Your call ends it.',
    lesson: 'preflop/vs-open/bb-defense',
  },
  {
    id: 'initiative',
    term: 'initiative',
    short: 'Being the last player who bet or raised. That player can often win by betting again.',
    lesson: 'preflop/vs-open/cold-3bet',
  },

  // Game formats and stakes
  {
    id: 'stakes',
    term: 'stakes',
    link: false,
    aliases: ['stake'],
    short: 'How big a game is, named by its blinds. A 1/3 game has a $1 small blind and a $3 big blind.',
    lesson: 'basics/money/stakes',
    except: ['at stake'],
  },
  {
    id: 'cash-game',
    term: 'cash game',
    aliases: ['cash games', 'live cash', 'online cash'],
    short: 'A game where the chips are real money. You can cash out and leave between hands.',
    lesson: 'basics/money/stakes',
  },
  {
    id: 'tournament',
    term: 'tournament',
    aliases: ['tournaments', 'MTT', 'MTTs'],
    short: 'An event where everyone pays the same entry for a stack of chips. Players are knocked out until the last ones split the prizes.',
    lesson: 'basics/money/stakes',
  },
  {
    id: 'card-room',
    term: 'card room',
    aliases: ['card rooms', 'poker room'],
    short: 'A place that runs poker games, often inside a casino.',
    lesson: 'basics/money/card-room',
  },
  {
    id: 'cage',
    term: 'cage',
    aliases: ['the cage'],
    short: 'The card room’s cashier. You swap money for chips there and cash out there.',
    lesson: 'basics/money/card-room',
  },
  {
    id: 'buy-in',
    term: 'buy in',
    link: false,
    aliases: ['buy ins', 'buy-in', 'buy-ins', 'buyin', 'buyins', 'buying in', 'minimum buy in', 'maximum buy in'],
    short: 'The money you pay to join a game or tournament. Felt often counts a bankroll in buy ins of 100bb.',
    lesson: 'basics/money/stakes',
  },
  {
    id: 'stack',
    term: 'stack',
    link: false,
    aliases: ['stacks'],
    short: 'All the chips you have on the table. Felt counts it in big blinds.',
    lesson: 'basics/first-strategy/big-blinds',
  },
  {
    id: 'effective-stack',
    term: 'effective stack',
    aliases: ['effective stacks', 'effective depth'],
    short: 'The smaller stack between 2 players. It is the most either one can win or lose against the other.',
    lesson: 'basics/first-strategy/big-blinds',
  },
  {
    id: 'deep',
    term: 'deep',
    link: false,
    aliases: ['deep stacks', 'deep stack', 'deeper', 'bb deep', 'stack depth'],
    short: 'How many big blinds are in the stacks. More big blinds leave more room to bet after the flop.',
    lesson: 'preflop/stack-depth/depth',
    except: ['how deep and long', 'deep hole', 'deep holes', 'deep drops', 'goes deeper', 'deep a hole', 'this deep'],
  },
  {
    id: 'short-stack',
    term: 'short stack',
    aliases: ['short stacks', 'short stacked', 'shallow', 'shallower'],
    short: 'A stack with few big blinds in it. Short stacks often play all in or fold.',
    lesson: 'tournaments/mtt-basics/push-fold',
  },
  {
    id: 'stack-off',
    term: 'stack off',
    aliases: ['stacks off', 'stacked off', 'stacking off'],
    short: 'To put your whole stack into one pot.',
    lesson: 'preflop/live-preflop/big-opens',
  },
  {
    id: 'six-max',
    term: '6-max',
    aliases: ['6max', 'six max', '6-handed', 'short handed'],
    short: 'A table of at most 6 players. It is common online.',
    lesson: 'basics/money/stakes',
  },
  {
    id: 'nine-handed',
    term: '9-handed',
    aliases: ['9-max', 'full ring', 'full table'],
    short: 'A table of 9 players, common in live games. It is also called full ring.',
    lesson: 'basics/money/stakes',
  },

  // Preflop actions
  {
    id: 'open',
    term: 'open',
    link: false,
    aliases: ['opens', 'opened', 'opening', 'opener', 'openers', 'open raise', 'open raises', 'opening range', 'opening ranges'],
    short: 'The first raise before the flop, made when everyone before you folded.',
    lesson: 'basics/rules/actions',
    except: ['seat opens', 'open to a squeeze'],
  },
  {
    id: 'rfi',
    term: 'RFI',
    aliases: ['raise first in'],
    short: 'Raise first in. Opening with a raise when everyone before you folded.',
    lesson: 'preflop/rfi/rfi-ep',
  },
  {
    id: 'steal',
    term: 'steal',
    aliases: ['steals', 'stealing'],
    short: 'An open from a late seat that hopes to win the blinds at once.',
    lesson: 'preflop/rfi/rfi-lp',
  },
  {
    id: 'limp',
    term: 'limp',
    link: false,
    aliases: ['limps', 'limped', 'limping', 'limper', 'limpers', 'limp in', 'limps in', 'limped pot', 'limped pots'],
    short: 'To just call the big blind before the flop when nobody has raised.',
    lesson: 'basics/rules/actions',
  },
  {
    id: 'overlimp',
    term: 'overlimp',
    aliases: ['overlimps', 'overlimping', 'limp behind', 'limps behind'],
    short: 'To limp after another player has already limped.',
    lesson: 'preflop/live-preflop/limped-pots',
  },
  {
    id: 'limp-reraise',
    term: 'limp reraise',
    aliases: ['limp reraises', 'limp raise', 'limp-reraise'],
    short: 'Limping and then reraising when someone raises behind. It usually means a very strong hand.',
    lesson: 'preflop/live-preflop/limped-pots',
  },
  {
    id: 'iso-raise',
    term: 'iso raise',
    aliases: ['iso', 'iso raises', 'isolate', 'isolates', 'isolating', 'isolated', 'isolation'],
    short: 'A raise over a limper to play them alone, often with position.',
    lesson: 'exploit/adjustments/live-limpers',
  },
  {
    id: 'cold-call',
    term: 'cold call',
    aliases: ['cold calls', 'cold caller', 'cold callers', 'cold calling', 'calling an open cold'],
    short: 'Calling a raise when you have put no chips in yet this round.',
    lesson: 'preflop/live-preflop/big-opens',
  },
  {
    id: 'flat',
    term: 'flat',
    aliases: ['flats', 'flatting', 'flatted', 'flat call', 'flat calls'],
    short: 'To just call a raise instead of reraising.',
    lesson: 'preflop/vs-open/flatting',
    except: ['flat line', 'flat payout'],
  },
  {
    id: 'overcall',
    term: 'overcall',
    aliases: ['overcalls', 'overcalling'],
    short: 'To call after another player has already called.',
    lesson: 'preflop/stack-depth/rake',
  },
  {
    id: 'three-bet',
    term: '3bet',
    aliases: ['3bets', '3betting', '3bettor', '3bettors', '3-bet', '3-bets', 'three bet'],
    short: 'A raise over the first raise. Before the flop the big blind counts as bet 1 and the open as bet 2.',
    lesson: 'preflop/vs-open/cold-3bet',
  },
  {
    id: 'four-bet',
    term: '4bet',
    aliases: ['4bets', '4betting', '4bettor', '4bettors', '4-bet', 'four bet'],
    short: 'A raise over a 3bet. It is the 4th bet in the betting round.',
    lesson: 'preflop/3bet-pots/4bet',
  },
  {
    id: 'five-bet',
    term: '5bet',
    aliases: ['5bets', '5-bet', 'five bet'],
    short: 'A raise over a 4bet. At 100bb it is usually all in.',
    lesson: 'preflop/3bet-pots/4bet',
  },
  {
    id: 'squeeze',
    term: 'squeeze',
    aliases: ['squeezes', 'squeezed', 'squeezing'],
    short: 'A 3bet after an open and at least 1 call. The calls add dead money to win.',
    lesson: 'preflop/vs-open/squeeze',
  },
  {
    id: 'reshove',
    term: 'reshove',
    aliases: ['reshoves', 'reshoving', 're-shove'],
    short: 'Going all in over another player’s open. Short stacks in tournaments do it often.',
    lesson: 'tournaments/mtt-basics/reshoves',
  },
  {
    id: 'push-fold',
    term: 'push or fold',
    aliases: ['push fold', 'push/fold', 'push-fold'],
    short: 'A short stack strategy where every play is all in or fold.',
    lesson: 'tournaments/mtt-basics/push-fold',
  },
  {
    id: 'single-raised-pot',
    term: 'single raised pot',
    aliases: ['single raised pots', 'single raised', 'SRP'],
    short: 'A pot with only 1 raise before the flop, which someone called.',
    lesson: 'foundations/math/spr',
  },
  {
    id: 'three-bet-pot',
    term: '3bet pot',
    aliases: ['3bet pots', '3-bet pot', '3BP'],
    short: 'A pot where someone made a 3bet before the flop and got called. The pot is big next to the stacks.',
    lesson: 'postflop/3bet-postflop/cbet-3bp',
  },
  {
    id: 'four-bet-pot',
    term: '4bet pot',
    aliases: ['4bet pots'],
    short: 'A pot where a 4bet before the flop got called. Little room is left to play after the flop.',
    lesson: 'postflop/3bet-postflop/low-spr',
  },

  // Postflop actions
  {
    id: 'cbet',
    term: 'c-bet',
    aliases: ['c-bets', 'c-betting', 'cbet', 'cbets', 'continuation bet', 'continuation bets'],
    short: 'Continuation bet. A flop bet by the player who made the last raise before the flop.',
    lesson: 'postflop/cbet/cbet-ip',
  },
  {
    id: 'delayed-cbet',
    term: 'delayed c-bet',
    aliases: ['delayed c-bets', 'delayed cbet'],
    short: 'A turn bet by the preflop raiser after they checked the flop. It often follows a check from the caller.',
    lesson: 'postflop/defense/probe',
  },
  {
    id: 'fold-to-cbet',
    term: 'fold to c-bet',
    aliases: ['fold to a c-bet'],
    short: 'A player stat. It counts how often they fold when they face a flop c-bet.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'check-raise',
    term: 'check raise',
    aliases: ['check raises', 'check raised', 'check raising', 'check raiser', 'check-raise', 'check-raises', 'check-raising'],
    short: 'To check and then raise when an opponent bets in the same round.',
    lesson: 'postflop/defense/check-raise',
  },
  {
    id: 'check-call',
    term: 'check call',
    aliases: ['check calls', 'check-call', 'check and call'],
    short: 'To check and then call when an opponent bets in the same round.',
    lesson: 'postflop/cbet/cbet-oop',
  },
  {
    id: 'check-back',
    term: 'check back',
    link: false,
    aliases: ['checks back', 'checked back', 'checking back', 'check behind', 'checks behind'],
    short: 'To check when you are last to act. That ends the betting round with no bet.',
    lesson: 'postflop/defense/probe',
  },
  {
    id: 'donk-bet',
    term: 'donk bet',
    aliases: ['donk', 'donk bets', 'donk lead', 'donk leads'],
    short: 'A bet into the player who made the last bet or raise on the street before.',
    lesson: 'exploit/tells/bet-patterns',
  },
  {
    id: 'lead',
    term: 'lead',
    aliases: ['leads', 'leading', 'river lead', 'river leads'],
    short: 'To bet first into another player, before they get a chance to bet.',
    lesson: 'postflop/river/block-bets',
    except: ['leads to', 'lead to', 'leads both'],
  },
  {
    id: 'probe',
    term: 'probe',
    aliases: ['probes', 'probe bet', 'probe bets', 'probing'],
    short: 'A turn bet by the caller after the preflop raiser checked back the flop.',
    lesson: 'postflop/defense/probe',
  },
  {
    id: 'barrel',
    term: 'barrel',
    aliases: ['barrels', 'barreling', 'barrelling', 'barreled', 'double barrel', 'triple barrel', 'double barrels', 'triple barrels'],
    short: 'A bet on a later street after an earlier bet got called. Bets on the flop and turn make 2 barrels.',
    lesson: 'postflop/later-streets/barreling',
  },
  {
    id: 'stab',
    term: 'stab',
    aliases: ['stabs', 'stabbing'],
    short: 'A bet to take a pot that nobody seems to want, often after a check.',
    lesson: 'exploit/adjustments/vs-nit',
  },
  {
    id: 'float',
    term: 'float',
    aliases: ['floats', 'floating', 'floated'],
    short: 'To call a bet in position with a weak hand. You plan to win later by betting when they check.',
    lesson: 'exploit/adjustments/vs-nit',
  },
  {
    id: 'slowplay',
    term: 'slowplay',
    aliases: ['slowplays', 'slow play', 'slow plays', 'slowplaying', 'slow playing'],
    short: 'Checking or calling with a strong hand to hide its strength. You bet or raise later instead.',
    lesson: 'exploit/adjustments/vs-aggro',
  },
  {
    id: 'trap',
    term: 'trap',
    aliases: ['traps', 'trapping', 'trapped'],
    short: 'Checking or calling with a strong hand to invite the other player to bet.',
    lesson: 'exploit/adjustments/vs-aggro',
  },
  {
    id: 'value-bet',
    term: 'value bet',
    aliases: ['value bets', 'value betting', 'bet for value', 'bets for value', 'raise for value', 'for value', 'value hands', 'value hand'],
    short: 'A bet that wants calls from worse hands.',
    lesson: 'postflop/river/thin-value',
  },
  {
    id: 'thin-value',
    term: 'thin value',
    aliases: ['thin value bet', 'thin value bets', 'thinner', 'value bet thin', 'value bet thinner', 'bet thinner', 'bet thin'],
    short: 'A value bet with a hand that only just beats the hands that call. It wins a bit more than half the time when called.',
    lesson: 'postflop/river/thin-value',
  },
  {
    id: 'thick-value',
    term: 'thick value',
    aliases: ['thick value bet', 'thick value bets'],
    short: 'A value bet that stays far ahead of the hands that call. It can use a big size and still get paid.',
    lesson: 'postflop/cbet/thick-thin',
  },
  {
    id: 'bluff',
    term: 'bluff',
    link: false,
    aliases: ['bluffs', 'bluffing', 'bluffed', 'bluffer', 'bluffers', 'pure bluff', 'pure bluffs'],
    short: 'A bet or raise with a weak hand that wins mainly when better hands fold.',
    lesson: 'postflop/later-streets/bluff-selection',
  },
  {
    id: 'semi-bluff',
    term: 'semi bluff',
    aliases: ['semi bluffs', 'semi bluffing', 'semi-bluff', 'semi-bluffs', 'semi-bluffing'],
    short: 'A bet with a hand that is behind now but can improve. It wins when they fold or when you hit.',
    lesson: 'postflop/hand-reading/semi-bluffs',
  },
  {
    id: 'bluff-catcher',
    term: 'bluff catcher',
    aliases: ['bluff catchers', 'bluff catching', 'bluff catch', 'catch bluffs', 'catches bluffs', 'pure bluff catcher', 'pure bluff catchers'],
    short: 'A hand that beats bluffs but loses to value bets. It can only win by calling.',
    lesson: 'postflop/later-streets/bluff-catching',
  },
  {
    id: 'hero-call',
    term: 'hero call',
    aliases: ['hero calls'],
    short: 'A call with a hand that can only beat a bluff, against a bet that looks strong.',
    lesson: 'postflop/later-streets/bluff-catching',
  },
  {
    id: 'air',
    term: 'air',
    short: 'A hand with nothing at all, no pair and no draw.',
    lesson: 'foundations/ranges/range-shapes',
  },
  {
    id: 'showdown-value',
    term: 'showdown value',
    short: 'A hand’s chance to win at showdown without betting. Medium hands often check to keep it.',
    lesson: 'postflop/later-streets/pot-control',
  },
  {
    id: 'pot-control',
    term: 'pot control',
    short: 'Checking a medium hand to keep the pot small. You still win at showdown when you are ahead.',
    lesson: 'postflop/later-streets/pot-control',
  },
  {
    id: 'protection',
    term: 'protection',
    short: 'Betting so that hands that could outdraw you fold now instead of seeing a free card.',
    lesson: 'postflop/cbet/cbet-ip',
    except: ['as protection'],
  },
  {
    id: 'free-card',
    term: 'free card',
    aliases: ['free cards'],
    short: 'A turn or river card you see without paying, because nobody bet.',
    lesson: 'foundations/ranges/equity-realization',
  },
  {
    id: 'overbet',
    term: 'overbet',
    aliases: ['overbets', 'overbetting', 'overbet bluffs'],
    short: 'A bet bigger than the pot. It fits a range with many more nut hands than the other player has.',
    lesson: 'postflop/river/overbets',
  },
  {
    id: 'block-bet',
    term: 'block bet',
    aliases: ['block bets', 'block betting', 'blocking bet'],
    short: 'A small bet that sets your own price to reach showdown. It is often made from out of position.',
    lesson: 'postflop/river/block-bets',
  },
  {
    id: 'range-bet',
    term: 'range bet',
    aliases: ['range bets', 'range betting'],
    short: 'Betting your whole range, usually with a small size.',
    lesson: 'postflop/cbet/cbet-ip',
  },
  {
    id: 'pot-sized-bet',
    term: 'pot sized bet',
    aliases: ['pot sized bets', 'pot sized', 'pot-sized', 'pot bet', 'pot bets', 'bets pot', 'bet pot'],
    short: 'A bet the same size as the pot before the bet.',
    lesson: 'foundations/math/pot-odds',
  },
  {
    id: 'sizing',
    term: 'sizing',
    link: false,
    aliases: ['bet sizing', 'bet size', 'bet sizes'],
    short: 'How big you bet or raise, usually as a share of the pot.',
    lesson: 'postflop/cbet/sizing',
  },
  {
    id: 'geometric-sizing',
    term: 'geometric sizing',
    aliases: ['geometric', 'geometric bet', 'geometric bets', 'geometric size', 'geometric sizes'],
    short: 'Betting the same share of the pot on each street so the stacks go in by the river.',
    lesson: 'foundations/math/spr',
  },

  // Draws and odds
  {
    id: 'draw',
    term: 'draw',
    link: false,
    aliases: ['draws', 'drawing', 'straight draw', 'straight draws'],
    short: 'A hand that needs more cards to become strong, like 4 cards to a flush.',
    lesson: 'foundations/math/outs',
  },
  {
    id: 'flush-draw',
    term: 'flush draw',
    aliases: ['flush draws', 'nut flush draw', 'nut flush draws'],
    short: '4 cards of one suit with a card to come. It has 9 outs.',
    lesson: 'foundations/math/outs',
  },
  {
    id: 'oesd',
    term: 'open ended straight draw',
    aliases: ['OESD', 'open ender', 'open enders', 'open ended'],
    short: '4 cards in a row like 9 8 7 6. A card at either end makes a straight, so it has 8 outs.',
    lesson: 'foundations/math/outs',
  },
  {
    id: 'gutshot',
    term: 'gutshot',
    aliases: ['gutshots', 'gutshot straight draw', 'inside straight draw'],
    short: 'A straight draw that needs one rank in the middle, like 9 8 6 5 needing a 7. It has 4 outs.',
    lesson: 'foundations/math/outs',
  },
  {
    id: 'combo-draw',
    term: 'combo draw',
    aliases: ['combo draws'],
    short: 'A draw to both a flush and a straight. Big ones have 12 to 15 outs.',
    lesson: 'foundations/math/outs',
  },
  {
    id: 'backdoor',
    term: 'backdoor draw',
    aliases: ['backdoor', 'backdoors', 'backdoor draws', 'backdoor flush draw', 'backdoor flush draws'],
    short: 'A draw that needs both the turn and the river, like 3 cards to a flush on the flop.',
    lesson: 'postflop/defense/vs-cbet',
  },
  {
    id: 'overcard',
    term: 'overcard',
    aliases: ['overcards'],
    short: 'A card higher than every card on the board. Your hole cards can be overcards, and so can a new turn card.',
    lesson: 'postflop/later-streets/turn-cards',
  },
  {
    id: 'outs',
    term: 'outs',
    aliases: ['an out', 'dirty outs', 'clean out'],
    except: ['an out of'],
    short: 'Cards still to come that would give you the best hand.',
    lesson: 'foundations/math/outs',
  },
  {
    id: 'rule-of-2-and-4',
    term: 'rule of 2 and 4',
    aliases: ['rule of 4', 'rule of 2'],
    short: 'A quick estimate of your chance to hit. Multiply your outs by 4 on the flop or by 2 on the turn.',
    lesson: 'foundations/math/outs',
  },
  {
    id: 'odds',
    term: 'odds',
    aliases: ['odds against'],
    short: 'A chance written as misses to hits. 3 to 1 against means 1 hit in 4 tries, or 25%.',
    lesson: 'basics/first-strategy/odds',
  },
  {
    id: 'equity',
    term: 'equity',
    aliases: ['equities', 'raw equity'],
    short: 'Your share of the pot on average, from how often your hand wins. Ties count as half.',
    lesson: 'basics/first-strategy/odds',
  },
  {
    id: 'pot-odds',
    term: 'pot odds',
    short: 'The price of a call. It is your call divided by the final pot, the share you must win to break even.',
    lesson: 'foundations/math/pot-odds',
  },
  {
    id: 'implied-odds',
    term: 'implied odds',
    short: 'Extra chips you expect to win on later streets when your draw hits. They can make a call right that the price alone does not.',
    lesson: 'foundations/math/implied-odds',
  },
  {
    id: 'reverse-implied-odds',
    term: 'reverse implied odds',
    aliases: ['reverse implied'],
    short: 'Extra chips you lose on later streets when you make a second best hand. They make a call worse than its price.',
    lesson: 'foundations/math/implied-odds',
  },
  {
    id: 'priced-in',
    term: 'priced in',
    short: 'When the pot odds alone make a call right, with no extra chips needed later.',
    lesson: 'foundations/math/implied-odds',
  },
  {
    id: 'break-even',
    term: 'break even',
    aliases: ['breaks even', 'breakeven', 'Breakeven', 'break-even'],
    short: 'Neither winning nor losing on average.',
    lesson: 'basics/first-strategy/odds',
  },
  {
    id: 'coin-flip',
    term: 'coin flip',
    aliases: ['coin flips'],
    short: 'An all in where both hands are close to 50%, like a pair against 2 higher cards.',
    lesson: 'foundations/theory/equity-benchmarks',
  },
  {
    id: 'ev',
    term: 'EV',
    aliases: ['EVs', 'expected value'],
    short: 'Expected value. The average result of a decision over every way the hand can go.',
    lesson: 'foundations/math/ev',
  },
  {
    id: 'all-in-ev',
    term: 'all in EV',
    aliases: ['All in EV'],
    short: 'What an all in is worth on average, from your equity and the pot. It removes the luck of the cards that came.',
    lesson: 'results/variance/luck-vs-skill',
  },
  {
    id: 'fold-equity',
    term: 'fold equity',
    short: 'The value a bet gains from the chance that the other player folds.',
    lesson: 'postflop/hand-reading/semi-bluffs',
  },
  {
    id: 'alpha',
    term: 'alpha',
    short: 'How often a pure bluff must make them fold to break even. It is the bet divided by the pot after the bet.',
    lesson: 'foundations/math/mdf-alpha',
  },
  {
    id: 'mdf',
    term: 'MDF',
    aliases: ['minimum defense frequency'],
    short: 'Minimum defense frequency. The share of your range to keep so any 2 cards cannot bluff you for profit.',
    lesson: 'foundations/math/mdf-alpha',
  },
  {
    id: 'spr',
    term: 'SPR',
    aliases: ['SPRs', 'stack to pot ratio', 'stack-to-pot ratio'],
    short: 'Stack to pot ratio. The effective stack divided by the pot, usually measured on the flop.',
    lesson: 'foundations/math/spr',
  },
  {
    id: 'commitment',
    term: 'committed',
    aliases: ['commitment', 'commit', 'commits', 'pot committed'],
    short: 'When so much of your stack is in the pot that folding the rest no longer makes sense.',
    lesson: 'foundations/math/spr',
  },
  {
    id: 'card-removal',
    term: 'card removal',
    short: 'How the cards you can see change which hands an opponent can hold.',
    lesson: 'foundations/math/combos',
  },
  {
    id: 'blocker',
    term: 'blocker',
    aliases: ['blockers', 'block', 'blocks', 'blocking', 'unblock', 'unblocks', 'unblocking'],
    short: 'A card in your hand that makes some opponent hands less likely or impossible. The ace of a suit blocks the nut flush.',
    lesson: 'foundations/math/combos',
    except: ['blocks of'],
  },

  // Ranges and theory
  {
    id: 'range',
    term: 'range',
    aliases: ['ranges', 'calling range', 'calling ranges', 'betting range', 'checking range'],
    short: 'Every hand a player could hold in a spot, given how they have played.',
    lesson: 'basics/first-strategy/ranges',
    except: ['95% range', 'range either side', 'range of your win rate', 'range is 10', 'range shrinks', 'range is where'],
  },
  {
    id: 'hero',
    term: 'hero',
    link: false,
    short: 'The player telling the hand, usually you.',
    lesson: 'basics/first-strategy/ranges',
  },
  {
    id: 'villain',
    term: 'villain',
    link: false,
    aliases: ['villains'],
    short: 'The opponent in a hand you are talking through. It is not a judgment of the player.',
    lesson: 'basics/first-strategy/ranges',
  },
  {
    id: 'range-advantage',
    term: 'range advantage',
    short: 'When your whole range has more equity than theirs. It decides how often you bet.',
    lesson: 'foundations/ranges/advantages',
  },
  {
    id: 'nut-advantage',
    term: 'nut advantage',
    short: 'When your range holds more of the strongest hands than theirs. It decides how big you bet.',
    lesson: 'foundations/ranges/advantages',
  },
  {
    id: 'polarized',
    term: 'polarized',
    aliases: ['polar', 'polarize', 'polarizes', 'polarized range'],
    short: 'A range of very strong hands and bluffs with few medium hands. It suits big bets.',
    lesson: 'foundations/ranges/range-shapes',
  },
  {
    id: 'linear',
    term: 'linear',
    aliases: ['merged', 'linear range'],
    short: 'A range of the best hands in order, down to a cutoff. It is also called merged.',
    lesson: 'foundations/ranges/range-shapes',
    except: ['than linear'],
  },
  {
    id: 'condensed',
    term: 'condensed',
    aliases: ['condensed range'],
    short: 'A range of mostly medium hands, with few very strong hands or bluffs.',
    lesson: 'foundations/ranges/range-shapes',
  },
  {
    id: 'capped',
    term: 'capped',
    aliases: ['uncapped', 'capped range', 'caps your range', 'caps the range'],
    short: 'A range missing the strongest hands, because earlier actions would have shown them.',
    lesson: 'postflop/river/overbets',
  },
  {
    id: 'equity-realization',
    term: 'equity realization',
    aliases: ['realization', 'realize', 'realizes', 'realized', 'realizing', 'realized equity'],
    short: 'How much of your raw equity you actually win. Position and playable hands raise it.',
    lesson: 'foundations/ranges/equity-realization',
  },
  {
    id: 'texture',
    term: 'texture',
    aliases: ['textures', 'board texture', 'board textures'],
    short: 'How the board cards fit together. It decides which strong hands and draws are possible.',
    lesson: 'postflop/textures/texture-classes',
  },
  {
    id: 'dry',
    term: 'dry',
    aliases: ['dry board', 'dry boards', 'dry flop', 'dry flops'],
    short: 'A board with few draws, like K72 of 3 suits.',
    lesson: 'postflop/textures/texture-classes',
  },
  {
    id: 'wet',
    term: 'wet',
    aliases: ['wet board', 'wet boards'],
    short: 'A board with many straight and flush draws.',
    lesson: 'postflop/textures/texture-classes',
  },
  {
    id: 'rainbow',
    term: 'rainbow',
    short: 'A flop of 3 different suits. Nobody can have a flush draw yet.',
    lesson: 'postflop/textures/texture-classes',
  },
  {
    id: 'two-tone',
    term: 'two tone',
    aliases: ['two-tone'],
    short: 'A flop with 2 cards of one suit, so flush draws are possible.',
    lesson: 'foundations/ranges/advantages',
  },
  {
    id: 'monotone',
    term: 'monotone',
    short: 'A flop with all 3 cards of one suit.',
    lesson: 'postflop/textures/texture-classes',
  },
  {
    id: 'paired-board',
    term: 'paired board',
    aliases: ['paired boards', 'paired', 'pairs the board'],
    short: 'A board with 2 cards of the same rank. Full houses and quads become possible.',
    lesson: 'basics/first-strategy/the-nuts',
  },
  {
    id: 'static',
    term: 'static',
    aliases: ['static board', 'static boards'],
    short: 'A board where the best hand on the flop usually stays best. Small bets do most of the work there.',
    lesson: 'postflop/textures/texture-classes',
  },
  {
    id: 'dynamic',
    term: 'dynamic',
    aliases: ['dynamic board', 'dynamic boards'],
    short: 'A board where later cards often change which hand is best.',
    lesson: 'postflop/textures/texture-classes',
  },
  {
    id: 'blank',
    term: 'blank',
    aliases: ['blanks', 'brick', 'bricks'],
    short: 'A turn or river card that changes little for either player.',
    lesson: 'postflop/later-streets/turn-cards',
  },
  {
    id: 'runout',
    term: 'runout',
    aliases: ['runouts'],
    short: 'The cards still to come on the board, such as the turn and river after the flop.',
    lesson: 'foundations/theory/equity-benchmarks',
  },
  {
    id: 'hand-reading',
    term: 'hand reading',
    aliases: ['read ranges'],
    short: 'Narrowing an opponent’s range street by street from what they do.',
    lesson: 'postflop/hand-reading/narrowing',
  },
  {
    id: 'balanced',
    term: 'balanced',
    aliases: ['balance', 'unbalanced', 'unbalance', 'balances'],
    short: 'A range with the right mix of value bets and bluffs. Calling and folding then earn the other player the same.',
    lesson: 'foundations/math/mdf-alpha',
  },
  {
    id: 'indifferent',
    term: 'indifferent',
    aliases: ['indifference'],
    short: 'When 2 actions are worth the same to a player. At equilibrium a hand only mixes when this is true.',
    lesson: 'foundations/math/ev',
  },
  {
    id: 'mixed-strategy',
    term: 'mixed strategy',
    aliases: ['mixed strategies', 'mix', 'mixes', 'mixed', 'mixing', 'part of the mix'],
    short: 'Taking more than one action with the same hand, each some share of the time.',
    lesson: 'foundations/theory/solvers',
    except: ['mixes more than', 'mixes luck', 'mix ups'],
  },
  {
    id: 'frequency',
    term: 'frequency',
    aliases: ['frequencies'],
    short: 'How often an action is taken, as a share of the time.',
    lesson: 'foundations/theory/solvers',
  },
  {
    id: 'purify',
    term: 'purify',
    aliases: ['purified', 'purifying'],
    short: 'To always take one action with a hand that the full strategy mixes.',
    lesson: 'foundations/theory/simplification',
  },
  {
    id: 'gto',
    term: 'GTO',
    aliases: ['game theory optimal'],
    short: 'Game theory optimal. Playing your part of an equilibrium, so no opponent can gain by adjusting to you.',
    lesson: 'foundations/theory/what-is-gto',
  },
  {
    id: 'equilibrium',
    term: 'equilibrium',
    aliases: ['equilibria', 'Nash equilibrium', 'Nash'],
    short: 'A set of strategies where nobody can gain by changing only their own. Solvers search for one.',
    lesson: 'foundations/theory/what-is-gto',
  },
  {
    id: 'unexploitable',
    term: 'unexploitable',
    short: 'A strategy an opponent cannot beat by more than the spot is worth, even knowing it exactly.',
    lesson: 'foundations/theory/what-is-gto',
  },
  {
    id: 'zero-sum',
    term: 'zero sum game',
    aliases: ['zero sum', 'zero sum games'],
    short: 'A game where one player’s gain is exactly another’s loss. Poker is one before rake.',
    lesson: 'results/win-rate/true-cost',
  },
  {
    id: 'exploit',
    term: 'exploit',
    aliases: ['exploits', 'exploiting', 'exploited', 'exploitative', 'exploitation'],
    short: 'To move away from your baseline to win more from a player’s mistakes. It works only while they do not adjust.',
    lesson: 'exploit/adjustments/node-lock',
  },
  {
    id: 'exploitability',
    term: 'exploitability',
    short: 'How much a perfect counter strategy would win against a strategy. Zero means an exact equilibrium.',
    lesson: 'foundations/theory/solvers',
  },
  {
    id: 'best-response',
    term: 'best response',
    aliases: ['best responses'],
    short: 'The strategy that wins the most against one fixed opponent strategy. It is often all or nothing.',
    lesson: 'exploit/adjustments/node-lock',
  },
  {
    id: 'baseline',
    term: 'baseline',
    aliases: ['baselines'],
    short: 'Your default strategy before you adjust, close to GTO. For tells it means how a player usually acts.',
    lesson: 'exploit/profiling/population',
  },
  {
    id: 'solver',
    term: 'solver',
    aliases: ['solvers', 'solve', 'solves', 'solved', 'solution', 'solutions'],
    short: 'A program that finds an equilibrium for a spot by playing both sides against itself many times.',
    lesson: 'foundations/theory/solvers',
  },
  {
    id: 'cfr',
    term: 'CFR',
    aliases: ['counterfactual regret minimization'],
    short: 'Counterfactual regret minimization. The method most poker solvers use to find an equilibrium.',
    lesson: 'foundations/theory/solvers',
  },
  {
    id: 'regret',
    term: 'regret',
    aliases: ['regrets', 'regret matching'],
    short: 'In a solver, how much better an action would have done than the mix it played.',
    lesson: 'foundations/theory/solvers',
  },
  {
    id: 'game-tree',
    term: 'game tree',
    aliases: ['tree', 'trees'],
    short: 'Every action and bet size a solver may use in a spot. A solution only covers its own tree.',
    lesson: 'foundations/theory/solvers',
  },
  {
    id: 'node',
    term: 'node',
    aliases: ['nodes'],
    short: 'One decision point in a game tree.',
    lesson: 'exploit/adjustments/node-lock',
  },
  {
    id: 'node-locking',
    term: 'node locking',
    aliases: ['node lock', 'node locks', 'node locked'],
    short: 'Fixing an opponent’s strategy at one decision in a solver. It then finds your best response.',
    lesson: 'exploit/adjustments/node-lock',
  },
  {
    id: 'monte-carlo',
    term: 'Monte Carlo',
    short: 'Estimating a number by dealing many random hands and averaging the results.',
    lesson: 'foundations/ranges/advantages',
  },
  {
    id: 'spot',
    term: 'spot',
    link: false,
    aliases: ['spots'],
    short: 'One situation in a hand, like the button against the big blind on a given flop.',
    lesson: 'foundations/theory/solvers',
    except: ['to spot', 'spot them', 'same spot', 'one spot'],
  },
  {
    id: 'chart',
    term: 'chart',
    link: false,
    aliases: ['charts', 'starter chart', 'starter charts'],
    short: 'A 13 by 13 grid of starting hands. It shows what a strategy does with each hand in one spot.',
    lesson: 'basics/first-strategy/starting-hands',
  },
  {
    id: 'close-call',
    term: 'close call',
    aliases: ['close calls'],
    short: 'A hand near the edge of a chart, where 2 actions are worth about the same.',
    lesson: 'preflop/rfi/rfi-ep',
  },

  // Players and reads
  {
    id: 'tight',
    term: 'tight',
    link: false,
    aliases: ['tighter', 'tightest', 'tighten', 'tightens', 'tightening'],
    short: 'Playing few hands. Such a player folds most hands before the flop.',
    lesson: 'exploit/profiling/archetypes',
    except: ['tight jaw'],
  },
  {
    id: 'loose',
    term: 'loose',
    link: false,
    aliases: ['looser', 'loosen'],
    short: 'Playing many hands. Such a player enters lots of pots.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'passive',
    term: 'passive',
    aliases: ['passively'],
    short: 'Checking and calling more than betting and raising.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'aggressive',
    term: 'aggressive',
    aliases: ['aggression'],
    short: 'Betting and raising more than checking and calling.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'tag',
    term: 'TAG',
    aliases: ['TAGs', 'tight aggressive'],
    short: 'Tight aggressive. A player who plays few hands and usually enters by raising.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'lag',
    term: 'LAG',
    aliases: ['LAGs', 'loose aggressive'],
    short: 'Loose aggressive. A player who plays many hands and raises and bets a lot.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'nit',
    term: 'nit',
    aliases: ['nits'],
    short: 'A very tight player who folds too much. When they bet or raise it is almost always strong.',
    lesson: 'exploit/adjustments/vs-nit',
  },
  {
    id: 'calling-station',
    term: 'calling station',
    aliases: ['calling stations', 'station', 'stations'],
    short: 'A player who calls far too often and rarely folds a pair. You cannot bluff them.',
    lesson: 'exploit/adjustments/vs-station',
  },
  {
    id: 'maniac',
    term: 'maniac',
    aliases: ['maniacs'],
    short: 'A player who bets and raises far too much, often with weak hands and big sizes.',
    lesson: 'exploit/adjustments/vs-aggro',
  },
  {
    id: 'whale',
    term: 'whale',
    aliases: ['whales'],
    short: 'A recreational player who plays most hands and calls far too much.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'recreational',
    term: 'recreational player',
    aliases: ['recreational players', 'recreational', 'rec'],
    short: 'Someone who plays for fun and rarely studies. Their mistakes are where most of your profit comes from.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'regular',
    term: 'regular',
    aliases: ['regulars', 'reg', 'regs'],
    short: 'A player who plays often and seriously, usually with a solid strategy.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'scared-money',
    term: 'scared money',
    short: 'Playing for stakes that feel too big. It leads to folding too often to big bets.',
    lesson: 'basics/money/bankroll-start',
  },
  {
    id: 'pool',
    term: 'player pool',
    aliases: ['pool', 'pools', 'population'],
    except: ['100 pool', '000 pool', 'of pool'],
    short: 'The players you usually face in a game, taken as a group.',
    lesson: 'exploit/profiling/population',
  },
  {
    id: 'leak',
    term: 'leak',
    aliases: ['leaks'],
    short: 'A mistake a player makes again and again. Exploits target leaks.',
    lesson: 'exploit/profiling/archetypes',
  },
  {
    id: 'table-image',
    term: 'table image',
    aliases: ['image'],
    short: 'How the other players see your style. It changes how they react to your bets.',
    lesson: 'exploit/tells/own-image',
  },
  {
    id: 'tell',
    term: 'tell',
    aliases: ['tells', 'false tell', 'physical tell', 'physical tells', 'timing tell', 'sizing tells'],
    short: 'A habit or reaction that gives away information about a hand. Most are weak evidence.',
    lesson: 'exploit/tells/using-tells',
    except: [
      'tell you',
      'tells you',
      'tell them',
      'tells them',
      'tell me',
      'tell us',
      'tell if',
      'tell whether',
      'tell which',
      'tell what',
      'tell how',
      'tell a winner',
      'tell the',
      'tells observant',
    ],
  },
  {
    id: 'tank',
    term: 'tank',
    aliases: ['tanks', 'tanking', 'tanked'],
    short: 'To think for a long time before acting.',
    lesson: 'exploit/tells/own-image',
  },
  {
    id: 'snap-call',
    term: 'snap call',
    aliases: ['snap calls', 'instant call', 'instant calls'],
    short: 'A call made almost at once.',
    lesson: 'exploit/tells/own-image',
  },
  {
    id: 'time-bank',
    term: 'time bank',
    short: 'Extra thinking time an online site gives you for hard decisions.',
    lesson: 'exploit/tells/using-tells',
  },
  {
    id: 'card-dead',
    term: 'card dead',
    short: 'Getting few playable hands for a long stretch.',
    lesson: 'exploit/tells/own-image',
  },
  {
    id: 'vpip',
    term: 'VPIP',
    aliases: ['voluntarily put money in pot'],
    short: 'Voluntarily put money in pot. The share of hands where a player calls or raises before the flop.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'pfr',
    term: 'PFR',
    aliases: ['preflop raise'],
    short: 'Preflop raise. The share of hands where a player raises before the flop.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'wtsd',
    term: 'WTSD',
    aliases: ['went to showdown'],
    short: 'Went to showdown. The share of flops seen where a player reaches showdown.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'af',
    term: 'AF',
    aliases: ['aggression factor'],
    short: 'Aggression factor. A player’s bets plus raises after the flop, divided by their calls.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'hud',
    term: 'HUD',
    aliases: ['heads up display'],
    short: 'Heads up display. Player stats from a tracker shown on an online table.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'tracker',
    term: 'tracker',
    aliases: ['trackers'],
    short: 'Software that records online hands and builds stats on each player.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'stat',
    term: 'stat',
    aliases: ['stats', 'spot stats'],
    short: 'A count of how often a player did something when they had the chance.',
    lesson: 'exploit/profiling/hud-stats',
  },
  {
    id: 'floor',
    term: 'the floor',
    except: ['the floor can'],
    short: 'The card room staff member who runs the seating and settles disputes.',
    lesson: 'results/win-rate/table-selection',
  },

  // Money, results and the mental game
  {
    id: 'rake',
    term: 'rake',
    aliases: ['raked', 'rakes'],
    short: 'The fee the room takes from each pot. It is usually a share of the pot up to a cap.',
    lesson: 'results/rake/how-rake-works',
  },
  {
    id: 'no-flop-no-drop',
    term: 'no flop, no drop',
    short: 'A common rule that a pot ending before the flop pays no rake.',
    lesson: 'results/rake/how-rake-works',
  },
  {
    id: 'jackpot-drop',
    term: 'jackpot drop',
    aliases: ['jackpot', 'jackpot drops'],
    short: 'A fixed amount many live rooms take from each pot to fund a jackpot. It comes on top of the rake.',
    lesson: 'results/rake/how-rake-works',
  },
  {
    id: 'time-collection',
    term: 'time collection',
    aliases: ['time charge'],
    short: 'A seat fee charged every half hour instead of rake from pots.',
    lesson: 'results/rake/how-rake-works',
  },
  {
    id: 'rakeback',
    term: 'rakeback',
    short: 'Part of the rake you paid that a room or site returns to you. Terms vary and can change.',
    lesson: 'results/rake/rake-strategy',
  },
  {
    id: 'win-rate',
    term: 'win rate',
    link: false,
    aliases: ['win rates', 'winrate', 'WR'],
    short: 'How much you win on average. Felt measures it in big blinds per 100 hands.',
    lesson: 'results/win-rate/bb-per-100',
  },
  {
    id: 'bb-per-100',
    term: 'bb/100',
    aliases: ['bb per 100'],
    short: 'Big blinds won per 100 hands. It lets you compare results at any stakes.',
    lesson: 'results/win-rate/bb-per-100',
  },
  {
    id: 'mbb-hand',
    term: 'mbb/hand',
    short: 'Thousandths of a big blind per hand. 1bb/100 is the same rate as 10 of them.',
    lesson: 'foundations/theory/solvers',
  },
  {
    id: 'edge',
    term: 'edge',
    short: 'An advantage over the other players. In bb/100 it is what you win from them before rake and tips.',
    lesson: 'results/win-rate/true-cost',
    except: ['edge of', 'edges'],
  },
  {
    id: 'sd',
    term: 'SD',
    aliases: ['standard deviation'],
    short: 'Standard deviation. How much your results swing around your win rate, in bb/100.',
    lesson: 'results/variance/standard-deviation',
  },
  {
    id: 'variance',
    term: 'variance',
    short: 'The swings in results that luck causes. Even strong winners have long losing stretches.',
    lesson: 'mindset/mental/variance',
  },
  {
    id: 'sample-size',
    term: 'sample size',
    aliases: ['sample', 'samples'],
    short: 'How many hands or chances a result rests on. Small samples are mostly luck.',
    lesson: 'results/variance/sample-size',
  },
  {
    id: 'confidence-interval',
    term: 'confidence interval',
    aliases: ['confidence intervals'],
    short: 'The span where your true win rate likely sits, given your results so far.',
    lesson: 'mindset/mental/variance',
  },
  {
    id: 'downswing',
    term: 'downswing',
    aliases: ['downswings'],
    short: 'A drop from your best result so far. Every winning player has long ones.',
    lesson: 'results/variance/downswings',
  },
  {
    id: 'upswing',
    term: 'upswing',
    aliases: ['upswings'],
    short: 'A stretch where results run better than your true win rate.',
    lesson: 'mindset/mental/variance',
  },
  {
    id: 'bankroll',
    term: 'bankroll',
    aliases: ['bankrolls', 'roll', 'rolls'],
    short: 'Money set aside only for poker that you can afford to lose.',
    lesson: 'basics/money/bankroll-start',
  },
  {
    id: 'risk-of-ruin',
    term: 'risk of ruin',
    aliases: ['RoR'],
    short: 'The chance of ever losing your whole bankroll. More buy ins and a higher win rate both cut it.',
    lesson: 'results/variance/risk-of-ruin',
  },
  {
    id: 'shot-taking',
    term: 'shot taking',
    aliases: ['take a shot', 'planned shot', 'shot budget'],
    short: 'Playing a higher stake with a few buy ins set aside in advance. If they are gone you move back down.',
    lesson: 'mindset/mental/bankroll',
  },
  {
    id: 'stop-loss',
    term: 'stop loss',
    aliases: ['stop losses', 'stop rule', 'stop rules', 'loss limit', 'loss limits'],
    short: 'A loss limit you set before you play. You leave when you reach it.',
    lesson: 'mindset/mental/stop-rules',
  },
  {
    id: 'tilt',
    term: 'tilt',
    aliases: ['tilted', 'tilting', 'on tilt'],
    short: 'Any drop from your best play caused by emotion, like anger after a bad beat.',
    lesson: 'mindset/mental/tilt',
  },
  {
    id: 'a-game',
    term: 'A game',
    short: 'Your best, most focused play.',
    lesson: 'mindset/mental/tilt',
    except: ['A game where', 'A game is'],
  },
  {
    id: 'bad-beat',
    term: 'bad beat',
    aliases: ['bad beats'],
    short: 'Losing a hand you were a big favorite to win.',
    lesson: 'mindset/mental/tilt',
  },
  {
    id: 'cooler',
    term: 'cooler',
    aliases: ['coolers'],
    short: 'A hand where 2 strong hands meet and the loser could not avoid losing a big pot.',
    lesson: 'mindset/mental/tilt',
  },
  {
    id: 'chasing',
    term: 'chasing',
    aliases: ['chase', 'chasing losses'],
    short: 'Playing longer or bigger to win back a loss.',
    lesson: 'mindset/mental/stop-rules',
  },
  {
    id: 'results-oriented',
    term: 'results oriented',
    aliases: ['results oriented thinking'],
    short: 'Judging a decision by how the cards fell instead of by the choice itself.',
    lesson: 'mindset/study/hand-review',
  },

  // Tournaments
  {
    id: 'icm',
    term: 'ICM',
    aliases: ['independent chip model'],
    short: 'Independent chip model. A model that turns tournament chips into prize money.',
    lesson: 'tournaments/mtt-basics/icm',
  },
  {
    id: 'chip-ev',
    term: 'chip EV',
    aliases: ['Chip EV', 'cEV'],
    short: 'Expected value counted in chips, not prize money. In a cash game the two are the same.',
    lesson: 'tournaments/mtt-basics/push-fold',
  },
  {
    id: 'dollar-ev',
    term: '$EV',
    short: 'Expected value in prize money. ICM works it out from each stack.',
    lesson: 'tournaments/mtt-basics/icm',
  },
  {
    id: 'risk-premium',
    term: 'risk premium',
    short: 'The extra equity a tournament call needs beyond 50% chip math. Losing chips costs more money than winning them gains.',
    lesson: 'tournaments/mtt-basics/icm',
  },
  {
    id: 'cover',
    term: 'cover',
    link: false,
    aliases: ['covers', 'covering', 'covered'],
    short: 'To have at least as many chips as another player. You can knock them out and they cannot knock you out.',
    lesson: 'tournaments/mtt-basics/bounties',
    except: ['covers about', 'cover the price', 'not cover', 'cannot cover', 'covers 95%', 'It also covers', 'covers swings', 'covers when'],
  },
  {
    id: 'bubble',
    term: 'bubble',
    short: 'The last place in a tournament that pays nothing. One more bust and everyone left is paid.',
    lesson: 'tournaments/mtt-basics/bubble',
  },
  {
    id: 'in-the-money',
    term: 'in the money',
    aliases: ['ITM'],
    short: 'Far enough in a tournament that you win a prize.',
    lesson: 'tournaments/mtt-basics/icm',
  },
  {
    id: 'bust',
    term: 'bust',
    aliases: ['busts', 'busted', 'busting'],
    short: 'To lose all your chips and leave a tournament. A busted draw is one that missed.',
    lesson: 'tournaments/mtt-basics/bubble',
  },
  {
    id: 'payout',
    term: 'payout',
    aliases: ['payouts'],
    short: 'The prize money a tournament pays for each finishing place.',
    lesson: 'tournaments/mtt-basics/icm',
  },
  {
    id: 'prize-pool',
    term: 'prize pool',
    short: 'All the money a tournament pays out, from the buy ins after the room’s fee.',
    lesson: 'tournaments/mtt-basics/icm',
  },
  {
    id: 'pay-jump',
    term: 'pay jump',
    aliases: ['pay jumps'],
    short: 'The extra money for finishing one place higher in a tournament.',
    lesson: 'tournaments/mtt-basics/final-table',
  },
  {
    id: 'final-table',
    term: 'final table',
    aliases: ['final tables'],
    short: 'The last table of a tournament, where each bust moves everyone up a pay jump.',
    lesson: 'tournaments/mtt-basics/final-table',
  },
  {
    id: 'chip-leader',
    term: 'chip leader',
    aliases: ['chip leaders'],
    short: 'The player with the most chips in a tournament.',
    lesson: 'tournaments/mtt-basics/icm',
  },
  {
    id: 'bounty',
    term: 'bounty',
    aliases: ['bounties', 'bounty tournament', 'bounty tournaments', 'knockout'],
    short: 'A prize on a player in a tournament. You win it by knocking that player out.',
    lesson: 'tournaments/mtt-basics/bounties',
  },
  {
    id: 'pko',
    term: 'PKO',
    aliases: ['progressive knockout'],
    short: 'Progressive knockout. A bounty tournament where part of each bounty you win adds to your own.',
    lesson: 'tournaments/mtt-basics/bounties',
  },
  {
    id: 'satellite',
    term: 'satellite',
    aliases: ['satellites'],
    short: 'A tournament whose prizes are seats in a bigger event. Every seat is worth the same.',
    lesson: 'tournaments/mtt-basics/satellites',
  },
];

const byId = new Map(GLOSSARY.map((t) => [t.id, t]));
export const glossaryTerm = (id: string) => byId.get(id);

/** Spellings with a capital letter match only as written ("TAG" but not "tag", "BB" but not "bb"). */
const exactCase = (s: string) => /[A-Z]/.test(s);

/** Units may follow a number with no space: "2.5bb", "10bb/100". */
const isUnit = (s: string) => /^m?bb/.test(s);

/** Lookup key for a spelling or a match: one apostrophe, and lower case unless the case is exact. */
const keyOf = (s: string, exact: boolean) => (exact ? s : s.toLowerCase()).replace(/’/g, "'");

/** A spelling as a pattern, with either apostrophe. Case is checked after the match. */
const pattern = (s: string) =>
  [...s].map((c) => (c === '’' || c === "'" ? "['’]" : c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))).join('');

interface Spelling {
  text: string;
  /** Null for an excepted phrase, which matches nothing. */
  id: string | null;
  exact: boolean;
  unit: boolean;
}

interface Matcher {
  re: RegExp;
  exact: Map<string, Spelling>;
  lower: Map<string, Spelling>;
  /** Spellings by first letter, longest first, to retry when the longest match fails a case or edge check. */
  byFirst: Map<string, Spelling[]>;
}

const cache = new Map<boolean, Matcher>();

function matcher(linkedOnly: boolean): Matcher {
  const hit = cache.get(linkedOnly);
  if (hit) return hit;
  const spelling = (text: string, id: string | null): Spelling => ({ text, id, exact: exactCase(text), unit: isUnit(text) });
  const spellings = [
    ...GLOSSARY.filter((t) => !linkedOnly || t.link !== false).flatMap((t) =>
      [t.term, ...(t.aliases ?? [])].map((text) => spelling(text, t.id)),
    ),
    // Excepted phrases always win over the shorter term inside them.
    ...GLOSSARY.flatMap((t) => (t.except ?? []).map((text) => spelling(text, null))),
  ].sort((a, b) => b.text.length - a.text.length);
  const exact = new Map<string, Spelling>();
  const lower = new Map<string, Spelling>();
  const byFirst = new Map<string, Spelling[]>();
  for (const s of spellings) {
    const map = s.exact ? exact : lower;
    const key = keyOf(s.text, s.exact);
    if (!map.has(key)) map.set(key, s);
    const first = s.text[0].toLowerCase();
    byFirst.set(first, [...(byFirst.get(first) ?? []), s]);
  }
  // Longest first, so "pot odds" wins over "pot" and "UTG+1" over "UTG". Word edges keep "TAG" out of "TAGGED".
  const re = new RegExp(`(?<![A-Za-z])(?:${spellings.map((s) => pattern(s.text)).join('|')})(?![A-Za-z0-9])`, 'gi');
  const m = { re, exact, lower, byFirst };
  cache.set(linkedOnly, m);
  return m;
}

/** The spelling that `found` is at `start`, if its case and edges are right. */
function check(m: Matcher, text: string, start: number, found: string): Spelling | undefined {
  const s = m.exact.get(keyOf(found, true)) ?? m.lower.get(keyOf(found, false));
  if (!s) return undefined;
  // Only units may follow a digit ("2.5bb"), so "3bet" never hides a "bet".
  if (start > 0 && /[0-9]/.test(text[start - 1]) && !s.unit) return undefined;
  return s;
}

export interface TermMatch {
  start: number;
  end: number;
  id: string;
}

/**
 * Glossary terms in a piece of text, in order and without overlaps.
 * `linkedOnly` skips everyday words that are not underlined in lessons.
 */
export function findTerms(text: string, { linkedOnly = true }: { linkedOnly?: boolean } = {}): TermMatch[] {
  if (GLOSSARY.length === 0) return [];
  const m = matcher(linkedOnly);
  const re = m.re;
  re.lastIndex = 0;
  const out: TermMatch[] = [];
  let r: RegExpExecArray | null;
  while ((r = re.exec(text))) {
    const start = r.index;
    let s = check(m, text, start, r[0]);
    if (!s) {
      // The longest spelling here has the wrong case or edge. Try shorter ones at the same place.
      for (const c of m.byFirst.get(text[start].toLowerCase()) ?? []) {
        const end = start + c.text.length;
        if (c.text.length >= r[0].length || /[A-Za-z0-9]/.test(text[end] ?? '')) continue;
        s = check(m, text, start, text.slice(start, end));
        if (s) break;
      }
    }
    if (!s) {
      re.lastIndex = start + 1;
      continue;
    }
    re.lastIndex = start + s.text.length;
    if (s.id) out.push({ start, end: start + s.text.length, id: s.id });
  }
  return out;
}
