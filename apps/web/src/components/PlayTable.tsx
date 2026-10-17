import { handNickname } from '@felt/content';
import { describeHand, handClassOf, type HandState } from '@felt/core';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { HERO, type PlaySeat } from '../state/play';
import { BotPortrait } from '../ui/BotPortrait';
import { PlayingCard } from './PlayingCard';

interface Props {
  /** Changes every hand, so animations never carry over between hands. */
  handId: string;
  state: HandState;
  seats: readonly PlaySeat[];
  /** Last action per seat on this street, e.g. "Raise to 2.5". */
  said: Record<number, string>;
  /** The bot thinking now and for how long, for its timer ring. */
  thinking?: { seat: number; ms: number };
  /** Words in the middle of the table at the end of a hand. */
  banner?: string;
  /** A pot worth a little extra: the banner turns brass. */
  bannerRare?: boolean;
  /** The Simple layout: bigger cards and fewer labels. */
  simple?: boolean;
  /** Tap a bot's seat to see who it is. */
  onSeat?: (seat: number) => void;
}

/**
 * Seat anchors around the table, the player at the bottom, clockwise like
 * the action. Big tables leave extra room on each side of the player, whose
 * cards are larger.
 */
export function anchors(count: number): [number, number][] {
  const even = (2 * Math.PI) / count;
  const gap = count >= 7 ? even * 1.3 : even;
  const step = count > 2 ? (2 * Math.PI - 2 * gap) / (count - 2) : even;
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.PI / 2 + (i === 0 ? 0 : gap + (i - 1) * step);
    // A rounder rectangle than an ellipse, so the seats at the top and bottom spread out instead of touching.
    const bend = (v: number) => Math.sign(v) * Math.abs(v) ** 0.7;
    return [50 + 37 * bend(Math.cos(angle)), 50 + 41 * bend(Math.sin(angle))];
  });
}

const CENTER: [number, number] = [50, 47];
const toward = ([x, y]: [number, number], t: number): [number, number] => [x + (CENTER[0] - x) * t, y + (CENTER[1] - y) * t];
/** The dealer button sits between the seat and its bet, off to the side the bet is not on. */
const dealerAt = (point: [number, number]): [number, number] => {
  const [x, y] = toward(point, 0.3);
  return [x + (point[0] < 50 ? 9 : -9), y];
};
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

interface Flight {
  key: string;
  from: [number, number];
  to: [number, number];
  amount: number;
  delay: number;
}

/** A seat's name plate. A bot's plate is a button that opens its card. */
function Plate({ seat, label, onSeat, children }: { seat: number; label?: string; onSeat?: (seat: number) => void; children: ReactNode }) {
  if (!onSeat) return <div className="play-plate">{children}</div>;
  return (
    <button type="button" className="play-plate" aria-label={label} data-haptic="select" onClick={() => onSeat(seat)}>
      {children}
    </button>
  );
}

/** A poker client style table: bots around the felt, the board and pot in the middle, the player at the bottom. */
export function PlayTable({ handId, state, seats, said, thinking, banner, bannerRare, simple = false, onSeat }: Props) {
  const n = state.players.length;
  const points = anchors(n);
  const at = (seat: number) => points[(seat - HERO + n) % n];
  const betAt = (seat: number) => toward(at(seat), 0.46);
  const over = !!state.result;

  // Chips slide into the pot when a street closes, and to the winners when the hand ends.
  const [flights, setFlights] = useState<Flight[]>([]);
  const prev = useRef<{ handId: string; street: string; bets: { seat: number; amount: number }[]; over: boolean }>();
  useEffect(() => {
    const p = prev.current;
    const bets = state.players.filter((pl) => pl.street > 0).map((pl) => ({ seat: pl.seat, amount: pl.street }));
    const add: Flight[] = [];
    if (p && p.handId === handId) {
      const streetClosed = p.street !== state.street;
      const ended = over && !p.over;
      if (streetClosed || ended) {
        const closing = ended && !streetClosed ? bets : p.bets;
        closing.forEach((b, i) => add.push({ key: `${handId}-${p.street}-${b.seat}-in`, from: betAt(b.seat), to: CENTER, amount: b.amount, delay: i * 30 }));
      }
      if (ended) {
        state.result!.won.forEach((w, seat) => {
          if (w > 0) add.push({ key: `${handId}-win-${seat}`, from: CENTER, to: toward(at(seat), 0.12), amount: w, delay: 420 });
        });
      }
    }
    prev.current = { handId, street: state.street, bets, over };
    if (add.length) {
      setFlights((f) => [...f, ...add]);
      const t = window.setTimeout(() => setFlights((f) => f.filter((x) => !add.includes(x))), 1300);
      return () => window.clearTimeout(t);
    }
    // Positions depend only on the seat count, which a hand never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, handId]);
  useEffect(() => setFlights([]), [handId]);

  // The pot as online clients show it: everything in, this street's bets included.
  const pot = state.players.reduce((s, p) => s + p.total, 0);
  const me = state.players[HERO];
  // Before the flop a few hands have a table name; after it, say what you made.
  const myHand = me.folded ? undefined : state.board.length >= 3 ? describeHand([...me.cards, ...state.board]) : handNickname(handClassOf(me.cards[0], me.cards[1]));

  return (
    <div className={`play-table seats-${n}${simple ? ' simple' : ''}`}>
      <div className="play-felt" />
      <div className="play-center">
        <div className="play-board">
          {state.board.map((c, i) => (
            <PlayingCard key={c} card={c} size={simple ? 'md' : 'sm'} deal delayMs={i >= 3 ? 0 : i * 70} />
          ))}
        </div>
        {banner ? (
          <div className={`play-banner${bannerRare ? ' rare' : ''}`} role="status">
            {banner}
          </div>
        ) : (
          <div className="play-pot num">{pot > 0 ? `Pot ${fmt(Math.round(pot * 10) / 10)}` : ' '}</div>
        )}
      </div>

      {state.players.map((p) => {
        const point = at(p.seat);
        const hero = p.seat === HERO;
        const bot = seats[p.seat]?.bot;
        const acting = state.toAct === p.seat;
        const won = over && state.result!.net[p.seat] > 0;
        const showCards = hero || (over && state.result!.showdown && !p.folded);
        const think = thinking?.seat === p.seat ? thinking.ms : undefined;
        return (
          <div key={p.seat}>
            <div
              className={`play-seat${hero ? ' me' : ''}${p.folded ? ' folded' : ''}${acting ? ' acting' : ''}${won ? ' won' : ''}`}
              style={{ left: `${point[0]}%`, top: `${point[1]}%` }}
            >
              <div className="play-hole">
                {!p.folded &&
                  (showCards
                    ? p.cards.map((c) => <PlayingCard key={c} card={c} size={hero ? (simple ? 'table' : 'md') : 'sm'} />)
                    : [0, 1].map((k) => <PlayingCard key={k} size="sm" />))}
              </div>
              <Plate seat={p.seat} label={bot ? `${bot.name}, bot. Stack ${fmt(p.stack)}` : undefined} onSeat={bot ? onSeat : undefined}>
                {bot && (
                  <span className={`play-avatar${think ? ' thinking' : ''}`} style={think ? ({ '--think': `${think}ms` } as CSSProperties) : undefined}>
                    <BotPortrait bot={bot} size={30} active={acting} />
                  </span>
                )}
                <span className="play-plate-text">
                  <span className="play-name">
                    {hero ? 'You' : (bot?.name ?? 'Seat')}
                    {!hero && <span className="play-bot-tag">Bot</span>}
                  </span>
                  <span className="play-stack num">
                    {p.allIn && !over ? 'All in' : fmt(p.stack)}
                    {(hero || !simple) && <span className="play-pos">{p.position}</span>}
                  </span>
                </span>
              </Plate>
              {hero && myHand && <span className="play-myhand">{myHand}</span>}
              {said[p.seat] && !hero && !p.folded && <span className="play-said">{said[p.seat]}</span>}
            </div>
            {p.street > 0 && !over && (
              <div className="play-bet num" style={{ left: `${betAt(p.seat)[0]}%`, top: `${betAt(p.seat)[1]}%` }}>
                <span className="play-chip" />
                {fmt(p.street)}
              </div>
            )}
            {state.button === p.seat && (
              <span className="play-dealer" style={{ left: `${dealerAt(point)[0]}%`, top: `${dealerAt(point)[1]}%` }} aria-label="Dealer button">
                D
              </span>
            )}
          </div>
        );
      })}

      {flights.map((f) => (
        <span
          key={f.key}
          className="play-fly num"
          aria-hidden="true"
          style={{ '--x0': `${f.from[0]}%`, '--y0': `${f.from[1]}%`, '--x1': `${f.to[0]}%`, '--y1': `${f.to[1]}%`, animationDelay: `${f.delay}ms` } as CSSProperties}
        >
          <span className="play-chip" />
          {fmt(Math.round(f.amount * 10) / 10)}
        </span>
      ))}
    </div>
  );
}
