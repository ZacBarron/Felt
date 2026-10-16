import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { noteCardDismissed, noteCardShown, readPrompt, shouldShowCard } from '../state/accountPrompt';
import { useServerFeatures, useSession } from '../state/api';
import { useClaudeCloud } from '../state/cloud';
import { db } from '../state/db';
import { track } from '../state/events';
import { streakNow } from '../state/rating';
import { CloseIcon, PasskeyIcon } from './icons';

/**
 * One quiet card on Today for guests with progress worth keeping, when this
 * server has accounts. At most once a week, and gone for good after two
 * dismissals. It states the plain fact and nothing more.
 */
export function AccountCard() {
  const session = useSession();
  const { cloud } = useClaudeCloud();
  const features = useServerFeatures();
  const [state, setState] = useState(readPrompt);
  const progress = useLiveQuery(async () => {
    const lessonsDone = await db.lessons.where('status').anyOf('done', 'tested').count();
    return { lessonsDone, streak: (await streakNow()).streak };
  }, []);
  const show = !session && !cloud && !!features?.accounts && !!progress && shouldShowCard(state, progress);

  useEffect(() => {
    if (!show) return;
    const fresh = !readPrompt().cardShownAt || Date.now() - Date.parse(readPrompt().cardShownAt!) >= 86_400_000;
    noteCardShown();
    if (fresh) track('account_prompt_viewed', { from: 'today' });
  }, [show]);

  if (!show) return null;

  const dismiss = () => {
    noteCardDismissed();
    track('account_skipped', { from: 'today' });
    setState(readPrompt());
  };

  return (
    <div className="card install-card reveal">
      <span className="import-card-icon" aria-hidden="true">
        <PasskeyIcon size={24} />
      </span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="install-title">Save your progress to an account</div>
        <div className="footnote">Use Suited on any device. {features?.passkeys ? 'It takes one tap with a passkey.' : 'It takes a minute with your email.'}</div>
        <Link to="/signin?mode=create&from=today" className="btn btn-tinted install-btn">
          Save my progress
        </Link>
      </div>
      <button className="icon-btn install-close" aria-label="Not now" onClick={dismiss}>
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
