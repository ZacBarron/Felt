import type { LessonContent } from './types';

/**
 * Mindset gap: stop rules, chasing losses and keeping poker healthy. Limits
 * are examples, not rules. Buy in amounts are checked with @felt/core in
 * packages/content/test/gaps2.test.ts. The lesson points the player to people
 * they trust or a professional, without naming outside material.
 */
export const GAPS_MINDSET_LESSONS: LessonContent[] = [
  {
    key: 'mindset/mental/stop-rules',
    level: 'core',
    minutes: 5,
    cover: {
      kind: 'tree',
      root: 'Before you sit down',
      branches: [
        { label: 'Loss limit', tone: 'red' },
        { label: 'Time limit', tone: 'brass' },
        { label: 'How you feel', tone: 'gray' },
      ],
    },
    steps: [
      {
        kind: 'intro',
        title: 'Stopping is a skill',
        body: 'Good players know when to leave. Rules you set in advance keep a bad night small. They also keep poker something you enjoy.',
      },
      {
        kind: 'visual',
        title: 'Set 3 stop rules before you play',
        art: {
          kind: 'tree',
          root: 'Before you sit down',
          branches: [
            { label: 'Loss limit', value: '3 buy ins, for example', tone: 'red' },
            { label: 'Time limit', value: '4 hours, for example', tone: 'brass' },
            { label: 'How you feel', value: 'Tired or upset means stop', tone: 'gray' },
          ],
        },
        caption: 'Pick numbers that fit you. These are examples, not rules. Decide them before the first hand.',
      },
      {
        kind: 'text',
        title: 'Why decide early',
        body: [
          'Once you are losing, it is harder to judge your own play.',
          'A rule made while calm does the judging for you.',
          'Being down does not make the next hand worse. Your play is what slips.',
        ],
      },
      {
        kind: 'visual',
        title: 'Chasing raises the stakes',
        art: {
          kind: 'bars',
          bars: [
            { label: 'Buy in at 1/3', value: 300, tone: 'brass' },
            { label: 'Buy in at 2/5', value: 500, tone: 'red' },
          ],
        },
        caption: 'Playing longer or bigger to win back a loss is called **chasing**. A 100bb buy in is $300 at 1/3. At 2/5 it is $500. Chasing raises your risk just when your play is at its worst.',
        evidence: 'math',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Stop on a good night too',
        body: 'A time limit works when you are winning too. Tired play costs money whatever the score. Leave while the game is still fun.',
      },
      {
        kind: 'visual',
        title: 'Signs to take seriously',
        art: {
          kind: 'tree',
          root: 'Poker may be a problem if you',
          branches: [
            { label: 'Play with money meant for bills', tone: 'red' },
            { label: 'Borrow money to play', tone: 'red' },
            { label: 'Hide how much you play or lose', tone: 'red' },
            { label: 'Keep breaking the limits you set', tone: 'red' },
            { label: 'Play to escape stress or low moods', tone: 'red' },
          ],
        },
        caption: 'Losing streaks happen to every winning player. These signs are different. They are about how poker fits in your life.',
      },
      {
        kind: 'text',
        title: 'What to do if they sound familiar',
        body: [
          'Stop playing for now. The game will still be there later.',
          'Talk to someone you trust about it. A professional counselor can help too.',
          'Asking for help is a strong move. It is never a failure.',
        ],
      },
      {
        kind: 'quiz',
        question: 'You hit your loss limit. The game still looks easy to beat. What fits your stop rule?',
        choices: ['Leave, since the game will be there next time', 'Play one more hour to get back to even', 'Move up to win it back faster'],
        answer: 0,
        explain: 'The limit only works if you keep it. A soft game will come again. Your play after a big loss is the part that has changed.',
      },
      {
        kind: 'quiz',
        question: 'Which one is a warning sign, not normal variance?',
        choices: ['Losing 3 sessions in a row', 'Using money meant for rent to play', 'A bad night against a lucky player'],
        answer: 1,
        explain: 'Losing streaks happen to every winning player. Playing with money you need for bills is different. It is a sign to stop and talk to someone.',
      },
      {
        kind: 'quiz',
        question: 'A friend says you seem to play to escape stress. You also keep chasing losses. What is a good next step?',
        choices: ['Take a break and talk to someone you trust', 'Play bigger to win it back faster', 'Keep it to yourself until you are even'],
        answer: 0,
        explain: 'These are signs that poker has stopped being healthy for you. A break and an honest talk help most. A professional counselor can help too.',
      },
      {
        kind: 'takeaway',
        points: [
          'Set a loss limit and a time limit before you play.',
          'Stop when you are tired or upset.',
          'Never chase a loss by playing longer or bigger.',
          'If poker costs money you need or stops being fun, stop and talk to someone.',
        ],
      },
    ],
  },
];
