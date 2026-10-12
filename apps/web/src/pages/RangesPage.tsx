import { STARTER_CHARTS } from '@felt/content';
import { actionFrequencies, buildChart, comboCount, type HandClass } from '@felt/core';
import { useMemo, useState } from 'react';
import { actionColor, sortActions } from '../components/actionColors';
import { RangeGrid } from '../components/RangeGrid';

export function RangesPage() {
  const [chartId, setChartId] = useState(STARTER_CHARTS[0].id);
  const [selected, setSelected] = useState<HandClass>('AKs');
  const chart = useMemo(() => buildChart(STARTER_CHARTS.find((c) => c.id === chartId)!), [chartId]);
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
        <select value={chartId} onChange={(e) => setChartId(e.target.value)}>
          {STARTER_CHARTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.hero} {c.versus ? `vs ${c.versus}` : ''}: {c.title}
            </option>
          ))}
        </select>
        <span className="pill">{chart.spec.format}</span>
        {chart.spec.source === 'starter-approx' && <span className="pill">starter approximation</span>}
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(300px, 620px) minmax(240px, 1fr)' }}>
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
