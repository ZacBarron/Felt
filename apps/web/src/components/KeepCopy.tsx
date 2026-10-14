import { useEffect, useState } from 'react';
import { calibratedDifficulty } from '../state/calibration';
import { type ProgressSummary, summarizeBackup, summarizeDevice } from '../state/summary';
import { cloudCopy, useSyncMeta } from '../state/sync';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, CloudIcon, DeviceIcon } from '../ui/icons';
import { plural } from '../ui/format';
import '../pages/auth.css';

const day = (d?: Date | string) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : undefined);

function Facts({ s }: { s?: ProgressSummary }) {
  if (!s) return <span className="footnote">Checking…</span>;
  const rating = s.rating === undefined ? 'Not rated yet' : s.settled ? `Felt Rating ${s.rating}` : `Felt Rating about ${s.rating}, still settling`;
  return (
    <span className="keep-facts">
      <span>{rating}</span>
      <span>{plural(s.lessonsDone, 'lesson')} done</span>
      {s.streak > 0 && <span>{s.streak} day streak</span>}
      <span>{s.lastStudied ? `Last studied ${day(s.lastStudied)}` : 'No study yet'}</span>
    </span>
  );
}

/**
 * Both this device and the account have progress, and Felt cannot merge
 * them. The player sees what each copy holds and picks one. Nothing is
 * replaced until they confirm.
 */
export function KeepCopy({ busy, onKeep, pinned }: { busy: boolean; onKeep: (choice: 'device' | 'cloud') => void; pinned?: boolean }) {
  const sync = useSyncMeta();
  const [device, setDevice] = useState<ProgressSummary>();
  const [cloud, setCloud] = useState<ProgressSummary>();
  const [cloudError, setCloudError] = useState(false);
  const [choice, setChoice] = useState<'device' | 'cloud'>();

  useEffect(() => {
    let live = true;
    void summarizeDevice({ difficulty: calibratedDifficulty }).then((s) => live && setDevice(s));
    cloudCopy()
      .then((c) => live && c.data && setCloud(summarizeBackup(c.data, { difficulty: calibratedDifficulty })))
      .catch(() => live && setCloudError(true));
    return () => {
      live = false;
    };
  }, []);

  const savedOn = !sync.conflict?.device ? '' : sync.conflict.device === 'Browser' ? ' in a browser' : ` on ${sync.conflict.device === 'Android' ? 'an Android phone' : `a ${sync.conflict.device}`}`;
  const options = [
    { id: 'cloud' as const, Icon: CloudIcon, title: 'Your account', sub: `Saved${savedOn}${sync.conflict?.updatedAt ? ` ${day(sync.conflict.updatedAt)}` : ''}`, s: cloud },
    { id: 'device' as const, Icon: DeviceIcon, title: 'This device', sub: 'On this phone or browser', s: device },
  ];

  const button = (
    <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!choice || busy} onClick={() => choice && onKeep(choice)}>
      {busy ? 'Saving…' : choice === 'device' ? 'Keep this device’s progress' : choice === 'cloud' ? 'Use my account’s progress' : 'Choose a copy'}
    </button>
  );

  return (
    <div className="stack" style={{ gap: '0.75rem' }}>
      <div className="keep-options" role="radiogroup" aria-label="Progress to keep">
        {options.map(({ id, Icon, title, sub, s }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={choice === id}
            className={`onb-choice keep-option${choice === id ? ' selected' : ''}`}
            data-haptic="select"
            onClick={() => setChoice(id)}
          >
            <span className="keep-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <span className="grow">
              <span className="onb-choice-label">{title}</span>
              <span className="footnote">{sub}</span>
              {id === 'cloud' && cloudError ? <span className="footnote">Felt could not load it. You can still pick it.</span> : <Facts s={s} />}
            </span>
            <span className="onb-check" aria-hidden="true">
              {choice === id && <CheckIcon size={14} />}
            </span>
          </button>
        ))}
      </div>
      <p className="footnote" style={{ margin: '0 0.25rem' }}>
        {choice === 'cloud'
          ? 'This device will show your account’s progress. What is on this device now is replaced.'
          : choice === 'device'
            ? 'Your account will match this device. The copy in your account is replaced.'
            : 'Felt cannot combine them. The copy you do not pick is replaced.'}
      </p>
      {pinned ? <BottomBar>{button}</BottomBar> : button}
    </div>
  );
}
