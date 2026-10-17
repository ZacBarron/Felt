import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { canOpenLesson } from '../state/access';
import type { StoredLesson } from '../state/db';
import { entryFor, isComplete, lessonPath, moduleEntries } from '../state/lessons';
import { markModuleIntroSeen, topicInfo, topicTarget, type TopicAction } from '../state/moduleIntros';
import { useSettings } from '../state/settings';
import { CheckIcon, LockIcon } from '../ui/icons';
import { LessonCover } from './LessonCover';
import './topic-intro.css';

const BUTTON: Record<TopicAction, string> = {
  start: 'Start lesson',
  continue: 'Continue lesson',
  again: 'Read the lesson again',
  locked: 'See Aced Pro',
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

        <ul className="topic-intro-checks">
          {topic.intro.youWill.map((item) => (
            <li key={item}>
              <CheckIcon size={14} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="topic-intro-why">{topic.intro.why}</p>

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
            {done < lessons.length && (
              <button
                className="btn btn-plain btn-block"
                onClick={() => {
                  onClose();
                  navigate(`/check/${trackId}/${moduleId}`);
                }}
              >
                Skip ahead with a quick quiz
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}

/** The screens a lesson walks through, by title, for a look inside before it opens. */
function outline(steps: readonly { kind: string; title?: string }[]): string[] {
  return steps.flatMap((s) => (s.kind !== 'quiz' && s.kind !== 'takeaway' && s.kind !== 'intro' && s.title ? [s.title] : []));
}

/**
 * A Aced Pro lesson, shown before the paywall: its cover, its length and
 * what it walks through, by screen title. It shows what is inside without
 * teaching it, so the paywall comes after real interest, not instead of it.
 */
export function LockedLessonSheet({ lessonKey, proLessons, onClose }: { lessonKey: string; proLessons?: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const entry = entryFor(lessonKey);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const content = entry?.content;
  if (!entry || !content) return null;
  const titles = outline(content.steps);
  const shown = titles.slice(0, 6);
  const questions = content.steps.filter((s) => s.kind === 'quiz').length;
  const titleId = `locked-${lessonKey.replace(/\W/g, '-')}`;

  return (
    <dialog
      ref={ref}
      className="sheet topic-intro locked-lesson"
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
            <div className="footnote locked-lesson-kicker">
              <LockIcon size={12} /> Aced Pro, {entry.moduleTitle}
            </div>
            <h2 id={titleId} className="topic-intro-title">
              {entry.title}
            </h2>
            <div className="footnote num topic-intro-meta">
              <span>{content.minutes} min</span>
              <span>{content.steps.length} screens</span>
              {questions > 0 && <span>{questions} questions</span>}
            </div>
          </div>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="locked-lesson-cover">
          <LessonCover cover={content.cover} size="md" />
        </div>

        <div className="topic-intro-card">
          <section>
            <h3 className="topic-intro-label">Inside this lesson</h3>
            <ol className="locked-outline">
              {shown.map((t) => (
                <li key={t}>{t}</li>
              ))}
              {titles.length > shown.length && <li className="locked-outline-more">{titles.length - shown.length === 1 ? '1 more screen' : `${titles.length - shown.length} more screens`}</li>}
              {questions > 0 && <li className="locked-outline-quiz">{questions} questions to check yourself</li>}
            </ol>
          </section>
        </div>

        <div className="topic-intro-cta">
          {proLessons !== undefined && proLessons > 1 && (
            <p className="locked-lesson-more">
              This lesson and {proLessons - 1} more come with Aced Pro.
            </p>
          )}
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/pro?from=lesson')}>
            See Aced Pro
          </button>
        </div>
      </div>
    </dialog>
  );
}
