import { type MouseEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CURRICULUM } from '@felt/content';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { LessonCover } from '../lesson/LessonCover';
import { LockedLessonSheet, TopicIntroSheet } from '../lesson/TopicIntroSheet';
import '../lesson/topic-intro.css';
import { navItem } from '../nav';
import { useCoachAvailable } from '../state/coach';
import { NavRow } from '../ui/NavRow';
import { ProBadge } from '../ui/ProBadge';
import './learn.css';
import { isComplete, LESSON_ENTRIES, type LessonEntry, lessonPath, lessonProgress, pickNextLesson } from '../state/lessons';
import type { StoredLesson } from '../state/db';
import { canOpenLesson, FREE_MODULES, isPro } from '../state/access';
import { pathPrefs } from '../state/goals';
import { useSettings } from '../state/settings';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, GlossaryIcon, LockIcon, TargetIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { loadPlacement } from '../state/placementProgress';
import { moduleKeyOf, shouldShowModuleIntro } from '../state/moduleIntros';

const NO_PROGRESS = new Map<string, StoredLesson>();

export function LearnPage() {
  const placementSaved = useMemo(() => !!loadPlacement(), []);
  const loaded = useLiveQuery(lessonProgress, []);
  const progress = loaded ?? NO_PROGRESS;
  const [intro, setIntro] = useState<{ moduleKey: string; lessonKey?: string }>();
  const [peek, setPeek] = useState<string>();
  /** Each topic's rail opens on its next lesson, not its first, once progress has loaded. */
  const page = useRef<HTMLDivElement>(null);
  const railsPlaced = useRef(false);
  useLayoutEffect(() => {
    if (!loaded || railsPlaced.current || !page.current) return;
    railsPlaced.current = true;
    for (const rail of page.current.querySelectorAll<HTMLElement>('.lesson-rail')) {
      const card = rail.querySelector<HTMLElement>('.lesson-card.current');
      if (!card) continue;
      // Measured against the rail itself: offsetLeft counts from the nearest positioned parent.
      const shift = card.getBoundingClientRect().left - rail.getBoundingClientRect().left - parseFloat(getComputedStyle(rail).paddingLeft);
      if (shift > 1) rail.scrollLeft += shift;
    }
  }, [loaded]);
  /** The first lesson opened in an untouched topic shows the topic's intro first, once. */
  const openLesson = (e: MouseEvent, key: string) => {
    if (!loaded || !shouldShowModuleIntro(key, progress)) return;
    e.preventDefault();
    setIntro({ moduleKey: moduleKeyOf(key), lessonKey: key });
  };
  const { settings } = useSettings();
  const pro = isPro(settings.access);
  const playable = LESSON_ENTRIES.filter((e) => e.content);
  const done = playable.filter((e) => isComplete(progress.get(e.key))).length;
  const next = pickNextLesson(progress, (key) => canOpenLesson(key, settings.access), pathPrefs(settings.profile));
  const nextState = next ? progress.get(next.key) : undefined;

  return (
    <div ref={page} className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader
        title="Learn"
        subtitle={`${done} of ${playable.length} lessons done`}
        trailing={
          <Link to="/glossary" className="btn btn-plain header-icon" aria-label="Glossary">
            <GlossaryIcon size={24} />
          </Link>
        }
      />

      {next?.content && (
        <Link to={lessonPath(next.key)} className="hero learn-hero" onClick={(e) => openLesson(e, next.key)}>
          <div className="learn-hero-body">
            <div style={{ minWidth: 0 }}>
              <div className="hero-label">{nextState?.status === 'started' ? 'Continue' : 'Up next'}</div>
              <div className="display learn-hero-title">{next.title}</div>
              <div className="hero-sub">
                {next.content.minutes} min, {next.content.steps.length} steps
              </div>
              {nextState?.status === 'started' && (
                <div className="hero-progress">
                  <span style={{ width: `${(nextState.step / next.content.steps.length) * 100}%` }} />
                </div>
              )}
            </div>
            <LessonCover cover={next.content.cover} size="sm" />
          </div>
          <span className="btn btn-lg btn-block btn-hero">{nextState?.status === 'started' ? 'Continue lesson' : 'Start lesson'}</span>
        </Link>
      )}

      {!settings.profile.placedAt && (
        <Link to="/placement" className="card placement-card reveal">
          <span className="placement-icon" aria-hidden="true">
            <TargetIcon size={22} />
          </span>
          <span className="grow">
            <span style={{ display: 'block', fontWeight: 650 }}>{placementSaved ? 'Continue the placement quiz' : 'Find where to start'}</span>
            <span className="footnote">
              {placementSaved ? 'Pick up where you stopped.' : 'A short quiz. Skip the lessons you already know.'}
            </span>
          </span>
          <ChevronRightIcon size={16} className="chev" />
        </Link>
      )}

      {(() => {
        const tracks = CURRICULUM.map((track) => {
          const entries = LESSON_ENTRIES.filter((e) => e.trackId === track.id && e.content);
          const trackDone = entries.filter((e) => isComplete(progress.get(e.key))).length;
          return { track, entries, trackDone, finished: entries.length > 0 && trackDone === entries.length };
        });
        // Finished tracks move to the end, folded, so what is left to learn stays on top.
        const active = tracks.filter((t) => !t.finished);
        const finished = tracks.filter((t) => t.finished);
        const moduleBlock = (track: (typeof CURRICULUM)[number], m: (typeof CURRICULUM)[number]['modules'][number], entries: typeof LESSON_ENTRIES) => {
          const lessons = entries.filter((e) => e.key.startsWith(`${track.id}/${m.id}/`));
          const open = lessons.filter((e) => !isComplete(progress.get(e.key)));
          const free = FREE_MODULES.has(`${track.id}/${m.id}`);
          const locked = !free && !pro;
          const topicDone = lessons.length - open.length;
          // In a topic already begun, the lesson to take next: the one in progress, else the first not done.
          const current = open.find((e) => progress.get(e.key)?.status === 'started') ?? (topicDone > 0 ? open[0] : undefined);
          // Lessons still to do come first; finished ones fall to the back of the row.
          const ordered = [...open, ...lessons.filter((e) => isComplete(progress.get(e.key)))];
          return (
            <div key={m.id} className="module-block">
              <div className="module-head">
                <button type="button" className="module-title" aria-haspopup="dialog" onClick={() => setIntro({ moduleKey: `${track.id}/${m.id}` })}>
                  {m.title}
                  {locked && <LockIcon size={13} className="muted" />}
                  <ChevronRightIcon size={14} className="module-title-chev" />
                </button>
                {open.length === 0 ? (
                  <span className="module-done" aria-label="Topic done">
                    <CheckIcon size={14} />
                  </span>
                ) : (
                  <span className="module-progress num">
                    {topicDone === 0 ? `${lessons.reduce((n, e) => n + (e.content?.minutes ?? 0), 0)} min` : `${topicDone} of ${lessons.length}`}
                  </span>
                )}
              </div>
              {topicDone > 0 && open.length > 0 && (
                <span className="module-bar" role="img" aria-label={`${topicDone} of ${lessons.length} lessons done`}>
                  <span style={{ width: `${(topicDone / lessons.length) * 100}%` }} />
                </span>
              )}
              <div className="lesson-rail">
                {ordered.map((e) => {
                  const closed = !canOpenLesson(e.key, settings.access);
                  return (
                    <LessonCard
                      key={e.key}
                      entry={e}
                      state={progress.get(e.key)}
                      locked={closed}
                      current={!closed && e === current}
                      onOpen={
                        closed
                          ? (ev) => {
                              ev.preventDefault();
                              setPeek(e.key);
                            }
                          : (ev) => openLesson(ev, e.key)
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        };
        const doneOf = (track: (typeof CURRICULUM)[number], entries: typeof LESSON_ENTRIES, m: (typeof CURRICULUM)[number]['modules'][number]) => {
          const lessons = entries.filter((e) => e.key.startsWith(`${track.id}/${m.id}/`));
          return lessons.length > 0 && lessons.every((e) => isComplete(progress.get(e.key)));
        };
        return (
          <>
            {active.map(({ track, entries, trackDone }) => {
              const doneModules = track.modules.filter((m) => doneOf(track, entries, m));
              const openModules = track.modules.filter((m) => !doneOf(track, entries, m));
              return (
                <section key={track.id} className="track-section">
                  <div className="row between" style={{ padding: '0 1rem 0.2rem', flexWrap: 'nowrap' }}>
                    <h2 className="display track-title">{track.title}</h2>
                    <span className="footnote num">
                      {trackDone} of {entries.length}
                    </span>
                  </div>
                  <div className="section-footer track-summary">{track.summary}</div>
                  {openModules.map((m) => moduleBlock(track, m, entries))}
                  {doneModules.length > 0 && (
                    <details className="done-fold">
                      <summary>
                        <CheckIcon size={14} />
                        {doneModules.length === 1 ? '1 topic done' : `${doneModules.length} topics done`}
                        <ChevronDownIcon size={14} className="done-fold-chev" />
                      </summary>
                      {doneModules.map((m) => moduleBlock(track, m, entries))}
                    </details>
                  )}
                </section>
              );
            })}
            {finished.length > 0 && (
              <section className="track-section">
                <h2 className="section-title">Completed</h2>
                {finished.map(({ track, entries }) => (
                  <details key={track.id} className="done-fold done-track">
                    <summary>
                      <CheckIcon size={14} />
                      <span className="grow">{track.title}</span>
                      <span className="footnote num">{entries.length} lessons</span>
                      <ChevronDownIcon size={14} className="done-fold-chev" />
                    </summary>
                    {track.modules.map((m) => moduleBlock(track, m, entries))}
                  </details>
                ))}
              </section>
            )}
          </>
        );
      })()}

      <StudyTools />

      {peek && (
        <LockedLessonSheet
          lessonKey={peek}
          proLessons={playable.filter((e) => !canOpenLesson(e.key, settings.access)).length}
          onClose={() => setPeek(undefined)}
        />
      )}

      {intro && (
        <TopicIntroSheet moduleKey={intro.moduleKey} lessonKey={intro.lessonKey} progress={progress} onClose={() => setIntro(undefined)} />
      )}
    </div>
  );
}

function LessonCard({
  entry,
  state,
  locked,
  current,
  onOpen,
}: {
  entry: LessonEntry;
  state?: StoredLesson;
  locked?: boolean;
  /** The next lesson to take in its topic. */
  current?: boolean;
  onOpen?: (e: MouseEvent) => void;
}) {
  const content = entry.content;
  const body = (
    <>
      {content ? <LessonCover cover={content.cover} /> : <div className="cover cover-md cover-soon" />}
      <div className="lesson-card-body">
        <div className={current ? 'caption lesson-card-next' : 'caption'}>{current ? (state?.status === 'started' ? 'Continue' : 'Up next') : entry.moduleTitle}</div>
        <div className="lesson-card-title">{entry.title}</div>
        <div className="lesson-card-meta">
          {!content ? (
            <span className="pill">Coming soon</span>
          ) : state?.status === 'done' ? (
            <span className="pill pill-good">
              <CheckIcon size={12} /> Done
            </span>
          ) : state?.status === 'tested' ? (
            <span className="pill pill-good">
              <CheckIcon size={12} /> Passed
            </span>
          ) : locked ? (
            <span className="pill pill-pro">
              <LockIcon size={12} /> Suited Pro
            </span>
          ) : state?.status === 'started' ? (
            <span className="pill pill-tint num">
              {state.step} of {content.steps.length} steps
            </span>
          ) : (
            <span className="caption">{content.minutes} min</span>
          )}
          {content?.level === 'advanced' && !isComplete(state) && <span className="pill">Advanced</span>}
        </div>
        {content && state?.status === 'started' && !locked && (
          <span className="lesson-card-progress" aria-hidden="true">
            <span style={{ width: `${Math.min(1, state.step / content.steps.length) * 100}%` }} />
          </span>
        )}
      </div>
    </>
  );
  return content ? (
    <Link
      to={locked ? '/pro?from=lesson' : lessonPath(entry.key)}
      className={`lesson-card${locked ? ' locked' : ''}${current ? ' current' : ''}`}
      aria-haspopup={locked ? 'dialog' : undefined}
      onClick={onOpen}
    >
      {body}
    </Link>
  ) : (
    <div className="lesson-card soon" aria-disabled="true">
      {body}
    </div>
  );
}

/** Tools for working through a spot yourself, after the lessons. */
function StudyTools() {
  const coach = useCoachAvailable();
  const { settings } = useSettings();
  const pro = isPro(settings.access);
  const tools: [string, string][] = [
    ['/coach', 'Ask about any hand or answer'],
    ['/solver', 'Solve a heads up spot'],
    ['/lab', 'See what one change does'],
    ['/exploit', 'How to beat common player types'],
  ];
  return (
    <section>
      <h2 className="section-title">Study tools</h2>
      <div className="list with-icons">
        {tools
          .filter(([to]) => to !== '/coach' || coach !== false)
          .map(([to, subtitle]) => {
            const i = navItem(to);
            return <NavRow key={to} to={to} icon={i.icon} color={i.color} title={i.label} subtitle={subtitle} detail={to === '/coach' && !pro ? <ProBadge /> : undefined} />;
          })}
      </div>
    </section>
  );
}
