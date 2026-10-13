import type { Chart, ChartSpec } from '@felt/core';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useSettings } from '../state/settings';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';
import { gameLine } from './GameSheet';

type ChartSpot = ChartSpec['spot'];

const SPOT_ORDER: ChartSpot[] = ['rfi', 'vs-open', 'vs-3bet', 'vs-limp', 'push-fold'];
export const SPOT_LABEL: Record<ChartSpot, string> = {
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
  const t = spec.title.replace(' open vs ', ' vs ').replace(/ (open|3bet)$/, '');
  // "UTG open vs 3bet" names no 3bettor, so the seat alone is clearer than "UTG vs".
  return / vs$/.test(t) ? spec.hero : t;
}

/** Charts grouped by spot, in the order a hand plays out. */
function groupCharts(charts: Chart[]) {
  return SPOT_ORDER.map((spot) => ({ spot, charts: charts.filter((c) => c.spec.spot === spot) })).filter((g) => g.charts.length > 0);
}

/**
 * One row that names the current chart. The capsule opens a sheet with every
 * chart grouped by spot. The arrows step to the chart before or after.
 */
export function ChartPicker({ charts, value, onChange }: { charts: Chart[]; value: Chart; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const groups = groupCharts(charts);
  const ordered = groups.flatMap((g) => g.charts);
  const index = ordered.findIndex((c) => c.spec.id === value.spec.id);
  const prev = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;

  return (
    <>
      <div className="chart-nav">
        <button
          type="button"
          className="chart-step"
          aria-label={prev ? `Previous chart, ${prev.spec.title}` : 'Previous chart'}
          disabled={!prev}
          data-haptic="select"
          onClick={() => prev && onChange(prev.spec.id)}
        >
          <ChevronLeftIcon size={20} />
        </button>
        <button type="button" className="chart-select" aria-haspopup="dialog" aria-label={`Chart: ${value.spec.title}. Change chart`} onClick={() => setOpen(true)}>
          <span className="chart-select-spot" aria-hidden="true">
            {SPOT_LABEL[value.spec.spot]}
          </span>
          <span className="chart-select-title" aria-hidden="true">
            {shortTitle(value.spec)}
          </span>
          <ChevronDownIcon size={16} className="chart-select-chev" />
        </button>
        <button
          type="button"
          className="chart-step"
          aria-label={next ? `Next chart, ${next.spec.title}` : 'Next chart'}
          disabled={!next}
          data-haptic="select"
          onClick={() => next && onChange(next.spec.id)}
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>
      <ChartSheet
        open={open}
        groups={groups}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(id) => {
          onChange(id);
          setOpen(false);
        }}
      />
    </>
  );
}

/** Bottom sheet with every chart, grouped by spot. Every option wraps, so nothing hides off the side. */
function ChartSheet({
  open,
  groups,
  value,
  onClose,
  onPick,
}: {
  open: boolean;
  groups: { spot: ChartSpot; charts: Chart[] }[];
  value: Chart;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { settings } = useSettings();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet chart-sheet"
      aria-label="Charts"
      onClose={onClose}
      onClick={(e) => {
        // A tap on the dimmed backdrop closes the sheet.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1.1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between" style={{ flexWrap: 'nowrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Charts</h2>
            <div className="footnote">For {gameLine(settings.game).replace(/^\w/, (c) => c.toLowerCase())}</div>
          </div>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>

        {groups.map(({ spot, charts }) => {
          const wide = charts.some((c) => shortTitle(c.spec).length > 6);
          return (
            <section key={spot} className="chart-sheet-group">
              <h3 className="section-title row" style={{ gap: '0.4rem' }}>
                {SPOT_LABEL[spot]}
                {charts.some((c) => c.spec.basis === 'exploit') && <span className="pill pill-exploit">Exploit</span>}
              </h3>
              <div className="seat-grid" role="radiogroup" aria-label={SPOT_LABEL[spot]} style={{ '--seat-min': wide ? '104px' : '64px' } as CSSProperties}>
                {charts.map((c) => {
                  const on = c.spec.id === value.spec.id;
                  return (
                    <button
                      key={c.spec.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c.spec.title}
                      className={`seat-pick${on ? ' on' : ''}`}
                      data-haptic="select"
                      onClick={() => onPick(c.spec.id)}
                    >
                      {shortTitle(c.spec)}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </dialog>
  );
}
