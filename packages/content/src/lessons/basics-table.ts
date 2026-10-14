import type { LessonContent } from './types';

/** Live table etiquette and the rules that decide what your chips mean. */
export const BASICS_TABLE_LESSONS: LessonContent[] = [
  {
    key: 'basics/rules/table-rules',
    level: 'core',
    minutes: 5,
    cover: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['HJ'], note: 'Wait for your turn' },
    steps: [
      {
        kind: 'intro',
        title: 'Live table basics',
        body: 'A live game runs on a few simple rules. They decide what your words and chips mean. Learn them once and you will play with confidence in any room.',
      },
      {
        kind: 'visual',
        title: 'Act in turn',
        art: { kind: 'table', seats: 9, button: 'BTN', hero: 'CO', highlight: ['HJ'], note: 'HJ acts, then you' },
        caption: 'Action moves clockwise, one player at a time. Wait until the player on your right has acted. Acting early gives away information. It can also hurt the players before you.',
      },
      {
        kind: 'text',
        title: 'Your words count',
        body: [
          'In many rooms an action out of turn is binding. It stands if nobody before you bets or raises.',
          'What you say out loud on your turn is binding too. Say “call” and you must call.',
          'Say “raise” and you must raise. Say the amount too, like “raise to 40”.',
        ],
      },
      {
        kind: 'visual',
        title: 'No string bets',
        art: {
          kind: 'tree',
          root: 'You want to raise',
          branches: [
            { label: 'Say “raise”, then add chips', value: 'A raise', tone: 'brass' },
            { label: 'Chips out in 2 trips, no words', value: 'Usually ruled a call', tone: 'red' },
          ],
        },
        caption: 'A raise without words must go in with one motion. Bringing chips out in 2 trips is a **string bet**. The dealer usually rules it a call, and your extra chips come back. Say “raise” first, then take your time.',
      },
      {
        kind: 'visual',
        title: 'The one chip rule',
        art: {
          kind: 'tree',
          root: 'Facing a bet, you put out 1 big chip',
          branches: [
            { label: 'You said “raise” first', value: 'A raise', tone: 'brass' },
            { label: 'You said nothing', value: 'Only a call', tone: 'gray' },
          ],
        },
        caption: 'Facing a bet, 1 chip bigger than the call is just a call unless you say raise. With no bet in front of you, 1 chip is a bet of its full value.',
      },
      {
        kind: 'text',
        title: 'Protect your cards',
        body: [
          'Keep a hand or a chip on your cards. Cards that touch the discards can be ruled dead.',
          'The dealer can also pull in cards that look folded. If they are mucked, you cannot get them back.',
          'You can only bet the chips in front of you. Money in your pocket cannot join a hand. This is called **table stakes**.',
        ],
      },
      {
        kind: 'visual',
        title: 'Who shows first',
        art: {
          kind: 'tree',
          root: 'At showdown',
          branches: [
            { label: 'The river was bet and called', value: 'The last player to bet or raise shows first', tone: 'brass' },
            { label: 'Everyone checked the river', value: 'The first player left of the button shows first', tone: 'gray' },
          ],
        },
        caption: 'The best hand wins only if you show it. Turn both cards face up and let the dealer read them. Never throw away a hand you think may win.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Tipping',
        body: 'In many US rooms, players tip the dealer after winning a pot. Customs differ by room and by country.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'House rules vary',
        body: 'Every room has its own rules. They differ on things like acting out of turn and showing cards. When you are unsure, ask the dealer before you act.',
      },
      {
        kind: 'quiz',
        question: 'Someone bets $10. Without a word, you put out a single $25 chip. What did you do?',
        choices: ['Raised to $25', 'Called $10', 'Raised to $20'],
        answer: 1,
        explain: 'Like the one chip rule showed, 1 big chip with no words is only a call. You get $15 back. To raise you must say “raise” before the chip goes in.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'Someone bets $20. You want to raise to $40. What is the clearest way to do it?',
        choices: ['Push in $20, then go back for $20 more', 'Put out a single $100 chip', 'Say “raise to 40” and then put in the chips'],
        answer: 2,
        explain: 'Like the string bet picture showed, say it first and the raise is clear. Two trips to your stack is a string bet. A single big chip with no words is just a call.',
        point: 1,
      },
      {
        kind: 'quiz',
        question: 'You bet the river and get called. Who shows their cards first?',
        choices: ['You do, because you bet last', 'The player who called', 'The player left of the button'],
        answer: 0,
        explain: 'Like the showdown picture showed, the last player to bet or raise on the river shows first. The player left of the button goes first only when everyone checked the river.',
        point: 3,
      },
      {
        kind: 'quiz',
        question: 'On your turn you say “call”. Then you change your mind. What happens?',
        choices: ['You must call', 'You can still fold', 'You can raise instead'],
        answer: 0,
        explain: 'Like the lesson said, what you say on your turn is binding. Say “call” and you must call. So decide before you speak.',
        point: 0,
      },
      {
        kind: 'quiz',
        question: 'At showdown you think your hand may win. What should you do with your cards?',
        choices: ['Turn both face up for the dealer to read', 'Say what you have and throw them in', 'Show just 1 of them'],
        answer: 0,
        explain: 'Like the showdown picture said, the best hand wins only if you show it. Never throw away a hand that may win. Turn both cards up and let the dealer read them.',
        point: 2,
      },
      {
        kind: 'takeaway',
        points: [
          'Act in turn. What you say on your turn is binding.',
          'Say “raise” before you add chips. One big chip alone is a call.',
          'Show both cards at showdown to win. Never throw away a hand that may win.',
          'The last player to bet or raise on the river shows first.',
        ],
      },
    ],
  },
];
