import { type MouseEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CURRICULUM } from '@felt/content';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { LessonCover } from '../lesson/LessonCover';
import { LockedLessonSheet, TopicIntroSheet } from '../lesson/TopicIntroSheet';
import '../lesson/topic-intro.css';
import './learn.css';
import { isComplete, LESSON_ENTRIES, type LessonEntry, lessonPath, lessonProgress, pickNextLesson } from '../state/lessons';
import type { StoredLesson } from '../state/db';
import { canOpenLesson, FREE_MODULES, isPro } from '../state/access';
import { pathPrefs } from '../state/goals';
import { useSettings } from '../state/settings';
import { CheckIcon, ChevronRightIcon, GlossaryIcon, LockIcon, TargetIcon } from '../ui/icons';
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
      if (!card || card === rail.firstElementChild) continue;
      rail.scrollLeft = card.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft);
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

      {CURRICULUM.map((track) => {
        const entries = LESSON_ENTRIES.filter((e) => e.trackId === track.id && e.content);
        const trackDone = entries.filter((e) => isComplete(progress.get(e.key))).length;
        return (
          <section key={track.id} className="track-section">
            <div className="row between" style={{ padding: '0 1rem 0.2rem', flexWrap: 'nowrap' }}>
              <h2 className="display track-title">{track.title}</h2>
              <span className="footnote num">
                {trackDone} of {entries.length}
              </span>
            </div>
            <div className="section-footer" style={{ paddingTop: 0, paddingBottom: '0.6rem' }}>
              {track.summary} {track.intro.why}
            </div>
            {track.modules.map((m) => {
              const lessons = entries.filter((e) => e.key.startsWith(`${track.id}/${m.id}/`));
              const open = lessons.filter((e) => !isComplete(progress.get(e.key)));
              const free = FREE_MODULES.has(`${track.id}/${m.id}`);
              const locked = !free && !pro;
              const topicDone = lessons.length - open.length;
              // In a topic already begun, the lesson to take next: the one in progress, else the first not done.
              const current = open.find((e) => progress.get(e.key)?.status === 'started') ?? (topicDone > 0 ? open[0] : undefined);
              return (
                <div key={m.id} className="module-block">
                  <div className="module-head">
                    <span className="module-title">
                      {m.title}
                      {locked && <LockIcon size={13} className="muted" />}
                    </span>
                    {open.length > 0 ? (
                      <Link to={`/check/${track.id}/${m.id}`} className="skip-link" data-haptic="select" aria-label={`Skip ahead in ${m.title} with a quick quiz`}>
                        Skip ahead
                        <ChevronRightIcon size={13} />
                      </Link>
                    ) : (
                      <span className="pill pill-good">
                        <CheckIcon size={12} /> Done
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="module-why"
                    aria-haspopup="dialog"
                    onClick={() => setIntro({ moduleKey: `${track.id}/${m.id}` })}
                  >
                    {m.intro.why}{' '}
                    <span className="module-why-more">
                      About this topic
                      <ChevronRightIcon size={12} />
                    </span>
                  </button>
                  {lessons.length > 0 && (topicDone === 0 ? (
                    <div className="topic-meter">
                      <span className="topic-meter-label num">
                        {lessons.length} lessons, about {lessons.reduce((n, e) => n + (e.content?.minutes ?? 0), 0)} min
                      </span>
                    </div>
                  ) : (
                    <div className="topic-meter" role="img" aria-label={`${topicDone} of ${lessons.length} lessons done`}>
                      <span className="topic-meter-bar" aria-hidden="true">
                        <span style={{ width: `${(topicDone / lessons.length) * 100}%` }} />
                      </span>
                      <span className="topic-meter-label num" aria-hidden="true">
                        {topicDone} of {lessons.length}
                      </span>
                    </div>
                  ))}
                  <div className="lesson-rail">
                    {lessons.map((e) => {
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
            })}
          </section>
        );
      })}

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
            <span className="pill">
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
