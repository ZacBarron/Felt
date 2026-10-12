import { actionFrequencies, chartFormatLabel, comboCount, type HandClass } from '@felt/core';
import { useState } from 'react';
import { actionColor, sortActions } from '../components/actionColors';
import { RangeGrid } from '../components/RangeGrid';
import { chartsForGame } from '../state/charts';
import { useSettings } from '../state/settings';

export function RangesPage() {
  const { settings } = useSettings();
  const fit = chartsForGame(settings.game);
  const [chartId, setChartId] = useState<string>();
  const [selected, setSelected] = useState<HandClass>('AKs');
  const chart = fit.charts.find((c) => c.spec.id === chartId) ?? fit.charts[0];
  if (!chart) return <p className="muted">No charts for this game yet.</p>;
  const totals = actionFrequencies(chart);
  const labels: Record<string, string> = { fold: 'Fold' };
  for (const a of chart.spec.actions) labels[a.id] = a.label;
  const mix = chart.mixes.get(selected) ?? { fold: 1 };

  return (
    <div className="stack">
      <div>
        <h1>Ranges</h1>
        <p className="muted">
          Solver style charts with mixed strategies. Each cell splits by how often the hand takes each action. Starter charts are
          approximations; solver imports replace them in Phase 5.
        </p>
      </div>

      <div className="row">
        <select value={chart.spec.id} onChange={(e) => setChartId(e.target.value)}>
          {fit.charts.map((c) => (
            <option key={c.spec.id} value={c.spec.id}>
              {c.spec.title}
            </option>
          ))}
        </select>
        <span className="pill">{chartFormatLabel(chart.spec)}</span>
        {chart.spec.basis === 'exploit' && <span className="pill">exploit, not GTO</span>}
        {chart.spec.source === 'starter-approx' && <span className="pill">starter approximation</span>}
        {!fit.exact && <span className="pill">no {settings.game.tableSize}-handed charts yet</span>}
      </div>

      {chart.spec.versus && <p className="muted" style={{ margin: 0 }}>{chart.spec.versus}</p>}

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
        <RangeGrid mixes={chart.mixes} selected={selected} onSelect={setSelected} />

        <div className="stack">
          <div className="card">
            <h2>Overall</h2>
            <table className="kv">
              <tbody>
                {sortActions(Object.keys(totals)).map((a) => (
                  <tr key={a}>
                    <td>
                      <Swatch id={a} /> {labels[a] ?? a}
                    </td>
                    <td>{(totals[a] * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>{selected}</h2>
            <p className="muted">{comboCount(selected)} combos</p>
            <table className="kv">
              <tbody>
                {sortActions(Object.keys(mix)).map((a) => (
                  <tr key={a}>
                    <td>
                      <Swatch id={a} /> {labels[a] ?? a}
                    </td>
                    <td>{Math.round(mix[a] * 100)}%</td>
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

function Swatch({ id }: { id: string }) {
  return (
    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: actionColor(id), marginRight: 6 }} />
  );
}
