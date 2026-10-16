import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../state/db';
import { useSettings } from '../state/settings';
import { CloseIcon, ImportIcon } from './icons';

const KEY = 'felt.importDismissed';

function dismissedBefore() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * For players who said at setup that they have hands or a session log: one
 * card that points at the import, until something is imported or they close it.
 */
export function ImportCard() {
  const profile = useSettings().settings.profile;
  // Regular and pro players have hands worth reading; anyone who said they keep hands or sessions too.
  const source = profile.handSource ?? (profile.experience === 'winning' || profile.experience === 'pro' ? 'online' : undefined);
  const [hidden, setHidden] = useState(dismissedBefore);
  const imported = useLiveQuery(async () => (await db.hands.count()) + (await db.sessions.count()), []);
  if (hidden || imported !== 0 || (source !== 'online' && source !== 'tracked')) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* Storage blocked: it shows again next visit. */
    }
  };

  return (
    <div className="card install-card reveal">
      <span className="import-card-icon" aria-hidden="true">
        <ImportIcon size={24} />
      </span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="install-title">{source === 'online' ? 'Find your leaks in real hands' : 'Bring in your session log'}</div>
        <div className="footnote">{source === 'online' ? 'Import your hand histories. Felt compares them with its charts.' : 'Import your sessions to see your real results.'}</div>
        <Link to="/import" className="btn btn-tinted install-btn">
          Import {source === 'online' ? 'hands' : 'sessions'}
        </Link>
      </div>
      <button className="icon-btn install-close" aria-label="Not now" onClick={dismiss}>
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
