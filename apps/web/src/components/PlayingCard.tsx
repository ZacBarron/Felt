import { type Card, rankOf, SUIT_SYMBOLS, suitOf } from '@felt/core';

interface Props {
  card?: Card;
  size?: 'sm' | 'md';
}

/** Four color deck card. Renders a face down card when `card` is undefined. */
export function PlayingCard({ card, size = 'md' }: Props) {
  const w = size === 'sm' ? 30 : 42;
  const h = size === 'sm' ? 42 : 58;
  const base: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: 6,
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    lineHeight: 1,
    fontSize: size === 'sm' ? 14 : 19,
    boxShadow: '0 1px 3px rgba(0,0,0,.5)',
  };

  if (card === undefined) {
    return <span style={{ ...base, background: 'repeating-linear-gradient(45deg,#2b4a3d,#2b4a3d 4px,#22392f 4px,#22392f 8px)', border: '1px solid #3b5c4d' }} />;
  }

  const suit = suitOf(card);
  return (
    <span style={{ ...base, background: '#101814', border: `1.5px solid var(--suit-${suit})`, color: `var(--suit-${suit})` }}>
      <span>{rankOf(card)}</span>
      <span style={{ fontSize: '0.8em' }}>{SUIT_SYMBOLS[suit]}</span>
    </span>
  );
}
