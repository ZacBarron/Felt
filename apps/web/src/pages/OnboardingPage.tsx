import { PRESETS } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { canOpenLesson, isPro } from '../state/access';
import type { StoredLesson } from '../state/db';
import { track } from '../state/events';
import { CUES, cueCopy, DAILY_OPTIONS, FOCUS, GOALS, goalCopy, pathPrefs } from '../state/goals';
import { isComplete, LESSON_ENTRIES, lessonProgress, recommendedLessons } from '../state/lessons';
import { studyReminder } from '../state/reminders';
import { type Focus, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern, TAGLINE, Wordmark } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { BellIcon, CheckIcon, ChevronLeftIcon, ClockIcon, LockIcon, SkipIcon, TargetIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';

/**
 * First run. Short, personal and honest: every question changes the plan,
 * placement finds where to start so nobody repeats what they know, and the
 * plan ends with a pledge the player makes on purpose.
 */

type Step = 'intro' | 'goal' | 'game' | 'focus' | 'daily' | 'when' | 'level' | 'plan';
const STEPS: Step[] = ['intro', 'goal', 'game', 'focus', 'daily', 'when', 'level', 'plan'];

const GAMES = [
  { id: 'live-1-3', label: 'Live cash, 1/2 or 1/3', note: '9-handed, deep and loose' },
  { id: 'live-2-5', label: 'Live cash, 2/5 and up', note: '9-handed, deeper stacks' },
  { id: 'online-6max', label: 'Online cash', note: '6-max, 100bb' },
  { id: 'mtt-9max', label: 'Tournaments', note: 'Live or online' },
] as const;

/** Minutes left to finish the lessons a player can open (or all of them). */
function remainingMinutes(progress: Map<string, StoredLesson>, canOpen: (key: string) => boolean = () => true) {
  return LESSON_ENTRIES.filter((e) => e.content && canOpen(e.key) && !isComplete(progress.get(e.key))).reduce((m, e) => m + e.content!.minutes, 0);
}

const shortDate = (days: number) => new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

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
  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    window.scrollTo({ top: 0 });
    setStep(next);
    track('onboarding_step_viewed', { step: next, index: STEPS.indexOf(next) });
    if (next === 'plan') setBuilding(true);
  };
  const forward = () => go(STEPS[index + 1]);
  const back = () => index > 0 && go(STEPS[index - 1]);

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
    track('plan_committed', { goal: profile.goal, game, daily: profile.dailyMinutes, cue: profile.cue, focus: profile.focus.length });
    setTimeout(() => navigate(isPro(settings.access) ? '/' : '/pro?from=onboarding', { replace: true }), 450);
  };

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
        aria-valuemax={STEPS.length - 1}
        aria-valuenow={index}
        aria-valuetext={`Step ${index} of ${STEPS.length - 1}`}
      >
        <span style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }} />
      </div>
    </div>
  );

  if (step === 'intro') {
    return (
      <div className="onb-intro">
        <div className="onb-intro-felt">
          <HeroPattern />
          <div className="onb-intro-mark reveal">
            <BrandMark size={84} />
          </div>
          <div className="reveal" style={{ animationDelay: '120ms' }}>
            <Wordmark height={40} color="#fff" />
          </div>
          <p className="onb-tagline reveal" style={{ animationDelay: '200ms' }}>
            {TAGLINE}
          </p>
        </div>
        <div className="onb-intro-copy">
          <h1 ref={heading} tabIndex={-1} className="display onb-title reveal" style={{ animationDelay: '260ms' }}>
            Make better decisions at the table.
          </h1>
          <p className="muted reveal" style={{ animationDelay: '320ms' }}>
            Exact math, solver based patterns and player tendencies, each labelled for how sure it is. A few minutes a day.
          </p>
        </div>
        <BottomBar>
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => {
              track('onboarding_started');
              go('goal');
            }}
          >
            Get started
          </button>
        </BottomBar>
      </div>
    );
  }

  if (step === 'plan') {
    const goal = goalCopy(profile.goal);
    const access = settings.access;
    const pro = isPro(access);
    const freeMinutes = remainingMinutes(progress, (k) => canOpenLesson(k, access));
    const allMinutes = remainingMinutes(progress);
    const daily = Math.max(1, profile.dailyMinutes);
    const freeDays = Math.ceil(freeMinutes / daily);
    const allDays = Math.ceil(allMinutes / daily);
    const tested = LESSON_ENTRIES.filter((e) => progress.get(e.key)?.status === 'tested').length;
    const firstUp = recommendedLessons(progress, pathPrefs(profile));
    const cue = cueCopy(profile.cue);
    if (building) {
      return (
        <div className="stack focus-column onb-building" aria-live="polite">
          <div className="onb-spinner">
            <BrandMark size={64} />
          </div>
          <h1 ref={heading} tabIndex={-1} className="display onb-title">
            Building your plan
          </h1>
          <div className="list">
            {['Ordering lessons by your goal and focus', 'Applying your placement', 'Setting your daily study time'].map((t, i) => (
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
        <div className="lesson-stage from-right stack" style={{ gap: '1.1rem' }}>
          <div>
            <div className="footnote">Your plan</div>
            <h1 ref={heading} tabIndex={-1} className="display onb-title">
              {goal ? `To ${goal.plan}` : 'Your path'}
            </h1>
          </div>
          <div className="plan-stats">
            <div className="plan-stat">
              <TargetIcon size={20} style={{ color: 'var(--tint)' }} />
              <div className="num plan-stat-value">{profile.dailyMinutes} min</div>
              <div className="footnote">each day</div>
            </div>
            <div className="plan-stat">
              <SkipIcon size={20} style={{ color: 'var(--tint)' }} />
              <div className="num plan-stat-value">{tested}</div>
              <div className="footnote">tested out</div>
            </div>
            <div className="plan-stat">
              <ClockIcon size={20} style={{ color: 'var(--tint)' }} />
              <div className="num plan-stat-value">{shortDate(pro ? allDays : freeDays)}</div>
              <div className="footnote">{pro ? 'every lesson done' : 'free lessons done'}</div>
            </div>
          </div>
          <section>
            <h2 className="section-title">First up</h2>
            <div className="list">
              {firstUp.slice(0, 3).map((e, i) => {
                const locked = !canOpenLesson(e.key, access);
                return (
                  <div key={e.key} className="list-row reveal" style={{ animationDelay: `${i * 70}ms` }}>
                    <span className="onb-num num">{i + 1}</span>
                    <span className="grow">
                      <span style={{ display: 'block', fontWeight: 600 }}>{e.title}</span>
                      <span className="footnote">
                        {e.moduleTitle}, {e.content!.minutes} min{locked ? ', Felt Pro' : ''}
                      </span>
                    </span>
                    {locked && <LockIcon size={16} className="muted" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
            <div className="section-footer">
              {pro
                ? `At ${profile.dailyMinutes} minutes a day, every lesson is done by ${shortDate(allDays)}.`
                : `At ${profile.dailyMinutes} minutes a day, the free lessons are done by ${shortDate(freeDays)}; every lesson, with Felt Pro, by ${shortDate(allDays)}.`}{' '}
              Review keeps what you learn.
            </div>
          </section>
          <p className="onb-pledge">{cue ? `When I ${cue.phrase}, I will study ${profile.dailyMinutes} minutes.` : `I will study ${profile.dailyMinutes} minutes a day.`}</p>
          <button
            className="btn btn-tinted"
            onClick={() => {
              studyReminder(profile.cue, profile.dailyMinutes);
              track('reminder_added', { kind: 'study', cue: profile.cue });
            }}
          >
            <BellIcon size={18} /> Add a daily reminder to my calendar
          </button>
        </div>
        <BottomBar>
          <HoldToStart onDone={commit} />
        </BottomBar>
      </div>
    );
  }

  const screens: Record<Exclude<Step, 'intro' | 'plan'>, { title: string; sub?: string; body: JSX.Element; ready: boolean }> = {
    goal: {
      title: 'What do you want from poker?',
      sub: 'Your goal decides which lessons come first.',
      ready: !!profile.goal,
      body: (
        <div className="onb-choices" role="radiogroup" aria-labelledby="onb-title">
          {GOALS.map((g) => (
            <Choice key={g.id} selected={profile.goal === g.id} label={g.label} note={g.note} onClick={() => setProfile({ goal: g.id })} />
          ))}
        </div>
      ),
    },
    game: {
      title: 'Where do you play most?',
      sub: 'Charts, stakes and examples follow your game. You can change it any time.',
      ready: true,
      body: (
        <div className="onb-choices" role="radiogroup" aria-labelledby="onb-title">
          {GAMES.map((g) => (
            <Choice key={g.id} selected={game === g.id} label={g.label} note={g.note} onClick={() => setGame(g.id)} />
          ))}
        </div>
      ),
    },
    focus: {
      title: 'What costs you the most money?',
      sub: 'Pick any. These come first in your plan.',
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
        <div className="onb-choices" role="radiogroup" aria-labelledby="onb-title">
          {DAILY_OPTIONS.map((d) => {
            const weeks = Math.ceil(remainingMinutes(progress) / d.minutes / 7);
            return (
              <Choice
                key={d.minutes}
                selected={profile.dailyMinutes === d.minutes}
                label={`${d.minutes} min a day`}
                note={`Every lesson in about ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`}
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
        <div className="onb-choices" role="radiogroup" aria-labelledby="onb-title">
          {CUES.map((c) => (
            <Choice key={c.id} selected={profile.cue === c.id} label={c.label} onClick={() => setProfile({ cue: c.id })} />
          ))}
        </div>
      ),
    },
    level: {
      title: 'Find where to start',
      sub: 'A short test. Lessons you prove you know are marked tested out; miss a question and that lesson stays in your plan.',
      ready: true,
      body: (
        <ul className="onb-facts">
          <li>One question from each of up to three lessons per topic</li>
          <li>About 5 minutes, and it stops once questions get hard</li>
          <li>You can retake it any time from Settings</li>
        </ul>
      ),
    },
  };

  const screen = screens[step];
  const advance = () => {
    if (step === 'game') update({ ...settings, game: PRESETS[game].settings });
    track('onboarding_step_answered', {
      step,
      value: step === 'goal' ? profile.goal : step === 'game' ? game : step === 'daily' ? profile.dailyMinutes : step === 'when' ? profile.cue : profile.focus.length,
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
        {step === 'level' ? (
          <>
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={() => {
                track('placement_started', { from: 'onboarding' });
                navigate('/placement?from=onboarding');
              }}
            >
              Take the placement test
            </button>
            <button className="btn btn-plain btn-block" onClick={() => go('plan')}>
              Start from the first lesson
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
