import { type GameSettings, MAX_TABLE_SIZE, MIN_TABLE_SIZE, positionsFor, PRESETS, stakesLabel } from '@felt/core';
import { Check, Vibrate } from 'lucide-react';
import { haptic, hapticsSupported } from '../haptics';
import { chartsForGame } from '../state/charts';
import { useSettings } from '../state/settings';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';
import { Toggle } from '../ui/Toggle';

const same = (a: GameSettings, b: GameSettings) => JSON.stringify(a) === JSON.stringify(b);

export function SettingsPage() {
  const { settings, update } = useSettings();
  const g = settings.game;
  const setGame = (patch: Partial<GameSettings>) => update({ ...settings, game: { ...g, ...patch } });
  const fit = chartsForGame(g);
  const seats = positionsFor(g.tableSize);

  return (
    <div className="stack" style={{ gap: '1.1rem' }}>
      <div>
        <h1>Settings</h1>
        <p className="muted" style={{ margin: 0 }}>
          {stakesLabel(g.stakes)} {g.venue} {g.format === 'mtt' ? 'tournament' : 'cash'}, {g.tableSize}-handed. Charts, drills and
          amounts follow this.
        </p>
      </div>

      <section className="stack" style={{ gap: '0.6rem' }}>
        <div className="eyebrow">Presets</div>
        <div className="tiles">
          {Object.entries(PRESETS).map(([id, p]) => {
            const active = same(p.settings, g);
            return (
              <button
                key={id}
                className={`card ${active ? 'card-accent' : ''}`}
                style={{ textAlign: 'left', display: 'block', minHeight: 0, padding: '0.85rem 1rem' }}
                onClick={() => update({ ...settings, game: p.settings })}
                aria-pressed={active}
              >
                <div className="row between" style={{ flexWrap: 'nowrap' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{p.label}</strong>
                  {active && <Check size={18} color="var(--accent)" strokeWidth={3} />}
                </div>
                <div className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  {stakesLabel(p.settings.stakes)} · {p.settings.stackBb}bb
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="eyebrow">Game</div>
        <div className="list">
          <div className="list-row">
            <span className="label">Format</span>
            <Segmented
              value={g.format}
              onChange={(format) => setGame({ format })}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'mtt', label: 'Tournament' },
              ]}
            />
          </div>
          <div className="list-row">
            <span className="label">Venue</span>
            <Segmented
              value={g.venue}
              onChange={(venue) => setGame({ venue })}
              options={[
                { value: 'live', label: 'Live' },
                { value: 'online', label: 'Online' },
              ]}
            />
          </div>
          <div className="list-row" style={{ flexWrap: 'wrap' }}>
            <div>
              <div className="label">Players</div>
              <div className="hint">{seats.join(' · ')}</div>
            </div>
            <Stepper
              label="players"
              value={g.tableSize}
              min={MIN_TABLE_SIZE}
              max={MAX_TABLE_SIZE}
              onChange={(tableSize) => setGame({ tableSize })}
            />
          </div>
          {!fit.exact && (
            <div className="pill pill-warn" style={{ alignSelf: 'flex-start', margin: '0.25rem 0 0.5rem', whiteSpace: 'normal' }}>
              No {g.tableSize}-handed {g.format} charts yet. Drilling {fit.tableSize}-handed charts instead.
            </div>
          )}
          <div className="list-row">
            <div>
              <div className="label">Typical stack</div>
              <div className="hint">In big blinds</div>
            </div>
            <Stepper label="big blinds" value={g.stackBb} min={10} max={500} step={10} onChange={(stackBb) => setGame({ stackBb })} />
          </div>
        </div>
      </section>

      <section className="card stack" style={{ gap: '0.8rem' }}>
        <div className="row between">
          <div className="eyebrow">Stakes</div>
          <Segmented
            value={g.units}
            onChange={(units) => setGame({ units })}
            ariaLabel="Show amounts in"
            options={[
              { value: 'money', label: g.stakes.currency === 'USD' ? '$' : g.stakes.currency },
              { value: 'bb', label: 'bb' },
            ]}
          />
        </div>
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 96px), 1fr))', gap: '0.6rem' }}>
          <NumberField label="Small blind" value={g.stakes.sb} onChange={(v) => setGame({ stakes: { ...g.stakes, sb: v } })} />
          <NumberField label="Big blind" value={g.stakes.bb} onChange={(v) => setGame({ stakes: { ...g.stakes, bb: Math.max(0.01, v) } })} />
          <NumberField
            label="Straddle"
            value={g.stakes.straddle}
            onChange={(v) => setGame({ stakes: { ...g.stakes, straddle: v || undefined } })}
          />
          <NumberField label="Ante" value={g.stakes.ante} onChange={(v) => setGame({ stakes: { ...g.stakes, ante: v || undefined } })} />
          <label>
            Currency
            <input value={g.stakes.currency} onChange={(e) => setGame({ stakes: { ...g.stakes, currency: e.target.value } })} />
          </label>
        </div>
      </section>

      <section className="card stack" style={{ gap: '0.8rem' }}>
        <div className="eyebrow">Rake</div>
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 96px), 1fr))', gap: '0.6rem' }}>
          <NumberField
            label="Percent"
            value={Math.round(g.rake.percent * 1000) / 10}
            onChange={(v) => setGame({ rake: { ...g.rake, percent: v / 100 } })}
          />
          <NumberField label="Cap" value={g.rake.cap} onChange={(v) => setGame({ rake: { ...g.rake, cap: v } })} />
          <NumberField label="Extra drop" value={g.rake.dropExtra} onChange={(v) => setGame({ rake: { ...g.rake, dropExtra: v } })} />
        </div>
        <div className="list-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div>
            <div className="label">No flop, no drop</div>
            <div className="hint">No rake when the hand ends preflop</div>
          </div>
          <Toggle
            label="No flop, no drop"
            checked={g.rake.noFlopNoDrop}
            onChange={(noFlopNoDrop) => setGame({ rake: { ...g.rake, noFlopNoDrop } })}
          />
        </div>
      </section>

      <section className="card">
        <div className="eyebrow">Study and feel</div>
        <div className="list">
          <div className="list-row">
            <div>
              <div className="label">New cards per day</div>
              <div className="hint">About 6 seconds each</div>
            </div>
            <Stepper
              label="new cards"
              value={settings.study.newPerDay}
              min={0}
              max={100}
              step={5}
              onChange={(newPerDay) => update({ ...settings, study: { ...settings.study, newPerDay } })}
            />
          </div>
          <div className="list-row">
            <div>
              <div className="label">Haptics</div>
              <div className="hint">
                {hapticsSupported() ? 'Taps, answers and painting' : 'Not supported by this browser'}
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <button
                className="btn btn-ghost icon-btn"
                aria-label="Test haptics"
                data-haptic="off"
                disabled={!settings.ui.haptics}
                onClick={() => haptic('success')}
              >
                <Vibrate size={18} />
              </button>
              <Toggle label="Haptics" checked={settings.ui.haptics} onChange={(haptics) => update({ ...settings, ui: { ...settings.ui, haptics } })} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <label>
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        placeholder="none"
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  );
}
