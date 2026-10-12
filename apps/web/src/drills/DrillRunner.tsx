import type { DrillOutcome } from '@felt/core';
import { getChart } from '../state/charts';
import type { QueueItem } from '../state/review';
import { PaintDrill } from './PaintDrill';
import { QuickRecall } from './QuickRecall';

interface Props {
  item: QueueItem;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
}

/** Renders the right drill for a queue item. */
export function DrillRunner({ item, onAnswer, onNext }: Props) {
  const chart = getChart(item.chartId);
  if (!chart) return <p className="muted">This chart no longer exists. Skipping.</p>;
  if (item.mode === 'paint') return <PaintDrill chart={chart} targetMs={item.targetMs} onAnswer={onAnswer} onNext={onNext} />;
  return <QuickRecall chart={chart} hand={item.hand!} targetMs={item.targetMs} onAnswer={onAnswer} onNext={onNext} />;
}
