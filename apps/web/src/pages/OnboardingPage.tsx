import { PRESETS } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { haptic } from '../haptics';
import { isPro } from '../state/access';
import type { StoredLesson } from '../state/db';
import { DAILY_OPTIONS, EXPERIENCE, FOCUS, GOALS, goalCopy, pathPrefs } from '../state/goals';
import { isComplete, LESSON_ENTRIES, lessonProgress, recommendedLessons } from '../state/lessons';
import { type Focus, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern, TAGLINE, Wordmark } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronRightIcon, ClockIcon, SkipIcon, TargetIcon } from '../ui/icons';
import { useBodyClass } from '../ui/useBodyClass';

/**
 * First run. Short, personal and honest: every question changes the plan,
 * placement finds the level so nobody repeats what they know, and the plan
 * ends in a commitment the player makes on purpose.
 */

type Step = 'intro' | 'goal' | 'game' | 'experience' | 'focus' | 'daily' | 'level' | 'plan';
const STEPS: Step[] = ['intro', 'goal', 'game', 'experience', 'focus', 'daily', 'level', 'plan'];

const GAMES = [
  { id: 'live-1-3', label: 'Live cash, 1/2 or 1/3', note: '9 handed, deep and loose' },
  { id: 'live-2-5', label: 'Live cash, 2/5 and up', note: '9 handed, deeper stacks' },
  { id: 'online-6max', label: 'Online cash', note: '6-max, 100bb' },
  { id: 'mtt-9max', label: 'Tournaments', note: 'Live or online' },
] as const;

/** Minutes to finish every lesson not yet complete. */
function remainingMinutes(progress: Map<string, StoredLesson>) {
  return LESSON_ENTRIES.filter((e) => e.content && !isComplete(progress.get(e.key))).reduce((m, e) => m + e.content!.minutes, 0);
}

function Choice({ selected, label, note, onClick, multi }: { selected: boolean; label: string; note?: string; onClick: () => void; multi?: boolean }) {
  return (
    <button className={`onb-choice${selected ? ' selected' : ''}`} role={multi ? 'checkbox' : 'radio'} aria-checked={selected} data-haptic="select" onClick={onClick}>
      <span className="grow">
        <span className="onb-choice-label">{label}</span>
        {note && <span className="footnote">{note}</span>}
      </span>
      <span className={`onb-check${multi ? ' square' : ''}`}>{selected && <CheckIcon size={14} />}</span>
    </button>
  );
}

/** Press and hold to commit: a small, deliberate act that makes the plan the player's own. */
function HoldToCommit({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number>();
  const frame = useRef<number>();
  const done = useRef(false);
  const HOLD_MS = 1100;

  const tick = (t: number) => {
    if (start.current === undefined) start.current = t;
    const p = Math.min(1, (t - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1 && !done.current) {
      done.current = true;
      haptic('success');
      onDone();
      return;
    }
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
    <button
      className="btn btn-primary btn-lg btn-block hold-btn"
      data-haptic="off"
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!done.current) {
            done.current = true;
            haptic('success');
            onDone();
          }
        }
      }}
    >
      <span className="hold-fill" style={{ transform: `scaleX(${progress})` }} />
      <span style={{ position: 'relative' }}>{progress > 0 ? 'Keep holding' : 'Hold to commit'}</span>
    </button>
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
  const [game, setGame] = useState<string>(() => GAMES.find((g) => PRESETS[g.id].settings.venue === settings.game.venue && PRESETS[g.id].settings.format === settings.game.format)?.id ?? 'live-1-3');

  const setProfile = (patch: Partial<Profile>) => update({ ...settings, profile: { ...profile, ...patch } });
  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    window.scrollTo({ top: 0 });
    setStep(next);
    if (next === 'plan') setBuilding(true);
  };
  const forward = () => go(STEPS[index + 1]);
  const back = () => index > 0 && go(STEPS[index - 1]);

  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => setBuilding(false), 1700);
    return () => clearTimeout(t);
  }, [building]);

  const commit = () => {
    update({ ...settings, profile: { ...profile, onboarded: true, committedAt: new Date().toISOString() } });
    setTimeout(() => navigate(isPro(settings.access) ? '/' : '/pro?from=onboarding', { replace: true }), 450);
  };

  const top = step !== 'intro' && (
    <div className="focus-top">
      <button className="icon-btn glass" aria-label="Back" onClick={back}>
        <ChevronRightIcon size={18} style={{ transform: 'rotate(180deg)' }} />
      </button>
      <div className="check-bar" aria-label={`Step ${index} of ${STEPS.length - 1}`}>
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
          <h1 className="display onb-title reveal" style={{ animationDelay: '260ms' }}>
            Become the toughest player at your table.
          </h1>
          <p className="muted reveal" style={{ animationDelay: '320ms' }}>
            Solver checked strategy, exact math and the exploits winning players use, in a few minutes a day.
          </p>
        </div>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => go('goal')}>
            Get started
          </button>
        </BottomBar>
      </div>
    );
  }

  if (step === 'plan') {
    const goal = goalCopy(profile.goal);
    const minutes = remainingMinutes(progress);
    const days = Math.ceil(minutes / Math.max(1, profile.dailyMinutes));
    const finish = new Date(Date.now() + days * 86_400_000).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    const skipped = LESSON_ENTRIES.filter((e) => progress.get(e.key)?.status === 'tested').length;
    const firstUp = recommendedLessons(progress, pathPrefs(profile));
    if (building) {
      return (
        <div className="stack focus-column onb-building">
          <div className="onb-spinner">
            <BrandMark size={64} />
          </div>
          <h1 className="display onb-title">Building your plan</h1>
          <div className="list">
            {['Matching lessons to your goal', 'Applying your placement', 'Setting your daily target'].map((t, i) => (
              <div key={t} className="list-row reveal" style={{ animationDelay: `${i * 380}ms` }}>
                <CheckIcon size={16} style={{ color: 'var(--green)' }} />
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
            <h1 className="display onb-title">{goal ? `To ${goal.plan}` : 'Your path'}</h1>
          </div>
          <div className="plan-stats">
            <div className="plan-stat">
              <TargetIcon size={20} style={{ color: 'var(--tint)' }} />
              <div className="num plan-stat-value">{profile.dailyMinutes} min</div>
              <div className="footnote">every day</div>
            </div>
            <div className="plan-stat">
              <SkipIcon size={20} style={{ color: 'var(--green)' }} />
              <div className="num plan-stat-value">{skipped}</div>
              <div className="footnote">lessons skipped</div>
            </div>
            <div className="plan-stat">
              <ClockIcon size={20} style={{ color: 'var(--tint)' }} />
              <div className="num plan-stat-value">{finish}</div>
              <div className="footnote">every lesson done</div>
            </div>
          </div>
          <section>
            <h2 className="section-title">First up</h2>
            <div className="list">
              {firstUp.slice(0, 3).map((e, i) => (
                <div key={e.key} className="list-row reveal" style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="onb-num num">{i + 1}</span>
                  <span className="grow">
                    <span style={{ display: 'block', fontWeight: 600 }}>{e.title}</span>
                    <span className="footnote">
                      {e.moduleTitle}, {e.content!.minutes} min
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="section-footer">
              At {profile.dailyMinutes} minutes a day you finish all {minutes} remaining minutes of lessons in about {days} days. Review sessions
              keep what you learn.
            </div>
          </section>
          <p className="muted onb-pledge">I will study {profile.dailyMinutes} minutes a day and play every decision on purpose.</p>
        </div>
        <BottomBar>
          <HoldToCommit onDone={commit} />
        </BottomBar>
      </div>
    );
  }

  const screens: Record<Exclude<Step, 'intro' | 'plan'>, { title: string; sub?: string; body: JSX.Element; ready: boolean }> = {
    goal: {
      title: 'What do you want from poker?',
      sub: 'Your goal shapes your plan.',
      ready: !!profile.goal,
      body: (
        <div className="onb-choices" role="radiogroup">
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
        <div className="onb-choices" role="radiogroup">
          {GAMES.map((g) => (
            <Choice key={g.id} selected={game === g.id} label={g.label} note={g.note} onClick={() => setGame(g.id)} />
          ))}
        </div>
      ),
    },
    experience: {
      title: 'How would you describe your game?',
      sub: 'Be honest. Placement checks it next.',
      ready: !!profile.experience,
      body: (
        <div className="onb-choices" role="radiogroup">
          {EXPERIENCE.map((x) => (
            <Choice key={x.id} selected={profile.experience === x.id} label={x.label} note={x.note} onClick={() => setProfile({ experience: x.id })} />
          ))}
        </div>
      ),
    },
    focus: {
      title: 'What costs you the most money?',
      sub: 'Pick any. These come first in your plan.',
      ready: true,
      body: (
        <div className="onb-choices">
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
      title: 'Set a daily goal',
      sub: 'Small and daily beats long and rare. You can change it later.',
      ready: true,
      body: (
        <div className="onb-choices" role="radiogroup">
          {DAILY_OPTIONS.map((d) => {
            const days = Math.ceil(remainingMinutes(progress) / d.minutes);
            return (
              <Choice
                key={d.minutes}
                selected={profile.dailyMinutes === d.minutes}
                label={`${d.minutes} min a day`}
                note={`${d.label}: every lesson in about ${Math.ceil(days / 7)} weeks`}
                onClick={() => setProfile({ dailyMinutes: d.minutes })}
              />
            );
          })}
        </div>
      ),
    },
    level: {
      title: 'Find your level',
      sub: 'Answer a few questions and skip everything you already know. Miss one and that lesson stays in your plan.',
      ready: true,
      body: (
        <div className="onb-choices">
          <button className="onb-choice selected" onClick={() => navigate('/placement?from=onboarding')}>
            <span className="grow">
              <span className="onb-choice-label">Take the placement test</span>
              <span className="footnote">{profile.experience === 'new' ? 'About 3 minutes' : 'About 5 minutes, recommended'}</span>
            </span>
            <ChevronRightIcon size={18} />
          </button>
          <button className="onb-choice" onClick={() => go('plan')}>
            <span className="grow">
              <span className="onb-choice-label">Start from the beginning</span>
              <span className="footnote">{profile.experience === 'new' ? 'Recommended for new players' : 'Every lesson, in order'}</span>
            </span>
            <ChevronRightIcon size={18} />
          </button>
        </div>
      ),
    },
  };

  const screen = screens[step];
  const advance = () => {
    if (step === 'game') update({ ...settings, game: PRESETS[game].settings });
    forward();
  };
  return (
    <div className="stack focus-column">
      {top}
      <div key={step} className="lesson-stage from-right stack" style={{ gap: '1rem' }}>
        <div>
          <h1 className="display onb-title">{screen.title}</h1>
          {screen.sub && <p className="muted" style={{ margin: '0.4rem 0 0' }}>{screen.sub}</p>}
        </div>
        {screen.body}
      </div>
      {step !== 'level' && (
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" disabled={!screen.ready} onClick={advance}>
            {step === 'focus' && profile.focus.length === 0 ? 'Skip' : 'Continue'}
          </button>
        </BottomBar>
      )}
    </div>
  );
}
