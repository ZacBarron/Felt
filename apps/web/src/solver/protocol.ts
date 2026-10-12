import type { PlayerSizes, Street } from '@felt/core';

export type RangeInput = string | [string, number][];

/** A spot as plain data, so it can cross into the worker. */
export interface SpotInput {
  board: string;
  pot: number;
  stack: number;
  /** Out of position then in position: range notation, or [hand class, weight] pairs. */
  ranges: [RangeInput, RangeInput];
  sizes: Partial<Record<Street, PlayerSizes>>;
  targetPct: number;
  maxIterations: number;
}

export interface NodeAction {
  id: string;
  label: string;
}

export interface NodeView {
  kind: 'action' | 'chance' | 'fold' | 'showdown';
  player?: 0 | 1;
  pot?: number;
  board: string;
  actions: NodeAction[];
  /** Range wide frequency of each action. */
  aggregate: number[];
  /** [hand class, combos reaching the node, frequency per action]. */
  classes: [string, number, number[]][];
  /** Cards that can come next, at chance nodes. */
  cards: string[];
}

export type ToWorker = { type: 'solve'; spot: SpotInput } | { type: 'node'; path: number[] } | { type: 'stop' };

export type FromWorker =
  | { type: 'progress'; iterations: number; exploitability: number }
  | { type: 'solved'; iterations: number; exploitability: number; ev: [number, number]; seconds: number; nodes: number }
  | { type: 'node'; path: number[]; view: NodeView }
  | { type: 'error'; message: string };
