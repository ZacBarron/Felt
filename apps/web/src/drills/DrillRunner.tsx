import type { DrillOutcome } from '@felt/core';
import { getChart } from '../state/charts';
import { BottomBar } from '../ui/BottomBar';
import type { QueueItem } from '../state/review';
import { PaintDrill } from './PaintDrill';
import { QuickRecall } from './QuickRecall';
import { SavedCard } from './SavedCard';

interface Props {
  item: QueueItem;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
}

/** Renders the right drill for a queue item. */
export function DrillRunner({ item, onAnswer, onNext }: Props) {
  if (item.mode === 'saved') return <SavedCard savedId={item.savedId!} targetMs={item.targetMs} onAnswer={onAnswer} onNext={onNext} />;
  const chart = getChart(item.chartId);
  if (!chart)
    return (
      <>
        <p className="muted">This chart no longer exists.</p>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={onNext}>
            Next
          </button>
        </BottomBar>
      </>
    );
  if (item.mode === 'paint') return <PaintDrill chart={chart} targetMs={item.targetMs} onAnswer={onAnswer} onNext={onNext} />;
  return <QuickRecall chart={chart} hand={item.hand!} targetMs={item.targetMs} onAnswer={onAnswer} onNext={onNext} />;
}
