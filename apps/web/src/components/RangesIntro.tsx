import { type Chart, DEFAULT_SETTINGS, type GameSettings, type HandClass, PRESETS, sameGame, stakesLabel } from '@felt/core';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { actionLabels } from '../drills/labels';
import { chartsForGame, getChart } from '../state/charts';
import { lessonPath } from '../state/lessons';
import { useSettings } from '../state/settings';
import { BrushIcon, CheckIcon, ChevronRightIcon, DrillsIcon, RangesIcon } from '../ui/icons';
import { actionColor, sortActions } from './actionColors';
import { gameLine } from './GameSheet';
import { MixBar } from './MixBar';
import { RangeGrid } from './RangeGrid';

const KEY = 'felt.rangesIntro';
/** Remembers the intro for this session when storage is blocked, so it never loops. */
let seenThisSession = false;

/** True once the player has finished or skipped the Ranges intro. */
export function rangesIntroSeen(): boolean {
  if (seenThisSession) return true;
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markRangesIntroSeen() {
  seenThisSession = true;
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Private mode or blocked storage: the session flag still holds.
  }
}


/** A player who never touched the game still has the default one, so we ask which game to match. */
export function hasDefaultGame(game: GameSettings): boolean {
  return sameGame(game, DEFAULT_SETTINGS);
}

/** Plain names for the presets. The preset settings stay in @felt/core. */
export const GAME_CHOICES: { id: string; title: string }[] = [
  { id: 'live-1-3', title: 'Small live game' },
  { id: 'live-2-5', title: 'Bigger live game' },
  { id: 'online-6max', title: 'Online 6-max' },
  { id: 'mtt-9max', title: 'Tournaments' },
];

const LESSONS = [
  { key: 'basics/first-strategy/starting-hands', title: 'Starting hands' },
  { key: 'basics/first-strategy/ranges', title: 'What a range is' },
];

type Step = 'chart' | 'colors' | 'use' | 'game';

/** Charts for the pictures: the player's own game when it has them, a 9 handed chart otherwise. */
export function introCharts(game: GameSettings): { open?: Chart; defend?: Chart } {
  const { charts } = chartsForGame(game);
  const open = charts.find((c) => c.spec.spot === 'rfi' && c.spec.hero === 'BTN') ?? getChart('9max-100-rfi-btn');
  const defend = charts.find((c) => c.spec.spot === 'vs-open' && c.spec.hero === 'BB') ?? getChart('9max-100-bb-vs-btn');
  return { open, defend };
}

/** A hand the chart plays two ways, each at least a quarter of the time. Familiar hands first. */
export function splitHand(chart: Chart): HandClass {
  const familiar = ['A5s', 'KJo', 'A9s', 'QTs', 'K9s', 'T9s', 'ATo', '98s', 'J9s', 'KTs', '66', 'A4s'];
  const isSplit = (h: HandClass) => {
    const mix = chart.mixes.get(h) ?? {};
    return Object.values(mix).filter((f) => f >= 0.25).length >= 2;
  };
  return familiar.find(isSplit) ?? [...chart.mixes.keys()].find(isSplit) ?? 'A5s';
}

/** A hand the chart always plays one way that is not a fold. */
function pureHand(chart: Chart): HandClass {
  return ['AA', 'KK', 'AKs'].find((h) => Object.entries(chart.mixes.get(h) ?? {}).some(([a, f]) => a !== 'fold' && f === 1)) ?? 'AA';
}

/**
 * First visit to Ranges: what a chart is, how to read its colors, what to
 * do here and, when the player never picked one, which game to match.
 */
export function RangesIntro({ open, askGame, onClose }: { open: boolean; askGame: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const steps: Step[] = ['chart', 'colors', 'use', ...(askGame ? (['game'] as const) : [])];
  const current = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setStep(0);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // Focus the step title on open and on each step, so the new step is announced.
  useEffect(() => {
    if (!open || !ref.current) return;
    ref.current.scrollTop = 0;
    ref.current.querySelector<HTMLElement>('.intro-title')?.focus({ preventScroll: true });
  }, [open, current]);

  const finish = () => {
    markRangesIntroSeen();
    onClose();
  };

  // Skipping still asks the one question we need, then lets the player go.
  const skip = () => (askGame && current !== 'game' ? setStep(steps.length - 1) : finish());

  return (
    <dialog
      ref={ref}
      className="sheet ranges-intro"
      aria-label="How charts work"
      onClose={finish}
      onClick={(e) => {
        if (e.target === ref.current) finish();
      }}
    >
      <div className="sheet-body intro-body">
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="intro-head">
          {step > 0 ? (
            <button type="button" className="btn btn-plain" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {!last && (
            <button type="button" className="btn btn-plain" onClick={skip}>
              Skip
            </button>
          )}
        </div>

        <div key={current} className="intro-step reveal">
          {current === 'chart' && <ChartStep />}
          {current === 'colors' && <ColorsStep />}
          {current === 'use' && <UseStep onLeave={finish} />}
          {current === 'game' && <GameStep />}
        </div>

        <div className="intro-foot">
          <div className="value-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s} className={i === step ? 'on' : undefined} />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            Step {step + 1} of {steps.length}
          </span>
          <button type="button" className="btn btn-primary btn-lg btn-block" data-intro-next onClick={() => (last ? finish() : setStep((s) => s + 1))}>
            {last ? 'Show me the charts' : 'Next'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Step 1: the grid itself, with the three regions named on the picture. */
function ChartStep() {
  const { settings } = useSettings();
  const { open } = introCharts(settings.game);
  return (
    <>
      <h2 className="intro-title" tabIndex={-1}>Read a chart</h2>
      <p className="intro-lead">A chart shows all 169 starting hands.</p>
      {open && (
        <figure className="intro-figure">
          <div className="intro-grid" {...({ inert: '' } as object)}>
            <RangeGrid mixes={open.mixes} reach={open.reach} />
            <span className="intro-tag intro-tag-suited" aria-hidden="true">
              Suited
            </span>
            <span className="intro-tag intro-tag-pairs" aria-hidden="true">
              Pairs
            </span>
            <span className="intro-tag intro-tag-offsuit" aria-hidden="true">
              Offsuit
            </span>
          </div>
          <figcaption className="footnote">{open.spec.title}</figcaption>
        </figure>
      )}
      <ul className="intro-keys">
        <li>
          <span className="intro-cell">AA</span>
          <span>Pairs run down the diagonal.</span>
        </li>
        <li>
          <span className="intro-cell">AKs</span>
          <span>Suited hands sit above it.</span>
        </li>
        <li>
          <span className="intro-cell">AKo</span>
          <span>Offsuit hands sit below it.</span>
        </li>
      </ul>
    </>
  );
}

/** One big cell, drawn like a grid cell, so a split reads clearly. */
function BigCell({ hand, chart }: { hand: HandClass; chart: Chart }) {
  const mix = chart.mixes.get(hand) ?? { fold: 1 };
  return (
    <span className="intro-big-cell" aria-hidden="true">
      {sortActions(Object.keys(mix)).map((a) => (
        <span key={a} style={{ width: `${mix[a] * 100}%`, background: actionColor(a), opacity: a === 'fold' ? 0.22 : 0.95 }} />
      ))}
      <span className="intro-big-label">{hand}</span>
    </span>
  );
}

/** Step 2: each action has a color, and a split cell is a mix. */
function ColorsStep() {
  const { settings } = useSettings();
  const { defend } = introCharts(settings.game);
  if (!defend) return null;
  const labels = actionLabels(defend);
  const pure = pureHand(defend);
  const split = splitHand(defend);
  const ways = (h: HandClass) => Object.values(defend.mixes.get(h) ?? {}).filter((f) => f > 0).length;
  const legend = ['raise', '3bet', 'call', 'fold'];
  const names: Record<string, string> = { raise: 'Raise', '3bet': '3bet', call: 'Call', fold: 'Fold' };

  return (
    <>
      <h2 className="intro-title" tabIndex={-1}>Read the colors</h2>
      <p className="intro-lead">Each action has its own color.</p>
      <ul className="intro-legend" aria-label="Action colors">
        {legend.map((a) => (
          <li key={a}>
            <span className="intro-swatch" style={{ background: actionColor(a), opacity: a === 'fold' ? 0.4 : 1 }} aria-hidden="true" />
            {names[a]}
          </li>
        ))}
      </ul>

      <div className="intro-pair">
        <div className="intro-pair-item">
          <BigCell hand={pure} chart={defend} />
          <span className="intro-pair-name">One color</span>
          <span className="footnote">{pure} plays one way</span>
        </div>
        <div className="intro-pair-item">
          <BigCell hand={split} chart={defend} />
          <span className="intro-pair-name">Split cell</span>
          <span className="footnote">
            {split} plays {ways(split) === 3 ? '3' : 'two'} ways
          </span>
        </div>
      </div>

      <p className="intro-text">A split cell means the strategy plays that hand more than one way.</p>
      <div className="intro-mix">
        <div className="row between">
          <strong>{split}</strong>
          <span className="footnote">{defend.spec.title}</span>
        </div>
        <MixBar mix={defend.mixes.get(split) ?? { fold: 1 }} labels={labels} />
      </div>
      <p className="intro-text">The bar shows how often it takes each action.</p>
    </>
  );
}

/** Step 3: what each mode is for, and where to learn the basics. */
function UseStep({ onLeave }: { onLeave: () => void }) {
  const rows = [
    { icon: <RangesIcon size={20} />, title: 'Look up a hand', body: 'Tap any cell to see its mix.', mode: 'Chart' },
    { icon: <DrillsIcon size={20} />, title: 'Quiz yourself', body: 'Answer the close calls.', mode: 'Quiz' },
    { icon: <BrushIcon size={20} />, title: 'Paint the chart', body: 'Fill it in from memory.', mode: 'Paint' },
  ];
  return (
    <>
      <h2 className="intro-title" tabIndex={-1}>Practice here</h2>
      <p className="intro-lead">Learn a chart in 3 ways.</p>
      <div className="list intro-list">
        {rows.map((r) => (
          <div key={r.title} className="list-row">
            <span className="intro-icon" aria-hidden="true">
              {r.icon}
            </span>
            <span className="grow">
              <span className="intro-row-title">{r.title}</span>
              <span className="footnote">{r.body}</span>
            </span>
            <span className="pill">{r.mode}</span>
          </div>
        ))}
      </div>
      <h3 className="section-title intro-section">New to charts?</h3>
      <div className="list">
        {LESSONS.map((l) => (
          <Link key={l.key} to={lessonPath(l.key)} className="list-row" onClick={onLeave}>
            <span className="grow">
              <span className="intro-row-title">{l.title}</span>
              <span className="footnote">Basics lesson</span>
            </span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
        ))}
      </div>
    </>
  );
}

/** Step 4, first visit only: which game the charts should match. Saves like the game sheet. */
function GameStep() {
  const { settings, update } = useSettings();
  const choices = GAME_CHOICES.filter((c) => PRESETS[c.id]);
  return (
    <>
      <h2 className="intro-title" tabIndex={-1}>Which game should charts match?</h2>
      <p className="intro-lead">Good play changes with table size and stack depth.</p>
      <div className="list" role="radiogroup" aria-label="Your game">
        {choices.map((c) => {
          const p = PRESETS[c.id].settings;
          const on = sameGame(p, settings.game);
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              className="list-row"
              data-haptic="select"
              data-game-option={c.id}
              onClick={() => update({ ...settings, game: { ...p, openBb: settings.game.openBb } })}
            >
              <span className="grow">
                <span className="intro-row-title">{c.title}</span>
                <span className="footnote">
                  {p.format === 'cash' ? `${stakesLabel(p.stakes)} · ` : ''}
                  {gameLine(p)}
                </span>
              </span>
              {on && <CheckIcon size={20} style={{ color: 'var(--tint)' }} />}
            </button>
          );
        })}
      </div>
      <p className="intro-text">Change it any time with the game button at the top.</p>
    </>
  );
}
