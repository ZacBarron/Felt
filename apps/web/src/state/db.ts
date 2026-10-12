import type { FsrsCard } from '@felt/core';
import Dexie, { type EntityTable } from 'dexie';

/** A review card the learner has started. Unstarted cards exist only as deck seeds. */
export interface StoredCard {
  id: string;
  chartId: string;
  mode: 'quick' | 'paint';
  hand?: string;
  targetMs: number;
  fsrs: FsrsCard;
  /** Mirrors fsrs.due so it can be indexed. */
  due: Date;
  createdAt: Date;
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

export const db = new Dexie('felt') as Dexie & {
  cards: EntityTable<StoredCard, 'id'>;
  reviews: EntityTable<StoredReview, 'id'>;
};

db.version(1).stores({
  cards: 'id, due, chartId, createdAt',
  reviews: '++id, at, cardId, chartId',
});
