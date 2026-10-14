import { SCENARIOS } from '@felt/content';
import { DIFFICULTY, handClassOf, isoWeek, isProvisional, parseCards, shareGrid, type SkillRating, tierLabel, weeklySummary, weekRange } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { actionColor } from '../components/actionColors';
import { PlayingCard } from '../components/PlayingCard';
import { DecisionItem } from '../drills/DecisionItem';
import { MathCard } from '../drills/QuestionCard';
import { haptic } from '../haptics';
import { track } from '../state/events';
import { lessonPath } from '../state/lessons';
import { ratingSnapshot, recordRated } from '../state/rating';
import { gradeChoice, type RiverResult, solveRiver } from '../state/scenarioSolve';
import { useSettings } from '../state/settings';
import {
  addWeeklyMissesToReview,
  describeWeekly,
  finishedWeeks,
  getWeekly,
  KIND_LABELS,
  saveWeekly,
  WEEKLY_SLOTS,
  weeklyAccuracy,
  weeklyAvailable,
  type WeeklyDecision,
  weeklyKind,
  type WeeklyKind,
  weeklyMisses,
  weeklySet,
  weeklyVerdict,
} from '../state/weekly';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronRightIcon, CloseIcon, type IconComponent, LearnIcon, MedalIcon, MinusIcon, PercentIcon, RangesIcon, ScenariosIcon, TargetIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { Section } from '../ui/Section';
import { useBodyClass } from '../ui/useBodyClass';
import { actionText, Board, GRADE_TEXT, lineText, RiverResultView } from './ScenariosPage';
import './screens.css';
import './weekly.css';

const KIND_ICONS: Record<WeeklyKind, IconComponent> = {
  math: PercentIcon,
  mixed: RangesIcon,
  edge: TargetIcon,
  river: ScenariosIcon,
  lesson: LearnIcon,
};

/** What each spot type asks, one short sentence each. */
const KIND_COVERS: Record<WeeklyKind, (n: number) => string> = {
  math: (n) => `${n} math ${n === 1 ? 'question' : 'questions'}. The answer is exact.`,
  mixed: (n) => `${n} mixed ${n === 1 ? 'hand' : 'hands'}. Pick the mix, not just one action.`,
  edge: (n) => `${n} close ${n === 1 ? 'call' : 'calls'} facing a raise or a 3bet.`,
  river: (n) => `${n} river ${n === 1 ? 'decision' : 'decisions'}. Felt Solver grades them on your device.`,
  lesson: (n) => `${n} ${n === 1 ? 'question' : 'questions'} from advanced lessons.`,
};

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const pct = (x: number) => `${Math.round(x * 100)}%`;

// River solves -------------------------------------------------------------

/** One solve per scenario per visit, started early so it is ready when the river comes. */
const riverSolves = new Map<string, Promise<RiverResult>>();

function solveFor(scenarioId: string): Promise<RiverResult> | undefined {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return undefined;
  let solve = riverSolves.get(scenarioId);
  if (!solve) {
    solve = solveRiver(scenario.river, scenario.hero.cards);
    // A failed solve can be tried again on the next visit.
    solve.catch(() => riverSolves.delete(scenarioId));
    riverSolves.set(scenarioId, solve);
  }
  return solve;
}

function prefetchRivers(items: readonly WeeklyDecision[]) {
  for (const d of items) if (d.kind === 'river') void solveFor(d.scenarioId)?.catch(() => undefined);
}

/** A scenario's river on its own: the hand so far, then the decision, graded by EV loss from Felt Solver. */
function RiverDecision({ scenarioId, last, onScore, onNext }: { scenarioId: string; last: boolean; onScore: (s: number) => void; onNext: () => void }) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const [river, setRiver] = useState<RiverResult>();
  const [error, setError] = useState<string>();
  const [choice, setChoice] = useState<number>();
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => top.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    let live = true;
    solveFor(scenarioId)
      ?.then((r) => live && setRiver(r))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Felt Solver could not finish this spot.'));
    return () => {
      live = false;
    };
  }, [scenarioId]);

  if (!scenario) return null;
  const cards = scenario.hero.cards;
  const heroClass = handClassOf(...(parseCards(cards) as [number, number]));
  const heroSide = scenario.river.hero === 0 ? 'out of position' : 'in position';
  const graded = river && choice !== undefined ? gradeChoice(river.hand, choice) : undefined;

  const choose = (i: number) => {
    if (!river || choice !== undefined) return;
    setChoice(i);
    const g = gradeChoice(river.hand, i);
    // The same credit as Scenarios: actions the solver plays often count in full.
    const score = g.grade === 'best' || g.grade === 'good' ? 1 : g.grade === 'inaccuracy' ? 0.5 : 0;
    haptic(score === 1 ? 'success' : score > 0 ? 'warning' : 'error');
    void recordRated({ itemId: `scenario:${scenario.id}`, domain: 'postflop', difficulty: DIFFICULTY.scenarioRiver, score, source: 'weekly' });
    onScore(score);
  };

  return (
    <div className="stack">
      <div ref={top} tabIndex={-1} className="card stack focus-anchor" style={{ gap: '0.8rem' }}>
        <div className="row between">
          <div>
            <div className="footnote">{scenario.title}</div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
              {scenario.hero.seat}{' '}
              <span className="muted" style={{ fontWeight: 500, fontSize: '1rem' }}>
                vs {scenario.villain.seat}, 9-handed, 100bb
              </span>
            </div>
          </div>
          <span className="footnote num">Pot {scenario.river.pot}bb</span>
        </div>
        <ol className="wk-story">
          <li>{scenario.preflop.narrative}</li>
          {scenario.streets.map((s) => (
            <li key={s.street}>
              <span className="wk-street">{s.street === 'flop' ? 'Flop' : 'Turn'}</span> {s.narrative}
            </li>
          ))}
        </ol>
        <Board cards={scenario.river.board} />
        <div className="row wk-hole" style={{ justifyContent: 'center', gap: 8 }} aria-label={`Your hand: ${heroClass}`}>
          {(cards.match(/.{2}/g) ?? []).map((c, i) => (
            <PlayingCard key={c} card={parseCards(c)[0]} size="md" flip delayMs={i * 90} />
          ))}
        </div>
        <p style={{ margin: 0 }}>
          You are {heroSide} with <strong className="num">{heroClass}</strong>. {scenario.river.stack}bb are behind.{' '}
          {scenario.river.line.length === 0
            ? 'You act first.'
            : scenario.river.line.map((id, i) => lineText(id, (i % 2 === 0) === (scenario.river.hero === 1) ? scenario.villain.seat : 'You')).join(' ')}{' '}
          What do you do?
        </p>
        {graded && river && <RiverResultView hand={river.hand} chosen={choice!} graded={graded} explain={scenario.river.explain} exploitability={river.exploitability} />}
        {error && (
          <div className="explain bad" role="alert">
            {error}
          </div>
        )}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {graded ? GRADE_TEXT[graded.grade] : ''}
      </div>
      <BottomBar>
        {error ? (
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => {
              // A solve that fails on this device is not the player's miss: it scores nothing and moves on.
              onScore(0);
              onNext();
            }}
          >
            Skip this decision
          </button>
        ) : !river ? (
          <button className="btn btn-lg btn-block" disabled>
            Felt Solver is solving the river…
          </button>
        ) : choice === undefined ? (
          <div className="stack" style={{ gap: 8 }}>
            {river.hand.actions.map((a, i) => (
              <button
                key={a.id}
                className="btn btn-lg btn-block btn-action"
                data-haptic="off"
                style={{ '--c': actionColor(a.id) } as React.CSSProperties}
                onClick={() => choose(i)}
              >
                {actionText(a.id, a.label)}
              </button>
            ))}
          </div>
        ) : (
          <button className="btn btn-primary btn-lg btn-block swap-in" onClick={onNext} autoFocus>
            {last ? 'See my results' : 'Next decision'}
          </button>
        )}
      </BottomBar>
    </div>
  );
}

/** One weekly decision, rendered by the same pieces the rest of Felt uses and recorded toward the Felt Rating. */
function WeeklyItem({ decision, last, onScore, onNext }: { decision: WeeklyDecision; last: boolean; onScore: (s: number) => void; onNext: () => void }) {
  if (decision.kind === 'chart' || decision.kind === 'quiz')
    return <DecisionItem decision={decision} source="weekly" last={last} mixAnswers onScore={onScore} onNext={onNext} />;
  if (decision.kind === 'river') return <RiverDecision scenarioId={decision.scenarioId} last={last} onScore={onScore} onNext={onNext} />;
  return (
    <MathCard
      factId={decision.factId}
      targetMs={8000}
      nextLabel={last ? 'See my results' : 'Next decision'}
      onAnswer={(o) => {
        onScore(o.accuracy);
        void recordRated({ itemId: decision.factId, domain: 'math', difficulty: DIFFICULTY.mathFact, score: o.accuracy, source: 'weekly' });
      }}
      onNext={onNext}
    />
  );
}

// Screens -------------------------------------------------------------------

function Covers() {
  return (
    <div className="list with-icons">
      {WEEKLY_SLOTS.map(({ kind, count }) => {
        const Icon = KIND_ICONS[kind];
        return (
          <div key={kind} className="list-row">
            <span className="icon-tile" style={{ background: 'var(--base-500)' }}>
              <Icon size={19} strokeWidth={2} />
            </span>
            <span className="grow">{KIND_COVERS[kind](count)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProEvent() {
  return (
    <span className="wk-pro">
      <MedalIcon size={13} strokeWidth={2.2} /> Pro event
    </span>
  );
}

/** The week's decisions as small tiles, easiest first. */
function Ladder({ items }: { items: readonly WeeklyDecision[] }) {
  return (
    <ol className="wk-ladder" role="img" aria-label={`${items.length} decisions that get harder as you go`}>
      {items.map((d, i) => {
        // Mixed hands and close calls look alike here, so the ladder does not give away which is which.
        const kind = weeklyKind(d);
        const range = kind === 'mixed' || kind === 'edge';
        const Icon = range ? RangesIcon : KIND_ICONS[kind];
        return (
          <li key={i} className={`wk-rung wk-${range ? 'range' : kind}`} style={{ animationDelay: `${i * 45}ms` }} aria-hidden="true">
            <Icon size={18} />
          </li>
        );
      })}
    </ol>
  );
}

function Intro({ week, items, resumeAt, onStart }: { week: ReturnType<typeof isoWeek>; items: readonly WeeklyDecision[]; resumeAt: number; onStart: () => void }) {
  const navigate = useNavigate();
  const { start, end } = weekRange(new Date());
  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Close" onClick={() => navigate('/')}>
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="hero daily-hero reveal">
        <div className="row between">
          <div className="hero-label">Week {week.week}</div>
          <ProEvent />
        </div>
        <h1 className="display pro-title">Ten harder decisions. Same for every Pro player.</h1>
        <Ladder items={items} />
        <p className="pro-sub" style={{ margin: 0 }}>
          The set runs {fmtDay(start)} to {fmtDay(end)}. It gets harder as you go.
        </p>
      </div>
      <Section title="What it covers" footer="Each answer counts toward your Felt Rating. You get one attempt each week. Your place is saved if you leave.">
        <Covers />
      </Section>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={onStart}>
          {resumeAt ? `Resume at decision ${resumeAt + 1} of ${items.length}` : 'Start the challenge'}
        </button>
      </BottomBar>
    </div>
  );
}

/** For players without Felt Pro: what the event is, and one way to unlock it. */
function Locked({ week }: { week: ReturnType<typeof isoWeek> }) {
  const navigate = useNavigate();
  useEffect(() => track('weekly_locked_viewed', { week: week.id }), [week.id]);
  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Close" onClick={() => navigate('/')}>
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="hero daily-hero reveal">
        <div className="row between">
          <div className="hero-label">Weekly Pro challenge</div>
          <ProEvent />
        </div>
        <h1 className="display pro-title">A harder set every week.</h1>
        <p className="pro-sub" style={{ margin: 0 }}>
          Every Pro player gets the same 10 decisions each week. They come from the hardest spots Felt can grade.
        </p>
      </div>
      <Section title="What it covers" footer="You compare with your own earlier weeks. There is no leaderboard.">
        <Covers />
      </Section>
      <BottomBar>
        <Link to="/pro?from=weekly" className="btn btn-primary btn-lg btn-block">
          See Felt Pro
        </Link>
      </BottomBar>
    </div>
  );
}

function shareText(week: ReturnType<typeof isoWeek>, scores: number[], rating: SkillRating) {
  const right = scores.filter((s) => s >= 1).length;
  const tier = isProvisional(rating) ? 'still settling' : tierLabel(rating);
  return `Felt Weekly ${week.id}: ${right} of ${scores.length}\n${shareGrid(scores)}\nFelt Rating ${Math.round(rating.rating)}, ${tier}`;
}

function Result({ week, items, scores, before, after }: { week: ReturnType<typeof isoWeek>; items: WeeklyDecision[]; scores: number[]; before: number; after: number }) {
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const earlier = useLiveQuery(async () => (await finishedWeeks()).filter((w) => w.id !== week.id), [week.id]);
  const summary = weeklySummary(scores, earlier?.map((w) => weeklyAccuracy(w.scores)) ?? []);
  const delta = Math.round(after - before);
  const misses = weeklyMisses(items, scores);

  const share = async () => {
    const text = `${shareText(week, scores, (await ratingSnapshot()).overall)}\n${location.origin}${import.meta.env.BASE_URL}weekly`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
      haptic('success');
    } catch {
      // The share sheet was dismissed.
    }
  };
  const addMissed = async () => {
    await addWeeklyMissesToReview(items, scores);
    setAdded(true);
    haptic('success');
  };

  return (
    <div className="stack focus-column lesson-done">
      <div className="card stack reveal daily-result" style={{ alignItems: 'center', textAlign: 'center', gap: '0.9rem' }}>
        <div className="row" style={{ gap: '0.5rem', justifyContent: 'center' }}>
          <span className="footnote">Weekly Pro challenge, week {week.week}</span>
          <ProEvent />
        </div>
        <ProgressRing value={summary.right / Math.max(1, summary.total)} size={116} stroke={11} label={`${summary.right} of ${summary.total} right`}>
          <span className="display num" style={{ fontSize: '2.2rem' }} aria-hidden="true">
            {summary.right}/{summary.total}
          </span>
        </ProgressRing>
        <div className="daily-grid wk-grid" role="img" aria-label={scores.map((s, i) => `${i + 1}: ${weeklyVerdict(s).toLowerCase()}`).join(', ')}>
          {scores.map((s, i) => (
            <span key={i} className={s >= 1 ? 'good' : s > 0 ? 'mix' : 'bad'} style={{ animationDelay: `${i * 70}ms` }}>
              {s >= 1 ? <CheckIcon size={14} /> : s > 0 ? <MinusIcon size={14} /> : <CloseIcon size={14} />}
            </span>
          ))}
        </div>
        <p className="footnote num" style={{ margin: 0 }}>
          Accuracy {pct(summary.accuracy)}. Close answers count half.
          {summary.personalBest && ' That is your best week.'}
        </p>
        <span className="pill num">
          Felt Rating {Math.round(after)}, {delta === 0 ? 'no change' : delta > 0 ? `up ${delta}` : `down ${-delta}`}
        </span>
      </div>

      {!summary.first && summary.previousBest !== undefined && summary.previousAverage !== undefined && (
        <section aria-labelledby="wk-compare">
          <h2 id="wk-compare" className="section-title">
            Against your earlier weeks
          </h2>
          <div className="card wk-compare">
            <CompareBar label="This week" value={summary.accuracy} strong />
            <CompareBar label="Your best before" value={summary.previousBest} />
            <CompareBar label={`Your average, ${earlier!.length} ${earlier!.length === 1 ? 'week' : 'weeks'}`} value={summary.previousAverage} />
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Your decisions</h2>
        <div className="list">
          {items.map((d, i) => {
            const { title, note } = describeWeekly(d);
            const s = scores[i] ?? 0;
            const row = (
              <>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="wk-row-title">{title}</span>
                  <span className="footnote">
                    {KIND_LABELS[weeklyKind(d)]}
                    {note && `. ${note}`}
                  </span>
                </span>
                <span className={`pill ${s >= 1 ? 'pill-good' : s > 0 ? 'pill-warn' : 'pill-bad'}`}>{weeklyVerdict(s)}</span>
              </>
            );
            const to = d.kind === 'quiz' && s < 1 ? lessonPath(d.key) : d.kind === 'river' ? `/scenarios/${d.scenarioId}` : undefined;
            return to ? (
              <Link key={i} to={to} className="list-row" aria-label={`${title}. ${weeklyVerdict(s)}. ${d.kind === 'river' ? 'Play the whole hand' : 'Open the lesson'}`}>
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
        {misses.count > 0 && (
          <button className="btn btn-tinted btn-block" style={{ marginTop: '0.75rem' }} disabled={added} onClick={() => void addMissed()} data-haptic="off">
            {added ? 'Added to your review' : misses.count === 1 ? 'Add the miss to your review' : `Add ${misses.count} misses to your review`}
          </button>
        )}
        <div className="section-footer">Every Pro player gets the same 10 decisions this week. A new set arrives on Monday.</div>
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

function CompareBar({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`wk-bar${strong ? ' strong' : ''}`}>
      <div className="row between">
        <span>{label}</span>
        <span className="num">{pct(value)}</span>
      </div>
      <span className="wk-bar-track" aria-hidden="true">
        <span style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
    </div>
  );
}

export function WeeklyPage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const { settings } = useSettings();
  const week = useMemo(() => isoWeek(new Date()), []);
  const fresh = useMemo(() => weeklySet().items.map((i) => i.decision), []);
  const stored = useLiveQuery(() => getWeekly(week.id), [week.id], null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const scores = useRef<number[]>([]);
  const [before, setBefore] = useState<number>();

  useEffect(() => {
    void ratingSnapshot().then((s) => setBefore(s.overall.rating));
  }, []);

  useEffect(() => {
    document.title = 'Weekly Pro challenge · Felt';
  }, []);

  if (stored === null || before === undefined) return null;
  // A finished week stays visible, even if Felt Pro has lapsed since.
  if (stored?.finished) return <Result week={week} items={stored.items} scores={stored.scores} before={stored.ratingBefore} after={stored.ratingAfter} />;
  if (!weeklyAvailable(settings.access)) return <Locked week={week} />;

  // A run in progress keeps the set it was dealt.
  const items = stored?.items ?? fresh;
  const resumeAt = stored?.scores.length ?? 0;
  const startBefore = stored?.ratingBefore ?? before;

  /** Saves after every answer, so leaving halfway keeps your place and the week cannot be replayed. */
  const save = async (finished: boolean) => {
    const after = (await ratingSnapshot()).overall.rating;
    await saveWeekly({ id: week.id, number: week.number, at: new Date(), items, scores: [...scores.current], finished, ratingBefore: startBefore, ratingAfter: after });
  };

  if (!started)
    return (
      <Intro
        week={week}
        items={items}
        resumeAt={resumeAt}
        onStart={() => {
          scores.current = [...(stored?.scores ?? [])];
          setIndex(resumeAt);
          setStarted(true);
          prefetchRivers(items.slice(resumeAt));
          if (!resumeAt) {
            void save(false);
            track('weekly_started', { week: week.id });
          }
        }}
      />
    );

  const item = items[index];
  const last = index + 1 >= items.length;
  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Close. Your place is saved." onClick={() => navigate('/')}>
          <CloseIcon size={18} />
        </button>
        <div className="check-bar" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={index} aria-label="Challenge progress">
          <span style={{ width: `${(index / items.length) * 100}%` }} />
        </div>
        <span className="footnote num">
          {index + 1} of {items.length}
        </span>
      </div>
      {/* Range decisions are not labelled mixed or pure while you answer: that would give the answer away. */}
      {item.kind !== 'math' && <div className="wk-kind footnote">{item.kind === 'chart' ? 'Range decision' : KIND_LABELS[weeklyKind(item)]}</div>}
      <WeeklyItem
        key={index}
        decision={item}
        last={last}
        onScore={(score) => {
          scores.current[index] = score;
          void save(false);
        }}
        onNext={async () => {
          window.scrollTo({ top: 0 });
          if (!last) {
            setIndex(index + 1);
            return;
          }
          await save(true);
          const all = scores.current;
          track('weekly_finished', { week: week.id, right: all.filter((x) => x >= 1).length, accuracy: Math.round(weeklyAccuracy(all) * 100) });
          haptic(all.every((x) => x >= 1) ? 'success' : 'heavy');
        }}
      />
    </div>
  );
}

// Entry points ----------------------------------------------------------------

/** This week's record, for the entry points. */
function useThisWeek() {
  return useLiveQuery(() => getWeekly(isoWeek(new Date()).id), [], null);
}

/** A compact card on Today for Pro players: start the week's set, or see how it went. Free players see nothing. */
export function WeeklyTodayCard() {
  const { settings } = useSettings();
  const record = useThisWeek();
  if (record === null || !weeklyAvailable(settings.access)) return null;
  const done = !!record?.finished;
  const right = record?.scores.filter((s) => s >= 1).length ?? 0;
  const detail = done ? `${right} of ${record!.scores.length} right, ${pct(weeklyAccuracy(record!.scores))}` : record ? `${record.scores.length} of ${record.items.length} done` : '10 harder decisions';
  return (
    <Link to="/weekly" className={`card wk-today reveal${done ? ' done' : ''}`}>
      <span className="wk-today-icon" aria-hidden="true">
        {done ? <CheckIcon size={20} /> : <MedalIcon size={22} />}
      </span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="wk-today-kicker">Pro event</span>
        <span className="wk-today-title">{done ? 'Weekly Pro challenge done' : 'Weekly Pro challenge'}</span>
        <span className="footnote num">{detail}</span>
      </span>
      <ChevronRightIcon size={16} className="chev" />
    </Link>
  );
}

/** A row in More. Everyone can open it to see what the event is. */
export function WeeklyMoreRow() {
  const { settings } = useSettings();
  const record = useThisWeek();
  const pro = weeklyAvailable(settings.access);
  const detail = !pro ? 'Pro' : record?.finished ? `${record.scores.filter((s) => s >= 1).length} of ${record.scores.length}` : record ? 'In progress' : 'New this week';
  return (
    <div className="list with-icons" style={{ marginTop: '0.75rem' }}>
      <Link to="/weekly" className="list-row">
        <span className="icon-tile" style={{ background: 'var(--base-500)' }}>
          <MedalIcon size={19} strokeWidth={2} />
        </span>
        <span className="grow">
          <span style={{ display: 'block' }}>Weekly Pro challenge</span>
          <span className="footnote" style={{ display: 'block' }}>
            Pro event
          </span>
        </span>
        <span className="detail num">{detail}</span>
        <ChevronRightIcon size={16} className="chev" />
      </Link>
    </div>
  );
}
