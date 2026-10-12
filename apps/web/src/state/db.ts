import type { FsrsCard, SkillDomain } from '@felt/core';
import Dexie, { type EntityTable } from 'dexie';
import { heroView, parseHand } from '@felt/core';

/** A review card the learner has started. Unstarted cards exist only as deck seeds. */
export interface StoredCard {
  id: string;
  chartId: string;
  mode: 'quick' | 'paint' | 'saved';
  hand?: string;
  /** For saved cards: the SavedItem this card reviews. */
  savedId?: string;
  targetMs: number;
  fsrs: FsrsCard;
  /** Mirrors fsrs.due so it can be indexed. */
  due: Date;
  createdAt: Date;
}

/** A frozen solver decision: everything needed to quiz it without solving again. */
export interface SavedSolverSpot {
  board: string;
  pot: number;
  /** Who acts: 0 out of position, 1 in position. */
  player: 0 | 1;
  /** The actions taken to reach this decision, for display. */
  line: string[];
  hand: string;
  actions: { id: string; label: string }[];
  /** The solver's frequency for each action with this hand class. */
  mix: number[];
  exploitability: number;
}

/** Something the player chose to keep. Each one also becomes a review card. */
export interface SavedItem {
  id: string;
  kind: 'lesson-step' | 'solver-spot';
  title: string;
  /** Where it came from, for display. */
  source: string;
  createdAt: Date;
  note?: string;
  lessonKey?: string;
  step?: number;
  spot?: SavedSolverSpot;
}

/** One graded answer, replayed into the Felt Rating. */
export interface StoredAnswer {
  id?: number;
  at: Date;
  itemId: string;
  domain: SkillDomain;
  difficulty: number;
  score: number;
  source: 'review' | 'lesson' | 'check' | 'daily';
}

/** An imported hand, summarized from the hero's seat, with the original text. */
export interface StoredHand {
  id: string;
  at: Date;
  site: string;
  game: 'cash' | 'tournament';
  bb: number;
  currency?: string;
  tableMax: number;
  players: number;
  position?: string;
  hand?: string;
  net: number;
  netBb: number;
  vpip: boolean;
  pfr: boolean;
  threeBetChance: boolean;
  threeBet: boolean;
  openChance: boolean;
  openAction?: 'raise' | 'limp' | 'fold';
  sawFlop: boolean;
  showdown: boolean;
  wonAtShowdown?: boolean;
  walk?: boolean;
  behind?: number;
  stackBb?: number;
  straddled?: boolean;
  foldTo3betChance?: boolean;
  foldTo3bet?: boolean;
  cbetChance?: boolean;
  cbet?: boolean;
  postAggressive?: number;
  postCalls?: number;
  raw: string;
}

/** A finished scenario: the river grade from Felt Solver and whether preflop matched the chart. */
export interface StoredScenario {
  id: string;
  at: Date;
  grade: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  preflopRight: boolean;
  lossBb: number;
}

/** A hand written down at the table, to study later. */
export interface LoggedHand {
  id?: number;
  at: Date;
  sessionId?: number;
  /** Hero's cards, like 'AhKd'. Optional: sometimes you only remember the spot. */
  cards?: string;
  position?: string;
  board?: string;
  /** What happened, in the player's own words or shorthand. */
  action: string;
  /** Result in big blinds, when known. */
  resultBb?: number;
  /** Flagged to look at again. */
  flagged: boolean;
  note?: string;
}

/** A live session imported from a spreadsheet or bankroll app. */
export interface StoredSession {
  id?: number;
  date?: Date;
  hours: number;
  profit: number;
  stakes?: string;
  bb?: number;
  importedAt: Date;
  /** Where it came from: a spreadsheet import or the Log. */
  source?: 'csv' | 'log';
  venue?: string;
  buyIn?: number;
  cashOut?: number;
  note?: string;
}

/** A product event, kept on this device for measuring what works. Nothing is uploaded. */
export interface StoredEvent {
  id?: number;
  at: Date;
  name: string;
  props?: Record<string, string | number | boolean | undefined>;
}

/** A daily challenge, saved after every answer so it cannot be restarted. */
export interface StoredDaily {
  /** Challenge number. */
  number: number;
  at: Date;
  scores: number[];
  /** False while answers are still coming in. */
  finished?: boolean;
  ratingBefore: number;
  ratingAfter: number;
}

export interface StoredReview {
  id?: number;
  cardId: string;
  chartId: string;
  at: Date;
  accuracy: number;
  responseMs: number;
  grade: number;
}

export interface StoredLesson {
  /** `${trackId}/${moduleId}/${lessonId}` */
  key: string;
  /** `tested` means skipped by answering its questions in a test out. */
  status: 'started' | 'done' | 'tested';
  /** Furthest step reached, so a lesson resumes where you left it. */
  step: number;
  correct: number;
  answered: number;
  updatedAt: Date;
}

export const db = new Dexie('felt') as Dexie & {
  cards: EntityTable<StoredCard, 'id'>;
  reviews: EntityTable<StoredReview, 'id'>;
  lessons: EntityTable<StoredLesson, 'key'>;
  saved: EntityTable<SavedItem, 'id'>;
  answers: EntityTable<StoredAnswer, 'id'>;
  daily: EntityTable<StoredDaily, 'number'>;
  hands: EntityTable<StoredHand, 'id'>;
  sessions: EntityTable<StoredSession, 'id'>;
  events: EntityTable<StoredEvent, 'id'>;
  scenarios: EntityTable<StoredScenario, 'id'>;
  logged: EntityTable<LoggedHand, 'id'>;
};

db.version(1).stores({
  cards: 'id, due, chartId, createdAt',
  reviews: '++id, at, cardId, chartId',
});

db.version(2).stores({
  lessons: 'key, status, updatedAt',
});

db.version(3).stores({
  saved: 'id, kind, createdAt, lessonKey',
});

db.version(4).stores({
  answers: '++id, at, itemId, domain',
  daily: 'number, at',
});

db.version(5).stores({
  hands: 'id, at, game, position',
  sessions: '++id, date, importedAt',
});

db.version(6).stores({
  events: '++id, at, name',
});

// Version 7 adds c-bet, fold to 3bet and aggression to stored hands, re-read from each hand's text.
db.version(7)
  .stores({})
  .upgrade((tx) =>
    tx
      .table('hands')
      .toCollection()
      .modify((h: StoredHand) => {
        try {
          const v = heroView(parseHand(h.raw));
          if (!v) return;
          Object.assign(h, {
            foldTo3betChance: v.foldTo3betChance,
            foldTo3bet: v.foldTo3bet,
            cbetChance: v.cbetChance,
            cbet: v.cbet,
            postAggressive: v.postAggressive,
            postCalls: v.postCalls,
          });
        } catch {
          // A hand that no longer parses keeps its old stats.
        }
      }),
  );

// Version 8 adds scenario results and hands logged at the table.
db.version(8).stores({
  scenarios: 'id, at',
  logged: '++id, at, sessionId, flagged',
});
