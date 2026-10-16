import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../haptics';
import { isPro } from '../state/access';
import { useServerFeatures, useSession } from '../state/api';
import { useClaudeCloud } from '../state/cloud';
import { track } from '../state/events';
import { useSettings } from '../state/settings';
import { BrandMark } from '../ui/Brand';
import { useBodyClass } from '../ui/useBodyClass';
import { SaveProgress } from './SignInPage';

/**
 * The end of the very first lesson: the moment Felt has given something
 * real. It celebrates the win, then offers to keep it (an account, once),
 * then shows Felt Pro once, then Today. Offers come after value, not before
 * (most trials still start on the first day, so the Pro offer stays on day
 * one, just after the lesson instead of before it).
 */
export function FirstWin({ correct, total, minutes }: { correct: number; total: number; minutes: number }) {
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
        <p className="moment-sub">That is how every day works. A few minutes, and it adds up.</p>
      </div>
      <button ref={button} className="btn btn-lg btn-block btn-hero moment-cta" data-haptic="off" onClick={next}>
        Continue
      </button>
    </div>
  );
}
