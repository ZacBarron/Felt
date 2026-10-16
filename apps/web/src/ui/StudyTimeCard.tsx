import { useState } from 'react';
import { useServerFeatures } from '../state/api';
import { canPush, enableReminders } from '../state/push';
import { haptic } from '../haptics';
import { track } from '../state/events';
import { CUES, cueCopy } from '../state/goals';
import { studyReminder } from '../state/reminders';
import { useSettings } from '../state/settings';
import { CloseIcon } from './icons';

const KEY = 'felt.studyTimeDismissed';

function dismissedBefore() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * After the first lesson, one card asks when tomorrow's lesson happens. Tying
 * practice to a moment you already have is among the best tested habit tools
 * (implementation intentions, Gollwitzer and Sheeran 2006), so it is asked
 * once, at the moment it is useful, instead of during setup.
 */
export function StudyTimeCard() {
  const { settings, update } = useSettings();
  const profile = settings.profile;
  const [hidden, setHidden] = useState(dismissedBefore);
  const [picked, setPicked] = useState<string>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);
  const features = useServerFeatures();
  if (hidden || !profile.firstLessonAt || (profile.cue && !picked)) return null;

  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* Storage blocked: it may show again, which is harmless. */
    }
  };

  if (picked) {
    const cue = cueCopy(picked);
    const [h, m] = cue?.time ?? [8, 0];
    const at = new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    // A push at the cue's time when one can arrive; a calendar event otherwise.
    const push = canPush(features);
    const remind = async () => {
      setBusy(true);
      setNote(undefined);
      try {
        await enableReminders(h * 60 + m);
        haptic('success');
        track('reminder_added', { kind: 'study', cue: picked, from: 'today', via: 'push' });
        close();
      } catch (e) {
        haptic('warning');
        setNote(e instanceof Error ? e.message : 'Felt could not turn on reminders.');
        setBusy(false);
      }
    };
    return (
      <div className="card study-card reveal">
        <div className="study-card-title">
          When you {cue?.phrase}, you study for {profile.dailyMinutes} minutes.
        </div>
        {note && (
          <p className="footnote" role="status">
            {note}
          </p>
        )}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {push ? (
            <button className="btn btn-tinted" disabled={busy} onClick={() => void remind()} data-haptic="off">
              Remind me at {at}
            </button>
          ) : (
            <button
              className="btn btn-tinted"
              onClick={() => {
                studyReminder(picked, profile.dailyMinutes);
                track('reminder_added', { kind: 'study', cue: picked, from: 'today', via: 'calendar' });
                close();
              }}
            >
              Add to my calendar
            </button>
          )}
          <button className="btn btn-plain" disabled={busy} onClick={close}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card study-card reveal">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="study-card-title">When will you do tomorrow's lesson?</div>
        <button className="icon-btn install-close" aria-label="Not now" onClick={close}>
          <CloseIcon size={14} />
        </button>
      </div>
      <div className="study-card-chips" role="radiogroup" aria-label="Study time">
        {CUES.map((c) => (
          <button
            key={c.id}
            className="chip"
            role="radio"
            aria-checked={false}
            data-haptic="select"
            onClick={() => {
              setPicked(c.id);
              update({ ...settings, profile: { ...profile, cue: c.id } });
              track('study_cue_set', { cue: c.id, from: 'today' });
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
