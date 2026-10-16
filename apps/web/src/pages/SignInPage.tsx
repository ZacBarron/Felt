import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { EmailCode } from '../components/EmailCode';
import { KeepCopy } from '../components/KeepCopy';
import { WelcomeBack } from '../components/WelcomeBack';
import { haptic } from '../haptics';
import { noteOnboardingPrompt } from '../state/accountPrompt';
import { emailOn, type ServerFeatures, type Session, useServerFeatures, useSession } from '../state/api';
import {
  Cancelled,
  cancelPasskeyPrompt,
  completeSignIn,
  createPasskeyAccount,
  markOnboardedFromSync,
  passkeyAutofillSupported,
  passkeysSupported,
  sendEmailCode,
  signInWithPasskey,
  type SyncOutcome,
  verifyEmailCode,
} from '../state/auth';
import { calibratedDifficulty } from '../state/calibration';
import { track } from '../state/events';
import { useSettings } from '../state/settings';
import { type ProgressSummary, summarizeDevice } from '../state/summary';
import { firstSync, keepCopy, syncMeta } from '../state/sync';
import { clearDeviceData } from '../state/backup';
import { BottomBar } from '../ui/BottomBar';
import { BrandMark } from '../ui/Brand';
import { CheckIcon, ChevronLeftIcon, CloudIcon, DeviceIcon, PasskeyIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';
import './auth.css';

/**
 * Accounts, phone first: passkeys lead (one tap, nothing to remember), an
 * emailed code is the fallback. After signing in, progress comes back with
 * a short "Welcome back"; when this device and the account both have
 * progress, the player sees what each holds and picks one.
 */

type Phase = 'form' | 'syncing' | 'welcome' | 'choose' | 'saved' | 'empty' | 'offline';

const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** What happens after a session starts: sync, then the right next screen. */
function useAfterSignIn() {
  const { reload } = useSettings();
  const [phase, setPhase] = useState<Phase>('form');
  const [summary, setSummary] = useState<ProgressSummary>();
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<'passkey' | 'email'>('passkey');

  const showWelcome = useCallback(async () => {
    markOnboardedFromSync();
    reload();
    setSummary(await summarizeDevice({ difficulty: calibratedDifficulty }));
    setPhase('welcome');
  }, [reload]);

  const route = useCallback(
    async (outcome: SyncOutcome, created: boolean) => {
      if (outcome === 'pulled' || outcome === 'same') return showWelcome();
      if (outcome === 'choose') return setPhase('choose');
      if (outcome === 'offline') return setPhase('offline');
      // The account was empty and now holds this device's progress.
      setPhase(created ? 'saved' : 'empty');
    },
    [showWelcome],
  );

  const finish = useCallback(
    async (session: Session, how: 'passkey' | 'email', created = false) => {
      setMethod(how);
      setPhase('syncing');
      haptic('success');
      await route(await completeSignIn(session, how, created), created);
    },
    [route],
  );

  const retry = useCallback(async () => {
    setPhase('syncing');
    try {
      await route(await firstSync(), false);
    } catch {
      setPhase('offline');
    }
  }, [route]);

  const keep = useCallback(
    async (choice: 'device' | 'cloud') => {
      setBusy(true);
      try {
        await keepCopy(choice, { reload: false });
        track('sync_conflict_resolved', { choice });
        if (choice === 'cloud') await showWelcome();
        else setPhase('saved');
      } catch {
        setPhase('offline');
      }
      setBusy(false);
    },
    [showWelcome],
  );

  return { phase, setPhase, summary, busy, finish, keep, retry, method };
}

/** Screens shared by signing in and saving progress, once a session exists. */
function AfterSignIn({ flow, next, savedCopy }: { flow: ReturnType<typeof useAfterSignIn>; next: () => void; savedCopy: { title: string; body: string } }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), [flow.phase]);

  if (flow.phase === 'syncing')
    return (
      <div className="auth-center" aria-live="polite">
        <BrandMark size={64} animate />
        <h1 ref={heading} tabIndex={-1} className="display onb-title">
          Getting your progress
        </h1>
        <p className="muted">This takes a moment.</p>
      </div>
    );
  if (flow.phase === 'welcome' && flow.summary) return <WelcomeBack summary={flow.summary} onContinue={next} />;
  if (flow.phase === 'choose')
    return (
      <div className="stack auth-top-space" style={{ gap: '1rem' }}>
        <div>
          <h1 ref={heading} tabIndex={-1} className="display onb-title">
            Choose which progress to keep
          </h1>
          <p className="muted auth-lead">This device and your account both have progress. Pick the one you want.</p>
        </div>
        <KeepCopy busy={flow.busy} onKeep={(c) => void flow.keep(c)} pinned />
      </div>
    );
  if (flow.phase === 'offline')
    return (
      <div className="auth-center">
        <span className="auth-badge warn" aria-hidden="true">
          <CloudIcon size={30} offline />
        </span>
        <h1 ref={heading} tabIndex={-1} className="display onb-title">
          You are signed in
        </h1>
        <p className="muted auth-lead">Suited could not reach your account to bring in your progress. Check your connection and try again.</p>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => void flow.retry()}>
            Try again
          </button>
          <button className="btn btn-plain btn-block" onClick={next}>
            Go on without it for now
          </button>
        </BottomBar>
      </div>
    );
  if (flow.phase === 'empty')
    return (
      <div className="auth-center">
        <span className="auth-badge" aria-hidden="true">
          <CheckIcon size={30} />
        </span>
        <h1 ref={heading} tabIndex={-1} className="display onb-title">
          You are signed in
        </h1>
        <p className="muted auth-lead">
          {settings.profile.onboarded ? 'Your account now holds the progress on this device.' : 'Your account has no saved progress yet. Set up your plan and Suited saves it as you go.'}
        </p>
        <BottomBar>
          {settings.profile.onboarded ? (
            <button className="btn btn-primary btn-lg btn-block" onClick={next}>
              Go to Today
            </button>
          ) : (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/welcome?step=level', { replace: true })}>
              Set up my plan
            </button>
          )}
        </BottomBar>
      </div>
    );
  // Saved: a new account, or the account now matches this device.
  return (
    <div className="auth-center">
      <span className="auth-badge pop" aria-hidden="true">
        <CheckIcon size={32} />
      </span>
      <h1 ref={heading} tabIndex={-1} className="display onb-title">
        {savedCopy.title}
      </h1>
      <p className="muted auth-lead">{savedCopy.body}</p>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={next}>
          Continue
        </button>
      </BottomBar>
    </div>
  );
}

const PERKS = [
  { Icon: CloudIcon, title: 'Your plan, rating and streak on any device', body: '' },
  { Icon: DeviceIcon, title: 'Safe if you lose your phone', body: '' },
  { Icon: PasskeyIcon, title: 'Saves on its own as you study', body: '' },
];

/**
 * Deferred sign up: offered after the player has a plan worth keeping,
 * once at the end of onboarding and from a quiet card later. Skipping is
 * as easy as saving, and nothing nags.
 */
export function SaveProgress({ from, features, onContinue, onSkip }: { from: 'onboarding' | 'today' | 'account'; features: ServerFeatures; onContinue: () => void; onSkip: () => void }) {
  const flow = useAfterSignIn();
  const { settings } = useSettings();
  const [mode, setMode] = useState<'offer' | 'email'>('offer');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean }>();
  const heading = useRef<HTMLHeadingElement>(null);
  const passkeys = !!features.passkeys && passkeysSupported();
  const email = emailOn(features);

  useEffect(() => {
    track('account_prompt_viewed', { from, passkeys, email });
    if (from === 'onboarding') noteOnboardingPrompt();
  }, [from, passkeys, email]);
  useEffect(() => heading.current?.focus(), [mode]);

  if (flow.phase !== 'form')
    return (
      <AfterSignIn
        flow={flow}
        next={onContinue}
        savedCopy={{
          title: 'Your progress is saved',
          body: flow.method === 'passkey' ? 'Sign in with your passkey on any device. Suited saves as you study.' : 'Sign in with an email code on any device. Suited saves as you study.',
        }}
      />
    );

  const create = async () => {
    setBusy(true);
    setNote(undefined);
    try {
      const session = await createPasskeyAccount(settings.profile.name);
      await flow.finish(session, 'passkey', true);
    } catch (e) {
      if (e instanceof Cancelled) setNote({ text: `${e.message} You can try again${email ? ' or use your email' : ''}.` });
      else {
        haptic('error');
        setNote({ text: errorText(e, 'Suited could not save a passkey. Try again.'), error: true });
      }
    }
    setBusy(false);
  };

  const skip = () => {
    track('account_skipped', { from });
    onSkip();
  };

  if (mode === 'email')
    return (
      <div className="stack auth-screen" style={{ gap: '1.1rem' }}>
        <div className="focus-top">
          <button className="icon-btn glass" aria-label="Back" onClick={() => setMode('offer')}>
            <ChevronLeftIcon size={18} />
          </button>
        </div>
        <div>
          <h1 ref={heading} tabIndex={-1} className="display onb-title">
            Save with your email
          </h1>
          <p className="muted auth-lead">Enter your email. Use the code we send to sign in on any device.</p>
        </div>
        <EmailCode
          send={sendEmailCode}
          verify={async (address, code) => {
            const session = await verifyEmailCode(address, code);
            await flow.finish(session, 'email', true);
          }}
          extra={
            <button type="button" className="btn btn-plain btn-block" onClick={skip}>
              Skip for now
            </button>
          }
        />
      </div>
    );

  return (
    <div className="stack auth-screen save-screen" style={{ gap: '1.4rem' }}>
      <div className="save-hero reveal" aria-hidden="true">
        <span className="save-hero-mark">
          <BrandMark size={52} />
        </span>
        <span className="save-hero-key">
          <PasskeyIcon size={24} />
        </span>
      </div>
      <div className="save-copy">
        <h1 ref={heading} tabIndex={-1} className="display onb-title">
          Keep your progress
        </h1>
        <p className="muted auth-lead">Save it to a free account. {passkeys ? 'Sign in with Face ID or a fingerprint. No password.' : 'Sign in with a code we email you.'}</p>
      </div>
      <ul className="save-perks">
        {PERKS.filter((p) => passkeys || p.Icon !== PasskeyIcon).map(({ title }, i) => (
          <li key={title} className="reveal" style={{ animationDelay: `${80 + i * 90}ms` }}>
            <CheckIcon size={16} />
            {title}
          </li>
        ))}
      </ul>
      {note && (
        <p className={note.error ? 'field-error' : 'footnote auth-note'} role={note.error ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}
      <BottomBar>
        {passkeys ? (
          <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={() => void create()} data-haptic="off">
            <PasskeyIcon size={20} /> {busy ? 'Waiting for your passkey…' : 'Save with a passkey'}
          </button>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setMode('email')}>
            Save with my email
          </button>
        )}
        <button className="btn btn-tinted btn-lg btn-block" disabled={busy} onClick={skip}>
          Skip for now
        </button>
        {passkeys && email && (
          <button className="btn btn-plain btn-block auth-alt" disabled={busy} onClick={() => setMode('email')}>
            Use email instead
          </button>
        )}
      </BottomBar>
    </div>
  );
}

/** Sign in at /signin: passkey first, email code as the fallback. Also hosts "save your progress" for guests. */
export function SignInPage() {
  useBodyClass('focus-mode');
  useBodyClass('onboarding');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const features = useServerFeatures();
  const session = useSession();
  const { settings } = useSettings();
  const flow = useAfterSignIn();
  const [mode, setMode] = useState<'choose' | 'email'>(params.get('mode') === 'email' ? 'email' : 'choose');
  const [emailStep, setEmailStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean }>();
  const [autofill, setAutofill] = useState(false);
  const [fresh, setFresh] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // Already signed in when the page opened (not by this flow): the account page has everything.
  const signedInBefore = useRef(!!session);
  const loggedOut = params.get('loggedout');
  const nextParam = params.get('next');

  const passkeys = !!features?.passkeys && passkeysSupported();
  const email = emailOn(features);

  useEffect(() => {
    document.title = 'Sign in · Suited';
    void passkeyAutofillSupported().then(setAutofill);
  }, []);
  useEffect(() => heading.current?.focus(), [mode]);

  // Without passkeys here, the email form is the whole page.
  useEffect(() => {
    if (features && !passkeys && email) setMode('email');
  }, [features, passkeys, email]);

  const { finish } = flow;
  const finishSession = useCallback(
    async (s: Session, how: 'passkey' | 'email') => {
      await finish(s, how);
    },
    [finish],
  );

  // Passkeys in the email field's suggestions (conditional mediation), while it is on screen.
  useEffect(() => {
    if (!passkeys || !autofill || mode !== 'email' || emailStep !== 'email' || flow.phase !== 'form') return;
    let live = true;
    signInWithPasskey({ autofill: true })
      .then((s) => {
        if (live) void finishSession(s, 'passkey');
      })
      .catch((e) => {
        if (live && !(e instanceof Cancelled)) setNote({ text: errorText(e, 'Suited could not sign you in with that passkey.'), error: true });
      });
    return () => {
      live = false;
      cancelPasskeyPrompt();
    };
  }, [passkeys, autofill, mode, emailStep, flow.phase, finishSession]);

  const goNext = () => {
    const onboarded = (() => {
      try {
        return !!(JSON.parse(localStorage.getItem('felt.settings.v1') ?? '{}') as { profile?: { onboarded?: boolean } }).profile?.onboarded;
      } catch {
        return settings.profile.onboarded;
      }
    })();
    navigate(nextParam && onboarded ? nextParam : onboarded ? '/' : '/welcome', { replace: true });
  };

  if (session && signedInBefore.current) return <Navigate to={nextParam ?? '/account'} replace />;

  if (params.get('mode') === 'create' && features !== null) {
    if (!features) return null;
    return (
      <div className="stack focus-column">
        <SaveProgress
          from={params.get('from') === 'today' ? 'today' : 'account'}
          features={features}
          onContinue={() => navigate(nextParam ?? '/', { replace: true })}
          onSkip={() => navigate(nextParam ?? '/', { replace: true })}
        />
      </div>
    );
  }

  if (flow.phase !== 'form')
    return (
      <div className="stack focus-column auth-screen">
        <AfterSignIn flow={flow} next={goNext} savedCopy={{ title: 'You are signed in', body: 'Your account now matches this device. Suited saves as you study.' }} />
      </div>
    );

  const back = () => {
    if (mode === 'email' && passkeys) {
      setMode('choose');
      setNote(undefined);
    } else if (window.history.length > 1) navigate(-1);
    else navigate(settings.profile.onboarded ? '/settings' : '/welcome');
  };

  const passkeySignIn = async () => {
    setBusy(true);
    setNote(undefined);
    try {
      const s = await signInWithPasskey();
      await finishSession(s, 'passkey');
    } catch (e) {
      if (e instanceof Cancelled) setNote({ text: `${e.message} Try again${email ? ' or use an email code' : ''}.` });
      else {
        haptic('error');
        setNote({ text: errorText(e, 'Suited could not sign you in with a passkey. Try again.'), error: true });
      }
    }
    setBusy(false);
  };

  const noAccounts = features === null || (features && !features.accounts);

  /**
   * A new account starts from what this browser holds. A guest's progress
   * is saved into it. A copy of an account that just logged out belongs to
   * that account, so Suited clears it (after a confirm) and starts a new player.
   */
  const createNew = () => {
    track('create_account_tapped', { loggedOut: loggedOut ?? 'no' });
    if (!settings.profile.onboarded) return navigate('/welcome', { replace: true });
    if (syncMeta().previous) return setFresh(true);
    navigate(`/signin?mode=create${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ''}`);
  };

  const startFresh = async () => {
    setBusy(true);
    await clearDeviceData();
    // Everything in memory belonged to the account that left: load the app again from the start.
    location.assign(`${import.meta.env.BASE_URL}welcome`);
  };

  const continueHere = () => navigate(settings.profile.onboarded ? '/' : '/welcome', { replace: true });

  return (
    <div className="stack focus-column auth-screen" style={{ gap: '1.25rem' }}>
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Back" onClick={back}>
          <ChevronLeftIcon size={18} />
        </button>
      </div>

      {loggedOut && (
        <div className="auth-notice reveal" role="status">
          <CheckIcon size={16} />
          <span>{loggedOut === 'removed' ? 'You are logged out. Suited was removed from this device.' : 'You are logged out. Your progress is still on this device.'}</span>
        </div>
      )}

      {mode === 'choose' ? (
        <>
          <div className="auth-art reveal" aria-hidden="true">
            <BrandMark size={56} />
          </div>
          <div>
            <h1 ref={heading} tabIndex={-1} className="display onb-title">
              {loggedOut ? 'Sign in again' : 'Sign in to Suited'}
            </h1>
            <p className="muted auth-lead">
              {noAccounts ? 'This copy of Suited has no accounts. Your progress stays on this device.' : 'Your plan, Suited Rating and streak come with you.'}
            </p>
          </div>
          {note && (
            <p className={note.error ? 'field-error' : 'footnote auth-note'} role={note.error ? 'alert' : 'status'}>
              {note.text}
            </p>
          )}
          {fresh && (
            <div className="auth-fresh reveal" role="alertdialog" aria-labelledby="fresh-title">
              <p id="fresh-title" className="auth-fresh-title">
                Start a new player?
              </p>
              <p className="footnote">This browser holds the copy of the account you logged out of. Suited clears it and starts fresh. That account keeps all its progress.</p>
              <div className="auth-fresh-actions">
                <button className="btn btn-destructive btn-block" disabled={busy} onClick={() => void startFresh()} data-haptic="off">
                  Clear and start fresh
                </button>
                <button className="btn btn-plain btn-block" disabled={busy} onClick={() => setFresh(false)}>
                  Keep this copy
                </button>
              </div>
            </div>
          )}
          {features && !noAccounts && (
            <BottomBar>
              {passkeys && (
                <button className="btn btn-primary btn-lg btn-block" disabled={busy} onClick={() => void passkeySignIn()} data-haptic="off">
                  <PasskeyIcon size={20} /> {busy ? 'Waiting for your passkey…' : 'Sign in with passkey'}
                </button>
              )}
              {email && (
                <button className={`btn ${passkeys ? 'btn-tinted' : 'btn-primary'} btn-lg btn-block`} disabled={busy} onClick={() => setMode('email')}>
                  Use an email code
                </button>
              )}
              <button className="btn btn-tinted btn-lg btn-block" disabled={busy} onClick={createNew}>
                Create a new account
              </button>
              <button className="btn btn-plain btn-block auth-alt" disabled={busy} onClick={continueHere}>
                Continue without an account
              </button>
            </BottomBar>
          )}
        </>
      ) : (
        <>
          <div>
            <h1 ref={heading} tabIndex={-1} className="display onb-title">
              {emailStep === 'code' ? 'Check your email' : 'Sign in with email'}
            </h1>
            <p className="muted auth-lead">
              {emailStep === 'code'
                ? 'The code works for 10 minutes.'
                : passkeys && autofill
                  ? 'Tap the field to see your passkey, or get a code by email.'
                  : 'We email you a code. No password needed.'}
            </p>
          </div>
          {note && (
            <p className={note.error ? 'field-error' : 'footnote auth-note'} role={note.error ? 'alert' : 'status'}>
              {note.text}
            </p>
          )}
          <EmailCode
            send={sendEmailCode}
            passkeyAutofill={passkeys && autofill}
            onStep={setEmailStep}
            verify={async (address, code) => {
              const s = await verifyEmailCode(address, code);
              await finishSession(s, 'email');
            }}
            extra={
              passkeys ? (
                <button type="button" className="btn btn-plain btn-block" onClick={() => void passkeySignIn()} data-haptic="off">
                  Use a passkey instead
                </button>
              ) : undefined
            }
          />
        </>
      )}
    </div>
  );
}
