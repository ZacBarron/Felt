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
                height: 6,
                borderRadius: 3,
                marginBottom: 4,
                background: hero ? 'var(--accent)' : folded ? 'var(--surface-3)' : 'var(--border-strong)',
                boxShadow: hero ? '0 0 10px rgba(61,220,151,.6)' : undefined,
              }}
            />
            <div
              style={{
                fontSize: seats.length > 6 ? 9.5 : 11,
                fontWeight: hero ? 800 : 600,
                color: hero ? 'var(--accent)' : folded ? 'var(--faint)' : 'var(--muted)',
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
