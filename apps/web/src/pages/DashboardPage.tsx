import { ideaForDay } from '@felt/content';
import { actionRange, challengeNumber, currentRating, handClassCombos, isProvisional, stakesLabel, tierFor } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { MasteryGrid } from '../components/MasteryGrid';
import { PlayingCard } from '../components/PlayingCard';
import { canOpenLesson } from '../state/access';
import { chartsForGame, getChart } from '../state/charts';
import type { StoredLesson } from '../state/db';
import { goalCopy, pathPrefs } from '../state/goals';
import { lessonPath, lessonProgress, pickNextLesson, studyMinutesToday } from '../state/lessons';
import { ratingSnapshot, streakNow } from '../state/rating';
import { db } from '../state/db';
import { buildQueue, masteryForCharts, todayStats } from '../state/review';
import { useSettings } from '../state/settings';
import { HeroPattern } from '../ui/Brand';
import { CheckIcon, ChevronRightIcon, FlameIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { ProgressRing } from '../ui/ProgressRing';
import { useCountUp } from '../ui/useCountUp';

/** A stable combo for a hand class, so the preview does not reshuffle on every render. */
function previewCombo(id: string, hand: string) {
  const combos = handClassCombos(hand);
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return combos[h % combos.length];
}

export function DashboardPage() {
  const { settings } = useSettings();
  const g = settings.game;
  const deps = [g.tableSize, g.format, settings.study.newPerDay];
  const charts = chartsForGame(g).charts;
  const stats = useLiveQuery(() => todayStats(charts, settings.study.newPerDay), deps);
  const next = useLiveQuery(async () => {
    const q = await buildQueue(charts, settings.study.newPerDay);
    return [...q.due, ...q.fresh][0] ?? null;
  }, deps);
  const mastery = useLiveQuery(() => masteryForCharts(charts), deps);
  const studied = useLiveQuery(() => studyMinutesToday(), [], 0);
  const progress = useLiveQuery(lessonProgress, [], new Map<string, StoredLesson>());
  const nextLesson = pickNextLesson(progress, (key) => canOpenLesson(key, settings.access), pathPrefs(settings.profile));
  const goal = settings.profile.dailyMinutes;
  const dailyDone = useLiveQuery(() => db.daily.get(challengeNumber(new Date())), []);
  const streak = useLiveQuery(() => streakNow(), []);
  const rating = useLiveQuery(async () => currentRating((await ratingSnapshot()).overall), []);

  const remaining = stats ? stats.dueNow + stats.newAvailable : 0;
  const total = stats ? stats.reviewedToday + remaining : 0;
  const shownRemaining = Math.round(useCountUp(remaining));
  const minutes = Math.max(1, Math.round((remaining * 6) / 60));
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const focus = mastery?.find((m) => m.solid < m.total) ?? mastery?.[0];
  const nextChart = next ? getChart(next.chartId) : undefined;
  const heroRange = focus ? new Set(actionRange(focus.chart, focus.chart.spec.actions[0].id).keys()) : undefined;
  const idea = ideaForDay(new Date());
  const quests = [
    { done: !!dailyDone, label: 'Daily challenge', to: '/daily', detail: dailyDone ? `${dailyDone.scores.filter((x) => x >= 1).length}/5` : '5 decisions' },
    { done: studied >= goal, label: `Study ${goal} minutes`, to: nextLesson ? lessonPath(nextLesson.key) : '/learn', detail: `${Math.floor(studied)} of ${goal}` },
    { done: !!stats && remaining === 0 && stats.reviewedToday > 0, label: 'Clear your review', to: '/review', detail: stats ? `${remaining} left` : '' },
  ];
  const questsDone = quests.filter((q) => q.done).length;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader
        title="Today"
        kicker={date}
        trailing={
          <Link to="/you" className="pill rating-chip" style={{ textDecoration: 'none', marginBottom: 4 }}>
            {rating && rating.games > 0 ? `${Math.round(rating.rating)}${isProvisional(rating) ? '?' : ''} · ${tierFor(rating.rating)}` : `${stakesLabel(g.stakes)} ${g.venue}`}
          </Link>
        }
      />

      <section className="hero">
        <HeroPattern mixes={heroRange} />
        <div className="hero-body">
          <div className="hero-copy">
            <div className="hero-label">Daily review</div>
            {stats && remaining === 0 ? (
              <div className="display" style={{ fontSize: '2.5rem', lineHeight: 1.02, marginTop: 6 }}>
                All caught up
              </div>
            ) : (
              <>
                <div className="display num" style={{ fontSize: '4.5rem', lineHeight: 0.95, marginTop: 4 }}>
                  {stats ? shownRemaining : ''}
                </div>
                <div className="hero-sub">
                  {remaining === 1 ? 'card' : 'cards'}, about {minutes} min
                </div>
              </>
            )}
            {total > 0 && (
              <div className="hero-progress" aria-label={`${stats?.reviewedToday} of ${total} done`}>
                <span style={{ width: `${((stats?.reviewedToday ?? 0) / total) * 100}%` }} />
              </div>
            )}
          </div>

          {next && nextChart && remaining > 0 && (
            <div className="up-next">
              <div className="fan">
                {next.mode === 'quick' && next.hand ? (
                  previewCombo(next.id, next.hand).map((c, i) => <PlayingCard key={c} card={c} size="md" deal delayMs={200 + i * 90} />)
                ) : (
                  <>
                    <PlayingCard size="md" deal delayMs={200} />
                    <PlayingCard size="md" deal delayMs={290} />
                  </>
                )}
              </div>
              <div className="hero-sub" style={{ textAlign: 'center' }}>
                Up next: {nextChart.spec.hero}
              </div>
            </div>
          )}
        </div>
        {remaining > 0 ? (
          <Link to="/review" className="btn btn-lg btn-block btn-hero">
            Start review
          </Link>
        ) : (
          <Link to="/drills" className="btn btn-lg btn-block btn-hero-ghost">
            Free practice
          </Link>
        )}
      </section>

      <section className="card quests reveal">
        <div className="quests-head">
          <ProgressRing value={questsDone / quests.length} size={52} stroke={6}>
            {questsDone === quests.length ? <CheckIcon size={20} style={{ color: 'var(--tint)' }} /> : <span className="num goal-num">{questsDone}/3</span>}
          </ProgressRing>
          <div className="grow">
            <div className="footnote">{goalCopy(settings.profile.goal)?.label ?? 'Today'}</div>
            <div style={{ fontWeight: 650 }}>{questsDone === quests.length ? 'Perfect day' : "Today's quests"}</div>
          </div>
          {!!streak?.streak && (
            <span className="pill pill-tint">
              <FlameIcon size={12} /> {streak.streak}
              {streak.bank > 0 && ` · ${streak.bank} freeze${streak.bank > 1 ? 's' : ''}`}
            </span>
          )}
        </div>
        {quests.map((q) => (
          <Link key={q.label} to={q.to} className={`quest${q.done ? ' done' : ''}`}>
            <span className="quest-check">{q.done && <CheckIcon size={13} />}</span>
            <span className="grow">{q.label}</span>
            <span className="footnote num">{q.detail}</span>
            <ChevronRightIcon size={14} className="chev" />
          </Link>
        ))}
      </section>

      {stats && stats.reviewedToday > 0 && (
        <section className="reveal">
          <div className="section-title">Today so far</div>
          <div className="stat-grid three">
            <Stat label="Reviewed" value={stats.reviewedToday} />
            <Stat label="Accuracy" value={Math.round((stats.accuracyToday ?? 0) * 100)} suffix="%" />
            <Stat label="Recall" value={stats.avgSecondsToday ?? 0} suffix="s" decimals={1} />
          </div>
        </section>
      )}

      {focus && (
        <section>
          <div className="section-title">Now learning</div>
          <Link to="/ranges" className="card focus-card">
            <MasteryGrid chart={focus.chart} hands={focus.hands} />
            <div className="focus-copy">
              <div className="display" style={{ fontSize: '1.9rem', lineHeight: 1.05 }}>
                {focus.chart.spec.title}
              </div>
              <div className="footnote" style={{ marginTop: 4 }}>
                {focus.solid} of {focus.total} edge hands solid
              </div>
              <div className="legend">
                <span>
                  <i style={{ background: 'var(--tint-fill)' }} /> Solid
                </span>
                <span>
                  <i style={{ background: 'color-mix(in srgb, var(--tint-fill) 42%, transparent)' }} /> Learning
                </span>
                <span>
                  <i style={{ background: 'var(--fill-3)' }} /> New
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      <section>
        <div className="row between" style={{ padding: '0 1rem 0.4rem' }}>
          <span className="section-title" style={{ padding: 0 }}>
            Last 7 days
          </span>
          {!!streak?.streak && (
            <span className="footnote row" style={{ gap: 4, color: 'var(--tint)', fontWeight: 600 }}>
              <FlameIcon size={14} /> {streak.streak} day streak{streak.best > streak.streak ? `, best ${streak.best}` : ''}
            </span>
          )}
        </div>
        <div className="card">
          <div className="week">
            {(stats?.week ?? []).map((d, i) => (
              <div key={i} className={`day${d.today ? ' today' : ''}`}>
                <span className={`dot${d.done ? ' done' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                  <CheckIcon size={15} />
                </span>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="section-title">Key idea</div>
        <article className="card idea">
          <div className="row between">
            <span className={`pill ${idea.basis === 'exploit' ? 'pill-exploit' : ''}`}>{idea.topic}</span>
          </div>
          <h3 className="display">{idea.title}</h3>
          <p>{idea.body}</p>
        </article>
      </section>

      {mastery && mastery.length > 1 && (
        <section>
          <div className="row between" style={{ padding: '0 1rem 0.4rem' }}>
            <span className="section-title" style={{ padding: 0 }}>
              Your charts
            </span>
            <Link to="/ranges" className="footnote" style={{ color: 'var(--tint)', textDecoration: 'none', fontWeight: 600 }}>
              All {mastery.length}
            </Link>
          </div>
          <div className="list">
            {mastery.slice(0, 5).map((m) => {
              const pct = m.total ? m.solid / m.total : 0;
              const touched = m.total ? (m.solid + m.learning) / m.total : 0;
              return (
                <Link key={m.chart.spec.id} to="/ranges" className="list-row">
                  <span className="grow">
                    <span style={{ display: 'block' }}>{m.chart.spec.title}</span>
                    <span className="chart-bar">
                      <span className="touched" style={{ width: `${touched * 100}%` }} />
                      <span className="solid" style={{ width: `${pct * 100}%` }} />
                    </span>
                  </span>
                  <span className="detail num">{Math.round(pct * 100)}%</span>
                  <ChevronRightIcon size={16} className="chev" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, suffix = '', decimals = 0 }: { label: string; value: number; suffix?: string; decimals?: number }) {
  const shown = useCountUp(value);
  return (
    <div>
      <div className="footnote">{label}</div>
      <div className="display num" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
        {shown.toFixed(decimals)}
        {suffix}
      </div>
    </div>
  );
}
