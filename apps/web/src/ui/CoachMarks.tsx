import { type CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { nextStep, type TourStep } from '../state/tour';

interface Props {
  steps: readonly TourStep[];
  /** Called once when the marks close: `done` after the last step, `skipped` otherwise. */
  onEnd: (how: 'done' | 'skipped') => void;
  /** What the marks are, for screen readers, such as "App tour". */
  label: string;
  /** The quiet button that ends the marks early. */
  skipLabel?: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

/** The first visible element for a selector: tab bar links exist twice, once in the sidebar. */
function findTarget(selector: string): HTMLElement | undefined {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return undefined;
}

const PAD = 6;

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 12;
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2, r: Math.min(radius + PAD, (r.height + PAD * 2) / 2) };
}

const same = (a?: Box, b?: Box) => !!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;

/**
 * Coach marks: a dimmed screen with a lit window around the real control and
 * a short card that says what it is. One sentence and one verb button per
 * step, a step count, and Skip. A tap anywhere outside the card ends the
 * marks, so they never hold a tap for more than one step. Escape skips.
 * Motion is a short fade that Reduce Motion turns off.
 */
export function CoachMarks({ steps, onEnd, label, skipLabel = 'Skip tour' }: Props) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box>();
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const primary = useRef<HTMLButtonElement>(null);
  const ended = useRef(false);
  const titleId = useId();
  const step = steps[index];
  const last = nextStep(index, steps.length) === undefined;

  const end = (how: 'done' | 'skipped') => {
    if (ended.current) return;
    ended.current = true;
    onEnd(how);
  };

  // Follow the target: it can move while the page settles, on scroll or on rotation.
  useLayoutEffect(() => {
    if (!step) return;
    let frame = 0;
    let lastBox: Box | undefined;
    const el = findTarget(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center' });
    }
    const tick = () => {
      const target = findTarget(step.target);
      const next = target ? boxOf(target) : undefined;
      if (!same(next, lastBox) || (!next && lastBox)) {
        lastBox = next;
        setBox(next);
      }
      setViewport((v) => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    // Focus for keyboards and screen readers, without a focus ring on a tap.
    primary.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end('skipped');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!step) return null;

  // The card sits on the roomier side of the target, its arrow pointing at the target's middle.
  const gutter = 16;
  const width = Math.min(360, viewport.w - gutter * 2);
  const centerX = box ? box.x + box.w / 2 : viewport.w / 2;
  const left = Math.max(gutter, Math.min(viewport.w - gutter - width, centerX - width / 2));
  const below = box ? box.y + box.h / 2 < viewport.h / 2 : false;
  const cardStyle: CSSProperties = box
    ? below
      ? { left, width, top: box.y + box.h + 12 }
      : { left, width, bottom: viewport.h - box.y + 12 }
    : { left, width, top: '50%', transform: 'translateY(-50%)' };
  const arrowX = Math.max(22, Math.min(width - 22, centerX - left));

  return createPortal(
    <div className="coach-layer" role="presentation">
      {/* The scrim: a tap here ends the marks. The lit window is a box shadow, so nothing blurs. */}
      <div className={`coach-scrim${box ? ' has-spot' : ''}`} onClick={() => end('skipped')} data-haptic="off" aria-hidden="true" />
      {box && <div className="coach-spot" style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: box.r }} aria-hidden="true" />}
      <div
        key={index}
        className={`coach-mark${below ? ' below' : ' above'}${box ? '' : ' floating'}`}
        style={{ ...cardStyle, '--arrow-x': `${arrowX}px` } as CSSProperties}
        role="dialog"
        aria-modal="false"
        aria-label={label}
        aria-describedby={titleId}
      >
        <div className="coach-mark-count num">
          {steps.length > 1 ? `${index + 1} of ${steps.length}` : 'Tip'}
        </div>
        <h2 className="coach-mark-title" id={titleId}>
          {step.title}
        </h2>
        <p className="coach-mark-body">{step.body}</p>
        <div className="coach-mark-buttons">
          {!last && (
            <button type="button" className="btn btn-plain coach-mark-skip" onClick={() => end('skipped')}>
              {skipLabel}
            </button>
          )}
          <button
            ref={primary}
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const n = nextStep(index, steps.length);
              if (n === undefined) end('done');
              else setIndex(n);
            }}
          >
            {step.action}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
