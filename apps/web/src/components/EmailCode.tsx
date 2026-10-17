import { useEffect, useRef, useState } from 'react';
import { haptic } from '../haptics';
import { ApiError } from '../state/api';
import { track } from '../state/events';
import { BottomBar } from '../ui/BottomBar';
import '../pages/auth.css';

const RESEND_SECONDS = 30;

interface Props {
  /** Sends the code. Returns a development code when the server shows one. */
  send: (email: string) => Promise<{ devCode?: string }>;
  /** Checks the code. Throws with a plain message when it is wrong. */
  verify: (email: string, code: string) => Promise<void>;
  /** Lets passkeys appear in the browser's suggestions on the email field. */
  passkeyAutofill?: boolean;
  /** Buttons in the thumb zone (full screen flows) or inline (inside a settings list). */
  inline?: boolean;
  /** Extra actions under the main button, such as going back to passkeys. */
  extra?: React.ReactNode;
  /** Where the step changes, so a page title can follow. */
  onStep?: (step: 'email' | 'code') => void;
}

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/**
 * Sign in or add an email with a 6 digit code. The code field takes a
 * paste or the code iOS offers above the keyboard, and checks itself on
 * the 6th digit. A new code can be asked for after 30 seconds.
 */
export function EmailCode({ send, verify, passkeyAutofill, inline, extra, onStep }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const tried = useRef('');

  useEffect(() => onStep?.(step), [step, onStep]);

  // The resend countdown ticks once a second, only while it runs.
  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [resendAt]);
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const r = await send(email.trim());
      setDevCode(r.devCode);
      setCode('');
      tried.current = '';
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
      setNow(Date.now());
      setStep('code');
      track('signin_code_sent');
      setTimeout(() => codeRef.current?.focus(), 60);
    } catch (err) {
      haptic('error');
      setError(message(err, 'Aced could not send a code. Check the address and try again.'));
    }
    setBusy(false);
  };

  const check = async (value: string) => {
    if (busy || value.length !== 6 || tried.current === value) return;
    tried.current = value;
    setBusy(true);
    setError(undefined);
    try {
      await verify(email.trim(), value);
    } catch (err) {
      haptic('error');
      setError(message(err, 'That code did not work. Try again or get a new code.'));
      // Wrong code: clear it so the next try starts fresh. Offline: keep it to retry.
      if (!(err instanceof ApiError && err.status === 0)) setCode('');
      tried.current = '';
      setTimeout(() => codeRef.current?.focus(), 30);
    }
    setBusy(false);
  };

  const enterCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (error) setError(undefined);
    if (digits.length === 6) void check(digits);
  };

  const errorId = 'email-code-error';
  const errorLine = error && (
    <p id={errorId} className="field-error" role="alert">
      {error}
    </p>
  );

  const actions = (primary: React.ReactNode) =>
    inline ? (
      <div className="stack" style={{ gap: '0.5rem' }}>
        {primary}
        {extra}
      </div>
    ) : (
      <BottomBar>
        {primary}
        {extra}
      </BottomBar>
    );

  if (step === 'email') {
    return (
      <form className="stack auth-form" style={{ gap: '0.6rem' }} onSubmit={sendCode} noValidate>
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            ref={emailRef}
            id="auth-email"
            type="email"
            name="email"
            // "webauthn" lets the browser list saved passkeys right here.
            autoComplete={passkeyAutofill ? 'email webauthn' : 'email'}
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="send"
            placeholder="you@example.com"
            required
            value={email}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : 'auth-email-note'}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(undefined);
            }}
          />
        </label>
        {errorLine}
        <p id="auth-email-note" className="footnote auth-note">
          We email you a 6 digit code. There is no password.
        </p>
        {actions(
          <button type="submit" className={`btn ${inline ? 'btn-tinted' : 'btn-primary btn-lg'} btn-block`} disabled={busy || !email.trim()}>
            {busy ? 'Sending code…' : 'Email me a code'}
          </button>,
        )}
      </form>
    );
  }

  return (
    <form
      className="stack auth-form"
      style={{ gap: '0.6rem' }}
      onSubmit={(e) => {
        e.preventDefault();
        void check(code);
      }}
    >
      <p className="auth-sent" role="status">
        We sent a code to <strong>{email.trim()}</strong>.
      </p>
      <label className="auth-field">
        <span className="auth-label">6 digit code</span>
        <span className={`code-boxes${error ? ' invalid' : ''}`} onClick={() => codeRef.current?.focus()}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`code-box${i === Math.min(code.length, 5) ? ' current' : ''}${code[i] ? ' filled' : ''}`} aria-hidden="true">
              {code[i] ?? ''}
            </span>
          ))}
          <input
            ref={codeRef}
            id="auth-code"
            className="code-input"
            name="one-time-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            enterKeyHint="done"
            required
            value={code}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => enterCode(e.target.value)}
            onPaste={(e) => {
              // A pasted code often carries spaces or a dash: keep the digits.
              const text = e.clipboardData.getData('text');
              if (/\d/.test(text)) {
                e.preventDefault();
                enterCode(text);
              }
            }}
          />
        </span>
      </label>
      {errorLine}
      {devCode && (
        <p className="footnote auth-note">
          Development server. Your code is <strong className="num">{devCode}</strong>.
        </p>
      )}
      <div className="auth-links">
        {wait > 0 ? (
          <span className="footnote" aria-live="off">
            New code in <span className="num">{wait}</span> s
          </span>
        ) : (
          <button type="button" className="link-btn auth-link" disabled={busy} onClick={() => void sendCode()}>
            Send a new code
          </button>
        )}
        <button
          type="button"
          className="link-btn auth-link"
          onClick={() => {
            setStep('email');
            setError(undefined);
            setCode('');
            setTimeout(() => emailRef.current?.focus(), 60);
          }}
        >
          Change email
        </button>
      </div>
      {actions(
        <button type="submit" className={`btn ${inline ? 'btn-tinted' : 'btn-primary btn-lg'} btn-block`} disabled={busy || code.length !== 6}>
          {busy ? 'Checking…' : 'Check code'}
        </button>,
      )}
    </form>
  );
}
