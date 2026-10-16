import { type GameSettings, MAX_TABLE_SIZE, MIN_TABLE_SIZE, positionsFor, PRESETS, stakesLabel } from '@felt/core';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { haptic, hapticsSupported } from '../haptics';
import { isPro, setTestingPro, testingPro } from '../state/access';
import { RestoreSheet } from '../components/RestoreSheet';
import { db } from '../state/db';
import { useClaudeCloud } from '../state/cloud';
import { useServerFeatures, useSession } from '../state/api';
import { exportBackup, importBackup, requestPersistentStorage } from '../state/backup';
import { exportEvents } from '../state/events';
import { studyReminder, trialReminder } from '../state/reminders';
import { chartsForGame } from '../state/charts';
import { type Access, type Appearance, useSettings } from '../state/settings';
import { BrandFooter, BrandMark } from '../ui/Brand';
import { actionColor } from '../components/actionColors';
import {
  AccountIcon,
  AppearanceIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  ChipIcon,
  CodeIcon,
  DataIcon,
  type IconProps,
  PercentIcon,
  ReviewIcon,
  TargetIcon,
} from '../ui/icons';
import { NavRow } from '../ui/NavRow';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';
import { ThemePicker } from '../ui/ThemePicker';
import { Toggle } from '../ui/Toggle';
import './settings.css';

const same = (a: GameSettings, b: GameSettings) => JSON.stringify(a) === JSON.stringify(b);

/** Sub pages of Settings, reached at /settings/:section. */
const PAGES: Record<string, () => JSX.Element> = {
  game: GamePage,
  rake: RakePage,
  study: StudyPage,
  plan: PlanPage,
  appearance: AppearancePage,
  data: DataPage,
  pro: ProSettingsPage,
  developer: DeveloperPage,
};

export function SettingsPage() {
  const { section } = useParams();
  if (!section) return <SettingsHome />;
  const Page = PAGES[section];
  if (!Page) return <Navigate to="/settings" replace />;
  return <Page />;
}

/* Summaries shown on the right of each row ---------------------------------- */

function money(v: number, currency: string) {
  const n = Math.round(v * 100) / 100;
  return currency === 'USD' ? `$${n}` : `${n} ${currency}`;
}

function gameSummary(g: GameSettings) {
  const preset = Object.values(PRESETS).find((p) => same(p.settings, g));
  if (preset) return preset.label;
  if (g.format === 'mtt') return `Tournament, ${g.tableSize}-handed`;
  return `${g.venue === 'live' ? 'Live' : 'Online'} ${stakesLabel(g.stakes)}, ${g.tableSize}-handed`;
}

function rakeSummary(g: GameSettings) {
  const pct = `${Math.round(g.rake.percent * 1000) / 10}%`;
  return g.rake.cap ? `${pct}, ${money(g.rake.cap, g.stakes.currency)} cap` : pct;
}

const APPEARANCE_LABEL: Record<Appearance, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function proSummary(access: Access) {
  if (testingPro(access)) return 'On for testing';
  if (!isPro(access)) return 'Free plan';
  return access.trialEndsAt ? `Trial to ${shortDate(access.trialEndsAt)}` : 'Active';
}

/** Suited Pro's tile: the mark in ink on brass. */
function ProGlyph({ size }: IconProps) {
  return (
    <span className="settings-pro-glyph">
      <BrandMark variant="glyph" size={(size ?? 19) + 3} />
    </span>
  );
}

/** Asks the browser to keep Suited's data, and reports whether it will. */
function usePersisted() {
  const [persisted, setPersisted] = useState<boolean>();
  useEffect(() => {
    void requestPersistentStorage().then(setPersisted);
  }, []);
  return persisted;
}

/* Settings root --------------------------------------------------------------- */

function SettingsHome() {
  const { settings, update } = useSettings();
  const session = useSession();
  const { cloud } = useClaudeCloud();
  const taps = useRef(0);
  const access = settings.access;
  const devVisible = access.devMode || import.meta.env.DEV;
  usePersisted();

  return (
    <div className="stack settings" style={{ gap: '1.6rem' }}>
      <PageHeader title="Settings" back={{ to: '/you', label: 'You' }} />

      <div className="list with-icons">
        <NavRow
          to="/account"
          icon={AccountIcon}
          color="var(--base-500)"
          title={
            <span className="settings-account">
              {session ? session.user.email ?? (settings.profile.name?.trim() || 'Your account') : cloud ? cloud.name || 'Signed in' : 'Account'}
            </span>
          }
          subtitle={
            session
              ? (session.user.passkeys ?? 0) > 0
                ? 'Signed in with a passkey. Sync and leagues.'
                : 'Sync and leagues'
              : cloud
                ? 'Signed in with Claude. Progress saves to the cloud.'
                : 'Sign in to keep your progress'
          }
        />
      </div>

      <Section title="Your game">
        <div className="list with-icons">
          <NavRow to="/settings/game" icon={ChipIcon} color="var(--base-500)" title="Game" detail={gameSummary(settings.game)} />
          <NavRow to="/settings/rake" icon={PercentIcon} color="var(--base-500)" title="Rake" detail={rakeSummary(settings.game)} />
        </div>
      </Section>

      <Section title="Learning">
        <div className="list with-icons">
          <NavRow to="/settings/study" icon={ReviewIcon} color="var(--base-500)" title="Study" detail={`${settings.study.newPerDay} new a day`} />
          <NavRow to="/settings/plan" icon={TargetIcon} color="var(--base-500)" title="Your plan" detail={`${settings.profile.dailyMinutes} min a day`} />
        </div>
      </Section>

      <Section title="App">
        <div className="list with-icons">
          <NavRow
            to="/settings/appearance"
            icon={AppearanceIcon}
            color="var(--base-500)"
            title="Appearance and feel"
            detail={APPEARANCE_LABEL[settings.ui.appearance]}
          />
          {session && (
            <NavRow to="/account" icon={BellIcon} color="var(--base-500)" title="Notifications" detail={session.user.reminders ? 'On' : 'Off'} />
          )}
          <NavRow to="/settings/data" icon={DataIcon} color="var(--base-500)" title="Your data" />
        </div>
      </Section>

      <div className="list with-icons settings-pro">
        <NavRow to="/settings/pro" icon={ProGlyph} color="var(--tint-fill)" title="Suited Pro" detail={proSummary(access)} />
      </div>

      <TestingSection />

      {devVisible && (
        <div className="list with-icons">
          <NavRow to="/settings/developer" icon={CodeIcon} color="var(--gray)" title="Developer" detail={access.devMode ? 'On' : 'Off'} />
        </div>
      )}

      <div
        onClick={() => {
          taps.current += 1;
          if (taps.current >= 7 && !access.devMode) {
            haptic('success');
            update({ ...settings, access: { ...access, devMode: true } });
          }
        }}
      >
        <BrandFooter />
      </div>
    </div>
  );
}

/* Sub pages ------------------------------------------------------------------ */

function SubPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="stack settings" style={{ gap: '1.6rem' }}>
      <PageHeader title={title} subtitle={subtitle} back={{ to: '/settings', label: 'Settings' }} />
      {children}
    </div>
  );
}

function GamePage() {
  const { settings, update } = useSettings();
  const g = settings.game;
  const setGame = (patch: Partial<GameSettings>) => update({ ...settings, game: { ...g, ...patch } });
  const fit = chartsForGame(g);

  return (
    <SubPage title="Game and stakes">
      <Section title="Presets" info={<p>Pick a preset. Then fine tune anything below.</p>}>
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
      </Section>

      <Section
        title="Table"
        footer={
          !fit.exact && (
            <span className="settings-warn">
              No {g.tableSize}-handed {g.format === 'mtt' ? 'tournament' : 'cash'} charts yet, so drills use the {fit.tableSize}-handed charts.
            </span>
          )
        }
      >
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
          <Row label="Typical stack">
            <Stepper label="big blinds" value={g.stackBb} min={10} max={500} step={10} format={(v) => `${v}bb`} onChange={(stackBb) => setGame({ stackBb })} />
          </Row>
        </div>
      </Section>

      <Section title="Stakes">
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
              className="settings-input"
            />
          </Row>
        </div>
      </Section>
    </SubPage>
  );
}

function RakePage() {
  const { settings, update } = useSettings();
  const g = settings.game;
  const setGame = (patch: Partial<GameSettings>) => update({ ...settings, game: { ...g, ...patch } });

  return (
    <SubPage title="Rake" subtitle="What the house takes from each pot.">
      <Section
        title="Per pot"
        info={
          <>
            <p>The cap is the most rake one pot can pay. Extra drop is a flat fee on top, like a jackpot drop.</p>
            <p>With no flop, no drop, pots that end before the flop pay nothing.</p>
          </>
        }
      >
        <div className="list">
          <NumberRow
            label="Rake percent"
            value={Math.round(g.rake.percent * 1000) / 10}
            onChange={(v) => setGame({ rake: { ...g.rake, percent: v / 100 } })}
            suffix="%"
          />
          <NumberRow label="Rake cap" value={g.rake.cap} onChange={(v) => setGame({ rake: { ...g.rake, cap: v } })} />
          <NumberRow label="Extra drop" value={g.rake.dropExtra} onChange={(v) => setGame({ rake: { ...g.rake, dropExtra: v } })} />
          <Row label="No flop, no drop">
            <Toggle label="No flop, no drop" checked={g.rake.noFlopNoDrop} onChange={(noFlopNoDrop) => setGame({ rake: { ...g.rake, noFlopNoDrop } })} />
          </Row>
        </div>
      </Section>
    </SubPage>
  );
}

/** About 6 seconds per new card, said as a rough daily time. */
function newCardTime(n: number) {
  if (n === 0) return 'No new cards';
  const seconds = n * 6;
  return seconds < 60 ? `About ${seconds} sec a day` : `About ${Math.round(seconds / 60)} min a day`;
}

function StudyPage() {
  const { settings, update } = useSettings();

  return (
    <SubPage title="Study and review">
      <Section
        title="Drills"
        info={
          <>
            <p>Untimed drills hide the timer. Speed then no longer affects when cards come back.</p>
            <p>With keyboard shortcuts, number keys answer and Enter moves on.</p>
          </>
        }
      >
        <div className="list">
          <Row label="Untimed drills">
            <Toggle label="Untimed drills" checked={!!settings.study.untimed} onChange={(untimed) => update({ ...settings, study: { ...settings.study, untimed } })} />
          </Row>
          <Row label="Keyboard shortcuts">
            <Toggle
              label="Keyboard shortcuts"
              checked={settings.study.shortcuts !== false}
              onChange={(shortcuts) => update({ ...settings, study: { ...settings.study, shortcuts } })}
            />
          </Row>
        </div>
      </Section>

      <Section title="Review" info={<p>New cards join your review each day. Each one takes about 6 seconds.</p>}>
        <div className="list">
          <Row label="New cards per day" hint={newCardTime(settings.study.newPerDay)}>
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
      </Section>
    </SubPage>
  );
}

function PlanPage() {
  const { settings, update } = useSettings();

  return (
    <SubPage title="Your plan">
      <Section title="Every day">
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
              <span className="footnote">Adds an event to your calendar</span>
            </span>
          </button>
        </div>
      </Section>

      <Section title="Where to start">
        <div className="list">
          <Link to="/placement" className="list-row">
            <span className="grow">Retake the placement quiz</span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
        </div>
      </Section>
    </SubPage>
  );
}

function AppearancePage() {
  const { settings, update } = useSettings();

  return (
    <SubPage title="Appearance and feel">
      <Section title="Look" info={<p>Themes change the table and accent colors. Action colors like raise and fold stay the same in every theme.</p>}>
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
          <div className="settings-theme">
            <ThemePicker value={settings.ui.palette} onChange={(palette) => update({ ...settings, ui: { ...settings.ui, palette } })} />
          </div>
        </div>
      </Section>

      <Section title="Action colors" footer="Raise, call and fold then differ in brightness as well as color. It helps with red-green color blindness.">
        <div className="list">
          <Row label="Color blind friendly">
            <Toggle
              label="Color blind friendly"
              checked={!!settings.ui.colorblind}
              onChange={(colorblind) => update({ ...settings, ui: { ...settings.ui, colorblind } })}
            />
          </Row>
          <div className="settings-actions-preview" aria-hidden="true">
            {(['raise', '3bet', 'call', 'fold'] as const).map((a) => (
              <span key={a} style={{ background: actionColor(a) }}>
                {a === '3bet' ? '3bet' : a[0].toUpperCase() + a.slice(1)}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Feel">
        <div className="list">
          <Row label="Haptics" hint={hapticsSupported() ? undefined : 'Not supported by this browser'}>
            <Toggle label="Haptics" checked={settings.ui.haptics} onChange={(haptics) => update({ ...settings, ui: { ...settings.ui, haptics } })} />
          </Row>
          <button className="list-row" data-haptic="off" disabled={!settings.ui.haptics} onClick={() => haptic('success')}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Test haptics
            </span>
          </button>
        </div>
      </Section>
    </SubPage>
  );
}

function DataPage() {
  const persisted = usePersisted();
  const [dataMessage, setDataMessage] = useState<string>();
  const saveBackup = async () => {
    const json = await exportBackup();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `felt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDataMessage('Backup saved. Keep the file somewhere safe, such as iCloud Drive or Google Drive.');
    haptic('success');
  };
  const restoreBackup = async (file?: File) => {
    if (!file) return;
    if (!window.confirm('Replace everything on this device with this backup?')) return;
    try {
      await importBackup(await file.text());
      setDataMessage('Backup restored. Suited will reload now.');
      haptic('success');
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      setDataMessage(e instanceof Error ? e.message : 'We could not read that file. Pick a Suited backup file.');
      haptic('error');
    }
  };

  return (
    <SubPage title="Your data">
      <Section
        title="Backups"
        info={<p>Your progress lives only in this browser. Save a backup to move it to a new phone or to restore it later.</p>}
        footer={
          <span role="status" className="settings-status">
            {dataMessage}
          </span>
        }
      >
        <div className="list">
          <div className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Stored on this device</span>
              <span className="footnote">
                {persisted === undefined
                  ? 'Checking…'
                  : persisted
                    ? 'Your browser will keep it safe.'
                    : 'Your browser could clear it. Save a backup.'}
              </span>
            </span>
          </div>
          <button className="list-row" onClick={() => void saveBackup()}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Save a backup
            </span>
          </button>
          <label className="list-row settings-action" style={{ cursor: 'pointer', fontSize: 'inherit' }}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Restore from a backup
            </span>
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void restoreBackup(e.target.files?.[0])} />
          </label>
        </div>
      </Section>
    </SubPage>
  );
}

/**
 * Pro for testing, in plain sight while purchases are not open. It reuses
 * the developer Pro override and changes this device only (docs/MONETIZATION.md).
 */
function TestingSection() {
  const { settings, update } = useSettings();
  const session = useSession();
  const features = useServerFeatures();
  const on = testingPro(settings.access);
  const serverOn = !!features?.proForEveryone;
  return (
    <Section
      title="Testing"
      footer={
        <span className="settings-status">
          {serverOn
            ? session
              ? 'The server has Suited Pro on for every signed in player. The AI coach works too.'
              : 'The server has Suited Pro on for signed in players. Sign in to get it everywhere.'
            : 'For testing only. This unlocks Suited Pro on this device and charges nothing. The AI coach still checks your account.'}
        </span>
      }
    >
      <div className="list">
        <Row label="Unlock Suited Pro for testing" hint={on ? 'On for this device' : 'Only this device'}>
          <Toggle label="Unlock Suited Pro for testing" checked={on} onChange={(next) => update({ ...settings, access: setTestingPro(settings.access, next) })} />
        </Row>
      </div>
    </Section>
  );
}

function ProSettingsPage() {
  const { settings } = useSettings();
  const access = settings.access;
  const [params, setParams] = useSearchParams();
  // Back from signing in to restore: the sheet opens again on its own.
  const [restoring, setRestoring] = useState(params.get('restore') === '1');
  useEffect(() => {
    if (params.get('restore') === '1') setParams({}, { replace: true });
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SubPage title="Suited Pro">
      <Section
        title="Subscription"
        info={<p>Cancel or change Suited Pro from your account. Your progress stays either way.</p>}
      >
        <div className="list">
          <Link to="/pro?from=settings" className="list-row">
            <span className="grow">Suited Pro</span>
            <span className="detail">
              {!isPro(access) ? 'Free plan' : access.trialEndsAt ? `Free trial until ${shortDate(access.trialEndsAt)}` : 'Active'}
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
          <button className="list-row" onClick={() => setRestoring(true)}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Restore purchases
            </span>
          </button>
        </div>
      </Section>
      <RestoreSheet open={restoring} onClose={() => setRestoring(false)} returnTo="/settings/pro" />
    </SubPage>
  );
}

function DeveloperPage() {
  const { settings, update } = useSettings();
  const navigate = useNavigate();
  const access = settings.access;
  const setAccess = (patch: Partial<typeof access>) => update({ ...settings, access: { ...access, ...patch } });
  if (!(access.devMode || import.meta.env.DEV)) return <Navigate to="/settings" replace />;

  return (
    <SubPage title="Developer">
      <Section
        title="Purchases"
        info={
          <>
            <p>Developer mode completes purchases locally without a store. Pro unlocked overrides purchases while it is on.</p>
            <p>This page is hidden in release builds. Tap the version on Settings seven times to show it.</p>
          </>
        }
      >
        <div className="list">
          <Row label="Developer mode">
            <Toggle label="Developer mode" checked={!!access.devMode} onChange={(devMode) => setAccess({ devMode })} />
          </Row>
          <Row label="Pro unlocked">
            <Toggle label="Pro unlocked" checked={!!access.devPro} onChange={(devPro) => setAccess({ devPro, devMode: true })} />
          </Row>
          <button className="list-row" onClick={() => setAccess({ pro: false, trialEndsAt: undefined, plan: undefined, devPro: undefined })}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Clear purchase
            </span>
          </button>
        </div>
      </Section>

      <Section title="Tools">
        <div className="list">
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
      </Section>
    </SubPage>
  );
}

/* Rows ----------------------------------------------------------------------- */

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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
        className={suffix ? 'settings-input short' : 'settings-input'}
      />
      {suffix && <span className="muted">{suffix}</span>}
    </label>
  );
}
