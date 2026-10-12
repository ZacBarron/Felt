import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { appear } from '../anim';
import { C, SERIF, TAGLINE } from '../brand';
import { BEATS } from '../timeline';
import { Mark, Wordmark } from '../ui/Brand';
import { useLayout } from '../ui/Stage';

/** Scene 1: the mark assembles, the F lights, the wordmark and tagline resolve. */
export function Intro() {
  const frame = useCurrentFrame();
  const { portrait } = useLayout();
  const b = BEATS.mark;
  const w = appear(frame, b.word, 20);
  const t = appear(frame, b.tagline, 20);
  // A slow push in across the whole scene.
  const push = 1 + frame * 0.0009;
  const markSize = portrait ? 420 : 330;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${push})` }}>
        <Mark size={markSize} pop={b.pop} light={b.light} />
        <div
          style={{
            marginTop: markSize * 0.3,
            opacity: w,
            transform: `translateY(${(1 - w) * 24}px)`,
            filter: `blur(${(1 - w) * 10}px)`,
          }}
        >
          <Wordmark height={portrait ? 150 : 118} />
        </div>
        <div
          style={{
            marginTop: portrait ? 34 : 24,
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: portrait ? 72 : 58,
            color: C.label2,
            letterSpacing: '-0.005em',
            opacity: t,
            transform: `translateY(${(1 - t) * 18}px)`,
            filter: `blur(${(1 - t) * 8}px)`,
          }}
        >
          {TAGLINE}
        </div>
      </div>
    </AbsoluteFill>
  );
}
