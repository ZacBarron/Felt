import { useEffect, useRef } from 'react';
import type { ProgressSummary } from '../state/summary';
import { BrandMark } from '../ui/Brand';
import { plural } from '../ui/format';
import { useCountUp } from '../ui/useCountUp';
import '../pages/auth.css';

/** "today", "yesterday" or a short date. */
function studiedWhen(d: Date, now = new Date()) {
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `on ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/**
 * A short moment after signing in brings progress back: what came back,
 * in numbers the player knows, then on to Today.
 */
export function WelcomeBack({ summary, onContinue }: { summary: ProgressSummary; onContinue: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const rating = Math.round(useCountUp(summary.rating ?? 0));
  useEffect(() => {
    const t = setTimeout(() => button.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);
  const stats: { label: string; value: string; note?: string }[] = [
    {
      label: 'Suited Rating',
      value: summary.rating === undefined ? 'Not yet' : String(summary.settled ? rating : `~${rating}`),
      // "~" alone would carry meaning in a symbol: the words say it too.
      note: summary.rating === undefined ? undefined : summary.settled ? summary.tier : 'Still settling',
    },
    { label: summary.lessonsDone === 1 ? 'Lesson done' : 'Lessons done', value: String(summary.lessonsDone) },
    { label: 'Day streak', value: String(summary.streak) },
  ];
  return (
    <div className="moment" role="dialog" aria-modal="true" aria-labelledby="welcome-back-title" aria-describedby="welcome-back-sub">
      <div className="moment-rays" aria-hidden="true" />
      <div className="moment-body">
        <BrandMark size={84} animate />
        <div className="moment-kicker">Welcome back</div>
        <h1 id="welcome-back-title" className="display moment-title">
          {summary.name ? `Hi, ${summary.name}` : 'Your progress is back'}
        </h1>
        <ul className="welcome-stats" aria-label="What came back">
          {stats.map((s) => (
            <li key={s.label} className="welcome-stat">
              <span className={`welcome-stat-value num${s.value === 'Not yet' ? ' none' : ''}`}>{s.value}</span>
              <span className="welcome-stat-label">{s.label}</span>
              {s.note && <span className="welcome-stat-note">{s.note}</span>}
            </li>
          ))}
        </ul>
        <p id="welcome-back-sub" className="moment-sub">
          {summary.lastStudied
            ? `You last studied ${studiedWhen(summary.lastStudied)}. ${plural(summary.answers, 'answer')} came with you.`
            : 'Your plan and settings came with you.'}
        </p>
      </div>
      <button ref={button} className="btn btn-lg btn-block btn-hero moment-cta" data-haptic="off" onClick={onContinue}>
        Go to Today
      </button>
    </div>
  );
}
