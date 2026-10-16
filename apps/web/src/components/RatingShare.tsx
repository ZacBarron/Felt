import { useEffect, useRef, useState } from 'react';
import { haptic } from '../haptics';
import { track } from '../state/events';
import { isFCell, MARK_GRID, TAGLINE } from '../ui/Brand';
import { ImportIcon, ShareIcon } from '../ui/icons';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '../ui/wordmark';
import '../pages/you.css';

/** What goes on the card. Every number comes from the player's own answers. */
export interface RatingCardData {
  name?: string;
  rating: number;
  /** Still settling: no tier yet, and the card says so. */
  settling: boolean;
  tier?: string;
  thinks?: string;
  answers: number;
  streak: number;
  /** Best settled rating, or 0 when there is none yet. */
  best: number;
  /** The rating after each answer, oldest first. */
  history: number[];
}

/**
 * The share image is a brand surface: it always shows the Card room felt and
 * brass from BRAND.md, whatever theme the app itself uses.
 */
const BRAND = {
  felt1: '#2a7461',
  felt2: '#165244',
  felt3: '#0b2421',
  brass: '#e3b261',
  white: '#ffffff',
};
const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif';
const SERIF = '"Instrument Serif", "New York", Georgia, serif';
const W = 1080;
const H = 1350;

export function shareText(d: RatingCardData) {
  const rating = `My Felt Rating is ${Math.round(d.rating)}`;
  const tier = d.settling ? ' and still settling.' : d.tier ? `. My tier is ${d.tier}.` : '.';
  const streak = d.streak > 1 ? ` I'm on a ${d.streak} day streak.` : '';
  return `${rating}${tier}${streak}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function spacing(ctx: CanvasRenderingContext2D, px: number) {
  // Letter spacing is newer than the rest of canvas text; without it the label is just tighter.
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

/** Draws the rating card as a 1080 by 1350 PNG, the size feeds and messages show whole. */
export async function drawRatingCard(d: RatingCardData): Promise<Blob> {
  try {
    await Promise.all([document.fonts.load(`300px ${SERIF}`), document.fonts.load(`italic 40px ${SERIF}`)]);
  } catch {
    // Fonts not ready: the card falls back to Georgia, which still reads well.
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // The felt.
  const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.hypot(W, H) * 1.05);
  bg.addColorStop(0, BRAND.felt1);
  bg.addColorStop(0.42, BRAND.felt2);
  bg.addColorStop(1, BRAND.felt3);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // A faint range grid in the top right, as on the app's felt hero.
  const n = 13;
  const cell = 34;
  const gap = 8;
  const gx = W - n * (cell + gap) + gap - 40;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const fade = Math.max(0, 1 - Math.hypot(n - 1 - c, r) / (n * 1.05));
      ctx.globalAlpha = 0.02 + fade * (c >= r ? 0.12 : 0.06);
      ctx.fillStyle = BRAND.brass;
      roundRect(ctx, gx + c * (cell + gap), 40 + r * (cell + gap), cell, cell, 7);
      ctx.fill();
    }
  ctx.globalAlpha = 1;

  // The mark and the wordmark.
  const mx = 84;
  const my = 84;
  const ms = 92;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, mx, my, ms, ms, ms * 0.23);
  ctx.fill();
  const pad = ms * 0.17;
  const g = ms * 0.032;
  const cs = (ms - 2 * pad - (MARK_GRID - 1) * g) / MARK_GRID;
  for (let r = 0; r < MARK_GRID; r++)
    for (let c = 0; c < MARK_GRID; c++) {
      const lit = isFCell(r, c);
      ctx.fillStyle = lit ? BRAND.brass : 'rgba(255,255,255,0.12)';
      roundRect(ctx, mx + pad + c * (cs + g), my + pad + r * (cs + g), cs, cs, cs * 0.22);
      ctx.fill();
    }
  const [vx, vy, , vh] = WORDMARK_VIEWBOX.split(' ').map(Number);
  const wh = 60;
  ctx.save();
  ctx.translate(mx + ms + 28, my + (ms - wh) / 2);
  ctx.scale(wh / vh, wh / vh);
  ctx.translate(-vx, -vy);
  ctx.fillStyle = BRAND.white;
  ctx.fill(new Path2D(WORDMARK_PATH));
  ctx.restore();

  const left = 84;
  const right = W - 84;
  ctx.textBaseline = 'alphabetic';

  // Label.
  ctx.font = `700 30px ${SANS}`;
  spacing(ctx, 5);
  ctx.fillStyle = BRAND.brass;
  const label = d.name ? `${d.name}'s Felt Rating` : 'Felt Rating';
  ctx.fillText(label.toUpperCase(), left, 350);
  spacing(ctx, 0);

  // The number.
  ctx.font = `300px ${SERIF}`;
  ctx.fillStyle = BRAND.white;
  ctx.fillText(String(Math.round(d.rating)), left - 8, 620);

  let y = 620;
  if (d.settling) {
    ctx.font = `600 40px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText('Still settling. More answers make it sure.', left, (y += 80));
  } else if (d.tier) {
    ctx.font = `120px ${SERIF}`;
    ctx.fillStyle = BRAND.brass;
    ctx.fillText(d.tier, left, (y += 140));
    if (d.thinks) {
      ctx.font = `500 42px ${SANS}`;
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      for (const line of wrap(ctx, `“${d.thinks}”`, right - left).slice(0, 2)) ctx.fillText(line, left, (y += 62));
    }
  }

  // The climb, from the player's own history.
  const pts = d.history.slice(-200);
  const top = y + 60;
  const bottom = 1050;
  if (pts.length >= 5 && bottom - top >= 70) {
    const lo = Math.min(...pts);
    const hi = Math.max(...pts);
    const px = (i: number) => left + (i / (pts.length - 1)) * (right - left);
    const py = (v: number) => bottom - ((v - lo) / Math.max(1, hi - lo)) * (bottom - top);
    ctx.beginPath();
    pts.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
    ctx.strokeStyle = BRAND.brass;
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
  }

  // Stats: only the ones the player has.
  const stats = [
    d.streak > 0 ? { value: d.streak.toLocaleString(), label: 'day streak' } : undefined,
    {
      value: d.answers.toLocaleString(),
      label: d.answers === 1 ? 'rated answer' : 'rated answers',
    },
    d.best > 0 ? { value: String(Math.round(d.best)), label: 'best rating' } : undefined,
  ].filter((s): s is { value: string; label: string } => !!s);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(left, 1096, right - left, 2);
  const colW = (right - left) / 3;
  stats.forEach((s, i) => {
    const x = left + i * colW;
    ctx.font = `76px ${SERIF}`;
    ctx.fillStyle = BRAND.white;
    ctx.fillText(s.value, x, 1180);
    ctx.font = `500 28px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(s.label, x, 1220);
  });

  // Footer.
  ctx.font = `italic 40px ${SERIF}`;
  ctx.fillStyle = BRAND.brass;
  ctx.fillText(TAGLINE, left, 1290);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Felt could not draw the image.'))), 'image/png'));
}

/**
 * Share your Felt Rating as an image: a preview first, then the system
 * share sheet or a saved file. Nothing on the card is made up.
 */
export function RatingShareSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: RatingCardData }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState<{ blob: Blob; url: string }>();
  const [note, setNote] = useState<string>();
  const key = JSON.stringify(data);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    let url: string | undefined;
    setNote(undefined);
    drawRatingCard(data)
      .then((blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => live && setNote('Felt could not draw the image. You can still share the text.'));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
      setImage(undefined);
    };
    // Redraw only when what is on the card changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const link = `${location.origin}${import.meta.env.BASE_URL}`;
  const text = shareText(data);
  const file = image ? new File([image.blob], 'felt-rating.png', { type: 'image/png' }) : undefined;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const share = async () => {
    setNote(undefined);
    try {
      if (canShareFile) await navigator.share({ files: [file!], text: `${text}\n${link}` });
      else if (navigator.share) await navigator.share({ text: `${text}\n${link}` });
      else {
        await navigator.clipboard.writeText(`${text}\n${link}`);
        setNote('Text copied. Save the image to post it too.');
      }
      haptic('success');
      track('rating_shared', {
        kind: canShareFile ? 'image' : 'text',
        settling: data.settling,
      });
    } catch {
      // The share sheet was dismissed.
    }
  };

  const save = () => {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image.url;
    a.download = 'felt-rating.png';
    a.click();
    haptic('success');
    track('rating_shared', { kind: 'saved', settling: data.settling });
  };

  return (
    <dialog
      ref={ref}
      className="sheet share-sheet"
      aria-labelledby="share-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between">
          <h2 id="share-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            Share your rating
          </h2>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="share-preview">
          {image ? <img src={image.url} alt={`${text} Felt card.`} /> : <span className="share-preview-wait" aria-label="Drawing the image" />}
        </div>
        <p className="footnote share-note" role="status">
          {note ?? 'Every number on the card comes from your own answers.'}
        </p>
        <div className="share-actions">
          <button className="btn btn-primary btn-lg" onClick={() => void share()} disabled={!image && !note} data-haptic="off">
            <ShareIcon size={20} />
            {canShareFile || !image ? 'Share image' : 'Share text'}
          </button>
          <button className="btn btn-tinted btn-lg" onClick={save} disabled={!image} data-haptic="off">
            <ImportIcon size={20} />
            Save image
          </button>
        </div>
      </div>
    </dialog>
  );
}
