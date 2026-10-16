import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { canOpenLesson } from '../state/access';
import type { StoredLesson } from '../state/db';
import { isComplete, lessonPath, moduleEntries } from '../state/lessons';
import { markModuleIntroSeen, topicInfo, topicTarget, type TopicAction } from '../state/moduleIntros';
import { useSettings } from '../state/settings';
import { LessonCover } from './LessonCover';
import './topic-intro.css';

const BUTTON: Record<TopicAction, string> = {
  start: 'Start lesson',
  continue: 'Continue lesson',
  again: 'Read the lesson again',
  locked: 'See Felt Pro',
};

/**
 * The intro to a topic, in a sheet: why it matters, when it comes up at the
 * table and what the player will be able to do, with a button into the next
 * lesson. `lessonKey` is the lesson the player tapped, when the sheet shows
 * before it the first time.
 */
export function TopicIntroSheet({
  moduleKey,
  lessonKey,
  progress,
  onClose,
}: {
  moduleKey: string;
  lessonKey?: string;
  progress: ReadonlyMap<string, StoredLesson>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const topic = topicInfo(moduleKey);

  useEffect(() => {
    ref.current?.showModal();
    markModuleIntroSeen(moduleKey);
  }, [moduleKey]);

  if (!topic) return null;
  const [trackId, moduleId] = moduleKey.split('/');
  const lessons = moduleEntries(trackId, moduleId).filter((e) => e.content);
  const done = lessons.filter((e) => isComplete(progress.get(e.key))).length;
  const minutes = lessons.reduce((m, e) => m + (e.content?.minutes ?? 0), 0);
  const target = topicTarget(moduleKey, progress, (key) => canOpenLesson(key, settings.access), lessonKey);
  const titleId = `topic-intro-${trackId}-${moduleId}`;

  const go = () => {
    if (!target) return;
    navigate(target.action === 'locked' ? '/pro?from=lesson' : lessonPath(target.entry.key));
  };

  return (
    <dialog
      ref={ref}
      className="sheet topic-intro"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1.25rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between" style={{ alignItems: 'flex-start', gap: '0.8rem', flexWrap: 'nowrap' }}>
          <div style={{ minWidth: 0 }}>
            <div className="footnote">{topic.trackTitle}</div>
            <h2 id={titleId} className="topic-intro-title">
              {topic.title}
            </h2>
            <div className="footnote num topic-intro-meta">
              <span>
                {lessons.length} lessons, about {minutes} min
              </span>
              {done > 0 && (
                <span>
                  {done} of {lessons.length} done
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="topic-intro-card">
          <section>
            <h3 className="topic-intro-label">Why this matters</h3>
            <p>{topic.intro.why}</p>
          </section>
          <section>
            <h3 className="topic-intro-label">When it comes up</h3>
            <p>{topic.intro.when}</p>
          </section>
          <section>
            <h3 className="topic-intro-label">You will</h3>
            <ul className="topic-intro-list">
              {topic.intro.youWill.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        {target?.entry.content && (
          <div className="topic-intro-next">
            <LessonCover cover={target.entry.content.cover} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div className="caption">{target.action === 'continue' ? 'Continue' : target.action === 'again' ? 'First lesson' : 'Up next'}</div>
              <div className="topic-intro-next-title">{target.entry.title}</div>
              <div className="footnote">{target.entry.content.minutes} min</div>
            </div>
          </div>
        )}
        {target && (
          <div className="topic-intro-cta">
            <button className="btn btn-primary btn-lg btn-block" onClick={go}>
              {BUTTON[target.action]}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
