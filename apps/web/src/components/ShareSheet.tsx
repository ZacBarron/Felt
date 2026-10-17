import { challengeNumber, currentRating, isProvisional, tierFor, TIERS } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '../haptics';
import { db } from '../state/db';
import { track } from '../state/events';
import { ratingSnapshot } from '../state/rating';
import { shareUrl } from '../state/referral';
import { useSettings } from '../state/settings';
import {
  bestSettled,
  type CardDesign,
  type DailyCardData,
  dailyAlt,
  dailyResultText,
  type RatingCardData,
  ratingFigure,
  ratingShareText,
  shareDeck,
  shareFileName,
  type ShareKind,
  shareMessage,
  shareMode,
  type StreakCardData,
  streakAlt,
  streakShareText,
} from '../state/share';
import { ImportIcon, LinkIcon, ShareIcon } from '../ui/icons';
import { drawCard, paintDaily, paintRating, paintStreak } from './shareCards';
import { useStreakWeek } from './StreakWeek';
import './share.css';

interface Sources {
  rating?: RatingCardData;
  streak?: StreakCardData;
  daily?: DailyCardData;
}

interface ShareCard {
  id: string;
  kind: ShareKind;
  design: CardDesign;
  /** Names the card for the page dots and screen readers. */
  label: string;
  title: string;
  alt: string;
  /** The message that goes with the card, without the link. */
  text: string;
  link: string;
  /** What the copy button copies: the whole daily result, or just the link. */
  copy: 'result' | 'link';
  fileName: string;
  paint: (ctx: CanvasRenderingContext2D) => void;
}

const KIND_LABEL: Record<ShareKind, string> = { rating: 'Rating card', streak: 'Streak card', daily: 'Daily card' };
const KIND_TITLE: Record<ShareKind, string> = { rating: 'Share your rating', streak: 'Share your streak', daily: 'Share your result' };

/** Everything the cards can show, read from this device. Undefined while loading. */
function useSources(): Sources | undefined {
  const { settings } = useSettings();
  const snap = useLiveQuery(ratingSnapshot, []);
  const week = useStreakWeek();
  const today = useLiveQuery(async () => {
    const d = await db.daily.get(challengeNumber(new Date()));
    return d && d.finished !== false ? d : null;
  }, []);
  return useMemo(() => {
    if (!snap || !week || today === undefined) return undefined;
    const overall = currentRating(snap.overall);
    const settling = isProvisional(overall);
    const tier = settling ? undefined : tierFor(overall.rating);
    const rating: RatingCardData | undefined =
      overall.games > 0
        ? {
            name: settings.profile.name?.trim() || undefined,
            rating: overall.rating,
            settling,
            tier,
            thinks: TIERS.find((t) => t.name === tier)?.thinks,
            answers: overall.games,
            streak: week.streak.streak,
            best: bestSettled(snap.history),
            history: snap.history.map((p) => p.rating),
          }
        : undefined;
    const streak: StreakCardData | undefined =
      week.streak.streak > 0
        ? { streak: week.streak.streak, best: week.streak.best, days: week.days.map(({ label, done, frozen, today }) => ({ label, done, frozen, today })) }
        : undefined;
    const daily: DailyCardData | undefined = today
      ? { number: today.number, scores: today.scores, date: today.at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
      : undefined;
    return { rating, streak, daily };
  }, [snap, week, today, settings.profile.name]);
}

function buildCards(first: ShareKind, src: Sources): ShareCard[] {
  return shareDeck(first, { rating: !!src.rating, streak: !!src.streak, daily: !!src.daily }).map(({ kind, design }) => {
    const base = {
      id: `${kind}-${design}`,
      kind,
      design,
      label: design === 'felt' ? KIND_LABEL[kind] : `${KIND_LABEL[kind]} on ${design}`,
      title: KIND_TITLE[kind],
    };
    if (kind === 'daily') {
      const d = src.daily!;
      return {
        ...base,
        alt: dailyAlt(d.number, d.scores),
        text: dailyResultText(d.number, d.scores),
        link: shareUrl('', { daily: String(d.number) }),
        copy: 'result' as const,
        fileName: shareFileName('daily', d.number),
        paint: (ctx) => paintDaily(ctx, d, design),
      };
    }
    if (kind === 'streak') {
      const d = src.streak!;
      return {
        ...base,
        alt: streakAlt(d),
        text: streakShareText(d),
        link: shareUrl(),
        copy: 'link' as const,
        fileName: shareFileName('streak'),
        paint: (ctx) => paintStreak(ctx, d, design),
      };
    }
    const d = src.rating!;
    const fig = ratingFigure(d.rating, d.settling);
    return {
      ...base,
      alt: `Aced Rating ${fig.about ? `about ${fig.value}, still settling` : `${fig.value}${d.tier ? `, ${d.tier}` : ''}`}.`,
      text: ratingShareText(d),
      link: shareUrl(),
      copy: 'link' as const,
      fileName: shareFileName('rating'),
      paint: (ctx) => paintRating(ctx, d, design),
    };
  });
}

function noteFor(card: ShareCard | undefined, src: Sources | undefined): string {
  if (!card) return 'Getting your cards ready.';
  if (card.kind === 'daily') return 'The card shows your squares. It never shows the hands.';
  if (card.kind === 'streak') return 'Your streak counts the days you studied.';
  return src?.rating?.settling ? 'Your rating is still settling. The card says so.' : 'Every number on the card comes from your own answers.';
}

type Drawn = { blob: Blob; url: string } | 'error';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Copies text, with an old style fallback for browsers without the clipboard API. */
async function copyText(s: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(s);
  const area = document.createElement('textarea');
  area.value = s;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('copy failed');
}

function ShareBody({ first, onClose }: { first: ShareKind; onClose: () => void }) {
  const src = useSources();
  // Rebuild (and redraw) only when what is on the cards changes, not on every database tick.
  const srcKey = src ? JSON.stringify(src) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cards = useMemo(() => (src ? buildCards(first, src) : []), [first, srcKey]);
  const [active, setActive] = useState(0);
  const [drawn, setDrawn] = useState<Record<string, Drawn>>({});
  const [note, setNote] = useState<string>();
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  // Draw every card once its data is in. The first card comes first.
  useEffect(() => {
    if (!cards.length) return;
    let live = true;
    const urls: string[] = [];
    void (async () => {
      for (const card of cards) {
        try {
          const blob = await drawCard(card.paint);
          if (!live) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setDrawn((d) => ({ ...d, [card.id]: { blob, url } }));
        } catch {
          if (live) setDrawn((d) => ({ ...d, [card.id]: 'error' }));
        }
      }
    })();
    return () => {
      live = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
      setDrawn({});
    };
  }, [cards]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const at = Math.min(active, Math.max(0, cards.length - 1));
  const card = cards[at];
  const image = card ? drawn[card.id] : undefined;
  const file = useMemo(
    () => (card && image && image !== 'error' ? new File([image.blob], card.fileName, { type: 'image/png' }) : undefined),
    [card, image],
  );
  const mode = shareMode(typeof navigator === 'undefined' ? undefined : navigator, file ? [file] : undefined);
  const ready = !!image;
  // An iPhone home screen app cannot save a download, and its share sheet has Save Image anyway.
  const canSave = !!file && !(navigator as Navigator & { standalone?: boolean }).standalone;
  const copyWhat = card && mode === 'copy' && card.copy === 'result' ? 'link' : card?.copy;

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (!el) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const h = c as HTMLElement;
        const d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - center);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== at) {
        setActive(best);
        setNote(undefined);
      }
    });
  };

  const go = (i: number) => {
    const el = scroller.current;
    const target = el?.children[i] as HTMLElement | undefined;
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' });
    setActive(i);
    setNote(undefined);
  };

  const done = (via: string) => {
    haptic('success');
    if (card) track('card_shared', { kind: card.kind, design: card.design, via });
  };

  const share = async () => {
    if (!card) return;
    setNote(undefined);
    const message = shareMessage(card.text, card.link);
    try {
      // No await before share: the browser only allows it straight from the tap.
      if (mode === 'image') await navigator.share({ files: [file!], text: message });
      else if (mode === 'text') await navigator.share({ text: message });
      else {
        await copyText(message);
        setNote(canSave ? 'Copied. Save the image to post it too.' : 'Copied. Paste it anywhere.');
      }
      done(mode);
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setNote('Aced could not share that. Try copying instead.');
    }
  };

  const copy = async () => {
    if (!card) return;
    try {
      await copyText(copyWhat === 'result' ? shareMessage(card.text, card.link) : card.link);
      setNote(copyWhat === 'result' ? 'Result copied. Paste it anywhere.' : 'Link copied. Paste it anywhere.');
      done(copyWhat === 'result' ? 'copy-result' : 'copy-link');
    } catch {
      setNote(`Aced could not copy. Your link is ${card.link}`);
    }
  };

  const save = () => {
    if (!card || !image || image === 'error') return;
    const a = document.createElement('a');
    a.href = image.url;
    a.download = card.fileName;
    a.click();
    setNote('Image saved.');
    done('saved');
  };

  const failed = image === 'error';

  return (
    <div className="sheet-body share-body">
      <div className="sheet-grabber" aria-hidden="true" />
      <div className="row between share-head">
        <h2 id="share-title">{card?.title ?? KIND_TITLE[first]}</h2>
        <button className="btn btn-plain" onClick={onClose}>
          Done
        </button>
      </div>

      <div
        ref={scroller}
        className="share-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="Card designs"
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' && at < cards.length - 1) {
            e.preventDefault();
            go(at + 1);
          } else if (e.key === 'ArrowLeft' && at > 0) {
            e.preventDefault();
            go(at - 1);
          }
        }}
      >
        {cards.length === 0 ? (
          <div className="share-slide">
            <span className="share-wait" aria-label="Drawing the image" />
          </div>
        ) : (
          cards.map((c, i) => {
            const d = drawn[c.id];
            return (
              <div
                key={c.id}
                className={`share-slide${i === at ? ' active' : ''}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${cards.length}. ${c.label}`}
                aria-hidden={i === at ? undefined : true}
                onClick={() => i !== at && go(i)}
              >
                {d && d !== 'error' ? (
                  <img src={d.url} alt={c.alt} draggable={false} />
                ) : (
                  <span className={`share-wait ${c.design}`} role="img" aria-label={d === 'error' ? 'The image could not be drawn' : 'Drawing the image'} />
                )}
              </div>
            );
          })
        )}
      </div>

      {cards.length > 1 && (
        <div className="share-dots" role="group" aria-label="Choose a card">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="share-dot"
              aria-label={`Show the ${c.label.toLowerCase()}`}
              aria-current={i === at ? 'true' : undefined}
              data-haptic="select"
              onClick={() => go(i)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <p className="footnote share-note" role="status">
        {note ?? (failed ? 'Aced could not draw the image. You can still share the text.' : noteFor(card, src))}
      </p>

      <div className="share-actions">
        <button className="btn btn-primary btn-lg btn-block" onClick={() => void share()} disabled={!ready} data-haptic="off">
          <ShareIcon size={20} />
          {mode === 'copy' ? (card?.copy === 'result' ? 'Copy result' : 'Copy text') : 'Share'}
        </button>
        <div className={`share-more${canSave ? '' : ' single'}`}>
          <button className="btn btn-tinted btn-lg" onClick={() => void copy()} disabled={!card} data-haptic="off">
            <LinkIcon size={20} />
            {copyWhat === 'result' ? 'Copy result' : 'Copy link'}
          </button>
          {canSave && (
            <button className="btn btn-tinted btn-lg" onClick={save} data-haptic="off">
              <ImportIcon size={20} />
              Save image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The share sheet: a carousel of cards to swipe through, then Share, Copy
 * and Save. It opens on the card the player asked for. Everything on a card
 * comes from this device's answers, and every link carries the player's
 * invite code when they have one.
 */
export function ShareSheet({ open, first, onClose }: { open: boolean; first: ShareKind; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

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
      {open && <ShareBody key={first} first={first} onClose={onClose} />}
    </dialog>
  );
}
