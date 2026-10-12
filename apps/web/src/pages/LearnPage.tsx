import { CURRICULUM } from '@felt/content';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { LessonCover } from '../lesson/LessonCover';
import { LESSON_ENTRIES, type LessonEntry, lessonPath, lessonProgress, pickNextLesson } from '../state/lessons';
import type { StoredLesson } from '../state/db';
import { CheckIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';

export function LearnPage() {
  const progress = useLiveQuery(lessonProgress, [], new Map<string, StoredLesson>());
  const playable = LESSON_ENTRIES.filter((e) => e.content);
  const done = playable.filter((e) => progress.get(e.key)?.status === 'done').length;
  const next = pickNextLesson(progress);
  const nextState = next ? progress.get(next.key) : undefined;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Learn" subtitle={`${done} of ${playable.length} lessons complete`} />

      {next?.content && (
        <Link to={lessonPath(next.key)} className="hero learn-hero">
          <div className="learn-hero-body">
            <div style={{ minWidth: 0 }}>
              <div className="hero-label">{nextState?.status === 'started' ? 'Continue' : 'Up next'}</div>
              <div className="display learn-hero-title">{next.title}</div>
              <div className="hero-sub">
                {next.trackTitle}, {next.content.minutes} min, {next.content.steps.length} steps
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

      {CURRICULUM.map((track) => {
        const entries = LESSON_ENTRIES.filter((e) => e.trackId === track.id);
        const written = entries.filter((e) => e.content);
        const trackDone = written.filter((e) => progress.get(e.key)?.status === 'done').length;
        return (
          <section key={track.id}>
            <div className="row between" style={{ padding: '0 1rem 0.5rem', flexWrap: 'nowrap' }}>
              <span className="section-title" style={{ padding: 0 }}>
                {track.title}
              </span>
              <span className="footnote num">{written.length ? `${trackDone} of ${written.length}` : 'Soon'}</span>
            </div>
            <div className="lesson-rail">
              {[...written, ...entries.filter((e) => !e.content)].map((e) => (
                <LessonCard key={e.key} entry={e} state={progress.get(e.key)} />
              ))}
            </div>
            <div className="section-footer">{track.summary}</div>
          </section>
        );
      })}
    </div>
  );
}

function LessonCard({ entry, state }: { entry: LessonEntry; state?: StoredLesson }) {
  const content = entry.content;
  const body = (
    <>
      {content ? <LessonCover cover={content.cover} /> : <div className="cover cover-md cover-soon" />}
      <div className="lesson-card-body">
        <div className="caption">{entry.moduleTitle}</div>
        <div className="display lesson-card-title">{entry.title}</div>
        <div className="lesson-card-meta">
          {!content ? (
            <span className="pill">Soon</span>
          ) : state?.status === 'done' ? (
            <span className="pill pill-good">
              <CheckIcon size={12} /> Done
            </span>
          ) : state?.status === 'started' ? (
            <span className="pill pill-tint num">
              {state.step} of {content.steps.length}
            </span>
          ) : (
            <span className="caption">{content.minutes} min</span>
          )}
          {content?.level === 'advanced' && state?.status !== 'done' && <span className="pill">Advanced</span>}
        </div>
      </div>
    </>
  );
  return content ? (
    <Link to={lessonPath(entry.key)} className="lesson-card">
      {body}
    </Link>
  ) : (
    <div className="lesson-card soon" aria-disabled="true">
      {body}
    </div>
  );
}
