import { markCell, MARK_GRID, TAGLINE } from '../ui/Brand';
import { GLYPHS } from '../ui/icons';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '../ui/wordmark';
import {
  type CardDesign,
  type DailyCardData,
  dailyMark,
  dailyRight,
  daysStudied,
  ratingFigure,
  type RatingCardData,
  type StreakCardData,
} from '../state/share';

/**
 * The share images, drawn on a canvas at 1080 by 1350: the 4:5 size that
 * feeds and messages show whole. They are brand surfaces, so they always use
 * the Card room colors from BRAND.md, whatever theme the app itself uses,
 * plus one cobalt card from the chip set for social posts.
 * That is why this file holds raw colors: an image cannot read CSS tokens.
 */
export const CARD_W = 1080;
export const CARD_H = 1350;

const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif';
const SERIF = '"Instrument Serif", "New York", Georgia, serif';
const LEFT = 84;
const RIGHT = CARD_W - 84;

interface Look {
  /** Main text. */
  ink: string;
  ink2: string;
  ink3: string;
  /** Faint fills: the offsuit half of the mark, empty days. */
  faint: string;
  rule: string;
  /** Brass for text and lines on this background. */
  accent: string;
  /** Brass for fills, with spruce black on top. */
  brass: string;
  onBrass: string;
  good: string;
  onGood: string;
  wrong: string;
  onWrong: string;
}

const LOOKS: Record<CardDesign, Look> = {
  felt: {
    ink: '#ffffff',
    ink2: 'rgba(255,255,255,0.8)',
    ink3: 'rgba(255,255,255,0.58)',
    faint: 'rgba(255,255,255,0.1)',
    rule: 'rgba(255,255,255,0.16)',
    accent: '#e3b261',
    brass: '#e3b261',
    onBrass: '#0b2421',
    good: '#3ccf72',
    onGood: '#0b2421',
    wrong: 'rgba(255,255,255,0.13)',
    onWrong: 'rgba(255,255,255,0.72)',
  },
  paper: {
    ink: '#0b2421',
    ink2: 'rgba(11,36,33,0.78)',
    ink3: 'rgba(11,36,33,0.58)',
    faint: 'rgba(11,36,33,0.07)',
    rule: 'rgba(11,36,33,0.14)',
    accent: '#9a6a1e',
    brass: '#e3b261',
    onBrass: '#0b2421',
    good: '#2f9e57',
    onGood: '#ffffff',
    wrong: 'rgba(11,36,33,0.12)',
    onWrong: 'rgba(11,36,33,0.66)',
  },
  cobalt: {
    ink: '#ffffff',
    ink2: 'rgba(255,255,255,0.82)',
    ink3: 'rgba(255,255,255,0.6)',
    faint: 'rgba(255,255,255,0.12)',
    rule: 'rgba(255,255,255,0.18)',
    accent: '#f8dc9b',
    brass: '#e6b764',
    onBrass: '#1d1505',
    good: '#3ccf72',
    onGood: '#0b2421',
    wrong: 'rgba(255,255,255,0.14)',
    onWrong: 'rgba(255,255,255,0.74)',
  },
};

const FELT_STOPS: [number, string][] = [
  [0, '#2a7461'],
  [0.42, '#165244'],
  [1, '#0b2421'],
];

/** The cobalt chip from BRAND.md, light at the top left. */
const COBALT_STOPS: [number, string][] = [
  [0, '#4272f2'],
  [0.46, '#2448b9'],
  [1, '#132667'],
];

type Ctx = CanvasRenderingContext2D;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function spacing(ctx: Ctx, px: number) {
  // Letter spacing is newer than the rest of canvas text; without it the label is just tighter.
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`;
}

function text(ctx: Ctx, s: string, x: number, y: number, font: string, color: string) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  return ctx.measureText(s).width;
}

function wrap(ctx: Ctx, s: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** An icon from icons.tsx, scaled from its 24pt grid and centered on (cx, cy). */
function glyph(ctx: Ctx, paths: string | readonly string[], cx: number, cy: number, size: number, color: string, stroke = 2.25, fill = false) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  for (const d of typeof paths === 'string' ? [paths] : paths) {
    const p = new Path2D(d);
    if (fill) ctx.fill(p);
    ctx.stroke(p);
  }
  ctx.restore();
}

function feltGradient(ctx: Ctx, x: number, y: number, size: number, stops = FELT_STOPS) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, size);
  for (const [at, c] of stops) g.addColorStop(at, c);
  return g;
}

/** Background, range texture and the lockup: the same frame on every card. */
function frame(ctx: Ctx, design: CardDesign) {
  const look = LOOKS[design];
  const dark = design !== 'paper';
  const reach = Math.hypot(CARD_W, CARD_H) * 1.05;
  ctx.fillStyle = design === 'paper' ? '#f4f1ea' : feltGradient(ctx, 0, 0, reach, design === 'cobalt' ? COBALT_STOPS : FELT_STOPS);
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // A faint range grid in the top right, as on the app's felt hero.
  const n = 13;
  const cell = 34;
  const gap = 8;
  const gx = CARD_W - n * (cell + gap) + gap - 40;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const fade = Math.max(0, 1 - Math.hypot(n - 1 - c, r) / (n * 1.05));
      const suited = c >= r;
      ctx.globalAlpha = dark ? 0.02 + fade * (suited ? 0.12 : 0.06) : 0.015 + fade * (suited ? 0.2 : 0.05);
      ctx.fillStyle = dark || suited ? look.brass : look.ink;
      rr(ctx, gx + c * (cell + gap), 40 + r * (cell + gap), cell, cell, 7);
      ctx.fill();
    }
  ctx.globalAlpha = 1;

  // The mark: on paper it is the app icon tile, on the felt a quiet glass tile.
  const mx = LEFT;
  const my = 84;
  const ms = 92;
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.08)' : feltGradient(ctx, mx, my, ms * 1.45);
  rr(ctx, mx, my, ms, ms, ms * 0.23);
  ctx.fill();
  const pad = ms * 0.17;
  const g = ms * 0.032;
  const cs = (ms - 2 * pad - (MARK_GRID - 1) * g) / MARK_GRID;
  for (let r = 0; r < MARK_GRID; r++)
    for (let c = 0; c < MARK_GRID; c++) {
      const kind = markCell(r, c);
      ctx.fillStyle = kind === 'suited' ? LOOKS.felt.brass : kind === 'pair' ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.12)';
      rr(ctx, mx + pad + c * (cs + g), my + pad + r * (cs + g), cs, cs, cs * 0.22);
      ctx.fill();
    }

  // The wordmark, from outlines so it never waits on a font.
  const [vx, vy, , vh] = WORDMARK_VIEWBOX.split(' ').map(Number);
  const wh = 60;
  ctx.save();
  ctx.translate(mx + ms + 28, my + (ms - wh) / 2);
  ctx.scale(wh / vh, wh / vh);
  ctx.translate(-vx, -vy);
  ctx.fillStyle = look.ink;
  ctx.fill(new Path2D(WORDMARK_PATH));
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

/** Small uppercase label in brass. Uppercase is styling only. */
function label(ctx: Ctx, look: Look, s: string, y: number) {
  ctx.font = `700 30px ${SANS}`;
  spacing(ctx, 5);
  ctx.fillStyle = look.accent;
  ctx.fillText(s.toUpperCase(), LEFT, y);
  spacing(ctx, 0);
}

function footer(ctx: Ctx, look: Look) {
  text(ctx, TAGLINE, LEFT, 1290, `italic 40px ${SERIF}`, look.accent);
}

function stats(ctx: Ctx, look: Look, items: { value: string; label: string }[]) {
  ctx.fillStyle = look.rule;
  ctx.fillRect(LEFT, 1096, RIGHT - LEFT, 2);
  const colW = (RIGHT - LEFT) / 3;
  items.forEach((s, i) => {
    const x = LEFT + i * colW;
    text(ctx, s.value, x, 1180, `76px ${SERIF}`, look.ink);
    text(ctx, s.label, x, 1220, `500 28px ${SANS}`, look.ink3);
  });
}

function sparkline(ctx: Ctx, look: Look, history: number[], top: number, bottom: number) {
  const pts = history.slice(-200);
  if (pts.length < 5 || bottom - top < 70) return;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const px = (i: number) => LEFT + (i / (pts.length - 1)) * (RIGHT - LEFT);
  const py = (v: number) => bottom - ((v - lo) / Math.max(1, hi - lo)) * (bottom - top);
  ctx.beginPath();
  pts.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
  ctx.strokeStyle = look.accent;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineTo(px(pts.length - 1), bottom);
  ctx.lineTo(px(0), bottom);
  ctx.closePath();
  const area = ctx.createLinearGradient(0, top, 0, bottom);
  area.addColorStop(0, 'rgba(227,178,97,0.28)');
  area.addColorStop(1, 'rgba(227,178,97,0)');
  ctx.fillStyle = area;
  ctx.fill();
  // Where the rating is now.
  ctx.beginPath();
  ctx.arc(px(pts.length - 1), py(pts[pts.length - 1]), 11, 0, Math.PI * 2);
  ctx.fillStyle = look.accent;
  ctx.fill();
}

export function paintRating(ctx: Ctx, d: RatingCardData, design: CardDesign) {
  const look = LOOKS[design];
  frame(ctx, design);
  ctx.font = `700 30px ${SANS}`;
  const named = d.name ? `${d.name}'s Suited Rating` : 'Suited Rating';
  // A long name falls back to the plain label rather than running off the card.
  label(ctx, look, ctx.measureText(named.toUpperCase()).width + named.length * 5 > RIGHT - LEFT ? 'Suited Rating' : named, 330);

  const fig = ratingFigure(d.rating, d.settling);
  let y: number;
  if (fig.about) {
    // Still settling: say "about" first, then the rough number, then why.
    text(ctx, 'About', LEFT, 440, `italic 88px ${SERIF}`, look.ink2);
    text(ctx, fig.value, LEFT - 8, 690, `300px ${SERIF}`, look.ink);
    text(ctx, 'Still settling', LEFT, 820, `110px ${SERIF}`, look.accent);
    text(ctx, 'Each answer makes it more certain.', LEFT, 884, `500 38px ${SANS}`, look.ink2);
    y = 884;
  } else {
    text(ctx, fig.value, LEFT - 8, 620, `300px ${SERIF}`, look.ink);
    y = 620;
    if (d.tier) {
      text(ctx, d.tier, LEFT, (y += 140), `120px ${SERIF}`, look.accent);
      if (d.thinks) {
        // One line when a slightly smaller size fits it, otherwise two at full size.
        const quote = `“${d.thinks}”`;
        ctx.font = `500 38px ${SANS}`;
        if (ctx.measureText(quote).width > RIGHT - LEFT) ctx.font = `500 42px ${SANS}`;
        ctx.fillStyle = look.ink2;
        for (const line of wrap(ctx, quote, RIGHT - LEFT).slice(0, 2)) ctx.fillText(line, LEFT, (y += 62));
      }
    }
  }

  sparkline(ctx, look, d.history, y + 70, 1040);

  stats(
    ctx,
    look,
    [
      d.best > 0 ? { value: String(Math.round(d.best)), label: 'best ever' } : undefined,
      { value: d.answers.toLocaleString(), label: d.answers === 1 ? 'rated answer' : 'rated answers' },
      d.streak > 0 ? { value: d.streak.toLocaleString(), label: 'day streak' } : undefined,
    ].filter((s): s is { value: string; label: string } => !!s),
  );
  footer(ctx, look);
}

export function paintStreak(ctx: Ctx, d: StreakCardData, design: CardDesign) {
  const look = LOOKS[design];
  frame(ctx, design);
  label(ctx, look, 'Study streak', 330);

  glyph(ctx, GLYPHS.flame, LEFT + 62, 552, 136, look.brass, 1.2, true);
  text(ctx, d.streak.toLocaleString(), LEFT + 146, 690, `340px ${SERIF}`, look.ink);
  text(ctx, d.streak === 1 ? 'day in a row' : 'days in a row', LEFT, 784, `600 48px ${SANS}`, look.ink);

  // The last 7 days, oldest first, as on the streak card in the app.
  const n = d.days.length;
  const size = 96;
  const gap = n > 1 ? (RIGHT - LEFT - n * size) / (n - 1) : 0;
  d.days.forEach((day, i) => {
    const cx = LEFT + size / 2 + i * (size + gap);
    const cy = 912;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    if (day.done) {
      ctx.fillStyle = look.brass;
      ctx.fill();
      glyph(ctx, GLYPHS.check, cx, cy, 56, look.onBrass, 2.75);
    } else if (day.frozen) {
      ctx.fillStyle = look.faint;
      ctx.fill();
      glyph(ctx, GLYPHS.freeze, cx, cy, 54, look.ink2, 1.9);
    } else {
      ctx.lineWidth = 4;
      ctx.strokeStyle = day.today ? look.accent : look.rule;
      if (day.today) ctx.setLineDash([10, 9]);
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textAlign = 'center';
    text(ctx, day.label, cx, 1014, `${day.today ? 700 : 500} 30px ${SANS}`, day.today ? look.ink : look.ink3);
    ctx.textAlign = 'left';
  });

  stats(ctx, look, [
    { value: d.best.toLocaleString(), label: 'longest streak' },
    { value: `${daysStudied(d)} of ${n}`, label: 'days studied' },
  ]);
  footer(ctx, look);
}

export function paintDaily(ctx: Ctx, d: DailyCardData, design: CardDesign) {
  const look = LOOKS[design];
  frame(ctx, design);
  label(ctx, look, 'Daily challenge', 330);

  text(ctx, `Daily #${d.number}`, LEFT - 4, 560, `210px ${SERIF}`, look.ink);
  if (d.date) text(ctx, d.date, LEFT, 628, `500 38px ${SANS}`, look.ink3);

  // One square per decision. Never the hand or the answer.
  const n = d.scores.length;
  const gap = 38;
  const size = Math.min(152, (RIGHT - LEFT - (n - 1) * gap) / Math.max(1, n));
  const top = 690;
  d.scores.forEach((s, i) => {
    const x = LEFT + i * (size + gap);
    const mark = dailyMark(s);
    rr(ctx, x, top, size, size, size * 0.2);
    ctx.fillStyle = mark === 'right' ? look.good : mark === 'close' ? look.brass : look.wrong;
    ctx.fill();
    const cx = x + size / 2;
    const cy = top + size / 2;
    if (mark === 'right') glyph(ctx, GLYPHS.check, cx, cy, size * 0.56, look.onGood, 2.75);
    else if (mark === 'close') glyph(ctx, GLYPHS.minus, cx, cy, size * 0.56, look.onBrass, 2.75);
    else glyph(ctx, GLYPHS.close, cx, cy, size * 0.5, look.onWrong, 2.5);
  });

  const w = text(ctx, `${dailyRight(d.scores)} of ${n}`, LEFT - 4, 1086, `200px ${SERIF}`, look.ink);
  text(ctx, 'right', LEFT + w + 18, 1086, `600 52px ${SANS}`, look.ink2);
  // A perfect day gets the one word every player knows.
  const perfect = dailyRight(d.scores) === n;
  text(ctx, perfect ? 'The nuts. Every decision right.' : `Everyone gets the same ${n} decisions today.`, LEFT, 1166, `500 38px ${SANS}`, perfect ? look.accent : look.ink2);
  footer(ctx, look);
}

let fonts: Promise<unknown> | undefined;
function loadFonts() {
  fonts ??= Promise.all([document.fonts.load(`300px ${SERIF}`), document.fonts.load(`italic 40px ${SERIF}`)]).catch(() => {
    // Fonts not ready: the card falls back to Georgia, which still reads well.
  });
  return fonts;
}

/** Draws one card to a PNG. */
export async function drawCard(paint: (ctx: Ctx) => void): Promise<Blob> {
  await loadFonts();
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Suited could not draw the image.');
  paint(ctx);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Suited could not draw the image.'))), 'image/png'));
}
