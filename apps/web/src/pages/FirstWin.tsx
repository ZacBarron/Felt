import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../haptics';
import { isPro } from '../state/access';
import { useServerFeatures, useSession } from '../state/api';
import { useClaudeCloud } from '../state/cloud';
import { track } from '../state/events';
import type { LessonEntry } from '../state/lessons';
import { useSettings } from '../state/settings';
import { BrandMark } from '../ui/Brand';
import { CheckIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';
import { SaveProgress } from './SignInPage';
import './learn.css';

/**
 * The end of the very first lesson: the moment Aced has given something
 * real. It celebrates the win, then offers to keep it (an account, once),
 * then shows Aced Pro once, then Today. Offers come after value, not before
 * (most trials still start on the first day, so the Pro offer stays on day
 * one, just after the lesson instead of before it).
 */
export function FirstWin({ correct, total, minutes, next: upNext }: { correct: number; total: number; minutes: number; next?: LessonEntry }) {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const features = useServerFeatures();
  const session = useSession();
  const { cloud } = useClaudeCloud();
  const [phase, setPhase] = useState<'win' | 'save'>('win');
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    haptic('success');
    track('first_lesson_done', { correct, total });
    if (!settings.profile.firstLessonAt) update({ ...settings, profile: { ...settings.profile, firstLessonAt: new Date().toISOString() } });
    const t = setTimeout(() => button.current?.focus(), 60);
    return () => clearTimeout(t);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => navigate(isPro(settings.access) ? '/' : '/pro?from=first-lesson', { replace: true });
  const next = () => {
    if (features?.accounts && !session && !cloud) setPhase('save');
    else finish();
  };

  if (phase === 'save' && features)
    return (
      <div className="stack focus-column">
        <SaveProgress from="onboarding" features={features} onContinue={finish} onSkip={finish} />
      </div>
    );

  return (
    <div className="moment first-win" role="dialog" aria-modal="true" aria-labelledby="first-win-title">
      <div className="moment-rays" aria-hidden="true" />
      <div className="moment-body">
        <BrandMark size={84} animate />
        <div className="moment-kicker">Day 1</div>
        <h1 id="first-win-title" className="display moment-title">
          First lesson done
        </h1>
        <ul className="first-win-stats" aria-label="Your first day">
          <li>
            <span className="num">{total > 0 ? `${correct}/${total}` : '1'}</span>
            <span>{total > 0 ? 'right' : 'lesson'}</span>
          </li>
          <li>
            <span className="num">1</span>
            <span>day streak</span>
          </li>
          <li>
            <span className="num">{minutes}</span>
            <span>minutes</span>
          </li>
        </ul>
        <WeekStrip />
        <p className="moment-sub">That is how every day works. A few minutes, and it adds up.</p>
        {upNext?.content && (
          <p className="first-win-next">
            Your next lesson is <strong>{upNext.title}</strong>.
          </p>
        )}
      </div>
      <button ref={button} className="btn btn-lg btn-block btn-hero moment-cta" data-haptic="off" onClick={next}>
        Continue
      </button>
    </div>
  );
}

/**
 * Today and the six days after it, with today checked: the week ahead the
 * habit is built in. It shows a plan, not a debt, so no day is ever marked
 * as missed here.
 */
function WeekStrip() {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  return (
    <ol className="first-win-week" aria-label="Day 1 of your week. Today is done.">
      {days.map((d, n) => (
        <li key={n} className={n === 0 ? 'on' : undefined} aria-hidden="true">
          <span className="first-win-day">{n === 0 ? 'Today' : fmt.format(d)}</span>
          <span className="first-win-dot">{n === 0 && <CheckIcon size={14} />}</span>
        </li>
      ))}
    </ol>
  );
}
