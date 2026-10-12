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
      <div>
        <h1>Ranges</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every cell splits by how often the hand takes each action. Tap a hand for its mix.
        </p>
      </div>

      <Chips
        value={chart.spec.id}
        onChange={setChartId}
        ariaLabel="Chart"
        options={fit.charts.map((c) => ({ value: c.spec.id, label: c.spec.title }))}
      />

      <div className="row" style={{ gap: '0.4rem' }}>
        <span className="pill">{chartFormatLabel(chart.spec)}</span>
        {chart.spec.basis === 'exploit' && <span className="pill pill-warn">exploit, not GTO</span>}
        {chart.spec.source === 'starter-approx' && <span className="pill">starter approximation</span>}
        {!fit.exact && <span className="pill pill-warn">no {settings.game.tableSize}-handed charts yet</span>}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ gap: '0.75rem' }}>
          <SeatStrip spec={chart.spec} />
          {chart.spec.versus && (
            <div className="muted" style={{ fontSize: '0.88rem' }}>
              {chart.spec.versus}
            </div>
          )}
          <RangeGrid mixes={chart.mixes} selected={selected} onSelect={setSelected} />
        </div>

        <div className="stack" style={{ position: 'sticky', top: '1rem' }}>
          <div className="card stack reveal" key={selected} style={{ gap: '0.7rem' }}>
            <div className="row between">
              <strong style={{ fontSize: '1.4rem', letterSpacing: '-0.02em' }}>{selected}</strong>
              <span className="pill num">{comboCount(selected)} combos</span>
            </div>
            <MixBar mix={mix} labels={labels} />
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: '0.4rem' }}>
              Whole range
            </div>
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: '0.5rem' }}>
              {sortActions(Object.keys(totals)).map((a) => (
                <span key={a} style={{ width: `${totals[a] * 100}%`, background: actionColor(a), opacity: a === 'fold' ? 0.5 : 1 }} />
              ))}
            </div>
            <table className="kv">
              <tbody>
                {sortActions(Object.keys(totals)).map((a) => (
                  <tr key={a}>
                    <td>
                      <span
                        style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: actionColor(a), marginRight: 8 }}
                      />
                      {labels[a] ?? a}
                    </td>
                    <td>{(totals[a] * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
