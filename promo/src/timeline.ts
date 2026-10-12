/**
 * One place for every scene start and sound cue, in frames at 30 fps.
 * Scenes overlap a little so each one can hand over to the next.
 */
export const FPS = 30;
export const DURATION = 600; // 20 s

export const SCENES = {
  mark: { from: 0, dur: 90 },
  chart: { from: 86, dur: 130 },
  drill: { from: 212, dur: 126 },
  rating: { from: 334, dur: 122 },
  phone: { from: 452, dur: 86 },
  end: { from: 534, dur: 66 },
} as const;

/** Local frames inside each scene. Sound cues below are built from these. */
export const BEATS = {
  mark: { pop: 2, light: 24, word: 40, tagline: 50 },
  chart: { header: 2, draw: 4, paint: 34, callout: 86, caption: 10 },
  drill: { deal: 4, flip: 24, buttons: 34, tap: 62, verdict: 70, mix: 78, caption: 8 },
  rating: { ring: 6, count: 8, countDur: 56, tier: 66, caption: 10 },
  phone: { enter: 0, checks: [34, 46, 58], caption: 8 },
  end: { mark: 0, word: 10, tagline: 22 },
} as const;

const at = (scene: keyof typeof SCENES, local: number) => SCENES[scene].from + local;

/** Global frames for sound effects. */
export const CUES = {
  markLight: at('mark', BEATS.mark.light),
  brush: at('chart', BEATS.chart.paint - 2),
  callout: at('chart', BEATS.chart.callout),
  deal: [at('drill', BEATS.drill.deal), at('drill', BEATS.drill.deal + 6)],
  flip: [at('drill', BEATS.drill.flip), at('drill', BEATS.drill.flip + 5)],
  tap: at('drill', BEATS.drill.tap),
  correct: at('drill', BEATS.drill.verdict),
  tier: at('rating', BEATS.rating.tier),
  checks: BEATS.phone.checks.map((c) => at('phone', c)),
  end: at('end', 0),
};
