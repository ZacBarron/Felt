import { STARTER_CHARTS } from '@felt/content';
import {
  boundaryHands,
  challengeNumber,
  chartItemDifficulty,
  type ChartSpot,
  comboText,
  dealCombo,
  DIFFICULTY,
  hashString,
  isProvisional,
  rotation,
  rotationAt,
  seededRandom,
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
import { ratingSnapshot } from '../state/rating';
import { addHandsToReview } from '../state/review';
import { BottomBar } from '../ui/BottomBar';
import { plural } from '../ui/format';
import { CheckIcon, ChevronRightIcon, CloseIcon, LearnIcon, MinusIcon, RangesIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';
import { ShareSheet } from '../components/ShareSheet';
import { StreakWeek, useStreakWeek } from '../components/StreakWeek';
import type { ShareKind } from '../state/share';
import { useSettings } from '../state/settings';
import { weeklyAvailable } from '../state/weekly';
import { WeeklyTodayCard } from './WeeklyPage';
import './today.css';
import './screens.css';

type ChartDecision = Extract<Decision, { kind: 'chart' }> & { difficulty: number };

/** Every rated edge hand of every hand written 9-handed chart, and every lesson quiz: the same pool for everyone. */
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
  const quizzes = LESSON_ENTRIES.flatMap((e) => quizSteps(e).map((step) => ({ kind: 'quiz' as const, key: e.key, step, track: e.trackId })));
  return { charts, quizzes };
}

/**
 * The spot type of the day's hardest range decision. It rotates, so the
 * daily challenge brings defense, 3bets, 4bets, squeezes and blind battles,
 * not just opens.
 */
export const DAILY_FACING: ChartSpot[][] = [['vs-open'], ['vs-3bet'], ['vs-open'], ['vs-4bet', 'vs-squeeze'], ['squeeze'], ['vs-3bet'], ['bvb']];

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The spot types the day's last range decision comes from. */
export const dailyFacing = (date: Date) => DAILY_FACING[mod(challengeNumber(date), DAILY_FACING.length)];

/**
 * Fixed rotations through the pool, the same for everyone. Each day takes the
 * next item of each rotation, so an exact decision comes back only after its
 * whole rotation has gone by (hundreds of days). Mixed hands rotate across
 * spot types, opening edges across seats, and each spot type of the last
 * decision across seats and hands.
 */
let rotations: ReturnType<typeof buildRotations> | undefined;
function buildRotations() {
  const { charts, quizzes } = dailyPool();
  const spec = (c: ChartDecision) => getChart(c.chartId)!.spec;
  const key = (c: ChartDecision) => `${c.chartId}:${c.hand}`;
  const facets = (c: ChartDecision) => [`seat:${spec(c).hero}`, `hand:${c.hand}`, `villain:${(spec(c).villains ?? []).join('/')}`];
  const mixed = rotation(
    charts.filter((c) => c.difficulty < DIFFICULTY.chartEdge),
    { salt: 'daily-mixed', group: (c) => spec(c).spot, key, facets },
  );
  const opens = rotation(
    charts.filter((c) => c.difficulty === DIFFICULTY.chartEdge && spec(c).spot === 'rfi'),
    { salt: 'daily-open', group: (c) => spec(c).hero, key, facets: (c) => [`hand:${c.hand}`] },
  );
  const hard = charts.filter((c) => c.difficulty >= DIFFICULTY.chartEdge && spec(c).spot !== 'rfi');
  const facing = new Map(
    DAILY_FACING.map((spots) => {
      const name = spots.join('+');
      const pool = hard.filter((c) => spots.includes(spec(c).spot));
      return [name, rotation(pool.length ? pool : hard, { salt: `daily-${name}`, group: (c) => `${spec(c).spot}|${spec(c).hero}`, key, facets })] as const;
    }),
  );
  const lessons = rotation(quizzes, { salt: 'daily-lessons', group: (q) => q.track, key: (q) => `${q.key}#${q.step}` });
  return { mixed, opens, facing, lessons };
}

/** How many days before day `n` used the same last spot type: the place in that spot type's rotation. */
function facingTurn(n: number): number {
  const p = mod(n, DAILY_FACING.length);
  const names = DAILY_FACING.map((s) => s.join('+'));
  const name = names[p];
  const perCycle = names.filter((x) => x === name).length;
  return Math.floor(n / DAILY_FACING.length) * perCycle + names.slice(0, p).filter((x) => x === name).length;
}

/** The same cards for everyone today: a seeded combo for each range decision. */
function dailyCards(n: number, i: number, hand: string): string {
  return comboText(dealCombo(hand, seededRandom(hashString(`daily|${n}|${i}|${hand}`))));
}

/**
 * Three range decisions that get harder (a mixed hand from any spot, an edge
 * of an opening range, then an edge when facing a raise, a 3bet, a 4bet, a
 * squeeze or the other blind), with two lesson questions between them.
 */
export function dailyItems(date = new Date()): Decision[] {
  rotations ??= buildRotations();
  const n = challengeNumber(date);
  const name = dailyFacing(date).join('+');
  const c = [rotationAt(rotations.mixed, n)!, rotationAt(rotations.opens, n)!, rotationAt(rotations.facing.get(name)!, facingTurn(n))!];
  const q = [rotationAt(rotations.lessons, 2 * n)!, rotationAt(rotations.lessons, 2 * n + 1)!];
  const chart = ({ chartId, hand }: ChartDecision, i: number): Decision => ({ kind: 'chart', chartId, hand, cards: dailyCards(n, i, hand) });
  const quiz = ({ key, step }: (typeof q)[number]): Decision => ({ kind: 'quiz', key, step });
  return [chart(c[0], 0), quiz(q[0]), chart(c[1], 1), quiz(q[1]), chart(c[2], 2)];
}

function timeToTomorrow(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${plural(h, 'hour')} ${plural(mins % 60, 'minute')}` : plural(mins % 60, 'minute');
}

interface Crowd {
  players: number;
  distribution: number[];
  items: number[];
  percentile?: number;
  signedOut: boolean;
}

/** How everyone did today, from the Aced server when there is one. Signed in results count once. */
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
  }, [number, right, scores.join(',')]);
  return crowd;
}

function describe(d: Decision) {
  if (d.kind === 'chart') return { title: d.hand, note: getChart(d.chartId)?.spec.title ?? '' };
  const entry = LESSON_ENTRIES.find((e) => e.key === d.key);
  return { title: entry?.title ?? 'Lesson question', note: entry?.trackTitle ?? '' };
}

const verdict = (s: number) => (s >= 1 ? 'Correct' : s > 0 ? 'Part of the mix' : 'Not quite');

function Result({ number, items, scores, before, after }: { number: number; items: Decision[]; scores: number[]; before: number; after: number }) {
  const [sharing, setSharing] = useState<ShareKind>();
  const [added, setAdded] = useState(false);
  const week = useStreakWeek();
  const { settings } = useSettings();
  const pro = weeklyAvailable(settings.access);
  const guest = !settings.profile.onboarded;
  const snapshot = useLiveQuery(() => ratingSnapshot(), []);
  const right = scores.filter((s) => s >= 1).length;
  const delta = Math.round(after - before);
  const crowd = useDailyCrowd(number, scores);
  const missedHands = items.flatMap((d, i) => (d.kind === 'chart' && scores[i] < 1 ? [{ chartId: d.chartId, hand: d.hand }] : []));
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
        {right === scores.length && <p className="hand-nickname daily-nuts">You had the nuts today.</p>}
        {crowd && crowd.players > 0 && (
          <p className="footnote num" style={{ margin: 0 }}>
            {crowd.players === 1 ? 'You are the first to finish today.' : `${crowd.players.toLocaleString()} players have played today.`}
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
            Aced Rating {Math.round(after)}, {delta === 0 ? 'no change' : delta > 0 ? `up ${delta}` : `down ${-delta}`}
            {provisional && <span className="sr-only">, still settling</span>}
          </span>
        </div>
      </div>

      {week && (
        <div className="card reveal">
          <StreakWeek data={week} onShare={() => setSharing('streak')} />
        </div>
      )}

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

      {/* What to do next, as daily puzzle apps offer more puzzles after the daily one. */}
      <section className="daily-next">
        <h2 className="section-title">Keep going</h2>
        <div className="list">
          <Link to="/practice" className="list-row">
            <span className="grow">
              <span className="daily-next-title">Practice at your level</span>
              <span className="footnote">10 decisions picked for your rating</span>
            </span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
          {!pro && (
            <Link to="/weekly" className="list-row">
              <span className="grow">
                <span className="daily-next-title">Weekly Pro challenge</span>
                <span className="footnote">10 harder decisions each week</span>
              </span>
              <span className="pill pill-pro">Pro</span>
              <ChevronRightIcon size={16} className="chev" />
            </Link>
          )}
        </div>
        {pro && (
          <div style={{ marginTop: '0.75rem' }}>
            <WeeklyTodayCard />
          </div>
        )}
      </section>

      <BottomBar>
        {guest ? (
          // A guest came straight from a share link or the website: the next step is their own plan.
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-lg glass" onClick={() => setSharing('daily')}>
              Share result
            </button>
            <Link to="/welcome" className="btn btn-primary btn-lg">
              Find your level
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link to="/" className="btn btn-lg glass">
              Done
            </Link>
            <button className="btn btn-primary btn-lg" onClick={() => setSharing('daily')}>
              Share result
            </button>
          </div>
        )}
      </BottomBar>

      <ShareSheet open={!!sharing} first={sharing ?? 'daily'} onClose={() => setSharing(undefined)} />
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
          <ol className="sc-steps" role="img" aria-label="Three range decisions that get harder, with two lesson questions between them">
            {items.map((d, i) => {
              const level = items.slice(0, i + 1).filter((x) => x.kind === 'chart').length;
              return (
                <li key={i} className={`sc-step ${d.kind === 'chart' ? 'range' : 'lesson'}`} aria-hidden="true">
                  <span className="sc-step-dot">{d.kind === 'chart' ? <RangesIcon size={22} /> : <LearnIcon size={22} />}</span>
                  {d.kind === 'chart' ? 'Range' : 'Lesson'}
                  <span className="sc-step-pips">{d.kind === 'chart' && [1, 2, 3].map((n) => <i key={n} className={n <= level ? 'on' : undefined} />)}</span>
                </li>
              );
            })}
          </ol>
          <p className="pro-sub" style={{ margin: 0 }}>
            Each answer counts toward your Aced Rating.
          </p>
        </div>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={begin}>
            {resumeAt ? `Resume at decision ${resumeAt + 1} of ${items.length}` : 'Start the challenge'}
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
