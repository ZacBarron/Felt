import {
  actionRange,
  bluffBreakeven,
  type Card,
  callEV,
  CATEGORY_NAMES,
  categoryOf,
  equityVsRange,
  evaluate,
  formatAmount,
  gradeDecision,
  mdf,
  parseCards,
  positionsFor,
  potOdds,
  rangePercent,
  rangeToCombos,
  type StrategyNode,
} from '@felt/core';
import { RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { haptic } from '../haptics';
import { ActionMixBar } from '../components/ActionMixBar';
import { PokerTable, type Seat } from '../components/PokerTable';
import { getChart } from '../state/charts';
import { useSettings } from '../state/settings';

// Illustrative node for the demo. Real nodes come from solver imports (Phase 5).
const DEMO_NODE: StrategyNode = {
  pot: 5.5,
  actions: [
    { id: 'check', label: 'Check', frequency: 0.28, ev: 3.31 },
    { id: 'bet33', label: 'Bet 33% (1.8bb)', frequency: 0.66, ev: 3.36 },
    { id: 'bet75', label: 'Bet 75% (4.1bb)', frequency: 0.06, ev: 3.18 },
    { id: 'bet150', label: 'Bet 150% (8.3bb)', frequency: 0, ev: 2.71 },
  ],
};

const BB_CALL = actionRange(getChart('9max-100-bb-vs-btn')!, 'call');

function tryParse(text: string, count: number[]): Card[] | string {
  try {
    const cards = parseCards(text);
    return count.includes(cards.length) ? cards : `Expected ${count.join(' or ')} cards`;
  } catch (e) {
    return (e as Error).message;
  }
}

/** Seats clockwise from the BTN (hero): BTN opened, BB called, everyone else folded. */
function spotSeats(tableSize: number, stackBb: number, hero: Seat['cards']): Seat[] {
  const order = positionsFor(Math.max(tableSize, 2));
  const btn = order.indexOf('BTN');
  const clockwise = [...order.slice(btn), ...order.slice(0, btn)];
  return clockwise.map((position) => {
    if (position === 'BTN') return { position, stack: stackBb - 2.5, isHero: true, cards: hero };
    if (position === 'BB') return { position, stack: stackBb - 2.5, inHand: true, action: 'Check' };
    return { position, stack: position === 'SB' ? stackBb - 0.5 : stackBb, inHand: false };
  });
}

export function LabPage() {
  const { settings } = useSettings();
  const game = settings.game;
  const fmt = (bb: number) => formatAmount(bb, game);
  const [heroText, setHeroText] = useState('AhQh');
  const [boardText, setBoardText] = useState('Ks7d2c');
  const [bet, setBet] = useState(4);
  const [chosen, setChosen] = useState<string>();

  const hero = tryParse(heroText, [2]);
  const board = tryParse(boardText, [0, 3, 4, 5]);
  const valid = typeof hero !== 'string' && typeof board !== 'string' && new Set([...hero, ...board]).size === hero.length + board.length;

  const equity = useMemo(() => {
    if (!valid) return undefined;
    const combos = rangeToCombos(BB_CALL);
    return equityVsRange(hero as [Card, Card], combos, board, { iterations: 8000 });
  }, [valid, heroText, boardText]); // the strings are stable keys for the parsed cards

  const pot = DEMO_NODE.pot;
  const potFacing = pot + bet;
  const madeHand = valid && board.length >= 3 ? CATEGORY_NAMES[categoryOf(evaluate([...hero, ...board]))] : undefined;
  const graded = chosen ? gradeDecision(DEMO_NODE, chosen) : undefined;

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Single raised pot · flop</div>
        <h1>Spot Lab</h1>
        <p className="muted">
          BTN opens 2.5bb, BB calls, BB checks the flop. See the spot, your equity against BB's actual calling range, the pot
          math for any bet, and the GTO mix with the EV of every option.
        </p>
      </div>

      <div className="card">
        <PokerTable
          pot={pot}
          board={typeof board === 'string' ? [] : board}
          format={fmt}
          seats={spotSeats(game.tableSize, game.stackBb, typeof hero === 'string' ? undefined : hero)}
        />
      </div>

      <div className="grid-2">
        <div className="card stack">
          <h2>Equity vs range</h2>
          <div className="row">
            <label>
              Your hand
              <input value={heroText} onChange={(e) => setHeroText(e.target.value)} size={8} />
            </label>
            <label>
              Board
              <input value={boardText} onChange={(e) => setBoardText(e.target.value)} size={14} />
            </label>
          </div>
          {!valid && <p className="grade-blunder">{typeof hero === 'string' ? hero : typeof board === 'string' ? board : 'Duplicate cards'}</p>}
          {equity && (
            <table className="kv">
              <tbody>
                <tr>
                  <td>Villain range (BB flat vs BTN)</td>
                  <td>{(rangePercent(BB_CALL) * 100).toFixed(1)}% of hands</td>
                </tr>
                {madeHand && (
                  <tr>
                    <td>Your hand</td>
                    <td>{madeHand}</td>
                  </tr>
                )}
                <tr>
                  <td>Equity</td>
                  <td>{(equity.equity * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Win / tie / lose</td>
                  <td>
                    {(equity.win * 100).toFixed(0)} / {(equity.tie * 100).toFixed(0)} / {(equity.lose * 100).toFixed(0)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="card stack">
          <h2>Facing a bet</h2>
          <label>
            Villain bets {fmt(bet)} into {fmt(pot)} ({Math.round((bet / pot) * 100)}% pot)
            <input type="range" min={1} max={15} step={0.5} value={bet} onChange={(e) => {
                haptic('select');
                setBet(Number(e.target.value));
              }} />
          </label>
          <table className="kv">
            <tbody>
              <tr>
                <td>Equity needed to call</td>
                <td>{(potOdds(potFacing, bet) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>MDF (defend at least)</td>
                <td>{(mdf(pot, bet) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Bluff needs folds</td>
                <td>{(bluffBreakeven(pot, bet) * 100).toFixed(1)}%</td>
              </tr>
              {equity && (
                <tr>
                  <td>EV of calling (showdown, no further bets)</td>
                  <td className={callEV(potFacing, bet, equity.equity) >= 0 ? 'grade-best' : 'grade-blunder'}>
                    {fmt(callEV(potFacing, bet, equity.equity))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card stack">
        <div>
          <h2>Your decision: BB checked to you</h2>
          <p className="muted">Pick an action, then see the GTO mix and the EV of each option. Numbers here are illustrative.</p>
        </div>
        <ActionMixBar
          actions={DEMO_NODE.actions}
          reveal={!!chosen}
          chosen={chosen}
          onChoose={(id) => {
            const g = gradeDecision(DEMO_NODE, id).grade;
            haptic(g === 'best' || g === 'correct' ? 'success' : g === 'inaccuracy' ? 'warning' : 'error');
            setChosen(id);
          }}
        />
        {graded && (
          <div className="row">
            <strong className={`grade-${graded.grade}`}>{graded.grade.toUpperCase()}</strong>
            <span className="muted">
              EV loss {graded.evLoss.toFixed(2)}bb ({(graded.evLossPctPot * 100).toFixed(1)}% of pot). Best: {graded.best.label}.
            </span>
            <button className="btn btn-ghost" onClick={() => setChosen(undefined)}>
              <RotateCcw size={16} /> Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
