import type { ArtTone, LessonArt as Art } from '@felt/content';
import { actionFrequencies, type Card, gridHandClass, parseCards, positionsFor, rankOf, simulateResults, suitOf } from '@felt/core';
import type { CSSProperties } from 'react';
import { actionColor, sortActions } from '../components/actionColors';
import { PlayingCard } from '../components/PlayingCard';
import { getChart } from '../state/charts';
import { useCountUp } from '../ui/useCountUp';
import './art.css';

/**
 * Lesson illustrations, drawn in the brand style: spruce felt, brass accents,
 * warm neutrals and the solver's action colors. Every kind works as a cover
 * (`sm` on the learn hero, `md` on lesson cards and the lesson intro) and as a
 * full width `step`. Covers scale with their box through container units.
 *
 * Motion explains: rings fill, bars grow, seats light up in action order and
 * cards are dealt. It runs only on lesson screens, never on a page of covers.
 */

export type ArtSize = 'sm' | 'md' | 'step';

interface Props {
  art: Art;
  size?: ArtSize;
}

export function LessonArt({ art, size = 'step' }: Props) {
  const step = size === 'step';
  const className = ['art', `art-k-${art.kind}`, `art-${size}`, step && 'art-anim', step && art.kind !== 'cards' && 'art-panel'].filter(Boolean).join(' ');
  return (
    <div className={className} role="img" aria-label={describeArt(art)}>
      <ArtBody art={art} size={size} />
    </div>
  );
}

function ArtBody({ art, size }: { art: Art; size: ArtSize }) {
  switch (art.kind) {
    case 'figure':
      return <FigureArt text={art.text} caption={art.caption} />;
    case 'chart':
      return size === 'step' ? <ChartStep chartId={art.chartId} /> : <ChartCover chartId={art.chartId} />;
    case 'cards':
      return <CardsArt cards={art.cards} board={art.board} step={size === 'step'} />;
    case 'ring':
      return <RingArt value={art.value} label={art.label} caption={art.caption} count={size === 'step'} />;
    case 'bars':
      return <BarsArt bars={art.bars} unit={art.unit} />;
    case 'table':
      return <TableArt {...art} step={size === 'step'} />;
    case 'streets':
      return size === 'step' ? <StreetsStep active={art.active} /> : <StreetsArt active={art.active} cover />;
    case 'ladder':
      return <LadderArt rungs={art.rungs} step={size === 'step'} />;
    case 'chips':
      return <ChipsArt stacks={art.stacks} />;
    case 'tree':
      return size === 'step' ? <TreeStep root={art.root} branches={art.branches} /> : <TreeArt root={art.root} branches={art.branches} />;
    case 'curve':
      return <CurveArt {...art} cover={size !== 'step'} />;
    case 'paths':
      return <PathsArt {...art} cover={size !== 'step'} />;
  }
}

/* Shared helpers ---------------------------------------------------------- */

const MINUS = '−';

/** One decimal at most (two below 1), trailing zeros dropped, and a true minus sign. */
export function formatNumber(n: number, signed = false): string {
  const digits = Math.abs(n) < 1 ? 2 : 1;
  const factor = 10 ** digits;
  const r = Math.round(n * factor) / factor;
  const body = String(Math.abs(r));
  if (r < 0) return MINUS + body;
  return (signed && r > 0 ? '+' : '') + body;
}

function withUnit(n: number, unit?: 'bb' | '%', signed = false): string {
  return formatNumber(n, signed) + (unit ?? '');
}

function safeCards(text?: string): Card[] {
  if (!text) return [];
  try {
    return parseCards(text);
  } catch {
    return [];
  }
}

function safePositions(seats: number): string[] {
  try {
    return positionsFor(seats);
  } catch {
    return [];
  }
}

const RANK_NAME: Record<string, string> = {
  A: 'ace',
  K: 'king',
  Q: 'queen',
  J: 'jack',
  T: 'ten',
  '9': 'nine',
  '8': 'eight',
  '7': 'seven',
  '6': 'six',
  '5': 'five',
  '4': 'four',
  '3': 'three',
  '2': 'two',
};
const SUIT_NAME: Record<string, string> = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' };

export function cardName(card: Card): string {
  return `${RANK_NAME[rankOf(card)]} of ${SUIT_NAME[suitOf(card)]}`;
}

const cardList = (cards: Card[]) => cards.map(cardName).join(', ');

/** Fills use the solver's action colors, so a red bar means the same as a red cell. */
const TONE_FILL: Record<ArtTone, string> = {
  brass: 'var(--art-accent)',
  green: actionColor('call'),
  red: actionColor('raise'),
  gray: actionColor('fold'),
  purple: actionColor('3bet'),
};

const toneFill = (tone?: ArtTone) => TONE_FILL[tone ?? 'brass'];

/** "Equity to call, %" reads as the title "Equity to call" with percent ticks. */
function axisLabel(label: string): { title: string; pct: boolean } {
  const pct = /%\)?\s*$/.test(label);
  return { title: pct ? label.replace(/[\s,(]*%\)?\s*$/, '').trim() : label, pct };
}

const STREETS = [
  { id: 'preflop', name: 'Preflop', cards: 2 },
  { id: 'flop', name: 'Flop', cards: 3 },
  { id: 'turn', name: 'Turn', cards: 1 },
  { id: 'river', name: 'River', cards: 1 },
  { id: 'showdown', name: 'Showdown', cards: 2 },
] as const;

/** The plain words a screen reader hears for each illustration. */
export function describeArt(art: Art): string {
  switch (art.kind) {
    case 'figure':
      return [art.text, art.caption].filter(Boolean).join(', ');
    case 'chart': {
      const chart = getChart(art.chartId);
      if (!chart) return 'Hand chart';
      const freqs = actionFrequencies(chart);
      const parts = sortActions(Object.keys(freqs))
        .filter((a) => freqs[a] >= 0.0005)
        .map((a) => `${actionLabel(chart.spec.actions, a)} ${formatNumber(freqs[a] * 100)}% of hands`);
      const approx = chart.spec.source === 'starter-approx' ? ' Starter chart, approximate.' : '';
      return `Hand chart: ${chart.spec.title}. ${parts.join(', ')}.${approx}`;
    }
    case 'cards': {
      const hole = safeCards(art.cards);
      const board = safeCards(art.board);
      return [hole.length ? `Your hand: ${cardList(hole)}.` : '', board.length ? `Board: ${cardList(board)}.` : ''].filter(Boolean).join(' ');
    }
    case 'ring': {
      const pct = `${formatNumber(art.value * 100)}%`;
      return `${pct} ${ringLabel(art.label, art.value)}.${art.caption ? ` ${art.caption}.` : ''}`;
    }
    case 'bars': {
      const signed = art.bars.some((b) => b.value < 0);
      return `Bar chart. ${art.bars.map((b) => `${b.label}: ${withUnit(b.value, art.unit, signed)}`).join('. ')}.`;
    }
    case 'table': {
      const parts = [`A ${art.seats}-handed table seen from above.`];
      if (art.hero) parts.push(`You are in the ${art.hero}.`);
      if (art.button && art.button !== art.hero) parts.push(`The button is the ${art.button}.`);
      if (art.button && art.button === art.hero) parts.push('You have the button.');
      if (art.highlight?.length) parts.push(`Marked seats: ${art.highlight.join(', ')}.`);
      if (art.note) parts.push(`${art.note}.`);
      return parts.join(' ');
    }
    case 'streets': {
      const active = STREETS.find((s) => s.id === art.active);
      return `The streets of a hand in order: preflop, flop, turn, river, then showdown.${active ? ` Now: ${active.name.toLowerCase()}.` : ''}`;
    }
    case 'ladder':
      return `Hand rankings from best to worst: ${art.rungs.map((r) => r.name).join(', ')}.`;
    case 'chips':
      return `Chip stacks: ${art.stacks.map((s) => `${s.label} ${formatNumber(s.bb)}bb`).join(', ')}.`;
    case 'tree':
      return `${art.root}. ${art.branches.map((b) => (b.value ? `${b.label}: ${b.value}` : b.label)).join('. ')}.`;
    case 'curve': {
      const x = axisLabel(art.xLabel);
      const y = axisLabel(art.yLabel);
      const pts = [...art.points].sort((a, b) => a[0] - b[0]);
      const fx = (v: number) => formatNumber(v) + (x.pct ? '%' : '');
      const fy = (v: number) => formatNumber(v) + (y.pct ? '%' : '');
      const from = pts[0];
      const to = pts[pts.length - 1];
      const range = from && to ? ` It goes from ${fy(from[1])} at ${fx(from[0])} to ${fy(to[1])} at ${fx(to[0])}.` : '';
      const mark = art.mark ? ` Marked: ${fy(art.mark[1])} at ${fx(art.mark[0])}.` : '';
      return `Line chart of ${y.title.toLowerCase()} against ${x.title.toLowerCase()}.${range}${mark}`;
    }
    case 'paths': {
      const sim = simulateResults(art);
      const k = pathsScale(art.unit);
      const unit = art.unit === 'buy ins' ? ' buy ins' : 'bb';
      const ends = sim.paths.map((p) => p[p.length - 1] * k).sort((a, b) => a - b);
      const behind = ends.filter((e) => e < 0).length;
      const last = sim.hands.length - 1;
      const spread = ends.length ? ` Final results run from ${formatNumber(ends[0], true)}${unit} to ${formatNumber(ends[ends.length - 1], true)}${unit}. ${behind} of ${ends.length} end behind.` : '';
      return `Simulated from the model: ${ends.length} players who all have a true win rate of ${formatNumber(art.winRate)}bb/100 and SD ${formatNumber(art.sd100)}bb/100, over ${art.hands.toLocaleString('en-US')} hands.${spread} 95% of results land between ${formatNumber(sim.low[last] * k, true)}${unit} and ${formatNumber(sim.high[last] * k, true)}${unit}. The dashed line is the expected result.`;
    }
  }
}

function actionLabel(actions: { id: string; label: string }[], id: string): string {
  if (id === 'fold') return 'Fold';
  return actions.find((a) => a.id === id)?.label ?? id;
}

/** A label that repeats the ring's number ("25% to call") shows only its words under the ring. */
function ringLabel(label: string, value: number): string {
  const pct = formatNumber(value * 100).replace(MINUS, '-');
  const rest = label.replace(new RegExp(`^\\s*${pct.replace('.', '\\.')}\\s*%\\s*`), '').trim();
  return rest || label;
}

/* Figure ------------------------------------------------------------------ */

function FigureArt({ text, caption }: { text: string; caption?: string }) {
  return (
    <div className="art-figure">
      <span className="display cover-figure art-figure-num">{text}</span>
      {caption && <span className="art-figure-caption">{caption}</span>}
    </div>
  );
}

/* Chart ------------------------------------------------------------------- */

const HANDS = Array.from({ length: 169 }, (_, i) => gridHandClass(Math.floor(i / 13), i % 13));

/** The cover grid: brass where the chart plays a hand, stronger the more often it does. */
function ChartCover({ chartId }: { chartId: string }) {
  const chart = getChart(chartId);
  return (
    <div className="cover-grid">
      {HANDS.map((hand) => {
        // A hand with no fold entry never folds: it plays 100%.
        const mix = chart?.mixes.get(hand);
        const play = mix ? 1 - (mix.fold ?? 0) : 0;
        return <span key={hand} style={{ opacity: play > 0 ? 0.45 + play * 0.55 : 1 }} className={play > 0 ? 'on' : undefined} />;
      })}
    </div>
  );
}

/** The full chart, split by action like the range grid, with a legend of how often each action happens. */
function ChartStep({ chartId }: { chartId: string }) {
  const chart = getChart(chartId);
  if (!chart) return null;
  const freqs = actionFrequencies(chart);
  const actions = sortActions(Object.keys(freqs)).filter((a) => freqs[a] >= 0.0005);
  return (
    <div className="art-chart">
      <div className="range-grid art-range">
        {HANDS.map((hand, i) => {
          const mix = chart.mixes.get(hand) ?? { fold: 1 };
          const segments = sortActions(Object.keys(mix));
          const plays = segments.some((a) => a !== 'fold');
          const unreached = chart.reach && !chart.reach.has(hand);
          return (
            <span
              key={hand}
              className={`range-cell${plays ? ' plays' : ''}${unreached ? ' unreached' : ''}`}
              style={{ '--wave': Math.floor(i / 13) + (i % 13) } as CSSProperties}
            >
              {segments.map((a) => (
                <span key={a} className="seg" style={{ width: `${mix[a] * 100}%`, backgroundColor: actionColor(a), opacity: a === 'fold' ? 0.22 : 0.95 }} />
              ))}
              <span className="label">{hand}</span>
            </span>
          );
        })}
      </div>
      <div className="art-legend">
        {actions.map((a) => (
          <span key={a}>
            <i style={{ background: actionColor(a), opacity: a === 'fold' ? 0.5 : 1 }} />
            {actionLabel(chart.spec.actions, a)} <b>{formatNumber(freqs[a] * 100)}%</b>
          </span>
        ))}
      </div>
      {chart.spec.source === 'starter-approx' && <div className="art-note">{chart.spec.title}. Starter chart, approximate.</div>}
    </div>
  );
}

/* Cards ------------------------------------------------------------------- */

function CardsArt({ cards, board, step }: { cards: string; board?: string; step: boolean }) {
  const hole = safeCards(cards);
  const shared = safeCards(board);
  if (step) {
    const boardSize = hole.length ? 'md' : shared.length <= 3 ? 'lg' : 'md';
    return (
      <div className="lesson-felt art-felt">
        {shared.length > 0 && (
          <div className="art-row">
            {shared.map((c, i) => (
              <PlayingCard key={c} card={c} size={boardSize} deal delayMs={80 + i * 80} />
            ))}
          </div>
        )}
        {hole.length > 0 && (
          <div className="art-row art-hole">
            {hole.map((c, i) => (
              <PlayingCard key={c} card={c} size="lg" flip delayMs={(shared.length ? 160 + shared.length * 80 : 0) + i * 90} />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`art-cards${shared.length ? ' with-board' : ''}${hole.length ? '' : ' board-only'}`}>
      {shared.length > 0 && (
        <div className="art-board">
          {shared.map((c) => (
            <PlayingCard key={c} card={c} size={hole.length || shared.length > 3 ? 'sm' : 'md'} />
          ))}
        </div>
      )}
      {hole.length > 0 && (
        <div className={shared.length ? 'art-row art-hole' : 'art-fan'}>
          {hole.map((c) => (
            <PlayingCard key={c} card={c} size="md" />
          ))}
        </div>
      )}
    </div>
  );
}

/* Ring -------------------------------------------------------------------- */

const RING_R = 50;
const RING_C = 2 * Math.PI * RING_R;

function RingArt({ value, label, caption, count }: { value: number; label: string; caption?: string; count: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  const pct = v * 100;
  const counted = useCountUp(pct, 900);
  // While counting, keep the final number's precision so the digits do not jitter.
  const shown = count ? (Number.isInteger(Math.round(pct * 10) / 10) ? String(Math.round(counted)) : counted.toFixed(1)) : formatNumber(pct);
  return (
    <div className="art-ring">
      <svg className="art-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r={RING_R} />
        {v > 0 && (
          <circle
            className="ring-arc"
            cx="60"
            cy="60"
            r={RING_R}
            transform="rotate(-90 60 60)"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - v)}
            style={{ '--circ': RING_C } as CSSProperties}
          />
        )}
        <text className="ring-num display" x="60" y="62" textAnchor="middle" dominantBaseline="middle">
          {shown}
          <tspan className="ring-pct">%</tspan>
        </text>
      </svg>
      <div className="art-ring-text">
        <div className="art-ring-label">{ringLabel(label, value)}</div>
        {caption && <div className="art-ring-caption">{caption}</div>}
      </div>
    </div>
  );
}

/* Bars -------------------------------------------------------------------- */

function BarsArt({ bars, unit }: { bars: { label: string; value: number; tone?: ArtTone }[]; unit?: 'bb' | '%' }) {
  const values = bars.map((b) => b.value);
  const signed = values.some((v) => v < 0);
  const maxPos = Math.max(0, ...values);
  const maxNeg = Math.max(0, ...values.map((v) => -v));
  // A zero based axis scaled to the longest bar: heights stay proportional to the values.
  const span = maxPos + maxNeg || 1;
  const zero = (maxNeg / span) * 100;
  const cols = { '--n': bars.length } as CSSProperties;
  return (
    <div className={`art-bars${signed ? ' signed' : ''}`}>
      <div className="art-bars-plot" style={cols}>
        <div className="art-zero" style={{ bottom: `${zero}%` }} />
        {bars.map((b, i) => {
          const h = (Math.abs(b.value) / span) * 100;
          const up = b.value >= 0;
          const delay = { animationDelay: `${120 + i * 90}ms` };
          return (
            <div key={i} className="art-bar-col">
              <div
                className={`art-bar ${up ? 'up' : 'down'}`}
                style={{ ...delay, background: toneFill(b.tone), height: `${h}%`, ...(up ? { bottom: `${zero}%` } : { top: `${100 - zero}%` }) }}
              />
              <div
                className={`art-bar-value ${up ? 'up' : 'down'} tone-${b.tone ?? 'brass'}`}
                style={{ ...delay, ...(up ? { bottom: `${zero + h}%` } : { top: `${100 - zero + h}%` }) }}
              >
                {withUnit(b.value, unit, signed)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="art-bars-labels" style={cols}>
        {bars.map((b, i) => (
          <div key={i} className="art-bar-label">
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Table ------------------------------------------------------------------- */

/**
 * Two drawings of the same table. The cover is wide and small; at step size the
 * table is taller and the seat names are set large enough to read at a glance.
 */
const TABLE_GEO = {
  cover: { w: 360, h: 224, rail: [124, 68], felt: [118, 62], line: [94, 44], seat: [148, 92], puck: [100, 52], you: 48, pill: 20, font: 7, minW: 38, pad: 14, chip: 8.5 },
  step: { w: 360, h: 300, rail: [122, 92], felt: [116, 86], line: [92, 64], seat: [146, 124], puck: [96, 70], you: 50, pill: 28, font: 9.4, minW: 48, pad: 20, chip: 11 },
} as const;

function TableArt({ seats, button, hero, highlight, note, step = false }: { seats: number; button?: string; hero?: string; highlight?: string[]; note?: string; step?: boolean }) {
  const g = TABLE_GEO[step ? 'step' : 'cover'];
  const cx = g.w / 2;
  const cy = g.h / 2;
  // Action order runs clockwise: UTG ... BTN, SB, BB.
  const names = safePositions(seats);
  const n = names.length;
  if (n === 0) return null;
  const anchor = Math.max(0, names.indexOf(hero ?? button ?? names[n - 1]));
  // Hero sits at the bottom; on screen, increasing angles run clockwise.
  const at = (i: number, [rx, ry]: readonly number[]): [number, number] => {
    const a = Math.PI / 2 + ((i - anchor) * 2 * Math.PI) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  };
  const lit = new Set(highlight ?? []);
  const dimOthers = lit.size > 0;
  const btn = button ? names.indexOf(button) : -1;
  // The puck sits just past the button seat, or before it when you hold the button, so it never covers the "You" label.
  const chip = btn >= 0 ? at(btn + (button === hero ? -0.5 : 0.32), g.puck) : undefined;
  const heroAt = hero && names.includes(hero) ? at(names.indexOf(hero), g.seat) : undefined;
  return (
    <svg className={`art-table-svg${step ? ' table-step' : ''}`} viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true">
      <ellipse className="table-rail" cx={cx} cy={cy} rx={g.rail[0]} ry={g.rail[1]} />
      <ellipse className="table-felt" cx={cx} cy={cy} rx={g.felt[0]} ry={g.felt[1]} />
      <ellipse className="table-line" cx={cx} cy={cy} rx={g.line[0]} ry={g.line[1]} />
      {note && (
        <text className="table-note" x={cx} y={hero ? cy - 4 : cy} textAnchor="middle" dominantBaseline="middle">
          {note}
        </text>
      )}
      {heroAt && (
        <text className="table-you" x={heroAt[0]} y={cy + g.you} textAnchor="middle">
          You
        </text>
      )}
      {chip && (
        <g className="table-dealer" style={{ animationDelay: `${120 + n * 55}ms` }}>
          <circle cx={chip[0]} cy={chip[1]} r={g.chip} />
          <text x={chip[0]} y={chip[1] + 0.5} textAnchor="middle" dominantBaseline="middle">
            D
          </text>
        </g>
      )}
      {names.map((name, i) => {
        const [x, y] = at(i, g.seat);
        const isHero = name === hero;
        const state = isHero ? 'hero' : lit.has(name) ? 'lit' : dimOthers ? 'dim' : 'plain';
        const w = Math.max(g.minW, name.length * g.font + g.pad);
        return (
          <g key={name} className={`table-seat seat-${state}`} style={{ animationDelay: `${80 + i * 55}ms` }}>
            <rect x={x - w / 2} y={y - g.pill / 2} width={w} height={g.pill} rx={g.pill / 2} />
            <text className="seat-text" x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="middle">
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* Streets ----------------------------------------------------------------- */

function StreetsArt({ active, cover }: { active?: (typeof STREETS)[number]['id']; cover: boolean }) {
  const a = STREETS.findIndex((s) => s.id === active);
  const x = (i: number) => 38 + i * 66;
  const y = 66;
  const len = x(Math.max(0, a)) - x(0);
  return (
    <>
      <svg className="art-streets-svg" viewBox={cover ? '14 20 312 84' : '0 0 340 112'} aria-hidden="true">
        <line className="street-track" x1={x(0)} y1={y} x2={x(4)} y2={y} />
        {a > 0 && <line className="street-done" x1={x(0)} y1={y} x2={x(0) + len} y2={y} pathLength="1" />}
        {STREETS.map((s, i) => {
          const state = a < 0 ? 'plain' : i < a ? 'past' : i === a ? 'now' : 'next';
          const w = 11;
          const gap = 3;
          const total = s.cards * w + (s.cards - 1) * gap;
          return (
            <g key={s.id} className={`street street-${state}`} style={{ animationDelay: `${100 + i * 110}ms` }}>
              {Array.from({ length: s.cards }, (_, k) => (
                <rect
                  key={k}
                  className={s.id === 'preflop' ? 'mini-back' : 'mini-face'}
                  x={x(i) - total / 2 + k * (w + gap)}
                  y={y - 40}
                  width={w}
                  height="15"
                  rx="2.5"
                />
              ))}
              {state === 'now' && <circle className="street-halo" cx={x(i)} cy={y} r="11" />}
              <circle className="street-dot" cx={x(i)} cy={y} r="6" />
              <text className="street-name" x={x(i)} y={y + 30} textAnchor="middle">
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
      {a >= 0 && <div className="art-streets-now">{STREETS[a].name}</div>}
    </>
  );
}

/** At step size the streets run down the screen, so every name is set at reading size. */
function StreetsStep({ active }: { active?: (typeof STREETS)[number]['id'] }) {
  const a = STREETS.findIndex((s) => s.id === active);
  return (
    <ol className="art-streets-list">
      {STREETS.map((s, i) => {
        const state = a < 0 ? 'plain' : i < a ? 'past' : i === a ? 'now' : 'next';
        return (
          <li key={s.id} className={`street street-${state}`} style={{ animationDelay: `${100 + i * 90}ms` }}>
            <span className="street-node" />
            <span className="street-label">{s.name}</span>
            <span className="street-cards">
              {Array.from({ length: s.cards }, (_, k) => (
                <i key={k} className={s.id === 'preflop' ? 'mini-back' : 'mini-face'} />
              ))}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* Ladder ------------------------------------------------------------------ */

function LadderArt({ rungs, step }: { rungs: { name: string; cards: string; tone?: ArtTone }[]; step: boolean }) {
  if (!step) {
    // A staircase: the best hand on top, each rung a little shorter.
    return (
      <div className="art-stairs">
        {rungs.map((r, i) => (
          <span key={i} style={{ width: `${100 - (i * 62) / Math.max(1, rungs.length - 1)}%`, background: i === 0 ? toneFill(r.tone) : r.tone ? toneFill(r.tone) : 'var(--art-track-strong)' }} />
        ))}
      </div>
    );
  }
  return (
    <ol className="art-ladder">
      {rungs.map((r, i) => (
        <li key={i} style={{ animationDelay: `${80 + i * 70}ms` }}>
          <span className={`rung-n${r.tone || i === 0 ? ' filled' : ''}`} style={r.tone || i === 0 ? { background: toneFill(r.tone) } : undefined}>
            {i + 1}
          </span>
          <span className="rung-name">{r.name}</span>
          <span className="rung-cards">
            {safeCards(r.cards).map((c) => (
              <PlayingCard key={c} card={c} size="sm" />
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* Chips ------------------------------------------------------------------- */

const CHIP_MAX = 14;
const CHIP_T = 5;
const STACK_H = CHIP_MAX * CHIP_T + 36;
const STACK_TONES = ['var(--art-accent)', 'var(--art-spruce)', 'var(--gray)', 'var(--purple)'];

function ChipsArt({ stacks }: { stacks: { label: string; bb: number }[] }) {
  const max = Math.max(...stacks.map((s) => s.bb), 0) || 1;
  return (
    <div className="art-chips" style={{ '--n': stacks.length } as CSSProperties}>
      {stacks.map((s, i) => {
        const count = Math.max(1, Math.round((s.bb / max) * CHIP_MAX));
        const color = STACK_TONES[i % STACK_TONES.length];
        const base = STACK_H - 9;
        return (
          <div key={i} className="art-stack">
            <svg className="art-stack-svg" viewBox={`0 0 64 ${STACK_H}`} aria-hidden="true" style={{ '--chip': color } as CSSProperties}>
              <ellipse className="chip-shadow" cx="32" cy={base + 3} rx="27" ry="7" />
              {Array.from({ length: count }, (_, j) => {
                const top = base - (j + 1) * CHIP_T;
                return (
                  <g key={j} className="chip" style={{ animationDelay: `${i * 140 + j * 32}ms` }}>
                    <path className="chip-side" d={`M8 ${top} v${CHIP_T} a24 7.5 0 0 0 48 0 v-${CHIP_T} z`} />
                    <ellipse className="chip-top" cx="32" cy={top} rx="24" ry="7.5" />
                    <ellipse className="chip-edge" cx="32" cy={top} rx="18" ry="5.2" />
                  </g>
                );
              })}
              <text className="chip-value" x="32" y={base - count * CHIP_T - 15} textAnchor="middle">
                {formatNumber(s.bb)}bb
              </text>
            </svg>
            <div className="art-stack-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* Tree -------------------------------------------------------------------- */

function TreeArt({ root, branches }: { root: string; branches: { label: string; value?: string; tone?: ArtTone }[] }) {
  const n = branches.length;
  return (
    <div className="art-tree">
      <div className="tree-root">{root}</div>
      <div className="tree-linkbox">
      <svg className="tree-links" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true">
        {branches.map((_, i) => {
          const y = ((i + 0.5) / n) * 100;
          return <path key={i} d={`M0 50 C 22 50, 18 ${y}, 40 ${y}`} style={{ animationDelay: `${120 + i * 90}ms` }} />;
        })}
      </svg>
      </div>
      <div className="tree-branches">
        {branches.map((b, i) => (
          <div key={i} className="tree-slot">
            <div className={`tree-branch${b.value && b.value.length > 10 ? ' stack' : ''}`} style={{ animationDelay: `${220 + i * 90}ms`, '--tone': toneFill(b.tone) } as CSSProperties}>
              <span className="tree-label">{b.label}</span>
              {b.value && <span className={`tree-value tone-${b.tone ?? 'brass'}`}>{b.value}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** At step size the tree reads top down: the decision, then each outcome on its own full width row. */
function TreeStep({ root, branches }: { root: string; branches: { label: string; value?: string; tone?: ArtTone }[] }) {
  return (
    <div className="art-tree-v">
      <div className="tree-root">{root}</div>
      <ul className="tree-list">
        {branches.map((b, i) => (
          <li key={i} className="tree-item" style={{ animationDelay: `${180 + i * 90}ms`, '--tone': toneFill(b.tone) } as CSSProperties}>
            <span className={`tree-branch${b.value && b.value.length > 10 ? ' stack' : ''}`}>
              <span className="tree-label">{b.label}</span>
              {b.value && <span className={`tree-value tone-${b.tone ?? 'brass'}`}>{b.value}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Curve ------------------------------------------------------------------- */

const CW = 320;
const CH = 200;
// At step size the drawing is narrower than the panel, so its ticks and axis names render at reading size.
const STEP_W = 296;
const STEP_H = 216;
const PAD_STEP = { l: 42, r: 14, t: 30, b: 52 };
// Covers hide the axis text, so the plot can use the whole box.
const PAD_COVER = { l: 16, r: 16, t: 34, b: 18 };

function niceStep(range: number, target = 4): number {
  if (!(range > 0)) return 1;
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function ticks(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function CurveArt({ points, xLabel, yLabel, mark, cover }: { points: [number, number][]; xLabel: string; yLabel: string; mark?: [number, number]; cover: boolean }) {
  const PAD = cover ? PAD_COVER : PAD_STEP;
  const cw = cover ? CW : STEP_W;
  const ch = cover ? CH : STEP_H;
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  if (pts.length < 2) return null;
  const xl = axisLabel(xLabel);
  const yl = axisLabel(yLabel);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const ystep = niceStep(Math.max(...ys, 0) - Math.min(...ys, 0));
  const y0 = Math.floor(Math.min(0, ...ys) / ystep) * ystep;
  const y1 = Math.ceil(Math.max(0, ...ys) / ystep) * ystep || ystep;
  const sx = (x: number) => PAD.l + ((x - x0) / (x1 - x0 || 1)) * (cw - PAD.l - PAD.r);
  const sy = (y: number) => ch - PAD.b - ((y - y0) / (y1 - y0)) * (ch - PAD.t - PAD.b);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`).join(' ');
  const base = sy(Math.max(y0, Math.min(0, y1)));
  const area = `${line} L${sx(x1).toFixed(2)} ${base} L${sx(x0).toFixed(2)} ${base} Z`;
  const fx = (v: number) => formatNumber(v) + (xl.pct ? '%' : '');
  const fy = (v: number) => formatNumber(v) + (yl.pct ? '%' : '');
  const xt = ticks(x0, x1, niceStep(x1 - x0)).filter((v) => !mark || Math.abs(sx(v) - sx(mark[0])) > (cover ? 16 : 26));
  const yt = ticks(y0, y1, ystep);
  const mx = mark ? sx(mark[0]) : 0;
  const my = mark ? sy(mark[1]) : 0;
  const labelLeft = mark ? mx > cw - PAD.r - 70 : false;
  // Set the label on the side of the dot the line leaves free: below a rising line, above a falling one.
  const after = mark ? pts.find(([x]) => x > mark[0]) : undefined;
  const before = mark ? [...pts].reverse().find(([x]) => x < mark[0]) : undefined;
  const rising = mark ? ((after?.[1] ?? mark[1]) - (before?.[1] ?? mark[1])) * (labelLeft ? -1 : 1) > 0 : false;
  const labelY = rising ? my + 30 : my - 12;
  const tickY = ch - PAD.b + (cover ? 14 : 20);
  return (
    <svg className="art-curve-svg" viewBox={`0 0 ${cw} ${ch}`} aria-hidden="true">
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line className={v === 0 ? 'curve-zero' : 'curve-grid'} x1={PAD.l} x2={cw - PAD.r} y1={sy(v)} y2={sy(v)} />
          <text className="curve-tick" x={PAD.l - 7} y={sy(v)} textAnchor="end" dominantBaseline="middle">
            {fy(v)}
          </text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={`x${v}`} className="curve-tick" x={sx(v)} y={tickY} textAnchor="middle">
          {fx(v)}
        </text>
      ))}
      <text className="curve-axis" x={PAD.l - 8} y={14}>
        {yl.title}
      </text>
      <text className="curve-axis" x={(PAD.l + cw - PAD.r) / 2} y={ch - (cover ? 6 : 4)} textAnchor="middle">
        {xl.title}
      </text>
      <path className="curve-area" d={area} />
      <path className="curve-line" d={line} pathLength="1" />
      {mark && (
        <g className="curve-mark">
          <line className="curve-guide" x1={mx} x2={mx} y1={my} y2={ch - PAD.b} />
          <line className="curve-guide" x1={PAD.l} x2={mx} y1={my} y2={my} />
          <text className="curve-tick curve-tick-mark" x={mx} y={tickY} textAnchor="middle">
            {fx(mark[0])}
          </text>
          <circle className="curve-dot" cx={mx} cy={my} r="5" />
          <text className="curve-mark-label display" x={labelLeft ? mx - 10 : mx + 10} y={labelY} textAnchor={labelLeft ? 'end' : 'start'}>
            {fy(mark[1])}
          </text>
        </g>
      )}
    </svg>
  );
}

/* Paths ------------------------------------------------------------------- */

/** Paths are simulated in big blinds; a buy in is 100bb. */
function pathsScale(unit?: 'bb' | 'buy ins'): number {
  return unit === 'buy ins' ? 1 / 100 : 1;
}

const PAD_PATHS = { l: 46, r: 14, t: 30, b: 52 };

/**
 * Running results of simulated players who share one true win rate, with the
 * band where 95% of results land and the expected result as a dashed line.
 * Paths that end behind are drawn in red. The drawing says it is simulated.
 */
function PathsArt({
  winRate,
  sd100,
  hands,
  paths,
  seed,
  unit,
  cover,
}: {
  winRate: number;
  sd100: number;
  hands: number;
  paths: number;
  seed: number;
  unit?: 'bb' | 'buy ins';
  cover: boolean;
}) {
  const sim = simulateResults({ winRate, sd100, hands, paths, seed });
  if (sim.hands.length < 2 || !(hands > 0)) return null;
  const PAD = cover ? PAD_COVER : PAD_PATHS;
  const cw = cover ? CW : STEP_W;
  const ch = cover ? CH : STEP_H;
  const k = pathsScale(unit);
  const all = [...sim.paths.flat(), ...sim.low, ...sim.high, 0].map((v) => v * k);
  const ystep = niceStep(Math.max(...all) - Math.min(...all));
  const y0 = Math.floor(Math.min(...all) / ystep) * ystep;
  const y1 = Math.ceil(Math.max(...all) / ystep) * ystep || ystep;
  const x1 = hands;
  const sx = (x: number) => PAD.l + (x / x1) * (cw - PAD.l - PAD.r);
  const sy = (y: number) => ch - PAD.b - ((y * k - y0) / (y1 - y0)) * (ch - PAD.t - PAD.b);
  const line = (ys: number[]) => ys.map((y, i) => `${i ? 'L' : 'M'}${sx(sim.hands[i]).toFixed(1)} ${sy(y).toFixed(1)}`).join(' ');
  const band = `${line(sim.high)} ${[...sim.low]
    .map((y, i) => [y, i] as const)
    .reverse()
    .map(([y, i]) => `L${sx(sim.hands[i]).toFixed(1)} ${sy(y).toFixed(1)}`)
    .join(' ')} Z`;
  const xt = ticks(0, x1 / 1000, niceStep(x1 / 1000)).map((v) => v * 1000);
  const yt = ticks(y0, y1, ystep);
  const tickY = ch - PAD.b + (cover ? 14 : 20);
  return (
    <svg className="art-paths-svg" viewBox={`0 0 ${cw} ${ch}`} aria-hidden="true">
      <path className="paths-band" d={band} />
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line className={v === 0 ? 'curve-zero' : 'curve-grid'} x1={PAD.l} x2={cw - PAD.r} y1={sy(v / k)} y2={sy(v / k)} />
          <text className="curve-tick" x={PAD.l - 7} y={sy(v / k)} textAnchor="end" dominantBaseline="middle">
            {formatNumber(v)}
          </text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={`x${v}`} className="curve-tick" x={sx(v)} y={tickY} textAnchor="middle">
          {formatNumber(v / 1000)}
        </text>
      ))}
      <text className="curve-axis" x={PAD.l - 8} y={14}>
        {unit === 'buy ins' ? 'Result, buy ins' : 'Result, bb'}
      </text>
      <text className="curve-axis paths-tag" x={cw - PAD.r} y={14} textAnchor="end">
        Simulated
      </text>
      <text className="curve-axis" x={(PAD.l + cw - PAD.r) / 2} y={ch - (cover ? 6 : 4)} textAnchor="middle">
        Hands played, thousands
      </text>
      {sim.paths.map((p, i) => (
        <path
          key={i}
          className={p[p.length - 1] < 0 ? 'paths-line paths-line-behind' : 'paths-line'}
          d={line(p)}
          pathLength="1"
          style={{ animationDelay: `${120 + i * 70}ms` } as CSSProperties}
        />
      ))}
      <path className="paths-expected" d={line(sim.expected)} />
    </svg>
  );
}
