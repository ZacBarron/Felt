import { type Chart, type DrillOutcome, handClassCombos, type HandMix, mixAnswerOptions, scoreMixAnswer, scoreRecall } from '@felt/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { actionColor } from '../components/actionColors';
import { MixBar } from '../components/MixBar';
import { PlayingCard } from '../components/PlayingCard';
import { describeMix, RangeGrid } from '../components/RangeGrid';
import { SeatStrip } from '../components/SeatStrip';
import { haptic } from '../haptics';
import { BottomBar } from '../ui/BottomBar';
import { CheckIcon, CloseIcon, MinusIcon } from '../ui/icons';
import { actionLabels, spotLine } from './labels';
import { untimedMs, useSettings } from '../state/settings';

interface Props {
  chart: Chart;
  hand: string;
  targetMs: number;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
  /** The page above already names the spot and its seats (Ranges), so skip the header. */
  compact?: boolean;
  /** No clock, whatever the setting says. Used for a first hand during setup. */
  untimed?: boolean;
  /** Label for the button after an answer. */
  nextLabel?: string;
}

/** The clock starts once both cards have flipped face up. */
const FLIP_MS = 560 + 90;

const VERDICTS = {
  right: { text: 'Correct', color: 'var(--green-text)', Icon: CheckIcon, haptic: 'success' as const },
  mix: { text: 'Part of the mix', color: 'var(--orange-text)', Icon: MinusIcon, haptic: 'warning' as const },
  close: { text: 'Close', color: 'var(--orange-text)', Icon: MinusIcon, haptic: 'warning' as const },
  wrong: { text: 'Not quite', color: 'var(--red-text)', Icon: CloseIcon, haptic: 'error' as const },
};

/** "You are UTG+1 with KTo, folded to you. Raise or fold?" Timed, then shows the full mix. */
export function QuickRecall({ chart, hand, targetMs, onAnswer, onNext, compact, untimed: forceUntimed, nextLabel = 'Next hand' }: Props) {
  const { settings } = useSettings();
  const untimed = !!forceUntimed || !!settings.study.untimed;
  const shortcuts = settings.study.shortcuts !== false;
  const started = useRef(performance.now() + FLIP_MS);
  const revealRef = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState<{ choice: string; label: string; outcome: DrillOutcome; kind: keyof typeof VERDICTS }>();
  // Mixed answers are on unless turned off, the same switch as painting mixes.
  const mixes = settings.study.paintMixes !== false;
  const combo = useMemo(() => {
    const combos = handClassCombos(hand);
    return combos[Math.floor(Math.random() * combos.length)];
  }, [hand]);
  const labels = actionLabels(chart);
  const mix = chart.mixes.get(hand) ?? { fold: 1 };
  const choices = [...chart.spec.actions.map((a) => a.id), 'fold'];
  const short = useMemo(() => Object.fromEntries(Object.entries(labels).map(([id, l]) => [id, l.replace(/\s+[\d.]+bb$/, '')])), [labels]);
  const mixedOptions = useMemo(() => (mixes ? mixAnswerOptions(chart, short).filter((o) => !o.pure) : []), [chart, mixes, short]);

  const choose = useCallback(
    (choice: string, answerMix?: HandMix, label?: string) => {
      if (answer) return;
      const responseMs = Math.max(0, performance.now() - started.current);
      let accuracy: number;
      let kind: keyof typeof VERDICTS;
      if (mixes) {
        const scored = scoreMixAnswer(mix, answerMix ?? { [choice]: 1 });
        accuracy = scored.accuracy;
        kind = scored.verdict;
      } else {
        accuracy = scoreRecall(mix, choice);
        kind = accuracy === 1 ? 'right' : accuracy > 0 ? 'mix' : 'wrong';
      }
      const outcome = { accuracy, responseMs: untimed ? untimedMs(targetMs) : responseMs, targetMs };
      haptic(VERDICTS[kind].haptic);
      setAnswer({ choice, label: label ?? labels[choice], outcome, kind });
      onAnswer(outcome);
    },
    [answer, mix, targetMs, onAnswer, untimed, mixes, labels],
  );

  // Keyboard on laptops: 1, 2, 3 pick an action; Enter or Space moves on.
  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Never hijack a key meant for another control, such as Save or the tab bar.
      if (e.target instanceof Element && e.target.closest('input, select, textarea, button, a')) return;
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
  }, [answer, choices, choose, onNext, shortcuts]);

  useEffect(() => {
    if (answer)
      revealRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }, [answer]);

  const kind = answer?.kind;
  const verdict = kind ? VERDICTS[kind] : undefined;
  const fast = answer && answer.outcome.responseMs <= targetMs;

  return (
    <div className="stack">
      <div className={`card stack ${kind === 'right' ? 'flash-good' : kind ? 'flash-bad' : ''}`} style={{ gap: '0.8rem' }}>
        {!compact && (
          <>
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
              {chart.spec.basis === 'exploit' && <span className="pill pill-exploit">Exploit</span>}
            </div>
            <SeatStrip spec={chart.spec} />
          </>
        )}
        {/* After an answer the hand shrinks, so the full chart fits above the Next button. */}
        <div className={`row felt-strip${answer ? ' answered' : ''}`} style={{ justifyContent: 'center', gap: 12 }}>
          {combo.map((c, i) => (
            <PlayingCard key={c} card={c} size={answer ? 'md' : 'lg'} flip delayMs={i * 90} />
          ))}
        </div>
        {/* Speed bar: drains over the time an answer still counts as "Good". */}
        <div className="progress" style={{ height: 4, opacity: answer || untimed ? 0 : 1, transition: 'opacity 200ms' }} aria-hidden="true">
          <span
            style={{
              width: '100%',
              animation: `drain ${targetMs * 2.5}ms linear ${FLIP_MS}ms both`,
              animationPlayState: answer ? 'paused' : 'running',
            }}
          />
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {answer && verdict ? `${verdict.text}. ${describeMix(hand, mix)}.` : ''}
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
            {!untimed && <span className={`pill ${fast && kind === 'right' ? 'pill-good' : ''} num`}>{(answer.outcome.responseMs / 1000).toFixed(1)}s</span>}
          </div>
          <div className="row between">
            <strong style={{ fontSize: '1.1rem' }}>{hand}</strong>
            <span className="footnote">
              You chose {answer.label}
            </span>
          </div>
          <MixBar mix={mix} labels={labels} />
          <RangeGrid mixes={chart.mixes} reach={chart.reach} selected={hand} />
        </div>
      )}

      <BottomBar>
        {!answer ? (
          <div className="stack" style={{ gap: 8 }}>
          {mixedOptions.length > 0 && (
            <div className="mix-answers" role="group" aria-label="Mixed answers">
              {mixedOptions.map((o) => (
                <button key={o.id} className="mix-answer" data-haptic="off" onClick={() => choose(o.id, o.mix, o.label)}>
                  <MixDots mix={o.mix} />
                  {o.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))`, gap: 8 }}>
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
                {shortcuts && <kbd className="kbd">{i + 1}</kbd>}
              </button>
            ))}
          </div>
          </div>
        ) : (
          <button className="btn btn-primary btn-lg btn-block swap-in" onClick={onNext} autoFocus aria-keyshortcuts="Enter">
            {nextLabel}
          </button>
        )}
      </BottomBar>
    </div>
  );
}

/** A small bar showing the split a mixed answer stands for. */
function MixDots({ mix }: { mix: HandMix }) {
  const parts = Object.entries(mix).filter(([a]) => a !== 'fold');
  const fold = 1 - parts.reduce((t, [, f]) => t + f, 0);
  return (
    <span className="mix-answer-bar" aria-hidden="true">
      {parts.map(([a, f]) => (
        <span key={a} style={{ width: `${f * 100}%`, background: actionColor(a) }} />
      ))}
      {fold > 1e-9 && <span style={{ width: `${fold * 100}%`, background: actionColor('fold'), opacity: 0.35 }} />}
    </span>
  );
}
