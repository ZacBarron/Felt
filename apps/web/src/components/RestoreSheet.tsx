import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../haptics';
import { restorePurchases, type RestoreResult } from '../state/access';
import { useSettings } from '../state/settings';
import { AccountIcon, CheckIcon, CloudIcon, InfoIcon } from '../ui/icons';
import '../pages/auth.css';
import '../pages/pro.css';

/** Adds restore=1 to a path, so the sheet opens again after signing in. */
export function withRestore(path: string) {
  return `${path}${path.includes('?') ? '&' : '?'}restore=1`;
}

/**
 * Restore purchases, with an answer every time. The sheet opens at once with
 * "Checking your account", then says what Aced found and what to do next:
 * Pro is back on, sign in first, no purchase on this account, or Aced
 * could not check.
 */
export function RestoreSheet({ open, onClose, returnTo }: { open: boolean; onClose: () => void; returnTo: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const [result, setResult] = useState<RestoreResult>();
  // The latest settings, so a slow check never writes back stale ones.
  const latest = useRef(settings);
  latest.current = settings;

  const check = useCallback(async () => {
    setResult(undefined);
    const r = await restorePurchases(latest.current);
    if (r.kind === 'restored') {
      update({ ...latest.current, access: r.access });
      haptic('success');
    } else haptic('warning');
    setResult(r);
  }, [update]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      void check();
    }
    if (!open && d.open) d.close();
  }, [open, check]);

  const kind = result?.kind ?? 'checking';
  const icon =
    kind === 'restored' ? <CheckIcon size={22} /> : kind === 'sign-in' ? <AccountIcon size={24} /> : kind === 'not-found' ? <InfoIcon size={24} /> : <CloudIcon size={24} offline={kind === 'unavailable'} />;

  return (
    <dialog
      ref={ref}
      className="sheet restore-dialog"
      aria-labelledby="restore-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack restore-sheet" style={{ gap: '1.1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className={`restore-state ${kind}`} role="status" aria-live="polite">
          <span className="restore-icon" aria-hidden="true">
            {icon}
          </span>
          <h2 id="restore-title" className="sheet-title">
            {result?.title ?? 'Checking your account'}
          </h2>
          <p className="restore-message">{result?.message ?? 'Aced is asking the server what this account owns.'}</p>
        </div>

        <div className="stack" style={{ gap: '0.6rem' }}>
          {kind === 'checking' && (
            <button className="btn btn-lg btn-block" disabled>
              One moment
            </button>
          )}
          {kind === 'restored' && (
            <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>
              Done
            </button>
          )}
          {kind === 'sign-in' && (
            <>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate(`/signin?next=${encodeURIComponent(withRestore(returnTo))}`)}>
                Sign in
              </button>
              <button className="btn btn-lg btn-block" onClick={onClose}>
                Not now
              </button>
            </>
          )}
          {kind === 'not-found' && (
            <>
              <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>
                Done
              </button>
              <button className="btn btn-plain btn-block" onClick={() => void check()}>
                Check again
              </button>
            </>
          )}
          {kind === 'unavailable' && (
            <>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => void check()}>
                Try again
              </button>
              <button className="btn btn-lg btn-block" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
