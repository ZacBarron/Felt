import type { Card } from '@felt/core';
import { PlayingCard } from './PlayingCard';

export interface Seat {
  position: string;
  stack: number;
  bet?: number;
  cards?: Card[];
  /** Show face down cards for an opponent still in the hand. */
  inHand?: boolean;
  isHero?: boolean;
  /** Latest action label, e.g. "Raise 2.5". */
  action?: string;
}

interface Props {
  /** Seats clockwise starting from hero, who is drawn at the bottom. */
  seats: Seat[];
  board: Card[];
  pot: number;
}

// Seat anchors (percent of the table box) for up to 6 players, hero first.
const ANCHORS: [number, number][] = [
  [50, 90],
  [11, 70],
  [11, 24],
  [50, 8],
  [89, 24],
  [89, 70],
];

const toward = ([x, y]: [number, number], t: number): [number, number] => [x + (50 - x) * t, y + (50 - y) * t];

export function PokerTable({ seats, board, pot }: Props) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', minHeight: 300 }}>
      <div
        style={{
          position: 'absolute',
          inset: '12% 9%',
          borderRadius: '50% / 50%',
          background: 'radial-gradient(ellipse at center, #1b7a51 0%, var(--felt) 55%, var(--felt-edge) 100%)',
          border: '10px solid #3a2a1c',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,.45), 0 8px 30px rgba(0,0,0,.5)',
        }}
      />

      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', minHeight: 58 }}>
          {board.map((c) => (
            <PlayingCard key={c} card={c} />
          ))}
        </div>
        <div style={{ marginTop: 6, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>Pot {fmt(pot)}bb</div>
      </div>

      {seats.slice(0, 6).map((seat, i) => {
        const [x, y] = ANCHORS[i];
        const [bx, by] = toward(ANCHORS[i], 0.42);
        return (
          <div key={seat.position}>
            <div
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                opacity: seat.inHand === false && !seat.isHero ? 0.45 : 1,
              }}
            >
              <div style={{ display: 'flex', gap: 3 }}>
                {seat.cards
                  ? seat.cards.map((c) => <PlayingCard key={c} card={c} size="sm" />)
                  : seat.inHand && (
                      <>
                        <PlayingCard size="sm" />
                        <PlayingCard size="sm" />
                      </>
                    )}
              </div>
              <div
                style={{
                  background: seat.isHero ? 'var(--accent)' : 'var(--surface-2)',
                  color: seat.isHero ? '#06120c' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '2px 10px',
                  fontSize: 12,
                  textAlign: 'center',
                  minWidth: 70,
                }}
              >
                <div style={{ fontWeight: 700 }}>{seat.position}</div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(seat.stack)}bb</div>
              </div>
              {seat.action && <div className="pill">{seat.action}</div>}
            </div>
            {seat.bet ? (
              <div
                style={{
                  position: 'absolute',
                  left: `${bx}%`,
                  top: `${by}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f5d90a', border: '2px dashed #8a6d00' }} />
                {fmt(seat.bet)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
