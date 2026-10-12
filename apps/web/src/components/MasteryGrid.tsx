import { type CardStrength, type Chart, gridHandClass } from '@felt/core';

const COLORS: Record<CardStrength, string> = {
  solid: 'var(--tint-fill)',
  learning: 'color-mix(in srgb, var(--tint-fill) 42%, transparent)',
  new: 'var(--fill-3)',
};

/**
 * A chart's 13x13 grid colored by how well you know it: edge hands by card
 * strength, the interior of the range in spruce, folds left empty.
 */
export function MasteryGrid({ chart, hands, size = 148 }: { chart: Chart; hands: Map<string, CardStrength>; size?: number }) {
  return (
    <div className="mastery-grid" style={{ width: size, height: size }} aria-hidden="true">
      {Array.from({ length: 169 }, (_, i) => {
        const hand = gridHandClass(Math.floor(i / 13), i % 13);
        const strength = hands.get(hand);
        const plays = (chart.mixes.get(hand)?.fold ?? 0) < 1;
        const bg = strength ? COLORS[strength] : plays ? 'color-mix(in srgb, var(--spruce-500) 38%, transparent)' : 'var(--fill)';
        return <span key={hand} style={{ background: bg, '--wave': Math.floor(i / 13) + (i % 13) } as React.CSSProperties} />;
      })}
    </div>
  );
}
