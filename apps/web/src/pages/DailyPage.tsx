import { STARTER_CHARTS } from '@felt/content';
import {
  boundaryHands,
  challengeNumber,
  chartItemDifficulty,
  dailyPicks,
  type DrillOutcome,
  isMixed,
  shareGrid,
  tierFor,
} from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QuickRecall } from '../drills/QuickRecall';
import { haptic } from '../haptics';
import { StepView } from '../lesson/StepView';
import { getChart } from '../state/charts';
import { db } from '../state/db';
import { LESSON_ENTRIES, quizSteps } from '../state/lessons';
import { ratingSnapshot, recordLessonQuiz, recordRated, streakNow } from '../state/rating';
import { BottomBar } from '../ui/BottomBar';
import { CloseIcon, FlameIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';

type DailyItem = { kind: 'chart'; chartId: string; hand: string } | { kind: 'quiz'; key: string; step: number };

/** Every edge hand of every 9 handed chart, and every lesson quiz: the same pool for everyone. */
function dailyPool() {
  const charts: DailyItem[] = STARTER_CHARTS.filter((s) => s.tableSize === 9).flatMap((spec) => {
    const chart = getChart(spec.id);
    return chart ? boundaryHands(chart).map((hand) => ({ kind: 'chart' as const, chartId: spec.id, hand })) : [];
  });
  const quizzes: DailyItem[] = LESSON_ENTRIES.flatMap((e) => quizSteps(e).map((step) => ({ kind: 'quiz' as const, key: e.key, step })));
  return { charts, quizzes };
}

/** Three chart decisions and two lesson questions, interleaved. */
export function dailyItems(date = new Date()): DailyItem[] {
  const { charts, quizzes } = dailyPool();
  const c = dailyPicks(charts, date, 3, 1);
  const q = dailyPicks(quizzes, date, 2, 2);
  return [c[0], q[0], c[1], q[1], c[2]];
}

function timeToTomorrow(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60_000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function shareText(number: number, scores: number[], rating: number) {
  const right = scores.filter((s) => s >= 1).length;
  return `Felt Daily #${number} · ${right}/${scores.length}\n${shareGrid(scores)}\nFelt Rating ${Math.round(rating)} (${tierFor(rating)})`;
}

function Result({ number, scores, before, after }: { number: number; scores: number[]; before: number; after: number }) {
  const [copied, setCopied] = useState(false);
  const streak = useLiveQuery(() => streakNow(), []);
  const right = scores.filter((s) => s >= 1).length;
  const delta = Math.round(after - before);
  const share = async () => {
    const text = shareText(number, scores, after);
    try {
      if (navigator.share) await navigator.share({ text: `${text}\n${location.origin}/daily` });
      else {
        await navigator.clipboard.writeText(`${text}\n${location.origin}/daily`);
        setCopied(true);
      }
      haptic('success');
    } catch {
      // The share sheet was dismissed.
    }
  };
  return (
    <div className="stack focus-column lesson-done">
      <div className="card stack reveal daily-result" style={{ alignItems: 'center', textAlign: 'center', gap: '0.9rem' }}>
        <div className="footnote">Felt Daily #{number}</div>
        <ProgressRing value={right / scores.length} size={116} stroke={11}>
          <span className="display num" style={{ fontSize: '2.2rem' }}>
            {right}/{scores.length}
          </span>
        </ProgressRing>
        <div className="daily-grid" aria-label="Your answers">
          {scores.map((s, i) => (
            <span key={i} className={s >= 1 ? 'good' : s > 0 ? 'mix' : 'bad'} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: '0.5rem' }}>
          <span className="pill num">
            Rating {Math.round(after)} {delta >= 0 ? `+${delta}` : delta}
          </span>
          {!!streak?.streak && (
            <span className="pill pill-tint">
              <FlameIcon size={12} /> {streak.streak} day streak
            </span>
          )}
        </div>
        <p className="footnote" style={{ margin: 0 }}>
          Everyone gets the same five decisions today. Next challenge in {timeToTomorrow()}.
        </p>
      </div>
      <BottomBar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link to="/" className="btn btn-lg glass">
            Done
          </Link>
          <button className="btn btn-primary btn-lg" onClick={() => void share()} data-haptic="off">
            {copied ? 'Copied' : 'Share result'}
          </button>
        </div>
      </BottomBar>
    </div>
  );
}

export function DailyPage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const number = challengeNumber(new Date());
  const items = useMemo(() => dailyItems(), []);
  const played = useLiveQuery(() => db.daily.get(number), [number], null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [before, setBefore] = useState<number>();
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    void ratingSnapshot().then((s) => setBefore(s.overall.rating));
  }, []);

  if (played === null || before === undefined) return null;
  if (played) return <Result number={number} scores={played.scores} before={played.ratingBefore} after={played.ratingAfter} />;

  if (!started) {
    return (
      <div className="stack focus-column">
        <div className="focus-top">
          <button className="icon-btn glass" aria-label="Close" onClick={() => navigate('/')}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="hero daily-hero reveal">
          <div className="hero-label">Felt Daily #{number}</div>
          <h1 className="display pro-title">Five decisions. Same for everyone.</h1>
          <p className="pro-sub">Three range decisions and two questions from the lessons. Rated, timed for the range decisions, and shareable when you finish.</p>
        </div>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setStarted(true)}>
            Start
          </button>
        </BottomBar>
      </div>
    );
  }

  const finish = async (all: number[]) => {
    const after = (await ratingSnapshot()).overall.rating;
    await db.daily.put({ number, at: new Date(), scores: all, ratingBefore: before, ratingAfter: after });
    haptic(all.every((s) => s >= 1) ? 'success' : 'heavy');
  };

  const advance = () => {
    setAnswered(false);
    window.scrollTo({ top: 0 });
    if (index + 1 >= items.length) void finish(scores);
    else setIndex(index + 1);
  };

  const item = items[index];
  const progress = (
    <div className="focus-top">
      <button className="icon-btn glass" aria-label="Close" onClick={() => navigate('/')}>
        <CloseIcon size={18} />
      </button>
      <div className="check-bar">
        <span style={{ width: `${(index / items.length) * 100}%` }} />
      </div>
      <span className="footnote num">
        {index + 1} of {items.length}
      </span>
    </div>
  );

  if (item.kind === 'chart') {
    const chart = getChart(item.chartId)!;
    return (
      <div className="stack focus-column">
        {progress}
        <QuickRecall
          key={index}
          chart={chart}
          hand={item.hand}
          targetMs={3000}
          onAnswer={(o: DrillOutcome) => {
            setScores((s) => [...s, o.accuracy]);
            void recordRated({
              itemId: `daily:${item.chartId}:${item.hand}`,
              domain: 'preflop',
              difficulty: chartItemDifficulty(isMixed(chart.mixes.get(item.hand) ?? { fold: 1 }), true),
              score: o.accuracy,
              source: 'daily',
            });
          }}
          onNext={() => {
            setScores((s) => {
              if (index + 1 >= items.length) void finish(s);
              return s;
            });
            if (index + 1 < items.length) {
              setIndex(index + 1);
              window.scrollTo({ top: 0 });
            }
          }}
        />
      </div>
    );
  }

  const entry = LESSON_ENTRIES.find((e) => e.key === item.key)!;
  const step = entry.content!.steps[item.step];
  return (
    <div className="stack focus-column">
      {progress}
      <div key={index} className="lesson-stage from-right">
        <div className="footnote" style={{ marginBottom: '0.4rem' }}>
          {entry.trackTitle}, {entry.title}
        </div>
        <StepView
          step={step}
          onAnswer={(choice) => {
            if (step.kind !== 'quiz') return;
            const right = choice === step.answer;
            setScores((s) => [...s, right ? 1 : 0]);
            setAnswered(true);
            void recordLessonQuiz(item.key, item.step, right, 'daily');
          }}
        />
      </div>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={!answered} onClick={advance}>
          {answered ? (index + 1 >= items.length ? 'See result' : 'Next') : 'Choose an answer'}
        </button>
      </BottomBar>
    </div>
  );
}
