import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../state/api';
import { ChipArt } from '../ui/FeatureArt';
import { CloseIcon } from '../ui/icons';

const DISMISS_KEY = 'felt.invite.dismissed.v1';
/** Days a dismissed invite card stays away. */
const QUIET_DAYS = 30;

function dismissedRecently(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && now - at < QUIET_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/**
 * One quiet card on Today for signed in players who have finished a lesson:
 * a month of Pro for a friend and for you. Closing it hides it for a month.
 */
export function InviteCard({ lessonsDone }: { lessonsDone: number }) {
  const session = useSession();
  const [hidden, setHidden] = useState(dismissedRecently);
  if (!session || lessonsDone < 1 || hidden) return null;
  return (
    <div className="feature-card cobalt reveal">
      <ChipArt />
      <Link to="/invite" className="feature-copy invite-feature-link">
        <span className="feature-kicker">Give a month, get a month</span>
        <span className="feature-title">Invite a friend who plays</span>
        <span className="feature-sub">You both get a month of Suited Pro.</span>
        <span className="feature-cta">Invite a friend</span>
      </Link>
      <button
        className="feature-close"
        aria-label="Hide for a month"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {
            // Private mode: hidden for this visit only.
          }
          setHidden(true);
        }}
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
