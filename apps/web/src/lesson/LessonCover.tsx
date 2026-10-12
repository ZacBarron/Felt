import type { LessonCover as Cover } from '@felt/content';
import { gridHandClass, parseCards } from '@felt/core';
import { PlayingCard } from '../components/PlayingCard';
import { getChart } from '../state/charts';

/** The art on a lesson card: the chart it teaches, its key number, or a hand. */
export function LessonCover({ cover, size = 'md' }: { cover: Cover; size?: 'sm' | 'md' }) {
  if (cover.kind === 'figure') {
    return (
      <div className={`cover cover-${size}`}>
        <span className="display cover-figure">{cover.text}</span>
      </div>
    );
  }
  if (cover.kind === 'cards') {
    return (
      <div className={`cover cover-${size}`}>
        <div className="fan">
          {parseCards(cover.cards).map((c) => (
            <PlayingCard key={c} card={c} size={size === 'sm' ? 'sm' : 'md'} />
          ))}
        </div>
      </div>
    );
  }
  const chart = getChart(cover.chartId);
  return (
    <div className={`cover cover-${size}`}>
      <div className="cover-grid">
        {Array.from({ length: 169 }, (_, i) => {
          const hand = gridHandClass(Math.floor(i / 13), i % 13);
          // A hand with no fold entry never folds: it plays 100%.
          const mix = chart?.mixes.get(hand);
          const play = mix ? 1 - (mix.fold ?? 0) : 0;
          return <span key={hand} style={{ opacity: play > 0 ? 0.45 + play * 0.55 : 1 }} className={play > 0 ? 'on' : undefined} />;
        })}
      </div>
    </div>
  );
}
