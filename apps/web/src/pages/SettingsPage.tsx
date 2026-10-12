import { type GameSettings, MAX_TABLE_SIZE, MIN_TABLE_SIZE, positionsFor, PRESETS, stakesLabel } from '@felt/core';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { haptic, hapticsSupported } from '../haptics';
import { isPro, restorePurchases } from '../state/access';
import { db } from '../state/db';
import { exportEvents } from '../state/events';
import { cueCopy } from '../state/goals';
import { studyReminder, trialReminder } from '../state/reminders';
import { chartsForGame } from '../state/charts';
import { type Appearance, useSettings } from '../state/settings';
import { BrandFooter } from '../ui/Brand';
import { CheckIcon, ChevronRightIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';
import { ThemePicker } from '../ui/ThemePicker';
import { Toggle } from '../ui/Toggle';

const same = (a: GameSettings, b: GameSettings) => JSON.stringify(a) === JSON.stringify(b);

export function SettingsPage() {
  const { settings, update } = useSettings();
  const g = settings.game;
  const setGame = (patch: Partial<GameSettings>) => update({ ...settings, game: { ...g, ...patch } });
  const fit = chartsForGame(g);
  const navigate = useNavigate();
  const taps = useRef(0);
  const access = settings.access;
  const devVisible = access.devMode || import.meta.env.DEV;
  const setAccess = (patch: Partial<typeof access>) => update({ ...settings, access: { ...access, ...patch } });
  const [restoreMessage, setRestoreMessage] = useState<string>();
  const restore = async () => {
    const result = await restorePurchases(settings);
    if (result.ok) {
      update({ ...settings, access: result.access });
      setRestoreMessage('Purchases restored.');
    } else setRestoreMessage(result.reason);
  };

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Settings" back={{ to: '/more', label: 'More' }} />

      <section>
        <h2 className="section-title">Game</h2>
        <div className="list">
          {Object.entries(PRESETS).map(([id, p]) => {
            const active = same(p.settings, g);
            return (
              <button key={id} className="list-row" data-haptic="select" onClick={() => update({ ...settings, game: p.settings })}>
                <span className="grow">
                  <span style={{ display: 'block' }}>{p.label}</span>
                  <span className="footnote">
                    {stakesLabel(p.settings.stakes)}, {p.settings.stackBb}bb
                  </span>
                </span>
                {active && <CheckIcon size={20} style={{ color: 'var(--tint)' }} />}
              </button>
            );
          })}
        </div>
        <div className="section-footer">Pick a preset, then fine tune anything below.</div>
      </section>

      <section>
        <h2 className="section-title">Table</h2>
        <div className="list">
          <Row label="Format">
            <Segmented
              ariaLabel="Format"
              value={g.format}
              onChange={(format) => setGame({ format })}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'mtt', label: 'Tournament' },
              ]}
            />
          </Row>
          <Row label="Venue">
            <Segmented
              ariaLabel="Venue"
              value={g.venue}
              onChange={(venue) => setGame({ venue })}
              options={[
                { value: 'live', label: 'Live' },
                { value: 'online', label: 'Online' },
              ]}
            />
          </Row>
          <Row label="Players" hint={positionsFor(g.tableSize).join(' ')}>
            <Stepper label="players" value={g.tableSize} min={MIN_TABLE_SIZE} max={MAX_TABLE_SIZE} onChange={(tableSize) => setGame({ tableSize })} />
          </Row>
          <Row label="Typical stack" hint="Big blinds">
            <Stepper label="big blinds" value={g.stackBb} min={10} max={500} step={10} onChange={(stackBb) => setGame({ stackBb })} />
          </Row>
        </div>
        {!fit.exact && (
          <div className="section-footer" style={{ color: 'var(--orange)' }}>
            No {g.tableSize}-handed {g.format === 'mtt' ? 'tournament' : 'cash'} charts yet, so drills use the {fit.tableSize}-handed charts.
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">Stakes</h2>
        <div className="list">
          <Row label="Amounts">
            <Segmented
              ariaLabel="Amounts"
              value={g.units}
              onChange={(units) => setGame({ units })}
              options={[
                { value: 'money', label: g.stakes.currency === 'USD' ? 'Dollars' : g.stakes.currency },
                { value: 'bb', label: 'Big blinds' },
              ]}
            />
          </Row>
          <NumberRow label="Small blind" value={g.stakes.sb} onChange={(v) => setGame({ stakes: { ...g.stakes, sb: v } })} />
          <NumberRow label="Big blind" value={g.stakes.bb} onChange={(v) => setGame({ stakes: { ...g.stakes, bb: Math.max(0.01, v) } })} />
          <NumberRow label="Straddle" value={g.stakes.straddle} onChange={(v) => setGame({ stakes: { ...g.stakes, straddle: v || undefined } })} />
          <NumberRow label="Ante" value={g.stakes.ante} onChange={(v) => setGame({ stakes: { ...g.stakes, ante: v || undefined } })} />
          <Row label="Currency">
            <input
              aria-label="Currency"
              value={g.stakes.currency}
              onChange={(e) => setGame({ stakes: { ...g.stakes, currency: e.target.value } })}
              style={{ width: 110, textAlign: 'right', background: 'transparent', padding: 0, color: 'var(--label-2)' }}
            />
          </Row>
        </div>
      </section>

      <section>
        <h2 className="section-title">Rake</h2>
        <div className="list">
          <NumberRow
            label="Percent"
            value={Math.round(g.rake.percent * 1000) / 10}
            onChange={(v) => setGame({ rake: { ...g.rake, percent: v / 100 } })}
            suffix="%"
          />
          <NumberRow label="Cap" value={g.rake.cap} onChange={(v) => setGame({ rake: { ...g.rake, cap: v } })} />
          <NumberRow label="Extra drop" value={g.rake.dropExtra} onChange={(v) => setGame({ rake: { ...g.rake, dropExtra: v } })} />
          <Row label="No flop, no drop">
            <Toggle
              label="No flop, no drop"
              checked={g.rake.noFlopNoDrop}
              onChange={(noFlopNoDrop) => setGame({ rake: { ...g.rake, noFlopNoDrop } })}
            />
          </Row>
        </div>
      </section>

      <section>
        <h2 className="section-title">Subscription</h2>
        <div className="list">
          <Link to="/pro?from=settings" className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Felt Pro</span>
              <span className="footnote">
                {!isPro(access)
                  ? 'Free plan'
                  : access.trialEndsAt
                    ? `Free trial until ${new Date(access.trialEndsAt).toLocaleDateString()}`
                    : 'Active'}
              </span>
            </span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
          {isPro(access) && access.trialEndsAt && (
            <button className="list-row" onClick={() => trialReminder(access.trialEndsAt!)}>
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Remind me 2 days before the trial ends
              </span>
            </button>
          )}
          <button className="list-row" onClick={() => void restore()}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Restore purchases
            </span>
          </button>
        </div>
        <div className="section-footer">
          {restoreMessage ?? 'Cancel or change your plan in the store you subscribed through. Your progress stays either way.'}
        </div>
      </section>

      <section>
        <h2 className="section-title">Your plan</h2>
        <div className="list">
          <Row label="Daily study time">
            <Stepper
              label="minutes a day"
              value={settings.profile.dailyMinutes}
              min={5}
              max={60}
              step={5}
              format={(v) => `${v} min`}
              onChange={(dailyMinutes) => update({ ...settings, profile: { ...settings.profile, dailyMinutes } })}
            />
          </Row>
          <button className="list-row" onClick={() => studyReminder(settings.profile.cue, settings.profile.dailyMinutes)}>
            <span className="grow">
              <span style={{ display: 'block', color: 'var(--tint)' }}>Add a daily study reminder</span>
              <span className="footnote">{cueCopy(settings.profile.cue) ? `${cueCopy(settings.profile.cue)!.label}, in your calendar app` : 'Opens in your calendar app'}</span>
            </span>
          </button>
          <Link to="/placement" className="list-row">
            <span className="grow">Retake the placement test</span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="section-title">Study</h2>
        <div className="list">
          <Row label="Untimed drills" hint="Hides the timer. Speed no longer affects when cards come back.">
            <Toggle label="Untimed drills" checked={!!settings.study.untimed} onChange={(untimed) => update({ ...settings, study: { ...settings.study, untimed } })} />
          </Row>
          <Row label="Keyboard shortcuts" hint="Number keys answer drills, Enter moves on">
            <Toggle
              label="Keyboard shortcuts"
              checked={settings.study.shortcuts !== false}
              onChange={(shortcuts) => update({ ...settings, study: { ...settings.study, shortcuts } })}
            />
          </Row>
          <Row label="New cards per day" hint="About 6 seconds each">
            <Stepper
              label="new cards"
              value={settings.study.newPerDay}
              min={0}
              max={100}
              step={5}
              onChange={(newPerDay) => update({ ...settings, study: { ...settings.study, newPerDay } })}
            />
          </Row>
        </div>
      </section>

      <section>
        <h2 className="section-title">Theme</h2>
        <div className="list">
          <ThemePicker value={settings.ui.palette} onChange={(palette) => update({ ...settings, ui: { ...settings.ui, palette } })} />
        </div>
        <div className="section-footer">Card room is the Felt brand. Themes change the felt and accent only; poker colors stay the same.</div>
      </section>

      <section>
        <h2 className="section-title">Display and feel</h2>
        <div className="list">
          <Row label="Appearance">
            <Segmented<Appearance>
              ariaLabel="Appearance"
              value={settings.ui.appearance}
              onChange={(appearance) => update({ ...settings, ui: { ...settings.ui, appearance } })}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Row>
          <Row label="Haptics" hint={hapticsSupported() ? undefined : 'Not supported by this browser'}>
            <Toggle
              label="Haptics"
              checked={settings.ui.haptics}
              onChange={(haptics) => update({ ...settings, ui: { ...settings.ui, haptics } })}
            />
          </Row>
          <button className="list-row" data-haptic="off" disabled={!settings.ui.haptics} onClick={() => haptic('success')}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Test haptics
            </span>
          </button>
        </div>
      </section>

      {devVisible && (
        <section>
          <h2 className="section-title">Developer</h2>
          <div className="list">
            <Row label="Developer mode" hint="Purchases complete locally without a store">
              <Toggle label="Developer mode" checked={!!access.devMode} onChange={(devMode) => setAccess({ devMode })} />
            </Row>
            <Row label="Pro unlocked" hint="Overrides purchases while developer mode is on">
              <Toggle
                label="Pro unlocked"
                checked={!!access.devPro}
                onChange={(devPro) => setAccess({ devPro, devMode: true })}
              />
            </Row>
            <button className="list-row" onClick={() => setAccess({ pro: false, trialEndsAt: undefined, plan: undefined, devPro: undefined })}>
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Clear purchase
              </span>
            </button>
            <button
              className="list-row"
              onClick={() => {
                update({ ...settings, profile: { ...settings.profile, onboarded: false, placedAt: undefined } });
                navigate('/welcome');
              }}
            >
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Replay onboarding
              </span>
            </button>
            <button
              className="list-row"
              onClick={async () => {
                const json = await exportEvents();
                const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = 'felt-events.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Export event log
              </span>
            </button>
            <button
              className="list-row"
              onClick={async () => {
                if (!window.confirm('Clear all lesson progress on this device?')) return;
                await db.lessons.clear();
                haptic('warning');
              }}
            >
              <span className="grow" style={{ color: 'var(--red)' }}>
                Clear lesson progress
              </span>
            </button>
          </div>
          <div className="section-footer">Hidden in release builds. Tap the version seven times to show it.</div>
        </section>
      )}

      <div
        onClick={() => {
          taps.current += 1;
          if (taps.current >= 7 && !access.devMode) {
            haptic('success');
            setAccess({ devMode: true });
          }
        }}
      >
        <BrandFooter />
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="list-row" style={{ flexWrap: 'wrap' }}>
      <span className="grow">
        <span style={{ display: 'block' }}>{label}</span>
        {hint && <span className="footnote">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="list-row" style={{ flexDirection: 'row', fontSize: 'inherit', fontWeight: 'inherit', color: 'var(--label)' }}>
      <span className="grow">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        placeholder="None"
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        style={{ width: 110, textAlign: 'right', background: 'transparent', padding: 0, color: 'var(--label-2)' }}
      />
      {suffix && <span className="muted">{suffix}</span>}
    </label>
  );
}
