import { actionFrequencies, chartFormatLabel, comboCount, type HandClass } from '@felt/core';
import { useState } from 'react';
import { actionColor, sortActions } from '../components/actionColors';
import { MixBar } from '../components/MixBar';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { actionLabels } from '../drills/labels';
import { chartsForGame } from '../state/charts';
import { useSettings } from '../state/settings';
import { Chips } from '../ui/Chips';
import { PageHeader } from '../ui/PageHeader';

export function RangesPage() {
  const { settings } = useSettings();
  const fit = chartsForGame(settings.game);
  const [chartId, setChartId] = useState<string>();
  const [selected, setSelected] = useState<HandClass>('AKs');
  const chart = fit.charts.find((c) => c.spec.id === chartId) ?? fit.charts[0];
  if (!chart) return <p className="muted">No charts for this game yet.</p>;
  const totals = actionFrequencies(chart);
  const labels = actionLabels(chart);
  const mix = chart.mixes.get(selected) ?? { fold: 1 };

  return (
    <div className="stack">
      <PageHeader title="Ranges" />

      <Chips
        value={chart.spec.id}
        onChange={setChartId}
        ariaLabel="Chart"
        options={fit.charts.map((c) => ({ value: c.spec.id, label: c.spec.title }))}
      />

      <div className="footnote row" style={{ gap: '0.4rem' }}>
        {chartFormatLabel(chart.spec)}
        {chart.spec.source === 'starter-approx' && <span className="pill">Approximate</span>}
        {chart.spec.basis === 'exploit' && <span className="pill pill-warn">Exploit</span>}
        {!fit.exact && <span className="pill pill-warn">Nearest table size</span>}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: '0.75rem' }}>
          <SeatStrip spec={chart.spec} />
          {chart.spec.versus && (
            <div className="footnote">
              {chart.spec.versus}
            </div>
          )}
          <RangeGrid key={chart.spec.id} mixes={chart.mixes} selected={selected} onSelect={setSelected} />
        </div>

        <div className="stack" style={{ position: 'sticky', top: '4.5rem' }}>
          <div className="card stack reveal" key={selected} style={{ gap: '0.7rem' }}>
            <div className="row between">
              <span className="display" style={{ fontSize: '2.2rem', lineHeight: 1 }}>{selected}</span>
              <span className="pill num">{comboCount(selected)} combos</span>
            </div>
            <MixBar mix={mix} labels={labels} />
          </div>

          <div className="card stack" style={{ gap: '0.5rem' }}>
            <div className="row between">
              <span className="footnote">Whole range</span>
              <span className="footnote num">
                {sortActions(Object.keys(totals))
                  .filter((a) => a !== 'fold')
                  .map((a) => `${labels[a]?.split(' ')[0] ?? a} ${(totals[a] * 100).toFixed(1)}%`)
                  .join(', ')}
              </span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
              {sortActions(Object.keys(totals)).map((a) => (
                <span key={a} style={{ width: `${totals[a] * 100}%`, background: actionColor(a), opacity: a === 'fold' ? 0.35 : 1 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
