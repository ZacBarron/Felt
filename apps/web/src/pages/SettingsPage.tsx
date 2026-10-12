import { type GameSettings, MAX_TABLE_SIZE, MIN_TABLE_SIZE, positionsFor, PRESETS, stakesLabel } from '@felt/core';
import { chartsForGame } from '../state/charts';
import { useSettings } from '../state/settings';

export function SettingsPage() {
  const { settings, update } = useSettings();
  const g = settings.game;
  const setGame = (patch: Partial<GameSettings>) => update({ ...settings, game: { ...g, ...patch } });
  const fit = chartsForGame(g);
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="stack">
      <div>
        <h1>Settings</h1>
        <p className="muted">
          Your game drives which charts you drill and how amounts are shown. Current: {stakesLabel(g.stakes)} {g.venue}{' '}
          {g.format}, {g.tableSize}-handed.
        </p>
      </div>

      <div className="card stack">
        <h2>Presets</h2>
        <div className="row">
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} onClick={() => update({ ...settings, game: p.settings })}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2>Game</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <label>
            Format
            <select value={g.format} onChange={(e) => setGame({ format: e.target.value as GameSettings['format'] })}>
              <option value="cash">Cash</option>
              <option value="mtt">Tournament</option>
            </select>
          </label>
          <label>
            Venue
            <select value={g.venue} onChange={(e) => setGame({ venue: e.target.value as GameSettings['venue'] })}>
              <option value="live">Live</option>
              <option value="online">Online</option>
            </select>
          </label>
          <label>
            Players
            <select value={g.tableSize} onChange={(e) => setGame({ tableSize: Number(e.target.value) })}>
              {Array.from({ length: MAX_TABLE_SIZE - MIN_TABLE_SIZE + 1 }, (_, i) => i + MIN_TABLE_SIZE).map((n) => (
                <option key={n} value={n}>
                  {n}-handed
                </option>
              ))}
            </select>
          </label>
          <label>
            Typical stack (bb)
            <input type="number" inputMode="decimal" value={g.stackBb} onChange={(e) => setGame({ stackBb: num(e.target.value) })} />
          </label>
        </div>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          Seats: {positionsFor(g.tableSize).join(', ')}
        </div>
        {!fit.exact && (
          <div className="pill" style={{ alignSelf: 'flex-start' }}>
            No {g.tableSize}-handed {g.format} charts yet; drilling {fit.tableSize}-handed charts instead
          </div>
        )}
      </div>

      <div className="card stack">
        <h2>Stakes</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
          <label>
            Small blind
            <input
              type="number"
              inputMode="decimal"
              value={g.stakes.sb}
              onChange={(e) => setGame({ stakes: { ...g.stakes, sb: num(e.target.value) } })}
            />
          </label>
          <label>
            Big blind
            <input
              type="number"
              inputMode="decimal"
              value={g.stakes.bb}
              onChange={(e) => setGame({ stakes: { ...g.stakes, bb: Math.max(0.01, num(e.target.value)) } })}
            />
          </label>
          <label>
            Straddle
            <input
              type="number"
              inputMode="decimal"
              value={g.stakes.straddle ?? ''}
              placeholder="none"
              onChange={(e) => setGame({ stakes: { ...g.stakes, straddle: num(e.target.value) || undefined } })}
            />
          </label>
          <label>
            Ante
            <input
              type="number"
              inputMode="decimal"
              value={g.stakes.ante ?? ''}
              placeholder="none"
              onChange={(e) => setGame({ stakes: { ...g.stakes, ante: num(e.target.value) || undefined } })}
            />
          </label>
          <label>
            Currency
            <input value={g.stakes.currency} onChange={(e) => setGame({ stakes: { ...g.stakes, currency: e.target.value } })} />
          </label>
          <label>
            Show amounts in
            <select value={g.units} onChange={(e) => setGame({ units: e.target.value as GameSettings['units'] })}>
              <option value="money">Money</option>
              <option value="bb">Big blinds</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card stack">
        <h2>Rake</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
          <label>
            Percent
            <input
              type="number"
              inputMode="decimal"
              value={Math.round(g.rake.percent * 1000) / 10}
              onChange={(e) => setGame({ rake: { ...g.rake, percent: num(e.target.value) / 100 } })}
            />
          </label>
          <label>
            Cap
            <input
              type="number"
              inputMode="decimal"
              value={g.rake.cap}
              onChange={(e) => setGame({ rake: { ...g.rake, cap: num(e.target.value) } })}
            />
          </label>
          <label>
            Extra drop
            <input
              type="number"
              inputMode="decimal"
              value={g.rake.dropExtra}
              onChange={(e) => setGame({ rake: { ...g.rake, dropExtra: num(e.target.value) } })}
            />
          </label>
          <label>
            No flop, no drop
            <select
              value={g.rake.noFlopNoDrop ? 'yes' : 'no'}
              onChange={(e) => setGame({ rake: { ...g.rake, noFlopNoDrop: e.target.value === 'yes' } })}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card stack">
        <h2>Study</h2>
        <label style={{ maxWidth: 220 }}>
          New review cards per day
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={settings.study.newPerDay}
            onChange={(e) => update({ ...settings, study: { ...settings.study, newPerDay: Math.max(0, num(e.target.value)) } })}
          />
        </label>
      </div>
    </div>
  );
}
