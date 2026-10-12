import { boundaryHands, chartItemDifficulty, pickAdaptive, type PracticeItem, type SkillDomain, type SkillRating } from '@felt/core';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chartChoices, type Decision, DecisionItem } from '../drills/DecisionItem';
import { haptic } from '../haptics';
import { chartsForGame } from '../state/charts';
import { db } from '../state/db';
import { isComplete, LESSON_ENTRIES, lessonProgress, quizSteps } from '../state/lessons';
import { DOMAIN_LABELS, domainForLesson, lessonQuizDifficulty, ratingSnapshot } from '../state/rating';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CloseIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { useBodyClass } from '../ui/useBodyClass';

type Candidate = PracticeItem & { decision: Decision };

const SESSION = 10;
/** Items answered this recently are left out, so practice is recall, not repetition. */
const RECENT_MS = 12 * 60 * 60 * 1000;

/**
 * A short session at the right difficulty: items the rating model expects
 * you to get right about 80% of the time, more of them from your weaker
 * areas, with areas mixed rather than blocked.
 */
export function PracticePage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [items, setItems] = useState<Candidate[]>();
  const [before, setBefore] = useState<number>();
  const [after, setAfter] = useState<SkillRating>();
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);

  useEffect(() => {
    void (async () => {
      const [snap, progress, recent] = await Promise.all([
        ratingSnapshot(),
        lessonProgress(),
        db.answers.where('at').above(new Date(Date.now() - RECENT_MS)).toArray(),
      ]);
      const charts = chartsForGame(settings.game).charts;
      // Rated chart questions only: equilibrium charts, and hands where some answer is wrong.
      const chartItems: Candidate[] = charts
        .filter((c) => c.spec.basis === 'gto')
        .flatMap((chart) =>
          boundaryHands(chart).flatMap((hand) => {
            const difficulty = chartItemDifficulty(chart.mixes.get(hand) ?? { fold: 1 }, chartChoices(chart));
            return difficulty === undefined
              ? []
              : [{ id: `chart:${chart.spec.id}:${hand}`, domain: 'preflop' as SkillDomain, difficulty, decision: { kind: 'chart' as const, chartId: chart.spec.id, hand } }];
          }),
        );
      // Questions from lessons you have finished or tested out of; if there are few, the core lessons too.
      const learned = LESSON_ENTRIES.filter((e) => e.content && isComplete(progress.get(e.key)));
      const lessons = learned.length >= 5 ? learned : LESSON_ENTRIES.filter((e) => e.content?.level === 'core');
      const quizItems: Candidate[] = lessons.flatMap((e) =>
        quizSteps(e).map((step) => ({
          id: `quiz:${e.key}#${step}`,
          domain: domainForLesson(e.key),
          difficulty: lessonQuizDifficulty(e.key),
          decision: { kind: 'quiz' as const, key: e.key, step },
        })),
      );
      const exclude = new Set(recent.map((a) => a.itemId));
      const ratingFor = (d: SkillDomain) => (snap.domains[d].games ? snap.domains[d].rating : snap.overall.rating);
      setItems(pickAdaptive([...chartItems, ...quizItems], ratingFor, { n: SESSION, exclude }));
      setBefore(snap.overall.rating);
    })();
  }, [settings.game]);

  if (!items || before === undefined) return null;

  if (items.length === 0 || index >= items.length) {
    const right = scores.filter((s) => s >= 1).length;
    const domains = [...new Set(items.map((i) => i.domain))];
    return (
      <div className="stack focus-column lesson-done">
        <div className="card stack reveal" style={{ alignItems: 'center', textAlign: 'center', padding: '2rem 1.25rem', gap: '0.9rem' }}>
          <ProgressRing value={scores.length ? right / scores.length : 0} size={116} stroke={11}>
            <span className="display num" style={{ fontSize: '2.2rem' }}>
              {right}/{scores.length}
            </span>
          </ProgressRing>
          <h1 className="display" style={{ fontSize: '2.1rem', fontWeight: 400 }}>
            {items.length === 0 ? 'Nothing to practice right now' : 'Practice done'}
          </h1>
          {after !== undefined && (
            <span className="pill num">
              Felt Rating {Math.round(after.rating)}, {Math.round(after.rating - before) === 0 ? 'no change' : after.rating > before ? `up ${Math.round(after.rating - before)}` : `down ${Math.round(before - after.rating)}`}
            </span>
          )}
          <p className="footnote" style={{ margin: 0, maxWidth: 360 }}>
            {items.length === 0
              ? 'You have answered everything available in the last 12 hours. Finish a lesson to add new questions.'
              : `Practiced ${domains.map((d) => DOMAIN_LABELS[d].toLowerCase()).join(', ')}. Sessions aim for about 80% right: hard enough to learn from, easy enough to keep going.`}
          </p>
        </div>
        <BottomBar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Link to="/you" className="btn btn-lg glass">
              Done
            </Link>
            <button className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
              Practice again
            </button>
          </div>
        </BottomBar>
      </div>
    );
  }

  const item = items[index];
  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="End practice" onClick={() => navigate('/you')}>
          <CloseIcon size={18} />
        </button>
        <div className="check-bar" role="progressbar" aria-label="Practice" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={index} aria-valuetext={`Decision ${index + 1} of ${items.length}`}>
          <span style={{ width: `${(index / items.length) * 100}%` }} />
        </div>
        <span className="pill">{DOMAIN_LABELS[item.domain]}</span>
      </div>
      <DecisionItem
        key={index}
        decision={item.decision}
        source="review"
        last={index + 1 >= items.length}
        onScore={(score) => setScores((s) => [...s, score])}
        onNext={async () => {
          window.scrollTo({ top: 0 });
          if (index + 1 >= items.length) {
            setAfter((await ratingSnapshot()).overall);
            haptic('success');
          }
          setIndex(index + 1);
        }}
      />
    </div>
  );
}
