import { type Chart, type DrillOutcome, handClassCombos, scoreRecall } from '@felt/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { actionColor } from '../components/actionColors';
import { MixBar } from '../components/MixBar';
import { PlayingCard } from '../components/PlayingCard';
import { RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { haptic } from '../haptics';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, CloseIcon, MinusIcon } from '../ui/icons';
import { actionLabels, spotLine } from './labels';

interface Props {
  chart: Chart;
  hand: string;
  targetMs: number;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
}

/** The clock starts once both cards have flipped face up. */
const FLIP_MS = 560 + 90;

const VERDICTS = {
  right: { text: 'Correct', color: 'var(--green)', Icon: CheckIcon, haptic: 'success' as const },
  mix: { text: 'Rare mix', color: 'var(--orange)', Icon: MinusIcon, haptic: 'warning' as const },
  wrong: { text: 'Not quite', color: 'var(--red)', Icon: CloseIcon, haptic: 'error' as const },
};

/** "You are UTG+1 with KTo, folded to you. Raise or fold?" Timed, then shows the full mix. */
export function QuickRecall({ chart, hand, targetMs, onAnswer, onNext }: Props) {
  const started = useRef(performance.now() + FLIP_MS);
  const revealRef = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState<{ choice: string; outcome: DrillOutcome }>();
  const combo = useMemo(() => {
    const combos = handClassCombos(hand);
    return combos[Math.floor(Math.random() * combos.length)];
  }, [hand]);
  const labels = actionLabels(chart);
  const mix = chart.mixes.get(hand) ?? { fold: 1 };
  const choices = [...chart.spec.actions.map((a) => a.id), 'fold'];

  const choose = useCallback(
    (choice: string) => {
      if (answer) return;
      const responseMs = Math.max(0, performance.now() - started.current);
      const outcome = { accuracy: scoreRecall(mix, choice), responseMs, targetMs };
      const kind = outcome.accuracy === 1 ? 'right' : outcome.accuracy > 0 ? 'mix' : 'wrong';
      haptic(VERDICTS[kind].haptic);
      setAnswer({ choice, outcome });
      onAnswer(outcome);
    },
    [answer, mix, targetMs, onAnswer],
  );

  // Keyboard on laptops: 1, 2, 3 pick an action; Enter or Space moves on.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (!answer) {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < choices.length) choose(choices[i]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, choices, choose, onNext]);

  useEffect(() => {
    if (answer) revealRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [answer]);

  const kind = answer ? (answer.outcome.accuracy === 1 ? 'right' : answer.outcome.accuracy > 0 ? 'mix' : 'wrong') : undefined;
  const verdict = kind ? VERDICTS[kind] : undefined;
  const fast = answer && answer.outcome.responseMs <= targetMs;

  return (
    <div className="stack">
      <div className={`card stack ${kind === 'right' ? 'flash-good' : kind ? 'flash-bad' : ''}`} style={{ gap: '0.8rem' }}>
        <div className="row between">
          <div>
            <div className="footnote">{spotLine(chart) || 'Your action'}</div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
              {chart.spec.hero}{' '}
              <span className="muted" style={{ fontWeight: 500, fontSize: '1rem' }}>
                {chart.spec.tableSize}-handed, {chart.spec.stackBb}bb
              </span>
            </div>
          </div>
          {chart.spec.basis === 'exploit' && <span className="pill pill-warn">Exploit</span>}
        </div>
        <SeatStrip spec={chart.spec} />
        <div className="row" style={{ justifyContent: 'center', padding: '1.1rem 0 0.6rem', gap: 12 }}>
          {combo.map((c, i) => (
            <PlayingCard key={c} card={c} size="lg" flip delayMs={i * 90} />
          ))}
        </div>
        {/* Speed bar: drains over the time an answer still counts as "Good". */}
        <div className="progress" style={{ height: 4, opacity: answer ? 0 : 1, transition: 'opacity 200ms' }} aria-hidden="true">
          <span
            style={{
              width: '100%',
              animation: `drain ${targetMs * 2.5}ms linear ${FLIP_MS}ms both`,
              animationPlayState: answer ? 'paused' : 'running',
            }}
          />
        </div>
      </div>

      {answer && verdict && (
        <div ref={revealRef} className="card stack reveal" style={{ gap: '0.9rem' }}>
          <div className="row between">
            <div className="verdict" style={{ color: verdict.color }}>
              <span className="badge" style={{ background: verdict.color }}>
                <verdict.Icon size={18} />
              </span>
              {verdict.text}
            </div>
            <span className={`pill ${fast ? 'pill-good' : ''} num`}>{(answer.outcome.responseMs / 1000).toFixed(1)}s</span>
          </div>
          <div className="row between">
            <strong style={{ fontSize: '1.1rem' }}>{hand}</strong>
            <span className="footnote">
              You chose {labels[answer.choice]}
            </span>
          </div>
          <MixBar mix={mix} labels={labels} />
          <RangeGrid mixes={chart.mixes} selected={hand} />
        </div>
      )}

      <BottomBar>
        {!answer ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${choices.length}, 1fr)`, gap: 10 }}>
            {choices.map((c, i) => (
              <button
                key={c}
                className="btn-action"
                data-haptic="off"
                style={{ '--c': actionColor(c) } as React.CSSProperties}
                onClick={() => choose(c)}
                aria-keyshortcuts={String(i + 1)}
              >
                {labels[c]}
                <kbd className="kbd">{i + 1}</kbd>
              </button>
            ))}
          </div>
        ) : (
          <button className="btn btn-primary btn-lg btn-block swap-in" onClick={onNext} autoFocus aria-keyshortcuts="Enter">
            Next
          </button>
        )}
      </BottomBar>
    </div>
  );
}
