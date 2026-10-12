import { type ChartSpec, positionsFor } from '@felt/core';

/**
 * Seats in preflop action order with hero highlighted. For opens, the seats
 * before hero are shown folded so position sinks in visually.
 */
export function SeatStrip({ spec }: { spec: ChartSpec }) {
  const seats = positionsFor(spec.tableSize);
  const heroIndex = seats.indexOf(spec.hero);
  return (
    <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
      {seats.map((seat, i) => {
        const hero = i === heroIndex;
        const folded = spec.spot === 'rfi' && i < heroIndex;
        return (
          <span
            key={seat}
            style={{
              fontSize: 12,
              fontWeight: hero ? 800 : 500,
              padding: '3px 7px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: hero ? 'var(--accent)' : 'var(--surface-2)',
              color: hero ? '#06120c' : 'var(--text)',
              opacity: folded ? 0.4 : 1,
              textDecoration: folded ? 'line-through' : undefined,
            }}
          >
            {seat}
          </span>
        );
      })}
    </div>
  );
}
