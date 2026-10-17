import { ideaForDay } from '@felt/content';
import { actionRange, challengeNumber, currentRating, handClassCombos, isProvisional, nextTier, tierLabel } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BillingIssueBanner } from '../components/BillingIssueBanner';
import { MasteryGrid } from '../components/MasteryGrid';
import { StreakWeek, useStreakWeek } from '../components/StreakWeek';
import { TierCard } from '../components/TierCard';
import { PlayingCard } from '../components/PlayingCard';
import { canOpenLesson, isPro } from '../state/access';
import { useCoachAvailable } from '../state/coach';
import { chartsForGame, getChart } from '../state/charts';
import { db, type StoredLesson } from '../state/db';
import { cueCopy, goalCopy, pathPrefs } from '../state/goals';
import { lessonPath, lessonProgress, recommendedLessons } from '../state/lessons';
import { ratingSnapshot } from '../state/rating';
import { chartsTaught, reviewTotal } from '../state/decks';
import { buildQueue, masteryForCharts, todayStats } from '../state/review';
import { useSettings } from '../state/settings';
import { APP_TOUR, endTour, getTour, setTour, shouldStartAppTour, useTour } from '../state/tour';
import { CoachMarks } from '../ui/CoachMarks';
import { Avatar } from '../ui/Avatar';
import { ImportCard } from '../ui/ImportCard';
import { StudyTimeCard } from '../ui/StudyTimeCard';
import { InstallCard } from '../ui/InstallCard';
import { AccountCard } from '../ui/AccountCard';
import { InviteCard } from '../components/InviteCard';
import { WeeklyTodayCard } from './WeeklyPage';
import { HeroPattern } from '../ui/Brand';
import { plural } from '../ui/format';
import { CheckIcon, ChevronRightIcon, CoachIcon, LockIcon } from '../ui/icons';
import { NavRow } from '../ui/NavRow';
import { ProBadge } from '../ui/ProBadge';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { ProgressRing } from '../ui/ProgressRing';
import { useCountUp } from '../ui/useCountUp';
import './today.css';

/** A stable combo for a hand class, so the preview does not reshuffle on every render. */
function previewCombo(id: string, hand: string) {
  const combos = handClassCombos(hand);
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return combos[h % combos.length];
}

/**
 * The first run tour starts on a calm Today: after the page has settled and
 * only when no sheet or moment is open. If something is open it waits for the
 * next visit.
 */
function useAppTour(onboarded: boolean) {
  const tour = useTour();
  const [running, setRunning] = useState(false);
  const due = shouldStartAppTour(tour, { onboarded });
  useEffect(() => {
    if (!due) return;
    const t = window.setTimeout(() => {
      if (!document.querySelector('dialog[open], .moment')) setRunning(true);
    }, 700);
    return () => window.clearTimeout(t);
  }, [due]);
  const end = (how: 'done' | 'skipped') => {
    setTour(endTour(getTour(), how));
    setRunning(false);
  };
  return { running, end };
}

export function DashboardPage() {
  const { settings } = useSettings();
  const tour = useAppTour(settings.profile.onboarded);
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
  const prefs = pathPrefs(settings.profile);
  // The next lesson you can open. When a free plan has run out of open lessons, the path's next one is in Aced Pro.
  const nextLesson = recommendedLessons(progress, prefs, (key) => canOpenLesson(key, settings.access))[0];
  const pathNext = recommendedLessons(progress, prefs)[0];
  const proNext = !nextLesson && pathNext?.content && !canOpenLesson(pathNext.key, settings.access) ? pathNext : undefined;
  const dailyDone = useLiveQuery(() => db.daily.get(challengeNumber(new Date())), []);
  const week = useStreakWeek();
  const coach = useCoachAvailable();
  const rating = useLiveQuery(async () => currentRating((await ratingSnapshot()).overall), []);

  const total = useLiveQuery(() => reviewTotal(charts, settings.study), [...deps, JSON.stringify(settings.study)]);
  const remaining = total ?? (stats ? stats.dueNow + stats.newAvailable : 0);
  const shownRemaining = Math.round(useCountUp(remaining));
  const minutes = Math.max(1, Math.round((remaining * 6) / 60));
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const focus = mastery?.find((m) => m.solid < m.total) ?? mastery?.[0];
  const nextChart = next ? getChart(next.chartId) : undefined;
  const heroRange = focus ? new Set(actionRange(focus.chart, focus.chart.spec.actions[0].id).keys()) : undefined;
  const idea = ideaForDay(new Date());
  const lessonToday = [...progress.values()].some((l) => l.status === 'done' && l.updatedAt >= new Date(new Date().setHours(0, 0, 0, 0)));
  const reviewDone = !!stats && remaining === 0;
  // Until a player has learned what a range chart is, Today does not send them to chart questions.
  const taught = chartsTaught(progress);
  const tasks = [
    (nextLesson || lessonToday) && {
      done: lessonToday,
      label: lessonToday ? 'Lesson done' : 'Finish a lesson',
      to: nextLesson ? lessonPath(nextLesson.key) : '/learn',
      detail: lessonToday || !nextLesson ? '' : `${nextLesson.content?.minutes ?? 5} min`,
    },
    (taught || remaining > 0) && {
      done: reviewDone,
      label: reviewDone ? 'Review cleared' : 'Clear your review',
      to: reviewDone ? '/practice' : '/review',
      detail: !stats ? '' : reviewDone ? (stats.reviewedToday ? '' : 'Nothing due') : plural(remaining, 'card'),
    },
    taught && { done: !!dailyDone?.finished || (!!dailyDone && dailyDone.finished === undefined), label: dailyDone && dailyDone.finished !== false ? 'Challenge done' : 'Play the daily challenge', to: '/daily', detail: !dailyDone ? '5 decisions' : dailyDone.finished === false ? `${dailyDone.scores.length} of 5 done` : `${dailyDone.scores.filter((x) => x >= 1).length} of 5 right` },
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
          <Link to="/you" className="today-me" aria-label={rating && rating.games > 0 ? `Aced Rating ${Math.round(rating.rating)}, ${tierLabel(rating)}` : 'You'}>
            <Avatar
              name={settings.profile.name}
              photo={settings.profile.photo}
              size={50}
              progress={rating && rating.games > 0 && !isProvisional(rating) ? nextTier(rating.rating)?.progress : undefined}
            />
            {/* A rating still settling shows words, not a number that looks firmer than it is. */}
            <span className="today-me-rating num">{!rating || rating.games === 0 ? 'Get rated' : isProvisional(rating) ? 'Settling' : Math.round(rating.rating)}</span>
          </Link>
        }
      />

      <BillingIssueBanner />

      {nextLesson?.content && !lessonToday ? (
        <Link to={lessonPath(nextLesson.key)} className="hero learn-hero" data-tour="today-main">
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
        <section className="hero" data-tour="today-main">
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
            {next && nextChart && remaining > 0 && taught && (
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
                  Starts with {nextChart.spec.hero}
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

      {/* The plan sits right under the hero, so the first screen says what to do today. */}
      <section className="card quests reveal" aria-labelledby="today-plan">
        <div className="quests-head">
          <ProgressRing value={tasks.length ? tasksDone / tasks.length : 1} size={52} stroke={6} label={`${tasksDone} of ${tasks.length} done`}>
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
        {/* The free lessons are done: the path goes on in Pro. One quiet row that is not a task, so the plan can still be finished for free. */}
        {proNext && (
          <Link to="/pro?from=lesson" className="quest quest-pro">
            <span className="quest-check" aria-hidden="true">
              <LockIcon size={13} />
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="quest-pro-title">{proNext.title}</span>
              <span className="footnote">Next lesson in your plan</span>
            </span>
            <ProBadge />
            <ChevronRightIcon size={14} className="chev" />
          </Link>
        )}
      </section>

      {week && (
        <Section
          title="Your streak"
          info={
            week.streak.bank > 0
              ? `You have ${plural(week.streak.bank, 'streak freeze')}. Each one covers a missed day. Study 7 days in a row to earn another.`
              : 'Study 7 days in a row to earn a streak freeze. Each one covers a missed day.'
          }
          trailing={week.streak.best > week.streak.streak ? <span className="footnote num">Best {plural(week.streak.best, 'day')}</span> : undefined}
        >
          <div className="card reveal">
            <StreakWeek data={week} />
          </div>
        </Section>
      )}

      <StudyTimeCard />
      <WeeklyTodayCard />
      <ImportCard />
      <InstallCard />

      {/* After the plan: saving progress never competes with studying. */}
      <AccountCard />
      <InviteCard lessonsDone={[...progress.values()].filter((l) => l.status === 'done').length} />

      {rating && rating.games > 0 && <TierCard rating={rating} />}

      {stats && stats.reviewedToday > 0 && (
        <section className="reveal">
          <div className="section-title">Today so far</div>
          {/* Time per card only when it was timed: untimed drills report nothing to show. */}
          <div className={`stat-grid ${stats.avgSecondsToday ? 'three' : 'two'}`}>
            <Stat label="Reviewed" value={stats.reviewedToday} />
            <Stat label="Accuracy" value={Math.round((stats.accuracyToday ?? 0) * 100)} suffix="%" />
            {!!stats.avgSecondsToday && <Stat label="Per card" value={stats.avgSecondsToday} suffix="s" decimals={1} />}
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
                You know {nowLearning.solid} of {nowLearning.total} close calls
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
        <div className="section-title">Key idea</div>
        <article className="card idea">
          <div className="row between">
            <span className={`pill ${idea.basis === 'exploit' ? 'pill-exploit' : ''}`}>{idea.topic}</span>
          </div>
          <h3>{idea.title}</h3>
          <p>{idea.body}</p>
        </article>
      </section>

      {coach !== false && (
        <div className="list with-icons">
          <NavRow to="/coach" icon={CoachIcon} color="var(--chip-cobalt)" title="Ask the coach" subtitle="About a hand you played or anything here" detail={isPro(settings.access) ? undefined : <ProBadge />} />
        </div>
      )}

      {touchedCharts.length > 0 && (
        <section>
          <div className="row between" style={{ padding: '0 1rem 0.4rem' }}>
            <span className="section-title" style={{ padding: 0 }}>
              Your charts
            </span>
            <Link to="/ranges" className="footnote" style={{ color: 'var(--tint)', textDecoration: 'none', fontWeight: 600 }}>
              See all {mastery?.length}
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
      {tour.running && <CoachMarks steps={APP_TOUR} label="App tour" onEnd={tour.end} />}
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
