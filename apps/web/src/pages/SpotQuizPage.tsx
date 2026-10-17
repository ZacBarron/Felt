import { RECALL_TARGET_MS } from '@felt/core';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { actionColor, sortActions } from '../components/actionColors';
import { actionLabels, spotLine } from '../drills/labels';
import { QuickRecall } from '../drills/QuickRecall';
import { getChart } from '../state/charts';
import { dealSpotQuiz, markQuizSeen, QUIZ_POOLS, type QuizItem, type QuizPool } from '../state/spotQuiz';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { Chips } from '../ui/Chips';
import { CheckIcon, CloseIcon } from '../ui/icons';
import { ProgressRing } from '../ui/ProgressRing';
import { Section } from '../ui/Section';
import { useBodyClass } from '../ui/useBodyClass';
import './ranges.css';

/** The pool a player last chose, on this device only. */
const POOL_KEY = 'felt.quizPool';

function readPool(): QuizPool {
  try {
    const v = localStorage.getItem(POOL_KEY);
    return v === 'stacks' || v === 'tables' ? v : 'game';
  } catch {
    return 'game';
  }
}

function writePool(pool: QuizPool) {
  try {
    localStorage.setItem(POOL_KEY, pool);
  } catch {
    // Blocked storage: the choice lasts for this visit.
  }
}

interface Answer {
  item: QuizItem;
  accuracy: number;
}

/**
 * A range quiz across many spots: ten hands, each from another chart. Opens,
 * defense, 3bets, 4bets, squeezes, blind battles and limped pots all come
 * up, with the seats and hands changing every time. Practice here does not
 * change the review schedule or the Aced Rating.
 */
export function SpotQuizPage() {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [pool, setPool] = useState<QuizPool>(readPool);
  const [items, setItems] = useState<QuizItem[]>(() => dealSpotQuiz(settings.game, readPool()));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [setNo, setSetNo] = useState(0);

  useEffect(() => {
    document.title = 'Range quiz · Aced';
  }, []);

  const item = items[index];
  useEffect(() => {
    if (item) markQuizSeen(item);
  }, [item]);

  const deal = (p: QuizPool) => {
    setItems(dealSpotQuiz(settings.game, p));
    setIndex(0);
    setAnswers([]);
    setSetNo((n) => n + 1);
    window.scrollTo({ top: 0 });
  };

  const choosePool = (p: QuizPool) => {
    setPool(p);
    writePool(p);
    deal(p);
  };

  const done = index >= items.length;
  const chart = item ? getChart(item.chartId) : undefined;

  return (
    <div className="stack focus-column">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="End the quiz" onClick={() => navigate('/train')}>
          <CloseIcon size={18} />
        </button>
        <div className="check-bar" role="progressbar" aria-label="Range quiz" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={Math.min(index, items.length)}>
          <span style={{ width: `${(Math.min(index, items.length) / Math.max(1, items.length)) * 100}%` }} />
        </div>
        <span className="footnote num">{done ? `${items.length} of ${items.length}` : `${index + 1} of ${items.length}`}</span>
      </div>

      {index === 0 && !done && (
        <div className="stack" style={{ gap: '0.4rem' }}>
          <Chips<QuizPool> ariaLabel="Charts to draw from" value={pool} onChange={choosePool} options={QUIZ_POOLS.map((p) => ({ value: p.value, label: p.label }))} />
          <p className="footnote" style={{ margin: 0 }}>
            {QUIZ_POOLS.find((p) => p.value === pool)!.note}
          </p>
        </div>
      )}

      {done ? (
        <QuizDone answers={answers} onAgain={() => deal(pool)} />
      ) : chart ? (
        <QuickRecall
          key={`${setNo}:${index}`}
          chart={chart}
          hand={item.hand}
          targetMs={RECALL_TARGET_MS}
          nextLabel={index + 1 >= items.length ? 'See my results' : 'Next hand'}
          onAnswer={(o) => setAnswers((a) => [...a, { item, accuracy: o.accuracy }])}
          onNext={() => {
            setIndex((i) => i + 1);
            window.scrollTo({ top: 0 });
          }}
        />
      ) : (
        <p className="muted">No charts for this game yet.</p>
      )}
    </div>
  );
}

function QuizDone({ answers, onAgain }: { answers: Answer[]; onAgain: () => void }) {
  const right = answers.filter((a) => a.accuracy >= 1).length;
  const total = answers.length;
  const spots = new Set(answers.map((a) => getChart(a.item.chartId)?.spec.spot)).size;
  const toFix = answers.filter((a) => a.accuracy < 1);
  return (
    <div className="stack quiz-result">
      <div className="card stack reveal quiz-result-card">
        <ProgressRing value={right / Math.max(1, total)} size={104} stroke={10} label={`${right} of ${total} right`}>
          <span className="display num" style={{ fontSize: '2rem' }} aria-hidden="true">
            {right}/{total}
          </span>
        </ProgressRing>
        <h2 className="display quiz-result-title" role="status">
          {right === total ? 'Every hand right' : `${right} of ${total} right`}
        </h2>
        <p className="footnote" style={{ margin: 0 }}>
          {spots === 1 ? 'From 1 kind of spot.' : `From ${spots} kinds of spot.`} Practice here does not change your review.
        </p>
      </div>

      {toFix.length > 0 ? (
        <Section title="Hands to fix" footer="Each bar shows how often the chart takes each action.">
          <ul className="list quiz-fix">
            {toFix.map(({ item, accuracy }) => {
              const chart = getChart(item.chartId);
              if (!chart) return null;
              const raw = chart.mixes.get(item.hand) ?? { fold: 1 };
              const played = Object.entries(raw).reduce((t, [a, f]) => (a === 'fold' ? t : t + f), 0);
              const mix: Record<string, number> = { ...raw, fold: Math.max(0, 1 - played) };
              const labels = actionLabels(chart);
              const parts = sortActions(Object.keys(mix)).filter((x) => mix[x] > 0.005);
              return (
                <li key={`${item.chartId}:${item.hand}`} className="list-row">
                  <span className={`quiz-cell${mix.fold > 0.5 ? ' mostly-fold' : ''}`} aria-hidden="true">
                    {parts.map((x) => (
                      <span key={x} style={{ width: `${mix[x] * 100}%`, background: actionColor(x), opacity: x === 'fold' ? 0.35 : 1 }} />
                    ))}
                    <b>{item.hand}</b>
                  </span>
                  <span className="grow">
                    <span style={{ display: 'block', fontWeight: 600 }}>
                      {chart.spec.hero}, {spotLine(chart) || chart.spec.title}
                    </span>
                    <span className="footnote num">
                      <span className="sr-only">{item.hand}. The chart plays it </span>
                      {parts.map((x) => `${(labels[x] ?? x).replace(/\s+[\d.]+bb$/, '')} ${Math.round(mix[x] * 100)}%`).join(', ')}
                      {item.estimate && '. Estimate'}
                    </span>
                  </span>
                  <span className={`pill ${accuracy > 0 ? 'pill-warn' : 'pill-bad'}`}>{accuracy > 0 ? 'Close' : 'Not quite'}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : (
        <Section>
          <div className="list">
            <div className="list-row">
              <CheckIcon size={18} />
              <span className="grow">Every hand right. The next set brings other spots.</span>
            </div>
          </div>
        </Section>
      )}

      <BottomBar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link to="/ranges" className="btn btn-lg glass">
            Open charts
          </Link>
          <button className="btn btn-primary btn-lg" onClick={onAgain}>
            Start a new set
          </button>
        </div>
      </BottomBar>
    </div>
  );
}
