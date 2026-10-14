import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from '../haptics';
import { logOut, type SaveResult } from '../state/auth';
import { saveNow } from '../state/sync';
import { CheckIcon, CloudIcon } from '../ui/icons';
import '../pages/auth.css';

type Status = 'saving' | SaveResult;

/**
 * Logging out, said plainly. Felt saves first and says whether it worked.
 * "Log out" keeps this device's copy, which goes on working offline.
 * "Log out and remove from this device" is for a shared phone: it clears
 * Felt from the device, and only after the save worked.
 */
export function LogOutSheet({ open, onClose, onLoggedOut }: { open: boolean; onClose: () => void; onLoggedOut: (removed: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<Status>('saving');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = useCallback(async () => {
    setStatus('saving');
    setStatus(await saveNow());
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setError(undefined);
      void save();
    }
    if (!open && d.open) d.close();
  }, [open, save]);

  const saving = status === 'saving';
  const saved = status !== 'saving' && status.ok;
  const failed = status !== 'saving' && !status.ok ? status : undefined;
  const leave = async (removeLocal: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      await logOut({ removeLocal, saved });
      haptic('success');
      onLoggedOut(removeLocal);
    } catch (e) {
      haptic('error');
      setError(e instanceof Error ? e.message : 'Felt could not log out. Try again.');
      setBusy(false);
    }
  };

  const line = saving
    ? { tone: '', text: 'Saving your progress…' }
    : saved || !failed
      ? { tone: 'good', text: 'Everything is saved to your account.' }
      : failed.reason === 'offline'
        ? { tone: 'warn', text: 'Not saved yet. You are offline.' }
        : failed.reason === 'conflict'
          ? { tone: 'warn', text: 'Not saved yet. This device and your account have different progress. Choose which to keep on the Account page.' }
          : { tone: 'warn', text: `Not saved yet. ${failed.message ?? 'Felt could not reach your account.'}` };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="logout-title"
      onClose={onClose}
      onClick={(e) => {
        // A tap on the dimmed backdrop closes the sheet.
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1.1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <h2 id="logout-title" className="sheet-title">
          Log out of Felt?
        </h2>

        <div className={`logout-status ${line.tone}`} role="status" aria-live="polite">
          <span className="logout-status-icon" aria-hidden="true">
            {line.tone === 'good' ? <CheckIcon size={16} /> : <CloudIcon size={18} offline={line.tone === 'warn'} />}
          </span>
          <span className="grow">{line.text}</span>
          {failed && failed.reason !== 'conflict' && (
            <button className="btn btn-tinted logout-retry" onClick={() => void save()} disabled={busy}>
              Try again
            </button>
          )}
        </div>

        <div className="stack" style={{ gap: '0.6rem' }}>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || saving} onClick={() => void leave(false)} data-haptic="off">
            Log out
          </button>
          <p className="footnote logout-note">This device keeps a copy that works offline.</p>
          <button className="btn btn-lg btn-block btn-destructive" disabled={busy || !saved} onClick={() => void leave(true)} data-haptic="off">
            Log out and remove from this device
          </button>
          <p className="footnote logout-note">
            {saved ? 'For a shared phone. Felt is cleared from this device. Your account keeps everything.' : 'Felt can remove this copy once everything is saved.'}
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-plain btn-block" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
