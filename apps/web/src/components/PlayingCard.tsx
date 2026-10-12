import { type Card, rankOf, SUIT_SYMBOLS, suitOf } from '@felt/core';

interface Props {
  card?: Card;
  size?: 'sm' | 'md' | 'lg';
  /** Animate the card being dealt in; the delay staggers a hand. */
  deal?: boolean;
  delayMs?: number;
}

const SIZES = {
  sm: { w: 30, h: 42, rank: 15, suit: 12, radius: 5 },
  md: { w: 42, h: 58, rank: 20, suit: 16, radius: 7 },
  lg: { w: 76, h: 106, rank: 38, suit: 28, radius: 11 },
};

/** A real looking card: white face, four color suits. Card back when `card` is undefined. */
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
          background: 'repeating-linear-gradient(45deg,#2c4f8f,#2c4f8f 3px,#24437a 3px,#24437a 6px)',
          border: '2px solid #fff',
          boxShadow: '0 2px 6px rgba(0,0,0,.3)',
        }}
      />
    );
  }

  const suit = suitOf(card);
  const big = size === 'lg';
  return (
    <span
      className={deal ? 'deal' : undefined}
      style={{
        ...base,
        gap: big ? 4 : 1,
        background: 'linear-gradient(180deg, #ffffff, #f4f4f6)',
        color: `var(--suit-${suit})`,
        fontWeight: 700,
        boxShadow: big
          ? '0 14px 30px rgba(0,0,0,.22), 0 2px 6px rgba(0,0,0,.12), inset 0 0 0 0.5px rgba(0,0,0,.12)'
          : '0 2px 5px rgba(0,0,0,.25), inset 0 0 0 0.5px rgba(0,0,0,.15)',
      }}
      aria-label={`${rankOf(card)} of ${{ c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' }[suit]}`}
    >
      <span style={{ fontSize: s.rank, letterSpacing: '-0.04em' }}>{rankOf(card)}</span>
      <span style={{ fontSize: s.suit }}>{SUIT_SYMBOLS[suit]}</span>
    </span>
  );
}
