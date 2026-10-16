import { describe, expect, it } from 'vitest';
import { type Card, FULL_DECK, parseCards } from './cards';
import { seededRng } from './equity';
import { act, type HandState, legalActions, potSize, seatPositions, shuffledDeck, startHand, startHandWithDeck } from './play';

/** A deck that deals `holes` (one hand per seat, dealt from the small blind) and then `board`. */
function deckFor(seats: number, button: number, holes: string[], board: string): Card[] {
  const sb = seats === 2 ? button : (button + 1) % seats;
  const top: Card[] = [];
  const cards = holes.map((h) => parseCards(h));
  for (let round = 0; round < 2; round++) for (let k = 0; k < seats; k++) top.push(cards[(sb + k) % seats][round]);
  top.push(...parseCards(board));
  return [...top, ...FULL_DECK.filter((c) => !top.includes(c))];
}

const total = (s: HandState) => s.players.reduce((a, p) => a + p.stack, 0) + potSize(s);

describe('seatPositions', () => {
  it('names seats from the button in preflop order', () => {
    expect(seatPositions(6, 0)).toEqual(['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO']);
    expect(seatPositions(6, 2)).toEqual(['HJ', 'CO', 'BTN', 'SB', 'BB', 'UTG']);
    expect(seatPositions(2, 1)).toEqual(['BB', 'BTN']);
    expect(seatPositions(3, 0)).toEqual(['BTN', 'SB', 'BB']);
  });
});

describe('shuffledDeck', () => {
  it('is a seeded permutation of the deck', () => {
    const a = shuffledDeck(seededRng(7));
    expect([...a].sort((x, y) => x - y)).toEqual([...FULL_DECK]);
    expect(shuffledDeck(seededRng(7))).toEqual(a);
    expect(shuffledDeck(seededRng(8))).not.toEqual(a);
  });
});

describe('startHand', () => {
  it('posts the blinds and gives the first action to the seat after the big blind', () => {
    const s = startHand({ stacks: [100, 100, 100, 100, 100, 100], button: 0 }, seededRng(1));
    expect(s.players[1].street).toBe(0.5);
    expect(s.players[2].street).toBe(1);
    expect(s.toAct).toBe(3);
    expect(s.currentBet).toBe(1);
    expect(new Set(s.players.flatMap((p) => p.cards)).size).toBe(12);
  });

  it('heads up the button posts the small blind and acts first preflop', () => {
    const s = startHand({ stacks: [100, 100], button: 1 }, seededRng(2));
    expect(s.players[1].street).toBe(0.5);
    expect(s.players[0].street).toBe(1);
    expect(s.toAct).toBe(1);
  });

  it('takes antes from every seat into the pot without counting them as a bet', () => {
    const s = startHand({ stacks: [50, 50, 50], button: 0, ante: 0.1 }, seededRng(3));
    expect(potSize(s)).toBeCloseTo(1.8);
    expect(s.players[0].street).toBe(0);
    expect(s.players[0].total).toBeCloseTo(0.1);
  });
});

describe('betting', () => {
  it('gives the pot to the big blind when everyone folds', () => {
    let s = startHand({ stacks: [100, 100, 100, 100], button: 0 }, seededRng(4));
    s = act(s, { kind: 'fold' }); // seat 3
    s = act(s, { kind: 'fold' }); // BTN
    s = act(s, { kind: 'fold' }); // SB
    expect(s.toAct).toBeNull();
    expect(s.result!.showdown).toBe(false);
    expect(s.result!.net).toEqual([0, -0.5, 0.5, 0]);
  });

  it('sets the minimum raise to the last full raise', () => {
    let s = startHand({ stacks: [100, 100, 100], button: 0 }, seededRng(5));
    expect(legalActions(s).raise).toEqual({ kind: 'raise', min: 2, max: 100 });
    s = act(s, { kind: 'raise', to: 3 }); // BTN opens to 3: a raise of 2
    expect(legalActions(s).raise!.min).toBe(5);
    s = act(s, { kind: 'raise', to: 10 }); // SB 3bets: a raise of 7
    expect(legalActions(s).raise!.min).toBe(17);
    expect(() => act(s, { kind: 'raise', to: 12 })).toThrow();
  });

  it('gives the big blind the option after limps', () => {
    let s = startHand({ stacks: [100, 100, 100], button: 0 }, seededRng(6));
    s = act(s, { kind: 'call' }); // BTN limps
    s = act(s, { kind: 'call' }); // SB completes
    expect(s.toAct).toBe(2);
    const legal = legalActions(s);
    expect(legal.check).toBe(true);
    expect(legal.fold).toBe(false);
    expect(legal.raise?.kind).toBe('raise');
    s = act(s, { kind: 'check' });
    expect(s.street).toBe('flop');
    expect(s.board).toHaveLength(3);
    // Postflop the first seat after the button acts first.
    expect(s.toAct).toBe(1);
    expect(legalActions(s).raise).toEqual({ kind: 'bet', min: 1, max: 99 });
  });

  it('lets the big blind act first after the flop heads up', () => {
    let s = startHand({ stacks: [100, 100], button: 0 }, seededRng(7));
    s = act(s, { kind: 'call' });
    s = act(s, { kind: 'check' });
    expect(s.street).toBe('flop');
    expect(s.toAct).toBe(1);
  });

  it('does not reopen the betting after an all in short of a full raise', () => {
    // BTN has 100, SB 100, BB 12.
    let s = startHand({ stacks: [100, 100, 12], button: 0 }, seededRng(8));
    s = act(s, { kind: 'raise', to: 10 }); // BTN raises to 10
    s = act(s, { kind: 'call' }); // SB calls 10
    s = act(s, { kind: 'raise', to: 12 }); // BB all in for 12: 2 more, short of a 9 raise
    expect(s.players[2].allIn).toBe(true);
    expect(s.toAct).toBe(0);
    const legal = legalActions(s);
    expect(legal.call).toBe(2);
    expect(legal.raise).toBeUndefined();
    s = act(s, { kind: 'call' });
    expect(legalActions(s).raise).toBeUndefined();
    s = act(s, { kind: 'call' });
    expect(s.street).toBe('flop');
  });

  it('reopens the betting after a full raise', () => {
    let s = startHand({ stacks: [100, 100, 100], button: 0 }, seededRng(9));
    s = act(s, { kind: 'raise', to: 3 });
    s = act(s, { kind: 'call' });
    s = act(s, { kind: 'raise', to: 12 });
    expect(legalActions(s).raise).toBeDefined();
  });

  it('refuses actions that are not allowed', () => {
    const s = startHand({ stacks: [100, 100, 100], button: 0 }, seededRng(10));
    expect(() => act(s, { kind: 'check' })).toThrow();
    expect(() => act(s, { kind: 'bet', to: 3 })).toThrow();
  });
});

describe('showdown', () => {
  it('pays the best hand and names it', () => {
    const deck = deckFor(2, 0, ['AsAh', 'KsKh'], '2c7d9hJcQd');
    let s = startHandWithDeck({ stacks: [100, 100], button: 0 }, deck);
    s = act(s, { kind: 'raise', to: 100 });
    s = act(s, { kind: 'call' });
    expect(s.board).toHaveLength(5);
    expect(s.result!.showdown).toBe(true);
    expect(s.result!.net).toEqual([100, -100]);
    expect(s.result!.hands[0]).toBe('Pair');
  });

  it('splits a tied pot', () => {
    const deck = deckFor(2, 0, ['AsKh', 'AdKc'], '2c7d9hJcQd');
    let s = startHandWithDeck({ stacks: [50, 50], button: 0 }, deck);
    s = act(s, { kind: 'raise', to: 50 });
    s = act(s, { kind: 'call' });
    expect(s.result!.net).toEqual([0, 0]);
  });

  it('builds side pots by contribution', () => {
    // Seat 0 BTN 100 with KK, seat 1 SB 30 with AA, seat 2 BB 60 with QQ.
    const deck = deckFor(3, 0, ['KsKh', 'AsAh', 'QsQh'], '2c7d9h3c4d');
    let s = startHandWithDeck({ stacks: [100, 30, 60], button: 0 }, deck);
    s = act(s, { kind: 'raise', to: 100 });
    s = act(s, { kind: 'call' }); // SB all in for 30
    s = act(s, { kind: 'call' }); // BB all in for 60
    const r = s.result!;
    // Main pot 90 to AA. Side pot 60 (30 each from BTN and BB) to KK. BTN's last 40 come back.
    expect(r.pots.map((p) => [p.amount, p.winners])).toEqual([
      [90, [1]],
      [60, [0]],
      [40, [0]],
    ]);
    expect(r.won).toEqual([100, 90, 0]);
    expect(r.net).toEqual([0, 60, -60]);
  });

  it('gives a folded player no share but keeps their chips in the pot', () => {
    const deck = deckFor(3, 0, ['KsKh', '7s2h', 'QsQh'], '2c7d9h3c4d');
    let s = startHandWithDeck({ stacks: [100, 100, 100], button: 0 }, deck);
    s = act(s, { kind: 'raise', to: 3 });
    s = act(s, { kind: 'call' });
    s = act(s, { kind: 'call' });
    s = act(s, { kind: 'bet', to: 5 }); // SB bets with 7s2h
    s = act(s, { kind: 'fold' }); // BB
    s = act(s, { kind: 'raise', to: 20 }); // BTN
    s = act(s, { kind: 'fold' }); // SB
    expect(s.result!.showdown).toBe(false);
    expect(s.result!.net).toEqual([11, -8, -3]);
  });
});

describe('random play', () => {
  it('always ends, keeps every chip and pays exactly the pot', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const rng = seededRng(seed);
      const seats = 2 + Math.floor(rng() * 8);
      const stacks = Array.from({ length: seats }, () => 5 + Math.floor(rng() * 200) / 2);
      let s = startHand({ stacks, button: Math.floor(rng() * seats), ante: rng() < 0.3 ? 0.1 : 0 }, rng);
      const chips = total(s);
      let steps = 0;
      while (s.toAct !== null) {
        const legal = legalActions(s);
        const r = rng();
        if (legal.raise && r < 0.25) s = act(s, { kind: legal.raise.kind, to: legal.raise.min + (legal.raise.max - legal.raise.min) * rng() * rng() });
        else if (legal.fold && r < 0.45) s = act(s, { kind: 'fold' });
        else s = act(s, legal.check ? { kind: 'check' } : { kind: 'call' });
        expect(++steps).toBeLessThan(200);
        expect(total(s)).toBeCloseTo(chips, 9);
      }
      const res = s.result!;
      expect(res.won.reduce((a, b) => a + b, 0)).toBeCloseTo(potSize(s), 9);
      expect(res.net.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
      for (const p of s.players) expect(p.stack).toBeGreaterThanOrEqual(0);
    }
  });
});
