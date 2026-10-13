import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { manageSubscription } from '../state/access';
import { api, serverFeatures, type ServerFeatures, type ServerUser, setSession, updateMe, useSession } from '../state/api';
import { track } from '../state/events';
import { cueCopy } from '../state/goals';
import { disableReminders, enableReminders, pushBlocker } from '../state/push';
import { useSettings } from '../state/settings';
import { useClaudeCloud } from '../state/cloud';
import { firstSync, keepCopy, pushNow, resetSync, useSyncMeta } from '../state/sync';
import { BottomBar } from '../ui/BottomBar';
import { BrandMark } from '../ui/Brand';
import { AccountIcon, BellIcon, LeagueIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, Section } from '../ui/Section';
import { Toggle } from '../ui/Toggle';
import './screens.css';

function ago(iso?: string) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return new Date(iso).toLocaleDateString();
}

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Sign in with an emailed code, then sync, reminders, leagues and subscription. */
export function AccountPage() {
  const [features, setFeatures] = useState<ServerFeatures | null>();
  const session = useSession();
  const { cloud } = useClaudeCloud();

  useEffect(() => {
    void serverFeatures().then(setFeatures);
  }, []);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Account" back={{ to: '/settings', label: 'Settings' }} />
      {!session && cloud ? (
        <ClaudeAccount name={cloud.name} />
      ) : features === undefined ? null : features === null || !features.accounts ? (
        <EmptyState
          art={
            <span className="sc-art-tile">
              <AccountIcon size={34} />
            </span>
          }
          title="No accounts here"
          body="Everything still works on this device. Move your progress with a backup."
          action={
            <Link to="/settings" className="btn btn-tinted" style={{ marginTop: '0.4rem' }}>
              Open Your data in Settings
            </Link>
          }
        />
      ) : session ? (
        <SignedIn user={session.user} features={features} />
      ) : (
        <SignIn />
      )}
    </div>
  );
}

function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const start = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const r = await api<{ devCode?: string }>('/auth/start', { body: { email } });
      setSent(true);
      setDevCode(r.devCode);
      track('signin_code_sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not send a code. Check your email address and try again.');
    }
    setBusy(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const r = await api<{ token: string; user: ServerUser }>('/auth/verify', { body: { email, code } });
      resetSync();
      setSession(r);
      haptic('success');
      track('signed_in');
      const result = await firstSync().catch(() => undefined);
      if (next && result !== 'choose') navigate(next, { replace: true });
      if (result === 'pulled') location.reload();
    } catch (err) {
      haptic('error');
      setError(err instanceof Error ? err.message : 'That code did not work. Try again or get a new code.');
    }
    setBusy(false);
  };

  return (
    <>
      {!sent && (
        <EmptyState
          art={<BrandMark size={72} />}
          title="Sign in to Felt"
          body="Keep your progress on all your devices."
          action={
            <div className="sc-perks" aria-label="You also get">
              <span className="sc-perk">
                <BellIcon size={15} /> Study reminders
              </span>
              <span className="sc-perk">
                <LeagueIcon size={15} /> Weekly leagues
              </span>
            </div>
          }
        />
      )}
      {!sent ? (
        <form className="stack" style={{ gap: '0.75rem' }} onSubmit={start}>
          <label className="stack" style={{ gap: '0.35rem' }}>
            <span className="footnote">Email</span>
            <input id="account-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <span className="footnote">There is no password. We email you a code.</span>
          <BottomBar>
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !email}>
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </BottomBar>
        </form>
      ) : (
        <form className="stack" style={{ gap: '0.75rem' }} onSubmit={verify}>
          <label className="stack" style={{ gap: '0.35rem' }}>
            <span className="footnote">Enter the 6 digit code we sent to {email}</span>
            <input
              id="account-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {devCode && <div className="footnote">Development server: your code is {devCode}.</div>}
          <button type="button" className="link-btn footnote" style={{ alignSelf: 'flex-start' }} onClick={() => void start()} disabled={busy}>
            Send a new code
          </button>
          <BottomBar>
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || code.length !== 6}>
              {busy ? 'Signing in' : 'Sign in'}
            </button>
          </BottomBar>
        </form>
      )}
      {error && (
        <div className="explain bad" role="alert">
          {error}
        </div>
      )}
    </>
  );
}

function SignedIn({ user, features }: { user: ServerUser; features: ServerFeatures }) {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState(user.handle ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cue = cueCopy(settings.profile.cue);
  const [time, setTime] = useState(toTime(user.cueMinutes ?? (cue ? cue.time[0] * 60 + cue.time[1] : 19 * 60)));

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setMessage(undefined);
    try {
      await fn();
      if (done) setMessage(done);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
    setBusy(false);
  };

  const signOut = () =>
    run(async () => {
      await api('/auth/logout', { body: {} }).catch(() => undefined);
      setSession(null);
      resetSync();
    });

  return (
    <>
      <Section title="Signed in" footer="Signing out keeps everything on this device.">
        <div className="list">
          <div className="list-row">
            <span className="sc-icon-tile" aria-hidden="true">
              <AccountIcon size={22} />
            </span>
            <span className="grow" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <span style={{ display: 'block', fontWeight: 600 }}>{user.handle ?? user.email}</span>
              {user.handle && <span className="footnote">{user.email}</span>}
            </span>
          </div>
          <button className="list-row" onClick={() => void signOut()} disabled={busy}>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Sign out
            </span>
          </button>
        </div>
      </Section>

      <SyncSection busy={busy} run={run} message={message} />

      {features.push && (
        <Section
          title="Daily reminder"
          info={<p>{cue ? `You planned to study when you ${cue.phrase}. Pick a time that matches.` : 'Pick a time you are usually free.'}</p>}
          footer={pushBlocker() ?? undefined}
        >
          <div className="list">
            <div className="list-row">
              <span className="grow">
                <span style={{ display: 'block' }}>Remind me to study</span>
                <span className="footnote">Only on days you have not studied</span>
              </span>
              <Toggle
                label="Remind me to study"
                checked={user.reminders}
                onChange={(on) => void run(() => (on ? enableReminders(fromTime(time)) : disableReminders()), on ? 'Reminder on.' : 'Reminder off.')}
              />
            </div>
            <label className="list-row" style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'var(--label)' }}>
              <span className="grow">Time</span>
              <input
                id="reminder-time"
                type="time"
                value={time}
                style={{ width: 150 }}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() =>
                  user.reminders &&
                  void run(() => updateMe({ cueMinutes: fromTime(time), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }), 'Time saved.')
                }
              />
            </label>
          </div>
        </Section>
      )}

      <Section
        title="Leagues"
        info={<p>Your display name is the only thing other players see. Use 3 to 20 letters, numbers or underscores. Your email is never shown.</p>}
      >
        <div className="list">
          <label className="list-row" style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'var(--label)', gap: '0.75rem' }}>
            <span className="grow">Display name</span>
            <input
              id="league-handle"
              value={handle}
              maxLength={20}
              autoComplete="nickname"
              style={{ width: 170 }}
              onChange={(e) => setHandle(e.target.value)}
            />
          </label>
          <button
            className="list-row"
            disabled={busy || handle === (user.handle ?? '')}
            onClick={() => void run(() => updateMe({ handle: handle || null }), 'Name saved.')}
          >
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Save name
            </span>
          </button>
          <div className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Join weekly leagues</span>
              <span className="footnote">Real players near your rating</span>
            </span>
            <Toggle
              label="Join weekly leagues"
              checked={user.leagues}
              onChange={(on) =>
                void run(async () => {
                  if (on && !user.handle) throw new Error('Save a display name first. It is the only thing other players see.');
                  await updateMe({ leagues: on });
                  if (on) await pushNow();
                })
              }
            />
          </div>
          {user.leagues && (
            <Link to="/league" className="list-row">
              <span className="grow" style={{ color: 'var(--tint)' }}>
                See this week's league
              </span>
            </Link>
          )}
        </div>
      </Section>

      {features.billing && (
        <Section title="Felt Pro">
          <div className="list">
            <div className="list-row">
              <span className="grow">
                <span style={{ display: 'block' }}>{user.access.pro ? (user.access.trialing ? 'Free trial' : 'Active') : 'Free plan'}</span>
                {user.access.until && user.access.pro && (
                  <span className="footnote">
                    {user.access.trialing ? 'Trial ends on' : 'Renews on'} {new Date(user.access.until).toLocaleDateString()}
                  </span>
                )}
              </span>
            </div>
            {user.access.until ? (
              <button
                className="list-row"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const err = await manageSubscription();
                    if (err) throw new Error(err);
                  })
                }
              >
                <span className="grow" style={{ color: 'var(--tint)' }}>
                  Manage or cancel subscription
                </span>
              </button>
            ) : (
              <Link to="/pro?from=account" className="list-row">
                <span className="grow" style={{ color: 'var(--tint)' }}>
                  See Felt Pro
                </span>
              </Link>
            )}
          </div>
        </Section>
      )}

      <Section title="Delete account">
        <div className="list">
          {!confirmDelete ? (
            <button className="list-row" onClick={() => setConfirmDelete(true)}>
              <span className="grow" style={{ color: 'var(--red-text)' }}>
                Delete my account
              </span>
            </button>
          ) : (
            <>
              <div className="list-row">
                <span className="grow footnote">
                  This permanently deletes your account and your synced progress. Progress on this device stays. Cancel your Felt Pro subscription first.
                </span>
              </div>
              <button
                className="list-row"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api('/me', { method: 'DELETE' });
                    setSession(null);
                    resetSync();
                    navigate('/settings');
                  })
                }
              >
                <span className="grow" style={{ color: 'var(--red-text)', fontWeight: 600 }}>
                  Delete my account for good
                </span>
              </button>
              <button className="list-row" onClick={() => setConfirmDelete(false)}>
                <span className="grow" style={{ color: 'var(--tint)' }}>
                  Keep my account
                </span>
              </button>
            </>
          )}
        </div>
      </Section>
    </>
  );
}

/** Sync status, the conflict choice and a sync now button, for either kind of account. */
function SyncSection({ busy, run, message }: { busy: boolean; run: (fn: () => Promise<unknown>, done?: string) => Promise<void>; message?: string }) {
  const sync = useSyncMeta();
  return (
  <Section
    title="Sync"
    info={<p>Felt syncs on its own a few seconds after you study and when you leave the app.</p>}
    footer={message || sync.error ? <span role="status">{message ?? sync.error}</span> : undefined}
  >
    {sync.conflict ? (
      <div className="card stack" style={{ gap: '0.75rem' }}>
        <strong>Choose which progress to keep</strong>
        <p className="footnote" style={{ margin: 0 }}>
          This device and your account have different progress. Felt cannot combine them. Pick one to keep. The other will be replaced.
        </p>
        <button
          className="btn btn-tinted btn-block"
          disabled={busy}
          onClick={() => void run(() => keepCopy('device'), 'Done. Your account now matches this device.')}
        >
          Keep this device's progress
        </button>
        <button className="btn btn-tinted btn-block" disabled={busy} onClick={() => void run(() => keepCopy('cloud'))}>
          Use my account's progress
        </button>
        {(sync.conflict.device || sync.conflict.updatedAt) && (
          <span className="footnote">
            Your account was last saved{sync.conflict.device ? ` on ${sync.conflict.device}` : ''}
            {sync.conflict.updatedAt ? ` ${ago(sync.conflict.updatedAt)}` : ''}.
          </span>
        )}
      </div>
    ) : (
      <div className="list">
        <div className="list-row">
          <span className="grow">
            <span style={{ display: 'block' }}>{sync.dirty ? 'Changes waiting to sync' : 'Up to date'}</span>
            <span className="footnote">Last synced {ago(sync.syncedAt)}</span>
          </span>
        </div>
        <button className="list-row" disabled={busy} onClick={() => void run(pushNow, 'Synced.')}>
          <span className="grow" style={{ color: 'var(--tint)' }}>
            Sync now
          </span>
        </button>
      </div>
    )}
  </Section>
  );
}

/** Signed in through claude.ai on a hosted page: progress saves privately to the cloud. */
function ClaudeAccount({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setMessage(undefined);
    try {
      await fn();
      if (done) setMessage(done);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
    setBusy(false);
  };
  return (
    <>
      <Section title="Signed in" info={<p>Your progress saves to a private space that only you can read. Open Felt on any device where you are signed in to Claude and it is there.</p>}>
        <div className="list">
          <div className="list-row">
            <span className="sc-icon-tile" aria-hidden="true">
              <AccountIcon size={22} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600 }}>{name || 'You'}</span>
              <span className="footnote">Signed in with Claude</span>
            </span>
          </div>
        </div>
      </Section>
      <SyncSection busy={busy} run={run} message={message} />
    </>
  );
}
