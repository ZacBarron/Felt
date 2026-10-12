import { type ChartSpec, positionsFor } from '@felt/core';

/**
 * Seats in preflop action order with hero highlighted. For opens, the seats
 * before hero are shown folded so position sinks in visually.
 */
export function SeatStrip({ spec }: { spec: ChartSpec }) {
  const seats = positionsFor(spec.tableSize);
  const heroIndex = seats.indexOf(spec.hero);
  return (
    <ol
      aria-label="Seats in action order"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))`, gap: 3, listStyle: 'none', margin: 0, padding: 0 }}
    >
      {seats.map((seat, i) => {
        const hero = i === heroIndex;
        const folded = spec.spot === 'rfi' && i < heroIndex;
        return (
          <li key={seat} style={{ textAlign: 'center' }} aria-current={hero ? 'true' : undefined}>
            <div
              style={{
                height: 5,
                borderRadius: 3,
                marginBottom: 5,
                background: hero ? 'var(--tint)' : 'var(--fill-2)',
                opacity: folded ? 0.45 : 1,
              }}
            />
            <div
              style={{
                fontSize: seats.length > 6 ? 10 : 11.5,
                fontWeight: hero ? 700 : 500,
                color: hero ? 'var(--tint)' : 'var(--label-2)',
                textDecoration: folded ? 'line-through' : undefined,
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em',
              }}
            >
              {/* At nine seats the UTG+ labels collide, so the middle seats show just "+1" and "+2". */}
              <span aria-hidden="true">{seats.length > 8 && seat.startsWith('UTG+') ? seat.slice(3) : seat}</span>
              <span className="sr-only">
                {seat}
                {hero ? ', you' : folded ? ', folded' : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
