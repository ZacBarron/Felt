# Data Model

Stored locally in IndexedDB (Phase 1+). Amounts are stored in big blinds where possible, with the stake kept on the session so results can be shown in money too.

## Learning

```ts
ReviewCard {
  id: string
  kind: 'range-recall' | 'spot-action' | 'frequency' | 'math' | 'equity-estimate' | 'concept'
  lessonId?: string          // curriculum lesson that created it
  sourceHandId?: string      // set when the card came from a logged hand
  prompt: object             // kind specific payload, e.g. { chartId, hand } or { nodeId }
  targetMs: number           // response time that counts as automatic
  fsrs: FsrsCard             // due, stability, difficulty, reps, lapses, state
  suspended: boolean
}

ReviewLog {
  id: string
  cardId: string
  at: Date
  accuracy: number           // 0..1
  responseMs: number
  grade: 1 | 2 | 3 | 4       // derived (Again, Hard, Good, Easy)
}

DrillAttempt {               // scenario and challenge decisions
  id: string
  at: Date
  context: 'drill' | 'scenario' | 'challenge'
  nodeId: string
  chosenAction: string
  evLoss: number             // bb
  evLossPctPot: number
  grade: 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder'
  tags: string[]             // position, street, spot type, texture
}

LessonProgress {
  lessonId: string
  status: 'locked' | 'available' | 'in-progress' | 'done' | 'mastered'
  completedAt?: Date
}
```

## Play

```ts
Session {
  id: string
  start: Date
  end?: Date
  game: 'nlh-cash' | 'nlh-mtt'
  venue: string              // casino, site
  stakes: { sb: number; bb: number; currency: string }
  tableSize: number
  buyIns: number[]           // money
  cashOut?: number
  notes?: string
  mood?: 1 | 2 | 3 | 4 | 5   // optional pre session check in
}

Hand {
  id: string
  sessionId?: string
  at: Date
  heroPosition: Position
  heroCards: [Card, Card]
  effectiveStack: number     // bb
  actionLine: string         // shorthand, see below; source of truth
  board: Card[]
  result?: number            // bb won or lost
  villains: { position: Position; playerId?: string; cards?: [Card, Card] }[]
  tags: string[]
  flagged: boolean           // review later
  note?: string
}

Player {                     // opponents you see repeatedly
  id: string
  name: string
  venue?: string
  archetype?: 'nit' | 'tag' | 'lag' | 'station' | 'maniac' | 'unknown'
  notes: { at: Date; text: string; tell?: string }[]
}
```

## Action shorthand

The logger stores the hand as one line so entry is fast and the parser can evolve without migrations.

```
<preflop> | <flop> <actions> | <turn> <actions> | <river> <actions>
```

- Preflop actions are prefixed with the position: `co r2.5 btn c bb c`. Positions not listed folded.
- Postflop actions are in seat order and need no prefix heads up. Multiway, prefix with the position.
- Actions: `x` check, `b<amt>` bet, `r<amt>` raise to, `c` call, `f` fold, `ai` all in.
- Amounts are in bb. A `$` prefix means money and is converted with the session stakes.
- Board cards use the normal notation: `Ks7d2c`.

Example: hero on the BTN, 3bet pot, two streets.

```
co r2.5 btn r8 co c | Ks7d2c x b5 c | 9h x b12 f
```

## Content (static, in `@felt/content`)

```ts
ChartSpec      // see packages/core/src/charts.ts
Track/Module/Lesson  // see packages/content/src/curriculum.ts
StrategyNode   // see packages/core/src/strategy.ts; solver imports produce these
Scenario {     // Phase 4
  id: string
  title: string
  lessonId?: string
  setup: { format: string; positions: Position[]; stacks: number[]; heroCards: [Card, Card] }
  steps: { actionLine: string; nodeId: string }[]  // hero decides at each node
}
```
