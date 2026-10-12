import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { appear } from '../anim';
import { C, SERIF, TAGLINE } from '../brand';
import { BEATS } from '../timeline';
import { Mark, Wordmark } from '../ui/Brand';
import { useLayout } from '../ui/Stage';

/** Scene 6: the lockup (mark and wordmark, gap 0.38 of the mark) and the tagline. */
export function End() {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const b = BEATS.end;
  const markH = portrait ? 236 : 190;
  const w = appear(frame, b.word, 20);
  const t = appear(frame, b.tagline, 20);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: markH * 0.38 }}>
        <Mark size={markH} pop={b.mark} light={b.mark + 4} />
        <div style={{ opacity: w, transform: `translateX(${(1 - w) * -18}px)`, filter: `blur(${(1 - w) * 8}px)` }}>
          <Wordmark height={markH * 0.78} />
        </div>
      </div>
      <div
        style={{
          marginTop: portrait ? 70 : 54,
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: portrait ? 76 : 62,
          color: C.label2,
          opacity: t,
          transform: `translateY(${(1 - t) * 16}px)`,
        }}
      >
        {TAGLINE}
      </div>
    </AbsoluteFill>
  );
}
