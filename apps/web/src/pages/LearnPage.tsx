import { useMemo } from 'react';
import { CURRICULUM } from '@felt/content';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { LessonCover } from '../lesson/LessonCover';
import { isComplete, LESSON_ENTRIES, type LessonEntry, lessonPath, lessonProgress, pickNextLesson } from '../state/lessons';
import type { StoredLesson } from '../state/db';
import { canOpenLesson, FREE_MODULES, isPro } from '../state/access';
import { pathPrefs } from '../state/goals';
import { useSettings } from '../state/settings';
import { CheckIcon, ChevronRightIcon, LockIcon, SkipIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { loadPlacement } from '../state/placementProgress';

export function LearnPage() {
  const placementSaved = useMemo(() => !!loadPlacement(), []);
  const progress = useLiveQuery(lessonProgress, [], new Map<string, StoredLesson>());
  const { settings } = useSettings();
  const pro = isPro(settings.access);
  const playable = LESSON_ENTRIES.filter((e) => e.content);
  const done = playable.filter((e) => isComplete(progress.get(e.key))).length;
  const next = pickNextLesson(progress, (key) => canOpenLesson(key, settings.access), pathPrefs(settings.profile));
  const nextState = next ? progress.get(next.key) : undefined;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Learn" subtitle={`${done} of ${playable.length} lessons done`} />

      {next?.content && (
        <Link to={lessonPath(next.key)} className="hero learn-hero">
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
          <span className="placement-icon">
            <SkipIcon size={22} />
          </span>
          <span className="grow">
            <span style={{ display: 'block', fontWeight: 650 }}>{placementSaved ? 'Continue the placement test' : 'Find where to start'}</span>
            <span className="footnote">
              {placementSaved ? 'Pick up where you stopped.' : 'A short test. Lessons you prove you know are marked tested out.'}
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
              {track.summary}
            </div>
            {track.modules.map((m) => {
              const lessons = entries.filter((e) => e.key.startsWith(`${track.id}/${m.id}/`));
              const open = lessons.filter((e) => !isComplete(progress.get(e.key)));
              const free = FREE_MODULES.has(`${track.id}/${m.id}`);
              return (
                <div key={m.id} className="module-block">
                  <div className="module-head">
                    <span className="module-title">
                      {m.title}
                      {!free && !pro && <LockIcon size={13} className="muted" />}
                    </span>
                    {open.length > 0 ? (
                      <Link to={`/check/${track.id}/${m.id}`} className="test-out" data-haptic="select" aria-label={`Test out of ${m.title}`}>
                        <SkipIcon size={14} /> Test out
                      </Link>
                    ) : (
                      <span className="pill pill-good">
                        <CheckIcon size={12} /> Done
                      </span>
                    )}
                  </div>
                  <div className="lesson-rail">
                    {lessons.map((e) => (
                      <LessonCard key={e.key} entry={e} state={progress.get(e.key)} locked={!canOpenLesson(e.key, settings.access)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function LessonCard({ entry, state, locked }: { entry: LessonEntry; state?: StoredLesson; locked?: boolean }) {
  const content = entry.content;
  const body = (
    <>
      {content ? <LessonCover cover={content.cover} /> : <div className="cover cover-md cover-soon" />}
      <div className="lesson-card-body">
        <div className="caption">{entry.moduleTitle}</div>
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
              <SkipIcon size={12} /> Tested out
            </span>
          ) : locked ? (
            <span className="pill">
              <LockIcon size={12} /> Felt Pro
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
      </div>
    </>
  );
  return content ? (
    <Link to={locked ? '/pro?from=lesson' : lessonPath(entry.key)} className={`lesson-card${locked ? ' locked' : ''}`}>
      {body}
    </Link>
  ) : (
    <div className="lesson-card soon" aria-disabled="true">
      {body}
    </div>
  );
}
