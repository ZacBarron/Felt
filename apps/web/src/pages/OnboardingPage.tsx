import { FIRST_HAND_NEW, LESSON_CONTENT, STARTER_CHARTS, TESTIMONIALS } from '@felt/content';
import { parseCard, TIERS } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { canOpenLesson } from '../state/access';
import { plural } from '../ui/format';
import type { StoredLesson } from '../state/db';
import { track } from '../state/events';
import { DAILY_OPTIONS, EXPERIENCE, EXPERIENCE_REPLY, FOCUS, goalsFor, goalsLine, isBeginner, pathPrefs } from '../state/goals';
import { LESSON_ENTRIES, lessonPath, lessonProgress, recommendedLessons } from '../state/lessons';
import { LessonCover } from '../lesson/LessonCover';
import { type Experience, type Focus, type Profile, useSettings } from '../state/settings';
import { BrandMark, HeroPattern, Wordmark } from '../ui/Brand';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, ChevronLeftIcon, ClockIcon } from '../ui/icons';
import { PlayingCard } from '../components/PlayingCard';
import { QuickRecall } from '../drills/QuickRecall';
import { StepView } from '../lesson/StepView';
import { serverFeatures } from '../state/api';
import { firstHandSpot, getChart } from '../state/charts';
import { RangeGrid } from '../components/RangeGrid';
import { useBodyClass } from '../ui/useBodyClass';
import { onRadioKeys } from '../ui/radioKeys';
import { requestPersistentStorage } from '../state/backup';
import { inviterName, pendingReferral } from '../state/referral';

/**
 * First run. Short, personal and honest: about five screens, each question
 * changes the plan, and the first lesson starts right after (value before
 * any ask). The account and Aced Pro offers come once, after that first
 * lesson (see FirstWin). Questions that only matter in one place are asked
 * there: the game in Ranges, a study time on Today. Proof is real: counts
 * come from the content, and testimonials appear only once real players
 * have given them.
 */

type Step = 'intro' | 'level' | 'goal' | 'focus' | 'try' | 'daily' | 'place' | 'plan';
/**
 * Every question earns its place by changing the plan, and the first lesson
 * starts right after: value first, the ask later. Questions that only matter
 * in one place are asked there instead (the game in Ranges, a study time on
 * Today after the first lesson).
 */
const STEPS: Step[] = ['intro', 'level', 'goal', 'focus', 'try', 'daily', 'place', 'plan'];

/**
 * Questions follow what a player can answer. Someone new cannot name a leak,
 * so they skip it and placement. Someone who plays for fun gets an optional,
 * plain "what feels hardest". Regular and pro players get the leak question
 * plus who they play and whether they have hands to import, because each
 * answer changes their plan.
 */
function stepsFor(experience?: Profile['experience']): Step[] {
  const skip: Step[] = experience === 'new' ? ['focus', 'place'] : [];
  return STEPS.filter((s) => !skip.includes(s));
}

const QUIZ_COUNT = [...LESSON_CONTENT.values()].reduce((n, l) => n + l.steps.filter((s) => s.kind === 'quiz').length, 0);
const PROOF = [
  { value: LESSON_CONTENT.size, label: 'lessons' },
  { value: QUIZ_COUNT, label: 'questions' },
  { value: STARTER_CHARTS.length, label: 'range charts' },
];

const tierMin = (name: string) => TIERS.find((t) => t.name === name)?.min ?? 0;






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
 * The rating ladder as one track: every tier a step, filled up to `to`.
 * On the welcome screen it climbs from Newcomer to Elite once.
 */
function LadderTrack({ to = 'Elite', start, climb }: { to?: string; start?: string; climb?: boolean }) {
  const end = TIERS.findIndex((t) => t.name === to);
  return (
    <div className={`ladder-track${climb ? ' climb' : ''}`} role="img" aria-label={`The Aced ladder, from ${start ?? TIERS[0].name} to ${to}`}>
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

/** A mini quiz like the ones in every lesson. AJo always opens from the button (checked in welcome.test.ts). */
function ValueQuiz() {
  return (
    <div className="value-quiz" aria-hidden="true">
      <div className="value-quiz-q">Folded to you on the button</div>
      <div className="value-quiz-cards">
        <PlayingCard card={parseCard('As')} size="md" />
        <PlayingCard card={parseCard('Jd')} size="md" />
      </div>
      <div className="value-quiz-choices">
        <span className="value-choice right">
          <CheckIcon size={14} /> Raise
        </span>
        <span className="value-choice">Fold</span>
      </div>
    </div>
  );
}

const BTN_OPEN = getChart('9max-100-rfi-btn');

/**
 * What Aced is, shown rather than told: three cards, each a real piece of the
 * app (a lesson question, a range chart, the rating ladder). Swipe, or let it
 * advance on its own until the player touches it.
 */
const VALUE = [
  { id: 'learn', title: 'Learn by playing real hands', body: 'Short lessons with a picture on every screen. Every answer says why.', Art: ValueQuiz },
  {
    id: 'chart',
    title: 'Know the right play',
    body: 'Charts show how often to raise or fold every hand, the way solvers play.',
    Art: () => (BTN_OPEN ? <div className="value-grid" aria-hidden="true"><RangeGrid mixes={BTN_OPEN.mixes} /></div> : null),
  },
  {
    id: 'climb',
    title: 'Watch your skill climb',
    body: 'Your Aced Rating moves only on real answers. Newcomer to Elite.',
    Art: () => (
      <div className="value-ladder">
        <div className="value-rating" aria-hidden="true">
          <span>
            <span className="value-rating-num num">{tierMin('Solid')}</span>
            <span className="value-rating-tier">Solid</span>
          </span>
          <span className="value-rating-arrow">→</span>
          <span>
            <span className="value-rating-num num goal">{tierMin('Elite')}</span>
            <span className="value-rating-tier">Elite</span>
          </span>
        </div>
        <LadderTrack climb />
      </div>
    ),
  },
];

function ValueCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const touched = useRef(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      const el = track.current;
      if (!el || touched.current) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % VALUE.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="value-carousel">
      <div
        ref={track}
        className="value-track"
        onPointerDown={() => (touched.current = true)}
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        aria-roledescription="carousel"
        aria-label="What Aced does"
      >
        {VALUE.map(({ id, title, body, Art }, i) => (
          <article key={id} className="value-card" aria-roledescription="slide" aria-label={`${i + 1} of ${VALUE.length}`}>
            <div className="value-art">
              <Art />
            </div>
            <h2 className="value-title">{title}</h2>
            <p className="value-body">{body}</p>
          </article>
        ))}
      </div>
      <div className="value-dots" aria-hidden="true">
        {VALUE.map((v, i) => (
          <span key={v.id} className={i === page ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}

/** Who invited this device and what it gets. Shown only with a known invite code. */
function InvitedBanner() {
  const [name, setName] = useState<string | null>();
  useEffect(() => {
    const code = pendingReferral();
    if (!code) return;
    void inviterName(code).then((r) => r && setName(r.name ?? ''));
  }, []);
  if (name === undefined || name === null) return null;
  return (
    <p className="onb-invited reveal" style={{ animationDelay: '800ms' }}>
      {name ? `${name} invited you.` : 'A friend invited you.'} Make an account and your first month of Pro is free.
    </p>
  );
}

function Welcome({ heading, onStart }: { heading: React.RefObject<HTMLHeadingElement>; onStart: () => void }) {
  const navigate = useNavigate();
  const [server, setServer] = useState(false);
  useEffect(() => {
    void serverFeatures().then((f) => setServer(!!f?.accounts));
  }, []);
  return (
    <div className="onb-intro onb-welcome">
      <div className="onb-intro-felt">
        <HeroPattern />
        <div className="onb-welcome-brand reveal">
          <BrandMark size={40} animate />
          <Wordmark height={26} color="#fff" />
        </div>
        <h1 ref={heading} tabIndex={-1} className="display onb-welcome-title reveal" style={{ animationDelay: '500ms' }}>
          From your first hand to Elite.
        </h1>
        <p className="onb-welcome-sub reveal" style={{ animationDelay: '650ms' }}>
          Poker training in a few minutes a day.
        </p>
        <InvitedBanner />
      </div>
      <div className="onb-intro-copy stack">
        <ValueCarousel />
        <p className="onb-proof-line footnote">
          {PROOF.map((p) => `${p.value} ${p.label}`).join(' · ')}
        </p>
        <Testimonials />
      </div>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={onStart}>
          Get started
        </button>
        {server && (
          <button className="btn btn-plain btn-block" onClick={() => navigate('/signin')}>
            I have an account
          </button>
        )}
      </BottomBar>
    </div>
  );
}


/** Hard hands for someone new are a lesson, not a test: the first one is winnable. */
function FirstHand({ experience, game, onDone }: { experience?: Experience; game: Parameters<typeof firstHandSpot>[0]; onDone: () => void }) {
  const [answered, setAnswered] = useState(false);
  // New players pick a starting hand, rules knowers rank a hand, players face a real chart spot.
  const spot = isBeginner(experience) ? undefined : firstHandSpot(game);
  const quiz = FIRST_HAND_NEW;
  if (spot) {
    return <QuickRecall chart={spot.chart} hand={spot.hand} targetMs={6000} untimed nextLabel="Continue" onAnswer={() => setAnswered(true)} onNext={onDone} />;
  }
  return (
    <>
      <StepView step={quiz} onAnswer={() => setAnswered(true)} />
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={!answered} onClick={onDone}>
          {answered ? 'Continue' : 'Choose an answer'}
        </button>
      </BottomBar>
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
  const beginner = isBeginner(profile.experience);
  const heading = useRef<HTMLHeadingElement>(null);

  const setProfile = (patch: Partial<Profile>) => update({ ...settings, profile: { ...profile, ...patch } });
  const flow = stepsFor(profile.experience);
  const index = flow.indexOf(step);
  const go = (next: Step) => {
    window.scrollTo({ top: 0 });
    setStep(next);
    track('onboarding_step_viewed', { step: next, index: flow.indexOf(next) });
    if (next === 'plan') setBuilding(true);
  };
  const forward = () => go(flow[index + 1]);
  const back = () => index > 0 && go(flow[index - 1]);

  // Move focus to each new question so screen readers read it.
  useEffect(() => {
    heading.current?.focus();
  }, [step, building]);

  useEffect(() => {
    if (!building) return;
    const t = setTimeout(() => setBuilding(false), 1700);
    return () => clearTimeout(t);
  }, [building]);

  /** Commit to the plan and go straight into the first lesson; the account and Pro offers come after it. */
  const commit = (firstLesson?: string) => {
    update({ ...settings, profile: { ...profile, onboarded: true, committedAt: new Date().toISOString() } });
    track('plan_committed', { goals: profile.goals.join(','), daily: profile.dailyMinutes, focus: profile.focus.length });
    track('onboarding_completed', { experience: profile.experience, placed: profile.placedAt ?? 'none' });
    // The plan is worth keeping: ask the browser not to clear Aced's data.
    void requestPersistentStorage();
    navigate(firstLesson ? `${lessonPath(firstLesson)}?first=1` : '/', { replace: true });
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

  if (step === 'plan') {
    const goalLine = goalsLine(profile.goals);
    const daily = Math.max(5, profile.dailyMinutes);
    const tested = LESSON_ENTRIES.filter((e) => progress.get(e.key)?.status === 'tested').length;
    const upcoming = recommendedLessons(progress, pathPrefs(profile), (key) => canOpenLesson(key, settings.access));
    const first = upcoming[0];
    const next = upcoming.find((e) => e.moduleTitle !== first?.moduleTitle);
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
              tested > 0 || profile.placedAt ? 'Skipping what you already know' : 'Starting at the right lesson',
              'Fitting it to your day',
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
        <div className="lesson-stage from-right stack" style={{ gap: '1.1rem' }}>
          <section className="hero plan-hero">
            <HeroPattern />
            <div className="hero-label">Your plan</div>
            <h1 ref={heading} tabIndex={-1} className="display plan-hero-title">
              {goalLine ?? 'Get better at poker'}
            </h1>
            <span className="plan-chip">
              <ClockIcon size={14} /> {daily} min a day
            </span>
          </section>

          {first && (
            <section className="plan-first card reveal">
              <span className="plan-first-cover" aria-hidden="true">
                <LessonCover cover={first.content!.cover} size="sm" />
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="footnote">First lesson · {first.content!.minutes} min</div>
                <div className="plan-first-title">{first.title}</div>
                <div className="footnote">{first.moduleTitle}</div>
              </div>
            </section>
          )}

          <ol className="plan-steps reveal" style={{ animationDelay: '120ms' }}>
            {tested > 0 && (
              <li className="done">
                <CheckIcon size={14} /> {plural(tested, 'lesson')} skipped. You know them.
              </li>
            )}
            <li>Today: {first ? first.title : 'your first lesson'}</li>
            {next && <li>Next: {next.moduleTitle}</li>}
            <li>Every day: a few minutes of review so it sticks</li>
          </ol>
        </div>
        <BottomBar>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => commit(first?.key)}>
            Start my first lesson
          </button>
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
          {goalsFor(profile.experience).map((g) => (
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
    focus: {
      title: beginner ? 'What feels hardest right now?' : 'What costs you the most money?',
      sub: beginner ? 'Optional. Pick any that fit, or skip.' : 'Pick as many as you like. They come first in your plan.',
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
                label={beginner ? f.note : f.label}
                note={beginner ? undefined : f.note}
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
    level: {
      title: 'How well do you know poker?',
      sub: 'Aced starts you at the right lesson.',
      ready: !!profile.experience,
      body: (
        <>
          <div className="onb-choices" role="radiogroup" onKeyDown={onRadioKeys} aria-labelledby="onb-title">
            {EXPERIENCE.map((x) => (
              <Choice
                key={x.id}
                selected={profile.experience === x.id}
                label={x.label}
                note={x.note}
                onClick={() => {
                  // Goals are worded per level, so keep only the ones the new level offers.
                  const offered = new Set(goalsFor(x.id).map((g) => g.id));
                  setProfile({ experience: x.id, goals: profile.goals.filter((g) => offered.has(g)) });
                }}
              />
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
    const subline = beginner ? 'Take a guess. Most people are surprised.' : 'A real spot from a real chart. Make your call.';
    return (
      <div className="stack focus-column">
        {top}
        <div className="lesson-stage from-right stack" style={{ gap: '1rem' }}>
          <div>
            <h1 id="onb-title" ref={heading} tabIndex={-1} className="display onb-title">
              {beginner ? 'A quick guess' : 'Try one hand'}
            </h1>
            <p className="muted" style={{ margin: '0.4rem 0 0' }}>
              {subline}
            </p>
          </div>
          <FirstHand
            experience={profile.experience}
            game={settings.game}
            onDone={() => {
              track('onboarding_step_answered', { step, value: beginner ? profile.experience : 'chart' });
              forward();
            }}
          />
        </div>
      </div>
    );
  }

  const screen = screens[step];
  const advance = () => {
    track('onboarding_step_answered', {
      step,
      value: String(step === 'goal' ? profile.goals.join(',') : step === 'daily' ? profile.dailyMinutes : step === 'level' ? profile.experience : profile.focus.length),
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
            <button
              className="btn btn-plain btn-block"
              onClick={() => {
                // Regular players who skip the quiz start past the rules, at the math every later topic uses.
                if (!beginner) setProfile({ placedAt: 'foundations/math' });
                go('plan');
              }}
            >
              {beginner ? 'Start from the basics' : 'Skip the quiz'}
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
