import { type DrillOutcome, type HandMix, parseCards, scoreRecall } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { actionColor } from '../components/actionColors';
import { MixBar } from '../components/MixBar';
import { PlayingCard } from '../components/PlayingCard';
import { haptic } from '../haptics';
import { StepView } from '../lesson/StepView';
import { db, type SavedItem, type SavedSolverSpot } from '../state/db';
import { entryFor, lessonPath } from '../state/lessons';
import { BottomBar } from '../ui/BottomBar';
import { BookmarkIcon } from '../ui/icons';

interface Props {
  savedId: string;
  targetMs: number;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
}

/** Self grades for flashcards, mapped onto the same outcome the drills produce. */
const GRADES = [
  { label: 'Forgot', accuracy: 0, speed: 3, color: 'var(--red)' },
  { label: 'Hard', accuracy: 0.75, speed: 3, color: 'var(--orange)' },
  { label: 'Good', accuracy: 1, speed: 2, color: 'var(--tint)' },
  { label: 'Easy', accuracy: 1, speed: 0.5, color: 'var(--green)' },
] as const;

function Header({ item }: { item: SavedItem }) {
  return (
    <div className="saved-head">
      <BookmarkIcon size={16} filled />
      <span className="footnote grow">{item.source}</span>
      {item.lessonKey && (
        <Link to={`${lessonPath(item.lessonKey)}?step=${item.step}`} className="footnote" style={{ color: 'var(--tint)' }}>
          Open lesson
        </Link>
      )}
    </div>
  );
}

/** A saved lesson quiz: answered and graded like any quiz. */
function SavedQuiz({ item, targetMs, onAnswer, onNext }: Props & { item: SavedItem }) {
  const step = entryFor(item.lessonKey!)!.content!.steps[item.step!];
  const started = useRef(performance.now());
  const [done, setDone] = useState(false);
  if (step.kind !== 'quiz') return null;
  return (
    <div className="stack">
      <Header item={item} />
      <StepView
        step={step}
        onAnswer={(choice) => {
          setDone(true);
          onAnswer({ accuracy: choice === step.answer ? 1 : 0, responseMs: performance.now() - started.current, targetMs });
        }}
      />
      {item.note && <p className="saved-note">{item.note}</p>}
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" disabled={!done} onClick={onNext}>
          {done ? 'Next' : 'Choose an answer'}
        </button>
      </BottomBar>
    </div>
  );
}

/** Any other lesson screen: recall it from its title, reveal, then grade yourself honestly. */
function SavedFlashcard({ item, targetMs, onAnswer, onNext }: Props & { item: SavedItem }) {
  const step = entryFor(item.lessonKey!)!.content!.steps[item.step!];
  const [shown, setShown] = useState(false);
  const [graded, setGraded] = useState(false);
  return (
    <div className="stack">
      <Header item={item} />
      {!shown ? (
        <div className="card stack saved-prompt">
          <div className="footnote">What do you remember about</div>
          <h2 className="display lesson-h2">{item.title}</h2>
          <p className="muted" style={{ margin: 0 }}>
            Say it to yourself first, then reveal.
          </p>
        </div>
      ) : (
        <div className="reveal">
          <StepView step={step} />
        </div>
      )}
      {shown && item.note && <p className="saved-note">{item.note}</p>}
      <BottomBar>
        {!shown ? (
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setShown(true)}>
            Reveal
          </button>
        ) : !graded ? (
          <div className="grade-row">
            {GRADES.map((g) => (
              <button
                key={g.label}
                className="btn-action"
                style={{ '--c': g.color } as React.CSSProperties}
                data-haptic="off"
                onClick={() => {
                  setGraded(true);
                  haptic(g.accuracy === 0 ? 'error' : 'success');
                  onAnswer({ accuracy: g.accuracy, responseMs: targetMs * g.speed, targetMs });
                  onNext();
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        ) : null}
      </BottomBar>
    </div>
  );
}

/** A saved solver decision: pick an action, graded against the solver's mix for that hand. */
export function SolverSpotQuiz({
  spot,
  onAnswer,
  targetMs = 12_000,
  footer = true,
}: {
  spot: SavedSolverSpot;
  onAnswer?: (outcome: DrillOutcome, choice: string) => void;
  targetMs?: number;
  footer?: boolean;
}) {
  const started = useRef(performance.now());
  const [choice, setChoice] = useState<string>();
  const mix: HandMix = Object.fromEntries(spot.actions.map((a, i) => [a.id, spot.mix[i]]));
  const labels = Object.fromEntries(spot.actions.map((a) => [a.id, a.label]));
  const choose = (id: string) => {
    if (choice) return;
    const accuracy = scoreRecall(mix, id);
    haptic(accuracy === 1 ? 'success' : accuracy > 0 ? 'warning' : 'error');
    setChoice(id);
    onAnswer?.({ accuracy, responseMs: performance.now() - started.current, targetMs }, id);
  };
  const verdict = choice ? scoreRecall(mix, choice) : undefined;
  return (
    <div className="stack">
      <div className={`card stack ${verdict === 1 ? 'flash-good' : verdict !== undefined ? 'flash-bad' : ''}`} style={{ gap: '0.8rem' }}>
        <div className="footnote">{spot.line.length ? spot.line.join(', ') : 'First to act'}</div>
        <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>
          {spot.player === 0 ? 'Out of position' : 'In position'} with {spot.hand}
          <span className="muted" style={{ fontWeight: 500, fontSize: '1rem' }}>
            {' '}
            · pot {spot.pot}bb
          </span>
        </div>
        <div className="row felt-strip" style={{ justifyContent: 'center', gap: 6 }}>
          {parseCards(spot.board).map((c) => (
            <PlayingCard key={c} card={c} size="md" />
          ))}
        </div>
      </div>
      {choice && (
        <div className="card stack reveal" style={{ gap: '0.7rem' }}>
          <div className="row between">
            <strong style={{ color: verdict === 1 ? 'var(--green)' : verdict ? 'var(--orange)' : 'var(--red)' }}>
              {verdict === 1 ? 'Correct' : verdict ? 'Rare mix' : 'Not quite'}
            </strong>
            <span className="footnote">You chose {labels[choice]}</span>
          </div>
          <MixBar mix={mix} labels={labels} />
          <div className="footnote">Felt Solver, accurate to {spot.exploitability.toFixed(2)}% of the pot.</div>
        </div>
      )}
      {footer && !choice && (
        <BottomBar>
          <div className="grade-row" style={{ gridTemplateColumns: `repeat(${Math.min(spot.actions.length, 4)}, 1fr)` }}>
            {spot.actions.map((a) => (
              <button key={a.id} className="btn-action" style={{ '--c': actionColor(a.id) } as React.CSSProperties} data-haptic="off" onClick={() => choose(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
        </BottomBar>
      )}
    </div>
  );
}

function Gone({ text, onNext }: { text: string; onNext: () => void }) {
  return (
    <>
      <p className="muted">{text}</p>
      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={onNext}>
          Next
        </button>
      </BottomBar>
    </>
  );
}

/** Renders the right review for a saved item. */
export function SavedCard(props: Props) {
  const item = useLiveQuery(() => db.saved.get(props.savedId), [props.savedId], null);
  const [answered, setAnswered] = useState(false);
  if (item === null) return null;
  if (!item) return <Gone text="This save was removed." onNext={props.onNext} />;
  if (item.kind === 'solver-spot' && item.spot) {
    return (
      <div className="stack">
        <Header item={item} />
        <SolverSpotQuiz
          spot={item.spot}
          targetMs={props.targetMs}
          onAnswer={(o) => {
            setAnswered(true);
            props.onAnswer(o);
          }}
        />
        {item.note && <p className="saved-note">{item.note}</p>}
        {answered && (
          <BottomBar>
            <button className="btn btn-primary btn-lg btn-block swap-in" onClick={props.onNext}>
              Next
            </button>
          </BottomBar>
        )}
      </div>
    );
  }
  const step = item.lessonKey ? entryFor(item.lessonKey)?.content?.steps[item.step!] : undefined;
  if (!step) return <Gone text="This lesson step no longer exists." onNext={props.onNext} />;
  return step.kind === 'quiz' ? <SavedQuiz item={item} {...props} /> : <SavedFlashcard item={item} {...props} />;
}
