import { dayKey, streakWithFreezes, type StreakState } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { activityDates } from '../state/rating';
import { plural } from '../ui/format';
import { CheckIcon, FlameIcon, FreezeIcon, ShareIcon } from '../ui/icons';
import '../pages/today.css';

export interface StreakWeekData {
  streak: StreakState;
  days: { key: string; label: string; name: string; done: boolean; frozen: boolean; today: boolean }[];
}

/**
 * The streak and the last seven days from every kind of study (reviews,
 * lessons, graded answers and the daily challenge), the same days the
 * streak itself counts. Days a streak freeze covered are marked as such.
 */
export function useStreakWeek(): StreakWeekData | undefined {
  return useLiveQuery(async () => {
    const now = new Date();
    const dates = await activityDates();
    const streak = streakWithFreezes(dates, now);
    const studied = new Set(dates.map(dayKey));
    const frozen = new Set(streak.frozen);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      const key = dayKey(d);
      return {
        key,
        label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        name: i === 6 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'long' }),
        done: studied.has(key),
        frozen: frozen.has(key),
        today: i === 6,
      };
    });
    return { streak, days };
  }, []);
}

/** What the streak needs next, in one or two short sentences. Never a guilt line. */
export function streakLine({ streak, days }: StreakWeekData): string {
  const { streak: n, best, activeToday } = streak;
  const yesterday = days[5];
  const covered = !activeToday && yesterday?.frozen ? 'A streak freeze covered yesterday. ' : '';
  if (n === 0) return best > 0 ? 'Study today to start a new streak.' : 'Study today to start your streak.';
  if (activeToday) return `Today counts. Tomorrow makes ${plural(n + 1, 'day')}.`;
  return `${covered}Study today to make it ${plural(n + 1, 'day')}.`;
}

/**
 * The streak card: the count, a week strip and what comes next. Shown on
 * Today and after the daily challenge, like the streak widgets in Duolingo
 * and LinkedIn's daily games. With `onShare`, a quiet share button sits by
 * the line once there is a streak to share.
 */
export function StreakWeek({ data, className = '', onShare }: { data: StreakWeekData; className?: string; onShare?: () => void }) {
  const { streak, days } = data;
  const n = streak.streak;
  return (
    <div className={`streak-week ${className}`}>
      <div className="streak-week-head">
        <span className={`streak-flame${streak.activeToday ? ' lit' : ''}`} aria-hidden="true">
          <FlameIcon size={22} />
        </span>
        <span className="streak-count">
          {n > 0 ? (
            <>
              <span className="display num streak-num">{n}</span>
              <span>day streak</span>
            </>
          ) : (
            'No streak yet'
          )}
        </span>
        {n > 0 && streak.bank > 0 && (
          <span className="streak-bank footnote num">
            <FreezeIcon size={14} aria-hidden="true" /> {plural(streak.bank, 'freeze')} saved
          </span>
        )}
      </div>
      <ul className="week streak-days" aria-label={`Studied on ${days.filter((d) => d.done).length} of the last 7 days`}>
        {days.map((d, i) => (
          <li key={d.key} className={`day${d.today ? ' today' : ''}`}>
            <span className={`dot${d.done ? ' done' : d.frozen ? ' frozen' : ''}`} style={{ animationDelay: `${i * 40}ms` }} aria-hidden="true">
              {d.done ? <CheckIcon size={15} /> : d.frozen ? <FreezeIcon size={16} /> : null}
            </span>
            <span aria-hidden="true">{d.label}</span>
            <span className="sr-only">
              {d.name}, {d.done ? 'studied' : d.frozen ? 'covered by a streak freeze' : d.today ? 'not yet' : 'not studied'}
            </span>
          </li>
        ))}
      </ul>
      {n > 0 && onShare ? (
        <div className="streak-foot">
          <p className="streak-line">{streakLine(data)}</p>
          <button type="button" className="btn btn-plain streak-share" onClick={onShare}>
            <ShareIcon size={18} />
            Share streak
          </button>
        </div>
      ) : (
        <p className="streak-line">{streakLine(data)}</p>
      )}
    </div>
  );
}
