import { createContext, type ReactNode, useContext } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { easeInOut, easeOut } from '../anim';

export function useLayout() {
  const { width, height } = useVideoConfig();
  return { portrait: height >= width, width, height };
}

/** Enter and exit progress for the current scene, shared with its layers. */
const SceneCtx = createContext({ enter: 1, exit: 0 });

/**
 * Wraps one scene: fades it in and out, with a small scale and rise.
 * Must sit inside a <Sequence> so frames are local to the scene.
 */
export function Scene({ dur, children, fadeIn = 12, fadeOut = 8 }: { dur: number; children: ReactNode; fadeIn?: number; fadeOut?: number }) {
  const frame = useCurrentFrame();
  const enter = fadeIn === 0 ? 1 : interpolate(frame, [0, fadeIn], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut });
  const exit =
    fadeOut === 0 ? 0 : interpolate(frame, [dur - fadeOut, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut });
  return (
    <SceneCtx.Provider value={{ enter, exit }}>
      <AbsoluteFill style={{ opacity: enter * (1 - exit) }}>{children}</AbsoluteFill>
    </SceneCtx.Provider>
  );
}

/** Design box for every visual. Scaled to fit each orientation. */
export const BOX = { w: 1000, h: 1150 };

/**
 * Places a scene's visual and caption. Phone: visual on top, caption in the
 * lower third. Landscape: visual left, caption right. The visual and caption
 * move at different speeds as the scene changes, for a touch of parallax.
 */
export function Stage({ visual, caption, boxHeight = BOX.h }: { visual: ReactNode; caption?: ReactNode; boxHeight?: number }) {
  const { portrait, width, height } = useLayout();
  const { enter, exit } = useContext(SceneCtx);
  const vShift = (1 - enter) * 50 - exit * 40;
  const cShift = (1 - enter) * 26 - exit * 20;
  const vScale = 0.97 + 0.03 * enter + exit * 0.025;

  if (portrait) {
    const scale = Math.min(1, (height * 0.66) / boxHeight);
    return (
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: (width - BOX.w) / 2,
            // Center the visual in the space above the caption.
            top: caption ? 750 - boxHeight / 2 : (height - boxHeight) / 2,
            width: BOX.w,
            height: boxHeight,
            transform: `translateY(${vShift}px) scale(${vScale * scale})`,
            transformOrigin: '50% 50%',
          }}
        >
          {visual}
        </div>
        {caption && (
          <div
            style={{
              position: 'absolute',
              left: 90,
              right: 90,
              top: 1410,
              textAlign: 'center',
              transform: `translateY(${cShift}px)`,
            }}
          >
            {caption}
          </div>
        )}
      </AbsoluteFill>
    );
  }

  const scale = Math.min(0.86, (height * 0.9) / boxHeight);
  const boxLeft = caption ? width * 0.31 - BOX.w / 2 : (width - BOX.w) / 2;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: boxLeft,
          top: (height - boxHeight) / 2,
          width: BOX.w,
          height: boxHeight,
          transform: `translateY(${vShift}px) scale(${vScale * scale})`,
          transformOrigin: '50% 50%',
        }}
      >
        {visual}
      </div>
      {caption && (
        <div
          style={{
            position: 'absolute',
            left: width * 0.56,
            width: width * 0.36,
            top: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'left',
            transform: `translateY(${cShift}px)`,
          }}
        >
          {caption}
        </div>
      )}
    </AbsoluteFill>
  );
}
