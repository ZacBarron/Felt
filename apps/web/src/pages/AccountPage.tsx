import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { EmailCode } from '../components/EmailCode';
import { KeepCopy } from '../components/KeepCopy';
import { LogOutSheet } from '../components/LogOutSheet';
import { haptic } from '../haptics';
import { manageSubscription } from '../state/access';
import { api, emailOn, serverFeatures, type ServerFeatures, type ServerUser, setSession, updateMe, useSession } from '../state/api';
import { addPasskey, Cancelled, passkeysSupported, sendAddEmailCode, verifyAddEmail } from '../state/auth';
import { cueCopy } from '../state/goals';
import { disableReminders, enableReminders, pushBlocker } from '../state/push';
import { useSettings } from '../state/settings';
import { useClaudeCloud } from '../state/cloud';
import { keepCopy, pushNow, resetSync, useSyncMeta } from '../state/sync';
import { Avatar } from '../ui/Avatar';
import { AccountIcon, CloudIcon, EmailIcon, LogOutIcon, PasskeyIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, Section } from '../ui/Section';
import { Toggle } from '../ui/Toggle';
import './screens.css';
import './auth.css';
import './you.css';

function ago(iso?: string) {
  if (!iso) return 'never';
  if (Date.now() - Date.parse(iso) < 45_000) return 'just now';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  return shortDate(iso);
}

/** Dates as the voice guide writes them: Oct 21. */
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fromTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Whether the browser thinks it is online, kept up to date. */
function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** The account when signed in: who you are, how you sign in, sync, reminders, leagues and subscription. Guests go to sign in. */
export function AccountPage() {
  const [features, setFeatures] = useState<ServerFeatures | null>();
  const session = useSession();
  const { cloud } = useClaudeCloud();
  const location = useLocation();

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
        <Navigate to={`/signin${location.search}`} replace />
      )}
    </div>
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

  const [loggingOut, setLoggingOut] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  // Results of adding a passkey or an email show under that section, not under sync.
  const [signinMessage, setSigninMessage] = useState<string>();
  const name = settings.profile.name?.trim() || user.handle || (user.email ? user.email.split('@')[0] : 'Your account');
  const passkeys = user.passkeys ?? 0;
  const canAddPasskey = !!features.passkeys && passkeysSupported();

  return (
    <>
      <section className="card account-id reveal" aria-label="Your account">
        <Avatar name={settings.profile.name || user.handle || undefined} photo={settings.profile.photo} size={72} />
        <div className="account-id-name">{name}</div>
        {user.email && <div className="account-id-email">{user.email}</div>}
        <div className="account-id-method">
          {passkeys > 0 ? <PasskeyIcon size={15} /> : <EmailIcon size={15} />}
          {passkeys > 0 ? 'Signed in with a passkey' : 'Signed in with an email code'}
        </div>
      </section>

      {features.billing && (
        <Section>
          <div className="card account-plan">
            <span className="grow">
              <span className="account-plan-name">{user.access.pro ? (user.access.trialing ? 'Aced Pro trial' : 'Aced Pro') : 'Free plan'}</span>
              <span className="footnote">
                {user.access.pro && user.access.until
                  ? `${user.access.trialing ? 'Trial ends' : user.access.plan === 'invite' ? 'From invites, free until' : 'Renews'} ${shortDate(user.access.until)}`
                  : user.access.pro
                    ? 'Active'
                    : 'Every track has free lessons.'}
              </span>
            </span>
            {user.access.until ? (
              <button
                className="btn btn-tinted"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const err = await manageSubscription();
                    if (err) throw new Error(err);
                  })
                }
              >
                Manage or cancel
              </button>
            ) : !user.access.pro ? (
              <Link to="/pro?from=account" className="btn btn-primary">
                See Aced Pro
              </Link>
            ) : null}
          </div>
        </Section>
      )}

      <SyncSection busy={busy} run={run} message={message} />

      <Section
        title="Ways to sign in"
        footer={signinMessage ? <span role="status">{signinMessage}</span> : undefined}
        info={<p>A passkey signs you in with Face ID, a fingerprint or your device PIN. Add one on each device you use. An email is optional. It lets you sign in with a code and get receipts.</p>}
      >
        <div className="list with-icons">
          <div className="list-row">
            <span className="sc-icon-tile small" aria-hidden="true">
              <PasskeyIcon size={20} />
            </span>
            <span className="grow">
              <span style={{ display: 'block' }}>Passkeys</span>
              <span className="footnote">{passkeys === 0 ? 'None yet' : passkeys === 1 ? '1 passkey' : `${passkeys} passkeys`}</span>
            </span>
          </div>
          {canAddPasskey && (
            <button
              className="list-row"
              disabled={busy}
              data-haptic="off"
              onClick={async () => {
                setBusy(true);
                setSigninMessage(undefined);
                try {
                  await addPasskey();
                  haptic('success');
                  setSigninMessage('Passkey added. You can sign in with it on this device.');
                } catch (e) {
                  if (!(e instanceof Cancelled)) haptic('error');
                  setSigninMessage(e instanceof Cancelled ? `${e.message} You can try again.` : e instanceof Error ? e.message : 'Aced could not add a passkey. Try again.');
                }
                setBusy(false);
              }}
            >
              <span className="sc-icon-tile small ghost" aria-hidden="true" />
              <span className="grow" style={{ color: 'var(--tint)' }}>
                {passkeys === 0 ? 'Add a passkey' : 'Add another passkey'}
              </span>
            </button>
          )}
          <div className="list-row">
            <span className="sc-icon-tile small" aria-hidden="true">
              <EmailIcon size={20} />
            </span>
            <span className="grow" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <span style={{ display: 'block' }}>Email</span>
              <span className="footnote">{user.email ?? 'Not added. It is optional.'}</span>
            </span>
          </div>
          {!user.email && emailOn(features) && !addingEmail && (
            <button className="list-row" onClick={() => setAddingEmail(true)}>
              <span className="sc-icon-tile small ghost" aria-hidden="true" />
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Add an email
              </span>
            </button>
          )}
        </div>
        {addingEmail && !user.email && (
          <div className="card account-add-email reveal">
            <EmailCode
              inline
              send={sendAddEmailCode}
              verify={async (address, code) => {
                await verifyAddEmail(address, code);
                haptic('success');
                setAddingEmail(false);
                setSigninMessage('Email added. You can sign in with a code too.');
              }}
              extra={
                <button type="button" className="btn btn-plain btn-block" onClick={() => setAddingEmail(false)}>
                  Cancel
                </button>
              }
            />
          </div>
        )}
      </Section>

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

      <Section>
        <div className="list with-icons">
          <button className="list-row" onClick={() => setLoggingOut(true)}>
            <span className="sc-icon-tile small" aria-hidden="true">
              <LogOutIcon size={20} />
            </span>
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Log out
            </span>
          </button>
        </div>
      </Section>

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
                <span className="grow stack" style={{ gap: '0.4rem', padding: '0.3rem 0' }}>
                  <strong>Delete your account for good?</strong>
                  <span className="footnote" style={{ display: 'block' }}>
                    Aced deletes your account and its saved progress. Your league results go too. This cannot be undone.
                  </span>
                  <span className="footnote" style={{ display: 'block' }}>
                    Progress on this device stays as a guest copy.
                    {user.access.pro && user.access.until ? ' Cancel Aced Pro first so you are not charged again.' : ''}
                  </span>
                </span>
              </div>
              <button
                className="list-row"
                disabled={busy}
                data-haptic="off"
                onClick={() =>
                  void run(async () => {
                    await api('/me', { method: 'DELETE' });
                    haptic('warning');
                    setSession(null);
                    resetSync();
                    navigate('/settings', { replace: true });
                  })
                }
              >
                <span className="grow" style={{ color: 'var(--red-text)', fontWeight: 600 }}>
                  Delete my account
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

      <LogOutSheet
        open={loggingOut}
        onClose={() => setLoggingOut(false)}
        onLoggedOut={(removed) => {
          if (removed) {
            // Everything in memory belongs to the account that just left: start fresh.
            location.assign(`${import.meta.env.BASE_URL}signin?loggedout=removed`);
            return;
          }
          setLoggingOut(false);
          navigate('/signin?loggedout=1', { replace: true });
        }}
      />
    </>
  );
}

/** Sync status, the conflict choice and a sync now button, for either kind of account. */
function SyncSection({ busy, run, message }: { busy: boolean; run: (fn: () => Promise<unknown>, done?: string) => Promise<void>; message?: string }) {
  const sync = useSyncMeta();
  const online = useOnline();
  // One line that says where your progress stands, in plain words.
  const status = sync.saving
    ? { tone: '', title: 'Saving…', sub: 'Sending your latest progress' }
    : !online
      ? { tone: 'warn', title: sync.dirty ? 'Not saved yet. You are offline.' : 'You are offline', sub: sync.dirty ? 'Aced saves when you are back online.' : `Saved ${ago(sync.syncedAt)}` }
      : sync.error && sync.dirty
        ? { tone: 'warn', title: 'Not saved yet', sub: sync.error }
        : sync.dirty
          ? { tone: '', title: 'Saving soon', sub: `Last saved ${ago(sync.syncedAt)}` }
          : sync.syncedAt
            ? { tone: 'good', title: `Saved ${ago(sync.syncedAt)}`, sub: 'Your account has everything on this device.' }
            : { tone: '', title: 'Not saved yet', sub: 'Aced saves a few seconds after you study.' };
  return (
    <Section
      title="Sync"
      info={<p>Aced saves to your account a few seconds after you study, and when you leave the app. Sign in on another device and your progress is there.</p>}
      footer={message ? <span role="status">{message}</span> : undefined}
    >
      {sync.conflict ? (
        <div className="card stack" style={{ gap: '0.75rem' }}>
          <strong>Choose which progress to keep</strong>
          <p className="footnote" style={{ margin: 0 }}>
            This device and your account both changed. Pick the copy you want.
          </p>
          <KeepCopy
            busy={busy}
            onKeep={(choice) =>
              void run(() => keepCopy(choice, { reload: false }), choice === 'device' ? 'Done. Your account now matches this device.' : 'Done. This device now shows your account’s progress.')
            }
          />
        </div>
      ) : (
        <div className="list with-icons">
          <div className="list-row" role="status" aria-live="polite">
            <span className={`sc-icon-tile small sync-tile ${status.tone}`} aria-hidden="true">
              <CloudIcon size={20} offline={status.tone === 'warn'} />
            </span>
            <span className="grow">
              <span style={{ display: 'block' }}>{status.title}</span>
              <span className="footnote">{status.sub}</span>
            </span>
          </div>
          <button className="list-row" disabled={busy || sync.saving || !online} onClick={() => void run(pushNow)}>
            <span className="sc-icon-tile small ghost" aria-hidden="true" />
            <span className="grow" style={{ color: 'var(--tint)' }}>
              Save now
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
      <Section title="Signed in" info={<p>Your progress saves to a private space that only you can read. Open Aced on any device where you are signed in to Claude and it is there.</p>}>
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
