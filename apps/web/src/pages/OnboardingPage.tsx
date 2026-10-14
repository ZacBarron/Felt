import { FIRST_HAND_NEW, LESSON_CONTENT, STARTER_CHARTS, TESTIMONIALS } from '@felt/content';
import { parseCard, PRESETS, TIERS } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { canOpenLesson, isPro } from '../state/access';
import { plural } from '../ui/format';
import type { StoredLesson } from '../state/db';
import { track } from '../state/events';
import { CUES, cueCopy, DAILY_OPTIONS, EXPERIENCE, EXPERIENCE_REPLY, FOCUS, GOALS, goalsLine, pathPrefs, TARGETS } from '../state/goals';
import { isComplete, LESSON_ENTRIES, lessonProgress, recommendedLessons } from '../state/lessons';
import { studyReminder } from '../state/reminders';
import { type Focus, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern, TAGLINE, Wordmark } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { BellIcon, CheckIcon, ChevronLeftIcon, ClockIcon, LockIcon, ReviewIcon, SolverIcon, StatsIcon, TargetIcon } from '../ui/icons';
import { PlayingCard } from '../components/PlayingCard';
import { QuickRecall } from '../drills/QuickRecall';
import { StepView } from '../lesson/StepView';
import { serverFeatures } from '../state/api';
import { firstHandSpot } from '../state/charts';
import { useBodyClass } from '../ui/useBodyClass';
import { onRadioKeys } from '../ui/radioKeys';
import { requestPersistentStorage } from '../state/backup';

/**
 * First run. Short, personal and honest: every question changes the plan,
 * each answer gets a reply, and the player plays a real hand before being
 * asked for any commitment (value before the ask; an early success builds
 * belief that the skill can be learned, Bandura 1977). Placement finds where
 * to start, and the plan ends with a pledge the player makes on purpose.
 * Proof is real: counts come from the content, research is cited, and
 * testimonials appear only once real players have given them.
 */

type Step = 'intro' | 'level' | 'target' | 'goal' | 'game' | 'focus' | 'try' | 'why' | 'daily' | 'when' | 'place' | 'plan';
const STEPS: Step[] = ['intro', 'level', 'target', 'goal', 'game', 'focus', 'try', 'why', 'daily', 'when', 'place', 'plan'];
/** Steps that only make sense for someone who already plays. */
const PLAYER_ONLY: Step[] = ['focus', 'place'];

const QUIZ_COUNT = [...LESSON_CONTENT.values()].reduce((n, l) => n + l.steps.filter((s) => s.kind === 'quiz').length, 0);
const PROOF = [
  { value: LESSON_CONTENT.size, label: 'lessons' },
  { value: QUIZ_COUNT, label: 'questions' },
  { value: STARTER_CHARTS.length, label: 'range charts' },
];

const tierMin = (name: string) => TIERS.find((t) => t.name === name)?.min ?? 0;

const GAMES = [
  { id: 'live-1-3', label: 'Live cash, 1/2 or 1/3', note: '9-handed, deep and loose' },
  { id: 'live-2-5', label: 'Live cash, 2/5 and up', note: '9-handed, deeper stacks' },
  { id: 'online-6max', label: 'Online cash', note: '6-max, 100bb' },
  { id: 'mtt-9max', label: 'Tournaments', note: 'Live or online' },
] as const;

const shortDate = (days: number) => new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const dayLabel = (i: number) =>
  i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(Date.now() + i * 86_400_000).toLocaleDateString(undefined, { weekday: 'short' });

/** Packs upcoming lessons into days of study, at least one lesson a day. */
function firstWeek<T extends { content?: { minutes: number } }>(lessons: readonly T[], daily: number, days = 3): T[][] {
  const out: T[][] = [];
  let i = 0;
  for (let d = 0; d < days && i < lessons.length; d++) {
    const day: T[] = [lessons[i++]];
    let used = day[0].content?.minutes ?? 5;
    while (i < lessons.length && used + (lessons[i].content?.minutes ?? 5) <= daily) {
      used += lessons[i].content?.minutes ?? 5;
      day.push(lessons[i++]);
    }
    out.push(day);
  }
  return out;
}

function Choice({ selected, label, note, onClick, multi }: { selected: boolean; label: string; note?: string; onClick: () => void; multi?: boolean }) {
  return (
    <button className={`onb-choice${selected ? ' selected' : ''}`} role={multi ? 'checkbox' : 'radio'} aria-checked={selected} data-haptic="select" onClick={onClick}>
      <span className="grow">
        <span className="onb-choice-label">{label}</span>
        {note && <span className="footnote">{note}</span>}
      </span>
      <span className={`onb-check${multi ? ' square' : ''}`} aria-hidden="true">
        {selected && <CheckIcon size={14} />}
      </span>
    </button>
  );
}

/**
 * Press and hold to start: a small, deliberate act that makes the plan the
 * player's own. A tap from VoiceOver, Switch Control or a keyboard starts it
 * directly, and a plain button below offers the same without holding.
 */
function HoldToStart({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number>();
  const frame = useRef<number>();
  const done = useRef(false);
  const HOLD_MS = 1100;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    haptic('success');
    onDone();
  };
  const tick = (t: number) => {
    if (start.current === undefined) start.current = t;
    const p = Math.min(1, (t - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) return finish();
    frame.current = requestAnimationFrame(tick);
  };
  const begin = () => {
    if (done.current) return;
    haptic('tap');
    start.current = undefined;
    frame.current = requestAnimationFrame(tick);
  };
  const cancel = () => {
    if (done.current) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    setProgress(0);
  };
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  return (
    <>
      <button
        className="btn btn-primary btn-lg btn-block hold-btn"
        data-haptic="off"
        aria-label="Start my plan"
        aria-describedby="hold-hint"
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        // Assistive technology and keyboards send a click with no pointer press: start right away.
        onClick={(e) => {
          if (e.detail === 0) finish();
        }}
      >
        <span className="hold-fill" style={{ transform: `scaleX(${progress})` }} />
        <span style={{ position: 'relative' }}>{progress > 0 ? 'Keep holding' : 'Hold to start my plan'}</span>
      </button>
      <span id="hold-hint" className="sr-only">
        Press and hold, or use the button below.
      </span>
      <button className="btn btn-plain btn-block hold-alt" onClick={finish}>
        Start without holding
      </button>
    </>
  );
}

/**
 * The rating ladder as one track: every tier a step, filled up to `to`.
 * On the welcome screen it climbs from Newcomer to Elite once.
 */
function LadderTrack({ to = 'Elite', start, climb }: { to?: string; start?: string; climb?: boolean }) {
  const end = TIERS.findIndex((t) => t.name === to);
  return (
    <div className={`ladder-track${climb ? ' climb' : ''}`} role="img" aria-label={`The Felt ladder, from ${start ?? TIERS[0].name} to ${to}`}>
      <div className="ladder-steps" aria-hidden="true">
        {TIERS.map((t, i) => (
          <span key={t.name} className={`ladder-step${i <= end ? ' on' : ''}${i === end ? ' goal' : ''}`} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="ladder-ends" aria-hidden="true">
        <span>{start ?? TIERS[0].name}</span>
        <span className="ladder-goal">{to}</span>
      </div>
    </div>
  );
}

/** Pick a target tier on a vertical ladder, the top tier first. */
function TargetLadder({ value, onChange }: { value?: string; onChange: (tier: string) => void }) {
  const rungs = [...TARGETS].reverse();
  const picked = rungs.findIndex((r) => r.tier === value);
  return (
    <div className="target-ladder" role="radiogroup" aria-labelledby="onb-title" onKeyDown={onRadioKeys}>
      {rungs.map((r, i) => {
        const selected = r.tier === value;
        const below = picked >= 0 && i > picked;
        return (
          <button
            key={r.tier}
            className={`target-rung${selected ? ' selected' : ''}${below ? ' below' : ''}`}
            role="radio"
            aria-checked={selected}
            data-haptic="select"
            onClick={() => onChange(r.tier)}
          >
            <span className="target-dot" aria-hidden="true">
              {selected && <TargetIcon size={14} />}
            </span>
            <span className="grow">
              <span className="target-name">{r.tier}</span>
              <span className="footnote">{r.note}</span>
            </span>
            <span className="target-min num">{tierMin(r.tier)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Real quotes only. Nothing renders until there are some. */
function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;
  return (
    <div className="onb-quotes" role="list">
      {TESTIMONIALS.map((t) => (
        <figure key={t.name + t.quote} className="onb-quote" role="listitem">
          <blockquote>{t.quote}</blockquote>
          <figcaption>
            {t.name}
            {t.detail && <span className="footnote"> · {t.detail}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Welcome({ heading, onStart }: { heading: React.RefObject<HTMLHeadingElement>; onStart: () => void }) {
  const navigate = useNavigate();
  const [server, setServer] = useState(false);
  useEffect(() => {
    void serverFeatures().then((f) => setServer(!!f));
  }, []);
  return (
    <div className="onb-intro">
      <div className="onb-intro-felt">
        <HeroPattern />
        <div className="onb-intro-mark">
          <BrandMark size={64} animate />
        </div>
        <div className="reveal" style={{ animationDelay: '900ms' }}>
          <Wordmark height={34} color="#fff" />
        </div>
        <p className="onb-tagline reveal" style={{ animationDelay: '1050ms' }}>
          {TAGLINE}
        </p>
        <div className="onb-hand" aria-hidden="true">
          <PlayingCard card={parseCard('As')} size="lg" flip delayMs={1150} />
          <PlayingCard card={parseCard('Ah')} size="lg" flip delayMs={1240} />
        </div>
      </div>
      <div className="onb-intro-copy stack">
        <h1 ref={heading} tabIndex={-1} className="display onb-title reveal" style={{ animationDelay: '1250ms' }}>
          From your first hand to Elite.
        </h1>
        <p className="muted reveal onb-lead" style={{ animationDelay: '1350ms' }}>
          Short daily lessons. Real answers with their sources. A rating that shows your climb.
        </p>
        <div className="reveal" style={{ animationDelay: '1450ms' }}>
          <LadderTrack climb />
        </div>
        <ul className="onb-proof reveal" style={{ animationDelay: '1550ms' }}>
          {PROOF.map((p) => (
            <li key={p.label}>
              <span className="onb-proof-num num">{p.value}</span>
              <span className="onb-proof-label">{p.label}</span>
            </li>
          ))}
        </ul>
        <Testimonials />
      </div>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={onStart}>
          Get started
        </button>
        {server && (
          <button className="btn btn-plain btn-block" onClick={() => navigate('/account')}>
            I have an account
          </button>
        )}
      </BottomBar>
    </div>
  );
}

const WHY = [
  { Icon: SolverIcon, title: 'Answers you can check', body: 'Every chart and spot names its source. Rough data says so.' },
  {
    Icon: ReviewIcon,
    title: 'Practice that sticks',
    body: 'Felt makes you recall, not reread. People who practiced recall kept 61% a week later. Rereading kept 40%.',
    cite: 'Roediger and Karpicke 2006',
  },
  { Icon: StatsIcon, title: 'Progress you can measure', body: 'Your Felt Rating moves only on real answers. It uses the math chess sites use.', cite: 'Elo 1978, Glickman 1999' },
];

/** Hard hands for someone new are a lesson, not a test: the first one is winnable. */
function FirstHand({ beginner, game, onDone }: { beginner: boolean; game: Parameters<typeof firstHandSpot>[0]; onDone: () => void }) {
  const [answered, setAnswered] = useState(false);
  const spot = beginner ? undefined : firstHandSpot(game);
  if (spot) {
    return <QuickRecall chart={spot.chart} hand={spot.hand} targetMs={6000} untimed nextLabel="Continue" onAnswer={() => setAnswered(true)} onNext={onDone} />;
  }
  return (
    <>
      <StepView step={FIRST_HAND_NEW} onAnswer={() => setAnswered(true)} />
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={!answered} onClick={onDone}>
          {answered ? 'Continue' : 'Pick a hand'}
        </button>
      </BottomBar>
    </>
  );
}

/** The moment the plan is set: a short celebration of a choice the player made. */
function PlanSet({ target, onContinue }: { target?: string; onContinue: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = setTimeout(() => button.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="moment" role="dialog" aria-modal="true" aria-labelledby="moment-title">
      <div className="moment-rays" aria-hidden="true" />
      <div className="moment-body">
        <BrandMark size={92} animate />
        <div className="moment-kicker">Day 1</div>
        <h1 id="moment-title" className="display moment-title">
          Your plan is set
        </h1>
        <p className="moment-sub">{target ? `Your first lesson is ready. ${target} is where it leads.` : 'Your first lesson is ready.'}</p>
      </div>
      <button ref={button} className="btn btn-lg btn-block btn-hero moment-cta" data-haptic="off" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}

export function OnboardingPage() {
  useBodyClass('focus-mode');
  useBodyClass('onboarding');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { settings, update } = useSettings();
  const profile = settings.profile;
  const [step, setStep] = useState<Step>(() => (params.get('step') as Step) ?? 'intro');
  const [building, setBuilding] = useState(step === 'plan');
  const progress = useLiveQuery(lessonProgress, [], new Map<string, StoredLesson>());
  const [game, setGame] = useState<string>(
    () => GAMES.find((g) => PRESETS[g.id].settings.venue === settings.game.venue && PRESETS[g.id].settings.format === settings.game.format)?.id ?? 'live-1-3',
  );
  const heading = useRef<HTMLHeadingElement>(null);

  const setProfile = (patch: Partial<Profile>) => update({ ...settings, profile: { ...profile, ...patch } });
  const flow = STEPS.filter((s) => !(profile.experience === 'new' && PLAYER_ONLY.includes(s)));
  const index = flow.indexOf(step);
  const go = (next: Step) => {
    window.scrollTo({ top: 0 });
    setStep(next);
    track('onboarding_step_viewed', { step: next, index: flow.indexOf(next) });
    if (next === 'plan') setBuilding(true);
  };
  const forward = () => go(flow[index + 1]);
  const back = () => index > 0 && go(flow[index - 1]);
  const [committed, setCommitted] = useState(false);

  // Move focus to each new question so screen readers read it.
  useEffect(() => {
    heading.current?.focus();
  }, [step, building]);

  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => setBuilding(false), 1700);
    return () => clearTimeout(t);
  }, [building]);

  const commit = () => {
    update({ ...settings, profile: { ...profile, onboarded: true, committedAt: new Date().toISOString() } });
    track('plan_committed', { goals: profile.goals.join(','), game, daily: profile.dailyMinutes, cue: profile.cue, focus: profile.focus.length });
    // The plan is worth keeping: ask the browser not to clear Felt's data.
    void requestPersistentStorage();
    setCommitted(true);
  };
  const leave = () => navigate(isPro(settings.access) ? '/' : '/pro?from=onboarding', { replace: true });

  const top = step !== 'intro' && (
    <div className="focus-top">
      <button className="icon-btn glass" aria-label="Back" onClick={back}>
        <ChevronLeftIcon size={18} />
      </button>
      <div
        className="check-bar"
        role="progressbar"
        aria-label="Setup"
        aria-valuemin={0}
        aria-valuemax={flow.length - 1}
        aria-valuenow={index}
        aria-valuetext={`Step ${index} of ${flow.length - 1}`}
      >
        <span style={{ width: `${(index / (flow.length - 1)) * 100}%` }} />
      </div>
    </div>
  );

  if (step === 'intro') {
    return (
      <Welcome
        heading={heading}
        onStart={() => {
          track('onboarding_started');
          go('level');
        }}
      />
    );
  }

  if (committed) {
    return <PlanSet target={profile.target} onContinue={leave} />;
  }

  if (step === 'plan') {
    const goalLine = goalsLine(profile.goals);
    const access = settings.access;
    const daily = Math.max(5, profile.dailyMinutes);
    const tested = LESSON_ENTRIES.filter((e) => progress.get(e.key)?.status === 'tested').length;
    const upcoming = recommendedLessons(progress, pathPrefs(profile));
    const week = firstWeek(upcoming, daily);
    const cue = cueCopy(profile.cue);
    // A near milestone, not a finish line: the first topic in the plan.
    const first = upcoming[0];
    const topicLeft = first
      ? LESSON_ENTRIES.filter((e) => e.content && e.key.startsWith(`${first.key.split('/').slice(0, 2).join('/')}/`) && !isComplete(progress.get(e.key)))
      : [];
    const topicDays = Math.max(1, Math.ceil(topicLeft.reduce((m, e) => m + e.content!.minutes, 0) / daily));
    if (building) {
      return (
        <div className="stack focus-column onb-building" aria-live="polite">
          <div className="onb-spinner">
            <BrandMark size={64} animate />
          </div>
          <h1 ref={heading} tabIndex={-1} className="display onb-title">
            Building your plan
          </h1>
          <div className="list">
            {[
              'Ordering lessons by your goals',
              tested > 0 || profile.placedAt ? 'Applying your placement quiz' : 'Matching examples to your game',
              'Setting your daily time',
              ...(profile.target ? [`Mapping your climb to ${profile.target}`] : []),
            ].map((t, i) => (
              <div key={t} className="list-row reveal" style={{ animationDelay: `${i * 380}ms` }}>
                <CheckIcon size={16} style={{ color: 'var(--green-text)' }} />
                <span className="grow">{t}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="stack focus-column">
        {top}
        <div className="lesson-stage from-right stack" style={{ gap: '1.25rem' }}>
          <section className="hero plan-hero">
            <HeroPattern />
            <div className="hero-label">Your plan</div>
            <h1 ref={heading} tabIndex={-1} className="display plan-hero-title">
              {goalLine ?? 'Get better at poker'}
            </h1>
            <p className="plan-hero-pledge">
              {cue ? `When I ${cue.phrase}, I will study for ${profile.dailyMinutes} minutes.` : `I will study for ${profile.dailyMinutes} minutes a day.`}
            </p>
            <div className="plan-hero-chips">
              <span className="plan-chip">
                <ClockIcon size={14} /> {profile.dailyMinutes} min a day
              </span>
              {tested > 0 && (
                <span className="plan-chip">
                  <CheckIcon size={14} /> {plural(tested, 'lesson')} passed
                </span>
              )}
            </div>
          </section>

          {profile.target && (
            <section>
              <h2 className="section-title">Your climb</h2>
              <div className="card plan-climb">
                <LadderTrack to={profile.target} start="Today" climb />
                <p className="footnote" style={{ margin: 0 }}>
                  Your Felt Rating settles after your first answers. {profile.target} starts at {tierMin(profile.target)}.
                </p>
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title">Your first week</h2>
            <ol className="list plan-week">
              {week.map((day, i) => (
                <li key={i} className="list-row reveal" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="plan-day">{dayLabel(i)}</span>
                  <span className="grow stack" style={{ gap: '0.35rem' }}>
                    {i === 0 && (
                      <span className="plan-lesson plan-done">
                        <CheckIcon size={14} /> Set up your plan
                      </span>
                    )}
                    {day.map((e) => (
                      <span key={e.key} className="plan-lesson">
                        <span style={{ display: 'block', fontWeight: 600 }}>{e.title}</span>
                        <span className="footnote">
                          {e.moduleTitle}, {e.content!.minutes} min
                          {!canOpenLesson(e.key, access) && (
                            <span className="pill pro-pill">
                              <LockIcon size={10} /> Felt Pro
                            </span>
                          )}
                        </span>
                      </span>
                    ))}
                    {i > 0 && <span className="footnote">Plus your review</span>}
                  </span>
                </li>
              ))}
            </ol>
            {first && (
              <div className="section-footer">
                Finish {first.moduleTitle} by {shortDate(topicDays)}. Review brings back what you learn so it sticks.
              </div>
            )}
          </section>

          <button
            className="list-row card plan-reminder"
            onClick={() => {
              studyReminder(profile.cue, profile.dailyMinutes);
              track('reminder_added', { kind: 'study', cue: profile.cue });
            }}
          >
            <BellIcon size={20} style={{ color: 'var(--tint)' }} />
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 600 }}>Add a daily reminder</span>
              <span className="footnote">{cue ? `${cue.label}, in your calendar` : 'In your calendar'}</span>
            </span>
          </button>
        </div>
        <BottomBar>
          <HoldToStart onDone={commit} />
        </BottomBar>
      </div>
    );
  }

  const screens: Record<Exclude<Step, 'intro' | 'plan' | 'try'>, { title: string; sub?: string; body: JSX.Element; ready: boolean }> = {
    goal: {
      title: 'What do you want from poker?',
      sub: 'Pick as many as you like. Your goals decide which lessons come first.',
      ready: profile.goals.length > 0,
      body: (
        <div className="onb-choices" role="group" aria-labelledby="onb-title">
          {GOALS.map((g) => (
            <Choice
              key={g.id}
              multi
              selected={profile.goals.includes(g.id)}
              label={g.label}
              note={g.note}
              onClick={() =>
                setProfile({ goals: profile.goals.includes(g.id) ? profile.goals.filter((x) => x !== g.id) : [...profile.goals, g.id] })
              }
            />
          ))}
        </div>
      ),
    },
    game: {
      title: 'Where do you play most?',
      sub: 'Your charts and examples will match this game. You can change it any time.',
      ready: true,
      body: (
        <div className="onb-choices" role="radiogroup" onKeyDown={onRadioKeys} aria-labelledby="onb-title">
          {GAMES.map((g) => (
            <Choice key={g.id} selected={game === g.id} label={g.label} note={g.note} onClick={() => setGame(g.id)} />
          ))}
        </div>
      ),
    },
    focus: {
      title: 'What costs you the most money?',
      sub: 'Pick as many as you like. They come first in your plan.',
      ready: true,
      body: (
        <div className="onb-choices" role="group" aria-labelledby="onb-title">
          {FOCUS.map((f) => {
            const on = profile.focus.includes(f.id);
            return (
              <Choice
                key={f.id}
                multi
                selected={on}
                label={f.label}
                onClick={() => setProfile({ focus: on ? profile.focus.filter((x) => x !== f.id) : [...profile.focus, f.id as Focus] })}
              />
            );
          })}
        </div>
      ),
    },
    daily: {
      title: 'How long each day?',
      sub: 'Small and daily beats long and rare. You can change it later.',
      ready: true,
      body: (
        <div className="onb-choices" role="radiogroup" onKeyDown={onRadioKeys} aria-labelledby="onb-title">
          {DAILY_OPTIONS.map((d) => {
            return (
              <Choice
                key={d.minutes}
                selected={profile.dailyMinutes === d.minutes}
                label={`${d.minutes} min a day`}
                note={d.note}
                onClick={() => setProfile({ dailyMinutes: d.minutes })}
              />
            );
          })}
        </div>
      ),
    },
    when: {
      title: 'When will you study?',
      sub: 'Tying practice to something you already do every day makes it stick.',
      ready: !!profile.cue,
      body: (
        <div className="onb-choices" role="radiogroup" onKeyDown={onRadioKeys} aria-labelledby="onb-title">
          {CUES.map((c) => (
            <Choice key={c.id} selected={profile.cue === c.id} label={c.label} onClick={() => setProfile({ cue: c.id })} />
          ))}
        </div>
      ),
    },
    level: {
      title: 'How well do you know poker?',
      sub: 'Felt starts you at the right lesson.',
      ready: !!profile.experience,
      body: (
        <>
          <div className="onb-choices" role="radiogroup" onKeyDown={onRadioKeys} aria-labelledby="onb-title">
            {EXPERIENCE.map((x) => (
              <Choice key={x.id} selected={profile.experience === x.id} label={x.label} note={x.note} onClick={() => setProfile({ experience: x.id })} />
            ))}
          </div>
          {profile.experience && (
            <p key={profile.experience} className="onb-reply reveal" role="status">
              {EXPERIENCE_REPLY[profile.experience]}
            </p>
          )}
        </>
      ),
    },
    target: {
      title: 'How far do you want to go?',
      sub: 'The Felt ladder runs from Newcomer to Elite. Aim high. You can change it later.',
      ready: !!profile.target,
      body: (
        <>
          <TargetLadder value={profile.target} onChange={(tier) => setProfile({ target: tier })} />
          {profile.target && (
            <p key={profile.target} className="onb-reply reveal" role="status">
              {profile.target} starts at a Felt Rating of {tierMin(profile.target)}. Each tier is 150 points.
            </p>
          )}
        </>
      ),
    },
    why: {
      title: 'Built to make you better',
      sub: 'That hand is how every Felt answer works.',
      ready: true,
      body: (
        <div className="list onb-why">
          {WHY.map(({ Icon, title, body, cite }, i) => (
            <div key={title} className="list-row reveal" style={{ animationDelay: `${120 + i * 120}ms` }}>
              <span className="onb-why-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="grow">
                <span className="onb-why-title">{title}</span>
                <span className="footnote">{body}</span>
                {cite && <span className="onb-cite">{cite}</span>}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    place: {
      title: 'Find where you start',
      sub: 'A short quiz skips what you already know.',
      ready: true,
      body: (
        <ol className="list onb-steps">
          {['One question per topic', 'Pass a topic and its lessons count as done', 'Miss one and your plan starts there'].map((t, i) => (
            <li key={t} className="list-row reveal" style={{ animationDelay: `${i * 100}ms` }}>
              <span className="onb-num num">{i + 1}</span>
              <span className="grow">{t}</span>
            </li>
          ))}
        </ol>
      ),
    },
  };

  if (step === 'try') {
    const beginner = profile.experience === 'new';
    return (
      <div className="stack focus-column">
        {top}
        <div className="lesson-stage from-right stack" style={{ gap: '1rem' }}>
          <div>
            <h1 id="onb-title" ref={heading} tabIndex={-1} className="display onb-title">
              Try one hand
            </h1>
            <p className="muted" style={{ margin: '0.4rem 0 0' }}>
              {beginner ? 'No experience needed. Go with your gut.' : 'A real spot from your game. Make your call.'}
            </p>
          </div>
          <FirstHand
            beginner={beginner}
            game={settings.game}
            onDone={() => {
              track('onboarding_step_answered', { step, value: beginner ? 'basics' : 'chart' });
              forward();
            }}
          />
        </div>
      </div>
    );
  }

  const screen = screens[step];
  const advance = () => {
    if (step === 'game') update({ ...settings, game: PRESETS[game].settings });
    track('onboarding_step_answered', {
      step,
      value: step === 'goal' ? profile.goals.join(',') : step === 'game' ? game : step === 'daily' ? profile.dailyMinutes : step === 'when' ? profile.cue : step === 'level' ? profile.experience : step === 'target' ? profile.target : profile.focus.length,
    });
    forward();
  };
  return (
    <div className="stack focus-column">
      {top}
      <div key={step} className="lesson-stage from-right stack" style={{ gap: '1rem' }}>
        <div>
          <h1 id="onb-title" ref={heading} tabIndex={-1} className="display onb-title">
            {screen.title}
          </h1>
          {screen.sub && <p className="muted" style={{ margin: '0.4rem 0 0' }}>{screen.sub}</p>}
        </div>
        {screen.body}
      </div>
      <BottomBar>
        {step === 'place' ? (
          <>
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={() => {
                track('placement_started', { from: 'onboarding', experience: profile.experience });
                navigate('/placement?from=onboarding');
              }}
            >
              Take the quiz
            </button>
            <button className="btn btn-plain btn-block" onClick={() => go('plan')}>
              Start from the basics
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-lg btn-block" disabled={!screen.ready} onClick={advance}>
            {step === 'focus' && profile.focus.length === 0 ? 'Skip' : 'Continue'}
          </button>
        )}
      </BottomBar>
    </div>
  );
}
