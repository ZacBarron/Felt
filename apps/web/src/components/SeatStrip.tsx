import { type ChartSpec, positionsFor } from '@felt/core';

/**
 * Seats in preflop action order with hero highlighted. For opens, the seats
 * before hero are shown folded so position sinks in visually.
 */
export function SeatStrip({ spec }: { spec: ChartSpec }) {
  const seats = positionsFor(spec.tableSize);
  const heroIndex = seats.indexOf(spec.hero);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${seats.length}, 1fr)`, gap: 3 }}>
      {seats.map((seat, i) => {
        const hero = i === heroIndex;
        const folded = spec.spot === 'rfi' && i < heroIndex;
        return (
          <div key={seat} style={{ textAlign: 'center' }}>
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
                color: hero ? 'var(--tint)' : folded ? 'var(--label-3)' : 'var(--label-2)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em',
              }}
            >
              {seat}
            </div>
          </div>
        );
      })}
    </div>
  );
}
