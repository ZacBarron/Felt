import { type HandState, streetBets } from '@felt/core';
import { HERO, type PlaySeat } from '../state/play';
import { BotPortrait } from '../ui/BotPortrait';
import { PlayingCard } from './PlayingCard';

interface Props {
  state: HandState;
  seats: readonly PlaySeat[];
  /** Last action per seat on this street, e.g. "Raise to 2.5". */
  said: Record<number, string>;
  /** Seats whose cards are face up: showdown, or always the player. */
  shown: ReadonlySet<number>;
  winners?: ReadonlySet<number>;
}

/** Seat anchors around an ellipse, the player at the bottom, clockwise like the action. */
function anchors(count: number): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (i * 2 * Math.PI) / count;
    return [50 + 40 * Math.cos(angle), 50 + 41 * Math.sin(angle)];
  });
}

const toward = ([x, y]: [number, number], t: number): [number, number] => [x + (50 - x) * t, y + (50 - y) * t];
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** The table for Play: bots around the felt, the board and pot in the middle, the player at the bottom. */
export function PlayTable({ state, seats, said, shown, winners }: Props) {
  const n = state.players.length;
  const points = anchors(n);
  const middle = state.players.reduce((s, p) => s + p.total, 0) - streetBets(state);
  return (
    <div className={`play-table seats-${n}`}>
      <div className="play-felt" />
      <div className="play-center">
        <div className="play-board">
          {state.board.map((c, i) => (
            <PlayingCard key={c} card={c} size="sm" deal delayMs={i >= 3 ? 0 : i * 70} />
          ))}
        </div>
        <div className="play-pot num">{middle > 0 ? `Pot ${fmt(middle)}` : ' '}</div>
      </div>
      {state.players.map((p, i) => {
        const at = points[(i - HERO + n) % n];
        const [bx, by] = toward(at, 0.46);
        const hero = p.seat === HERO;
        const bot = seats[p.seat]?.bot;
        const acting = state.toAct === p.seat;
        const won = winners?.has(p.seat);
        return (
          <div key={p.seat}>
            <div
              className={`play-seat${hero ? ' me' : ''}${p.folded ? ' folded' : ''}${acting ? ' acting' : ''}${won ? ' won' : ''}`}
              style={{ left: `${at[0]}%`, top: `${at[1]}%` }}
            >
              <div className="play-hole">
                {!p.folded &&
                  (hero || shown.has(p.seat)
                    ? p.cards.map((c) => <PlayingCard key={c} card={c} size={hero ? 'md' : 'sm'} />)
                    : [0, 1].map((k) => <PlayingCard key={k} size="sm" />))}
              </div>
              <div className="play-plate">
                {bot && <BotPortrait look={bot.look} size={hero ? 0 : 30} active={acting} />}
                <span className="play-plate-text">
                  <span className="play-name">
                    {hero ? 'You' : (bot?.name ?? 'Seat')}
                    {!hero && <span className="play-bot-tag">Bot</span>}
                  </span>
                  <span className="play-stack num">
                    {p.allIn ? 'All in' : fmt(p.stack)}
                    <span className="play-pos">{p.position}</span>
                  </span>
                </span>
              </div>
              {said[p.seat] && <span className="play-said">{said[p.seat]}</span>}
            </div>
            {p.street > 0 && (
              <div className="play-bet num" style={{ left: `${bx}%`, top: `${by}%` }}>
                <span className="play-chip" />
                {fmt(p.street)}
              </div>
            )}
            {state.button === p.seat && (
              <span className="play-dealer" style={{ left: `${toward(at, 0.2)[0] + (at[0] < 50 ? 6 : -6)}%`, top: `${toward(at, 0.2)[1]}%` }} aria-label="Dealer button">
                D
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
