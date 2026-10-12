/**
 * Strategy nodes and decision grading.
 *
 * A node is one decision point from a solver (or a chart): the available
 * actions, how often GTO takes each one, and each action's EV. Mixed
 * strategies are the norm, so a decision is graded by how much EV it gives
 * up, not by whether it matched the single most frequent action.
 */

export interface ActionOption {
  /** Stable id, e.g. "fold", "call", "bet33", "raise2.5x". */
  id: string;
  label: string;
  /** GTO frequency in [0, 1]. Frequencies at a node sum to 1. */
  frequency: number;
  /** Expected value in big blinds. */
  ev: number;
}

export interface StrategyNode {
  actions: ActionOption[];
  /** Pot in big blinds at this decision, used to scale EV loss. */
  pot: number;
}

export type DecisionGrade = 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';

export interface GradedDecision {
  grade: DecisionGrade;
  evLoss: number;
  evLossPctPot: number;
  chosen: ActionOption;
  best: ActionOption;
}

/**
 * Thresholds are EV loss as a share of the pot. Any action GTO takes at
 * least `mixThreshold` of the time counts as correct, since the solver is
 * close to indifferent between mixed actions.
 */
export const GRADE_THRESHOLDS = {
  mixThreshold: 0.1,
  correct: 0.02,
  inaccuracy: 0.05,
  mistake: 0.15,
} as const;

export function bestAction(node: StrategyNode): ActionOption {
  return node.actions.reduce((a, b) => (b.ev > a.ev ? b : a));
}

export function gradeDecision(node: StrategyNode, chosenId: string): GradedDecision {
  const chosen = node.actions.find((a) => a.id === chosenId);
  if (!chosen) throw new Error(`Unknown action "${chosenId}"`);
  const best = bestAction(node);
  const evLoss = Math.max(0, best.ev - chosen.ev);
  const evLossPctPot = node.pot > 0 ? evLoss / node.pot : 0;

  let grade: DecisionGrade;
  if (chosen.id === best.id) grade = 'best';
  else if (chosen.frequency >= GRADE_THRESHOLDS.mixThreshold || evLossPctPot <= GRADE_THRESHOLDS.correct) grade = 'correct';
  else if (evLossPctPot <= GRADE_THRESHOLDS.inaccuracy) grade = 'inaccuracy';
  else if (evLossPctPot <= GRADE_THRESHOLDS.mistake) grade = 'mistake';
  else grade = 'blunder';

  return { grade, evLoss, evLossPctPot, chosen, best };
}
