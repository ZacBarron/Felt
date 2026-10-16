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
import { useMemo, useState } from 'react';
import { haptic } from '../haptics';
import { ActionMixBar } from '../components/ActionMixBar';
import { PokerTable, type Seat } from '../components/PokerTable';
import { getChart } from '../state/charts';
import { useSettings } from '../state/settings';
import { UndoIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import './screens.css';

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

  const needed = potOdds(potFacing, bet);
  const callValue = equity ? callEV(potFacing, bet, equity.equity) : undefined;

  return (
    <div className="stack">
      <PageHeader title="Spot Lab" back={{ to: '/learn', label: 'Learn' }} kicker="Single raised pot, flop" subtitle="BTN opens. BB calls and checks." />

      <div className="card" style={{ padding: '0.5rem' }}>
        <PokerTable
          pot={pot}
          board={typeof board === 'string' ? [] : board}
          format={fmt}
          seats={spotSeats(game.tableSize, game.stackBb, typeof hero === 'string' ? undefined : hero)}
        />
      </div>

      <div className="grid-2">
        <Section
          title="Equity vs range"
          info={<p>Your hand against the BB calling range from the 9-handed chart, run to the river many times. Edit the cards to try other spots.</p>}
        >
          <div className="card stack">
            <div className="sc-lab-inputs">
              <label>
                Your hand
                <input value={heroText} onChange={(e) => setHeroText(e.target.value)} spellCheck={false} autoCapitalize="none" />
              </label>
              <label>
                Board
                <input value={boardText} onChange={(e) => setBoardText(e.target.value)} spellCheck={false} autoCapitalize="none" />
              </label>
            </div>
            {!valid && <p className="grade-blunder">{typeof hero === 'string' ? hero : typeof board === 'string' ? board : 'The same card appears twice.'}</p>}
            {equity && (
              <>
                <div className="row between" style={{ alignItems: 'flex-end' }}>
                  <span>
                    <span className="sc-hero-num num">{(equity.equity * 100).toFixed(1)}%</span>
                    <span className="sc-result-label">Your equity</span>
                  </span>
                  {madeHand && <span className="pill">{madeHand}</span>}
                </div>
                <table className="kv">
                  <tbody>
                    <tr>
                      <td>BB calling range</td>
                      <td>{(rangePercent(BB_CALL) * 100).toFixed(1)}% of hands</td>
                    </tr>
                    <tr>
                      <td>Win, tie, lose</td>
                      <td>
                        {(equity.win * 100).toFixed(0)} / {(equity.tie * 100).toFixed(0)} / {(equity.lose * 100).toFixed(0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>
        </Section>

        <Section title="Facing a bet">
          <div className="card stack">
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <span>
                <span className="sc-hero-num num">{(needed * 100).toFixed(1)}%</span>
                <span className="sc-result-label">Equity needed to call</span>
              </span>
              {callValue !== undefined && (
                <span style={{ textAlign: 'right' }}>
                  <span className={`sc-stat-value num ${callValue >= 0 ? 'green-text' : 'red-text'}`}>{fmt(callValue)}</span>
                  <span className="sc-result-label">Call if no one bets again</span>
                </span>
              )}
            </div>
            <label>
              Villain bets {fmt(bet)} into {fmt(pot)} ({Math.round((bet / pot) * 100)}% pot)
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={bet}
                onChange={(e) => {
                  haptic('select');
                  setBet(Number(e.target.value));
                }}
              />
            </label>
            <table className="kv">
              <tbody>
                <tr>
                  <td>Minimum defense (MDF)</td>
                  <td>{(mdf(pot, bet) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td>Folds your bluff needs</td>
                  <td>{(bluffBreakeven(pot, bet) * 100).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Section
        title="Your decision"
        trailing={<span className="pill pill-warn">Example numbers</span>}
        info={
          <p>BB checked to you. Pick an action. Then see the solver's mix and what each option is worth. These numbers are examples, not real solver output.</p>
        }
      >
        <div className="card stack">
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
              <strong className={`grade-${graded.grade}`}>{graded.grade[0].toUpperCase() + graded.grade.slice(1)}</strong>
              <span className="muted">
                You lose {graded.evLoss.toFixed(2)}bb against the best play of {graded.best.label}. That is {(graded.evLossPctPot * 100).toFixed(1)}% of the
                pot.
              </span>
              <button className="btn btn-plain" onClick={() => setChosen(undefined)}>
                <UndoIcon size={18} /> Try again
              </button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
