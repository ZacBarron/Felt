import type { Chart, ChartSpec } from '@felt/core';
import type { CSSProperties } from 'react';
import { Segmented } from '../ui/Segmented';

type ChartSpot = ChartSpec['spot'];

const SPOT_ORDER: ChartSpot[] = ['rfi', 'vs-open', 'vs-3bet', 'vs-limp', 'push-fold'];
const SPOT_LABEL: Record<ChartSpot, string> = {
  rfi: 'Open',
  'vs-open': 'Defend',
  'vs-3bet': 'Vs 3bet',
  'vs-limp': 'Vs limp',
  'push-fold': 'Push',
};

/** Label that fits a seat button: "UTG", "BB vs BTN", "Two limpers". */
export function shortTitle(spec: ChartSpec): string {
  if (spec.spot === 'rfi' || spec.spot === 'push-fold') return spec.hero;
  if (spec.spot === 'vs-limp') {
    const t = spec.title.replace(/^\S+ vs /, '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return spec.title.replace(' open vs ', ' vs ').replace(/ (open|3bet)$/, '');
}

/**
 * Two step chart picker: the kind of spot, then the seat. Every option stays
 * on screen and wraps, so nothing hides off the side of a phone.
 */
export function ChartPicker({ charts, value, onChange }: { charts: Chart[]; value: Chart; onChange: (id: string) => void }) {
  const groups = SPOT_ORDER.filter((spot) => charts.some((c) => c.spec.spot === spot));
  const inGroup = charts.filter((c) => c.spec.spot === value.spec.spot);
  return (
    <div className="stack" style={{ gap: '0.6rem' }}>
      {groups.length > 1 && (
        <Segmented<ChartSpot>
          ariaLabel="Spot"
          stretch
          value={value.spec.spot}
          onChange={(spot) => {
            const first = charts.find((c) => c.spec.spot === spot);
            if (first) onChange(first.spec.id);
          }}
          options={groups.map((spot) => ({ value: spot, label: SPOT_LABEL[spot] }))}
        />
      )}
      <div
        className="seat-grid"
        role="radiogroup"
        aria-label="Chart"
        style={{ '--seat-min': inGroup.some((c) => shortTitle(c.spec).length > 6) ? '104px' : '64px' } as CSSProperties}
      >
        {inGroup.map((c) => (
          <button
            key={c.spec.id}
            role="radio"
            aria-checked={c.spec.id === value.spec.id}
            className={`seat-pick${c.spec.id === value.spec.id ? ' on' : ''}`}
            data-haptic="select"
            onClick={() => onChange(c.spec.id)}
          >
            {shortTitle(c.spec)}
          </button>
        ))}
      </div>
    </div>
  );
}
