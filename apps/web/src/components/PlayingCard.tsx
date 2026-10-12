import { type Card, rankOf, SUIT_SYMBOLS, suitOf } from '@felt/core';

interface Props {
  card?: Card;
  size?: 'sm' | 'md' | 'lg';
  /** Animate the card being dealt in; the delay staggers a hand. */
  deal?: boolean;
  delayMs?: number;
}

const SIZES = {
  sm: { w: 30, h: 42, rank: 14, suit: 11, radius: 6 },
  md: { w: 42, h: 58, rank: 19, suit: 15, radius: 7 },
  lg: { w: 74, h: 102, rank: 36, suit: 26, radius: 11 },
};

/** Four color deck card. Renders a card back when `card` is undefined. */
export function PlayingCard({ card, size = 'md', deal, delayMs = 0 }: Props) {
  const s = SIZES[size];
  const base: React.CSSProperties = {
    width: s.w,
    height: s.h,
    borderRadius: s.radius,
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    lineHeight: 1,
    flex: 'none',
    animationDelay: `${delayMs}ms`,
  };

  if (card === undefined) {
    return (
      <span
        className={deal ? 'deal' : undefined}
        style={{
          ...base,
          background: 'repeating-linear-gradient(45deg,#24453a,#24453a 4px,#1b3529 4px,#1b3529 8px)',
          border: '1.5px solid #3b5c4d',
          boxShadow: '0 2px 6px rgba(0,0,0,.45)',
        }}
      />
    );
  }

  const suit = suitOf(card);
  return (
    <span
      className={deal ? 'deal' : undefined}
      style={{
        ...base,
        gap: size === 'lg' ? 4 : 1,
        background: 'linear-gradient(180deg, #17221c, #0d1511)',
        border: `${size === 'lg' ? 2 : 1.5}px solid var(--suit-${suit})`,
        color: `var(--suit-${suit})`,
        boxShadow: `0 ${size === 'lg' ? 10 : 2}px ${size === 'lg' ? 24 : 6}px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.06) inset`,
      }}
      aria-label={`${rankOf(card)} of ${{ c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' }[suit]}`}
    >
      <span style={{ fontSize: s.rank, letterSpacing: '-0.03em' }}>{rankOf(card)}</span>
      <span style={{ fontSize: s.suit }}>{SUIT_SYMBOLS[suit]}</span>
    </span>
  );
}
