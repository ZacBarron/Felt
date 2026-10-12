import { ideaForDay } from '@felt/content';
import { actionRange, challengeNumber, currentRating, handClassCombos, isProvisional, stakesLabel, tierLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { MasteryGrid } from '../components/MasteryGrid';
import { PlayingCard } from '../components/PlayingCard';
import { canOpenLesson } from '../state/access';
import { chartsForGame, getChart } from '../state/charts';
import { db, type StoredLesson } from '../state/db';
import { cueCopy, goalCopy, pathPrefs } from '../state/goals';
import { lessonPath, lessonProgress, pickNextLesson } from '../state/lessons';
import { ratingSnapshot, streakNow } from '../state/rating';
import { buildQueue, masteryForCharts, todayStats } from '../state/review';
import { useSettings } from '../state/settings';
import { HeroPattern } from '../ui/Brand';
import { plural } from '../ui/format';
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
  const progress = useLiveQuery(lessonProgress, [], new Map<string, StoredLesson>());
  const nextLesson = pickNextLesson(progress, (key) => canOpenLesson(key, settings.access), pathPrefs(settings.profile));
  const dailyDone = useLiveQuery(() => db.daily.get(challengeNumber(new Date())), []);
  const streak = useLiveQuery(() => streakNow(), []);
  const rating = useLiveQuery(async () => currentRating((await ratingSnapshot()).overall), []);

  const remaining = stats ? stats.dueNow + stats.newAvailable : 0;
  const shownRemaining = Math.round(useCountUp(remaining));
  const minutes = Math.max(1, Math.round((remaining * 6) / 60));
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const focus = mastery?.find((m) => m.solid < m.total) ?? mastery?.[0];
  const nextChart = next ? getChart(next.chartId) : undefined;
  const heroRange = focus ? new Set(actionRange(focus.chart, focus.chart.spec.actions[0].id).keys()) : undefined;
  const idea = ideaForDay(new Date());
  const lessonToday = [...progress.values()].some((l) => l.status === 'done' && l.updatedAt >= new Date(new Date().setHours(0, 0, 0, 0)));
  const reviewDone = !!stats && remaining === 0;
  const tasks = [
    nextLesson && {
      done: lessonToday,
      label: lessonToday ? 'Lesson done' : `Lesson: ${nextLesson.title}`,
      to: lessonPath(nextLesson.key),
      detail: lessonToday ? '' : `${nextLesson.content?.minutes ?? 5} min`,
    },
    {
      done: reviewDone,
      label: 'Review',
      to: reviewDone ? '/practice' : '/review',
      detail: !stats ? '' : reviewDone ? (stats.reviewedToday ? 'Cleared' : 'Nothing due') : plural(remaining, 'card'),
    },
    { done: !!dailyDone?.finished || (!!dailyDone && dailyDone.finished === undefined), label: 'Daily challenge', to: '/daily', detail: !dailyDone ? '5 decisions' : dailyDone.finished === false ? `${dailyDone.scores.length} of 5 done` : `${dailyDone.scores.filter((x) => x >= 1).length}/5 right` },
  ].filter(Boolean) as { done: boolean; label: string; to: string; detail: string }[];
  const tasksDone = tasks.filter((t) => t.done).length;
  const touchedCharts = mastery?.filter((m) => m.solid + m.learning > 0) ?? [];
  const nowLearning = touchedCharts.find((m) => m.solid < m.total) ?? touchedCharts[0];

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader
        title="Today"
        kicker={date}
        trailing={
          <Link to="/you" className="pill rating-chip" style={{ textDecoration: 'none', marginBottom: 4 }}>
            {rating && rating.games > 0 ? `${isProvisional(rating) ? '~' : ''}${Math.round(rating.rating)} · ${tierLabel(rating)}` : `${stakesLabel(g.stakes)} ${g.venue}`}
          </Link>
        }
      />

      {nextLesson?.content && !lessonToday ? (
        <Link to={lessonPath(nextLesson.key)} className="hero learn-hero">
          <HeroPattern mixes={heroRange} />
          <div className="learn-hero-body">
            <div style={{ minWidth: 0 }}>
              <div className="hero-label">{progress.get(nextLesson.key)?.status === 'started' ? 'Continue your plan' : 'Next in your plan'}</div>
              <div className="display learn-hero-title">{nextLesson.title}</div>
              <div className="hero-sub">
                {nextLesson.moduleTitle}, {nextLesson.content.minutes} min
              </div>
            </div>
          </div>
          <span className="btn btn-lg btn-block btn-hero">{progress.get(nextLesson.key)?.status === 'started' ? 'Continue lesson' : 'Start lesson'}</span>
        </Link>
      ) : (
        <section className="hero">
          <HeroPattern mixes={heroRange} />
          <div className="hero-body">
            <div className="hero-copy">
              <div className="hero-label">Review</div>
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
            </div>
            {next && nextChart && remaining > 0 && (
              <div className="up-next" aria-hidden="true">
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
            <Link to="/practice" className="btn btn-lg btn-block btn-hero-ghost">
              Practice at your level
            </Link>
          )}
        </section>
      )}

      <section className="card quests reveal" aria-labelledby="today-plan">
        <div className="quests-head">
          <ProgressRing value={tasksDone / tasks.length} size={52} stroke={6} label={`${tasksDone} of ${tasks.length} done`}>
            {tasksDone === tasks.length ? (
              <CheckIcon size={20} style={{ color: 'var(--tint)' }} />
            ) : (
              <span className="num goal-num">
                {tasksDone}/{tasks.length}
              </span>
            )}
          </ProgressRing>
          <div className="grow">
            <div className="footnote">{cueCopy(settings.profile.cue)?.label ?? goalCopy(settings.profile.goals[0])?.label ?? 'Today'}</div>
            <div id="today-plan" style={{ fontWeight: 650 }}>
              {tasksDone === tasks.length ? 'Done for today' : "Today's plan"}
            </div>
          </div>
          {!!streak?.streak && (
            <span className="pill pill-tint" aria-label={`${streak.streak} day streak`}>
              <FlameIcon size={12} /> {streak.streak}
            </span>
          )}
        </div>
        {tasks.map((t) => (
          <Link key={t.label} to={t.to} className={`quest${t.done ? ' done' : ''}`}>
            <span className="quest-check" aria-hidden="true">
              {t.done && <CheckIcon size={13} />}
            </span>
            <span className="sr-only">{t.done ? 'Done: ' : 'To do: '}</span>
            <span className="grow">{t.label}</span>
            <span className="footnote num">{t.detail}</span>
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
            <Stat label="Avg time" value={stats.avgSecondsToday ?? 0} suffix="s" decimals={1} />
          </div>
        </section>
      )}

      {nowLearning && (
        <section>
          <div className="section-title">Now learning</div>
          <Link to="/ranges" className="card focus-card">
            <MasteryGrid chart={nowLearning.chart} hands={nowLearning.hands} />
            <div className="focus-copy">
              <div style={{ fontSize: '1.15rem', fontWeight: 650, lineHeight: 1.2 }}>
                {nowLearning.chart.spec.title}
              </div>
              <div className="footnote" style={{ marginTop: 4 }}>
                {nowLearning.solid} of {nowLearning.total} borderline hands solid
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
          {!!streak?.best && streak.best > streak.streak && <span className="footnote num">Best streak {streak.best}</span>}
        </div>
        <div className="card">
          <ul className="week" aria-label={`Studied on ${(stats?.week ?? []).filter((d) => d.done).length} of the last 7 days`}>
            {(stats?.week ?? []).map((d, i) => (
              <li key={i} className={`day${d.today ? ' today' : ''}`}>
                <span className={`dot${d.done ? ' done' : ''}`} style={{ animationDelay: `${i * 40}ms` }} aria-hidden="true">
                  <CheckIcon size={15} />
                </span>
                <span aria-hidden="true">{d.label}</span>
                <span className="sr-only">
                  {d.today ? 'Today' : d.label}, {d.done ? 'studied' : 'not studied'}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {streak && (
          <div className="section-footer">
            {streak.bank > 0
              ? `You have ${streak.bank} streak ${streak.bank === 1 ? 'freeze' : 'freezes'}: each covers one missed day. Seven days in a row earns another.`
              : 'Study seven days in a row to earn a streak freeze. A freeze covers one missed day.'}
          </div>
        )}
      </section>

      <section>
        <div className="section-title">Key idea</div>
        <article className="card idea">
          <div className="row between">
            <span className={`pill ${idea.basis === 'exploit' ? 'pill-exploit' : ''}`}>{idea.topic}</span>
          </div>
          <h3>{idea.title}</h3>
          <p>{idea.body}</p>
        </article>
      </section>

      {touchedCharts.length > 0 && (
        <section>
          <div className="row between" style={{ padding: '0 1rem 0.4rem' }}>
            <span className="section-title" style={{ padding: 0 }}>
              Your charts
            </span>
            <Link to="/ranges" className="footnote" style={{ color: 'var(--tint)', textDecoration: 'none', fontWeight: 600 }}>
              All {mastery?.length}
            </Link>
          </div>
          <div className="list">
            {touchedCharts.slice(0, 5).map((m) => {
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
