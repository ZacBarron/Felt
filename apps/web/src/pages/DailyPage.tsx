import { STARTER_CHARTS } from '@felt/content';
import {
  boundaryHands,
  challengeNumber,
  chartItemDifficulty,
  DIFFICULTY,
  dailyPicks,
  shareGrid,
  isProvisional,
  type SkillRating,
  tierLabel,
} from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chartChoices, type Decision, DecisionItem } from '../drills/DecisionItem';
import { haptic } from '../haptics';
import { getChart } from '../state/charts';
import { db } from '../state/db';
import { api, currentSession, serverFeatures } from '../state/api';
import { track } from '../state/events';
import { LESSON_ENTRIES, lessonPath, quizSteps } from '../state/lessons';
import { ratingSnapshot, streakNow } from '../state/rating';
import { addHandsToReview } from '../state/review';
import { BottomBar } from '../ui/BottomBar';
import { plural, signed } from '../ui/format';
import { CheckIcon, ChevronRightIcon, CloseIcon, FlameIcon, MinusIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';

type ChartDecision = Extract<Decision, { kind: 'chart' }> & { difficulty: number };

/** Every rated edge hand of every 9-handed chart, and every lesson quiz: the same pool for everyone. */
function dailyPool() {
  // Equilibrium charts only, and only hands where some answer is wrong.
  const charts: ChartDecision[] = STARTER_CHARTS.filter((s) => s.tableSize === 9 && s.basis === 'gto').flatMap((spec) => {
    const chart = getChart(spec.id);
    if (!chart) return [];
    return boundaryHands(chart).flatMap((hand) => {
      const difficulty = chartItemDifficulty(chart.mixes.get(hand) ?? { fold: 1 }, chartChoices(chart));
      return difficulty === undefined ? [] : [{ kind: 'chart' as const, chartId: spec.id, hand, difficulty }];
    });
  });
  const quizzes: Decision[] = LESSON_ENTRIES.flatMap((e) => quizSteps(e).map((step) => ({ kind: 'quiz' as const, key: e.key, step })));
  return { charts, quizzes };
}

/**
 * Three range decisions that get harder (a mixed hand, an edge of an opening
 * range, then an edge when facing a raise or 3bet), with two lesson
 * questions between them.
 */
export function dailyItems(date = new Date()): Decision[] {
  const { charts, quizzes } = dailyPool();
  const spotOf = (c: ChartDecision) => getChart(c.chartId)?.spec.spot;
  const bands = [
    charts.filter((c) => c.difficulty < DIFFICULTY.chartEdge),
    charts.filter((c) => c.difficulty === DIFFICULTY.chartEdge && spotOf(c) === 'rfi'),
    charts.filter((c) => c.difficulty >= DIFFICULTY.chartEdge && spotOf(c) !== 'rfi'),
  ];
  const c = bands.map((band, i) => dailyPicks(band.length ? band : charts, date, 1, 10 + i)[0]);
  const q = dailyPicks(quizzes, date, 2, 2);
  const strip = ({ kind, chartId, hand }: ChartDecision): Decision => ({ kind, chartId, hand });
  return [strip(c[0]), q[0], strip(c[1]), q[1], strip(c[2])];
}

function timeToTomorrow(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60_000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function shareText(number: number, scores: number[], rating: SkillRating) {
  const right = scores.filter((s) => s >= 1).length;
  const shown = `${isProvisional(rating) ? '~' : ''}${Math.round(rating.rating)}`;
  return `Felt Daily #${number} · ${right}/${scores.length}\n${shareGrid(scores)}\nFelt Rating ${shown} (${tierLabel(rating)})`;
}

interface Crowd {
  players: number;
  distribution: number[];
  items: number[];
  percentile?: number;
  signedOut: boolean;
}

/** How everyone did today, from the Felt server when there is one. Signed in results count once. */
function useDailyCrowd(number: number, scores: number[]): Crowd | undefined {
  const [crowd, setCrowd] = useState<Crowd>();
  const right = scores.filter((s) => s >= 1).length;
  useEffect(() => {
    let live = true;
    void (async () => {
      const features = await serverFeatures();
      if (!features?.accounts) return;
      try {
        const signedIn = !!currentSession();
        const padded = [...scores, 0, 0, 0, 0, 0].slice(0, 5);
        const stats = signedIn
          ? await api<Omit<Crowd, 'signedOut'>>(`/daily/${number}`, { body: { scores: padded } })
          : await api<Omit<Crowd, 'signedOut'>>(`/daily/${number}?right=${right}`);
        if (live) setCrowd({ ...stats, signedOut: !signedIn });
      } catch {
        // Offline: the result stands on its own.
      }
    })();
    return () => {
      live = false;
    };
  }, [number, right, scores.join(",")]);
  return crowd;
}

function describe(d: Decision) {
  if (d.kind === 'chart') return { title: d.hand, note: getChart(d.chartId)?.spec.title ?? '' };
  const entry = LESSON_ENTRIES.find((e) => e.key === d.key);
  return { title: entry?.title ?? 'Lesson question', note: entry?.trackTitle ?? '' };
}

const verdict = (s: number) => (s >= 1 ? 'Right' : s > 0 ? 'Partly right' : 'Missed');

function Result({ number, items, scores, before, after }: { number: number; items: Decision[]; scores: number[]; before: number; after: number }) {
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const streak = useLiveQuery(() => streakNow(), []);
  const snapshot = useLiveQuery(() => ratingSnapshot(), []);
  const right = scores.filter((s) => s >= 1).length;
  const delta = Math.round(after - before);
  const crowd = useDailyCrowd(number, scores);
  const missedHands = items.flatMap((d, i) => (d.kind === 'chart' && scores[i] < 1 ? [{ chartId: d.chartId, hand: d.hand }] : []));
  const share = async () => {
    const text = shareText(number, scores, (await ratingSnapshot()).overall);
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
  const addMissed = async () => {
    await addHandsToReview(missedHands);
    setAdded(true);
    haptic('success');
  };
  const provisional = snapshot ? isProvisional(snapshot.overall) : true;
  return (
    <div className="stack focus-column lesson-done">
      <div className="card stack reveal daily-result" style={{ alignItems: 'center', textAlign: 'center', gap: '0.9rem' }}>
        <div className="footnote">Daily challenge #{number}</div>
        <ProgressRing value={right / scores.length} size={116} stroke={11} label={`${right} of ${scores.length} right`}>
          <span className="display num" style={{ fontSize: '2.2rem' }} aria-hidden="true">
            {right}/{scores.length}
          </span>
        </ProgressRing>
        <div className="daily-grid" role="img" aria-label={scores.map((s, i) => `${i + 1}: ${verdict(s).toLowerCase()}`).join(', ')}>
          {scores.map((s, i) => (
            <span key={i} className={s >= 1 ? 'good' : s > 0 ? 'mix' : 'bad'} style={{ animationDelay: `${i * 90}ms` }}>
              {s >= 1 ? <CheckIcon size={16} /> : s > 0 ? <MinusIcon size={16} /> : <CloseIcon size={16} />}
            </span>
          ))}
        </div>
        {crowd && crowd.players > 0 && (
          <p className="footnote num" style={{ margin: 0 }}>
            {crowd.players === 1 ? 'You are the first to finish today.' : `${crowd.players.toLocaleString()} players today.`}
            {crowd.percentile !== undefined && crowd.players > 1 && ` You did better than ${Math.round(crowd.percentile * 100)}% of them.`}
            {crowd.signedOut && (
              <>
                {' '}
                <Link to="/account?next=/daily">Sign in to add your result.</Link>
              </>
            )}
          </p>
        )}
        <div className="row" style={{ justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="pill num">
            Rating {provisional ? '~' : ''}
            {Math.round(after)} ({signed(delta, 0)})
          </span>
          {!!streak?.streak && (
            <span className="pill pill-tint">
              <FlameIcon size={12} /> {plural(streak.streak, 'day')}
            </span>
          )}
        </div>
      </div>

      <section>
        <h2 className="section-title">Your decisions</h2>
        <div className="list">
          {items.map((d, i) => {
            const { title, note } = describe(d);
            const s = scores[i] ?? 0;
            const row = (
              <>
                <span className="grow">
                  <span style={{ display: 'block', fontWeight: 600 }}>{title}</span>
                  <span className="footnote">
                    {note}
                    {crowd && crowd.players > 1 && `. ${Math.round((crowd.items[i] ?? 0) * 100)}% of players got it right`}
                  </span>
                </span>
                <span className={`pill ${s >= 1 ? 'pill-good' : s > 0 ? 'pill-warn' : 'pill-bad'}`}>{verdict(s)}</span>
              </>
            );
            return d.kind === 'quiz' && s < 1 ? (
              <Link key={i} to={lessonPath(d.key)} className="list-row">
                {row}
                <ChevronRightIcon size={14} className="chev" />
              </Link>
            ) : (
              <div key={i} className="list-row">
                {row}
              </div>
            );
          })}
        </div>
        {missedHands.length > 0 && (
          <button className="btn btn-tinted btn-block" style={{ marginTop: '0.75rem' }} disabled={added} onClick={() => void addMissed()} data-haptic="off">
            {added ? 'Added to your review' : `Add ${missedHands.length === 1 ? 'the missed hand' : `${missedHands.length} missed hands`} to your review`}
          </button>
        )}
        <div className="section-footer">Everyone gets the same five decisions today. The next challenge is in {timeToTomorrow()}.</div>
      </section>

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
  const [index, setIndex] = useState<number>();
  const scores = useRef<number[]>([]);
  const [before, setBefore] = useState<number>();

  useEffect(() => {
    void ratingSnapshot().then((s) => setBefore(s.overall.rating));
  }, []);

  if (played === null || before === undefined) return null;
  // Older saves have no `finished` flag and were only written at the end.
  if (played && played.finished !== false)
    return <Result number={number} items={items} scores={played.scores} before={played.ratingBefore} after={played.ratingAfter} />;

  const resumeAt = played?.scores.length ?? 0;
  const startBefore = played?.ratingBefore ?? before;

  /** Saves after every answer, so leaving halfway keeps your place. */
  const save = async (finished: boolean) => {
    const after = (await ratingSnapshot()).overall.rating;
    await db.daily.put({ number, at: new Date(), scores: [...scores.current], finished, ratingBefore: startBefore, ratingAfter: after });
  };

  if (!started) {
    const begin = () => {
      scores.current = [...(played?.scores ?? [])];
      setIndex(resumeAt);
      setStarted(true);
      if (!resumeAt) track('daily_started', { number });
    };
    return (
      <div className="stack focus-column">
        <div className="focus-top">
          <button className="icon-btn glass" aria-label="Close" onClick={() => navigate('/')}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="hero daily-hero reveal">
          <div className="hero-label">Daily challenge #{number}</div>
          <h1 className="display pro-title">Five decisions. Same for everyone.</h1>
          <p className="pro-sub">
            Three range decisions that get harder, and two questions from the lessons. Every answer counts toward your Felt Rating.
          </p>
        </div>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={begin}>
            {resumeAt ? `Resume, ${resumeAt} of ${items.length} done` : 'Start'}
          </button>
        </BottomBar>
      </div>
    );
  }

  const at = index ?? 0;
  const item = items[at];
  const last = at + 1 >= items.length;

  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Close. Your place is saved." onClick={() => navigate('/')}>
          <CloseIcon size={18} />
        </button>
        <div className="check-bar" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={at} aria-label="Challenge progress">
          <span style={{ width: `${(at / items.length) * 100}%` }} />
        </div>
        <span className="footnote num">
          {at + 1} of {items.length}
        </span>
      </div>
      <DecisionItem
        key={at}
        decision={item}
        source="daily"
        last={last}
        onScore={(score) => {
          scores.current[at] = score;
          void save(false);
        }}
        onNext={async () => {
          window.scrollTo({ top: 0 });
          if (!last) {
            setIndex(at + 1);
            return;
          }
          await save(true);
          const all = scores.current;
          track('daily_finished', { number, right: all.filter((x) => x >= 1).length });
          haptic(all.every((x) => x >= 1) ? 'success' : 'heavy');
        }}
      />
    </div>
  );
}
