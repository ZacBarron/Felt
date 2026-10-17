import { type ChartSpec, positionsFor } from '@felt/core';

/**
 * Seats in preflop action order with hero highlighted. For opens, the seats
 * before hero are shown folded so position sinks in visually.
 */
export function SeatStrip({ spec, compact }: { spec: ChartSpec; compact?: boolean }) {
  const seats = positionsFor(spec.tableSize);
  const heroIndex = seats.indexOf(spec.hero);
  // The players hero is up against: the raiser, a caller or a straddle.
  const against = new Set([...(spec.villains ?? []), ...(spec.caller ?? []), ...(spec.spot === 'straddle' ? [seats[0]] : [])]);
  return (
    <ol
      aria-label="Seats in action order"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))`, gap: 3, listStyle: 'none', margin: 0, padding: 0 }}
    >
      {seats.map((seat, i) => {
        const hero = i === heroIndex;
        const villain = against.has(seat);
        const folded = (spec.spot === 'rfi' || spec.spot === 'straddle') && i < heroIndex && !villain;
        return (
          <li key={seat} style={{ textAlign: 'center' }} aria-current={hero ? 'true' : undefined}>
            <div
              style={{
                height: compact ? 3 : 5,
                borderRadius: 3,
                marginBottom: compact ? 3 : 5,
                background: hero ? 'var(--tint)' : villain ? 'var(--label-2)' : 'var(--fill-2)',
                opacity: folded ? 0.45 : 1,
              }}
            />
            <div
              style={{
                fontSize: seats.length > 6 ? 10 : 11.5,
                lineHeight: compact ? 1.1 : undefined,
                fontWeight: hero || villain ? 700 : 500,
                color: hero ? 'var(--tint)' : villain ? 'var(--label)' : 'var(--label-2)',
                textDecoration: folded ? 'line-through' : undefined,
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em',
              }}
            >
              {/* At nine seats the UTG+ labels collide, so the middle seats show just "+1" and "+2". */}
              <span aria-hidden="true">{seats.length > 8 && seat.startsWith('UTG+') ? seat.slice(3) : seat}</span>
              <span className="sr-only">
                {seat}
                {hero ? ', you' : villain ? ', in the hand' : folded ? ', folded' : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
