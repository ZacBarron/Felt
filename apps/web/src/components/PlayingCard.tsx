import { type Card, rankOf, SUIT_SYMBOLS, suitOf } from '@felt/core';

interface Props {
  card?: Card;
  size?: 'sm' | 'md' | 'lg';
  /** Animate the card being dealt in; the delay staggers a hand. */
  deal?: boolean;
  /** Deal face down, then flip face up. */
  flip?: boolean;
  delayMs?: number;
}

const SIZES = {
  sm: { w: 30, h: 42, rank: 15, suit: 12, radius: 5 },
  md: { w: 42, h: 58, rank: 20, suit: 16, radius: 7 },
  lg: { w: 76, h: 106, rank: 38, suit: 28, radius: 11 },
};

/** A real looking card: white face, four color suits. Card back when `card` is undefined. */
export function PlayingCard(props: Props) {
  const { card, flip, delayMs = 0 } = props;
  if (flip && card !== undefined) {
    return (
      <span className="flip">
        <span className="flip-inner" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="face">
            <CardFace {...props} deal={false} delayMs={0} />
          </span>
          <span className="back" aria-hidden="true">
            <CardFace {...props} card={undefined} deal={false} delayMs={0} />
          </span>
        </span>
      </span>
    );
  }
  return <CardFace {...props} />;
}

const RANK_NAMES: Record<string, string> = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two' };

function CardFace({ card, size = 'md', deal, delayMs = 0 }: Props) {
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
          // Brand card back: the theme's felt with a fine accent lattice.
          background:
            'repeating-linear-gradient(45deg, color-mix(in srgb, var(--accent) 34%, transparent) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, color-mix(in srgb, var(--accent) 34%, transparent) 0 1px, transparent 1px 6px), radial-gradient(circle at 30% 20%, var(--felt-1), var(--felt-3))',
          border: `${size === 'lg' ? 4 : 2}px solid #fff`,
          boxShadow: '0 2px 6px rgba(0,0,0,.3)',
        }}
        role="img"
        aria-label="Face down card"
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
      role="img"
      aria-label={`${RANK_NAMES[rankOf(card)] ?? rankOf(card)} of ${{ c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' }[suit]}`}
    >
      <span aria-hidden="true" style={{ fontSize: s.rank, letterSpacing: '-0.04em' }}>
        {rankOf(card)}
      </span>
      <span aria-hidden="true" style={{ fontSize: s.suit }}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </span>
  );
}
