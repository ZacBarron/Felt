import { describe, expect, it } from 'vitest';
import { type Card, FULL_DECK, parseCards } from './cards';
import { seededRng } from './equity';
import {
  botMix,
  type BotProfile,
  botRange,
  drawsOf,
  gradeCall,
  madeStrength,
  type PlayDecision,
  postflopStrength,
  preflopSpot,
  sampleAction,
} from './bots';
import { act, type HandState, legalActions, potSize, startHand, startHandWithDeck } from './play';

const solid: BotProfile = { strength: 1, style: { looseness: 1, aggression: 0.5, foldiness: 1, bluff: 0.1, limp: 0, sizes: [0.33, 0.75] } };
const station: BotProfile = { strength: 0.5, style: { looseness: 2.5, aggression: 0.15, foldiness: 0.35, bluff: 0.02, limp: 0.7, sizes: [0.5] } };
const nit: BotProfile = { strength: 0.7, style: { looseness: 0.55, aggression: 0.4, foldiness: 1.5, bluff: 0.02, limp: 0, sizes: [0.66] } };

const two = (s: string) => parseCards(s) as [Card, Card];

function deckFor(seats: number, button: number, holes: string[], board: string): Card[] {
  const sb = seats === 2 ? button : (button + 1) % seats;
  const top: Card[] = [];
  const cards = holes.map((h) => parseCards(h));
  for (let round = 0; round < 2; round++) for (let k = 0; k < seats; k++) top.push(cards[(sb + k) % seats][round]);
  top.push(...parseCards(board));
  return [...top, ...FULL_DECK.filter((c) => !top.includes(c))];
}

const probOf = (state: HandState, cards: [Card, Card], profile: BotProfile, kind: string) =>
  botMix(state, cards, profile)
    .filter((a) => a.action.kind === kind)
    .reduce((s, a) => s + a.p, 0);

describe('preflopSpot', () => {
  it('reads opens, limps, raises and 3bets', () => {
    let s = startHand({ stacks: [100, 100, 100, 100, 100, 100], button: 0 }, seededRng(1));
    expect(preflopSpot(s, 3)).toMatchObject({ kind: 'open', position: 'UTG', limpers: 0, raisers: [] });
    s = act(s, { kind: 'call' }); // UTG limps
    expect(preflopSpot(s, 4)).toMatchObject({ kind: 'limped', limpers: 1 });
    s = act(s, { kind: 'raise', to: 5 }); // HJ isolates
    s = act(s, { kind: 'call' }); // CO calls
    expect(preflopSpot(s, 0)).toMatchObject({ kind: 'raised', raisers: ['HJ'], callers: 1, limpers: 1, raiseTo: 5 });
    s = act(s, { kind: 'raise', to: 18 }); // BTN 3bets
    s = act(s, { kind: 'fold' });
    s = act(s, { kind: 'fold' });
    s = act(s, { kind: 'fold' }); // UTG
    expect(preflopSpot(s, 4)).toMatchObject({ kind: '3bet', raisers: ['HJ', 'BTN'], reraised: true });
  });
});

describe('botMix', () => {
  it('is a probability mix over legal actions in random spots', () => {
    const profiles = [solid, station, nit];
    for (let seed = 1; seed <= 150; seed++) {
      const rng = seededRng(seed);
      const seats = 2 + Math.floor(rng() * 8);
      let s = startHand({ stacks: Array.from({ length: seats }, () => 20 + Math.floor(rng() * 180)), button: 0 }, rng);
      while (s.toAct !== null) {
        const seat = s.toAct;
        const mix = botMix(s, s.players[seat].cards, profiles[seat % 3]);
        expect(mix.reduce((a, m) => a + m.p, 0)).toBeCloseTo(1, 9);
        const legal = legalActions(s);
        for (const { action } of mix) {
          if (action.kind === 'fold') expect(legal.fold).toBe(true);
          if (action.kind === 'check') expect(legal.check).toBe(true);
          if (action.kind === 'call') expect(legal.call).toBeGreaterThan(0);
          if (action.kind === 'bet' || action.kind === 'raise') {
            expect(legal.raise?.kind).toBe(action.kind);
            expect(action.to).toBeGreaterThanOrEqual(legal.raise!.min - 1e-9);
            expect(action.to).toBeLessThanOrEqual(legal.raise!.max + 1e-9);
          }
        }
        s = act(s, sampleAction(mix, rng));
      }
      expect(s.result!.net.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
    }
  });

  it('plays strong hands and folds trash first in from early position', () => {
    const s = startHand({ stacks: [100, 100, 100, 100, 100, 100, 100, 100, 100], button: 0 }, seededRng(2));
    expect(s.players[s.toAct!].position).toBe('UTG');
    expect(probOf(s, two('AsAh'), solid, 'raise')).toBeGreaterThan(0.9);
    expect(probOf(s, two('7c2d'), solid, 'fold')).toBeGreaterThan(0.95);
    expect(probOf(s, two('7c2d'), nit, 'fold')).toBeGreaterThan(0.95);
  });

  it('lets a loose station play hands a nit folds', () => {
    const s = startHand({ stacks: [100, 100, 100, 100, 100, 100], button: 0 }, seededRng(3));
    const hand = two('Kd7c');
    expect(1 - probOf(s, hand, station, 'fold')).toBeGreaterThan(1 - probOf(s, hand, nit, 'fold') + 0.4);
  });

  it('calls a river bet more often as a station than as a nit', () => {
    const deck = deckFor(2, 0, ['QsJs', 'Ts9c'], 'Td7c2h4s3d');
    let s = startHandWithDeck({ stacks: [100, 100], button: 0 }, deck);
    s = act(s, { kind: 'call' });
    s = act(s, { kind: 'check' });
    for (let i = 0; i < 4; i++) s = act(s, { kind: 'check' }); // flop and turn check through
    expect(s.street).toBe('river');
    s = act(s, { kind: 'bet', to: 2 }); // BB bets the pot with top pair
    const cards = s.players[0].cards;
    expect(probOf(s, cards, station, 'call')).toBeGreaterThan(probOf(s, cards, nit, 'call'));
  });
});

describe('hand strength', () => {
  it('ranks made hands by how many holdings they beat', () => {
    const board = parseCards('Td7c2h4s3d');
    const set = madeStrength(two('TsTh'), board);
    const topPair = madeStrength(two('AsTc'), board);
    const air = madeStrength(two('KhJh'), board);
    expect(set).toBeGreaterThan(topPair);
    expect(topPair).toBeGreaterThan(air);
    expect(madeStrength(two('6s5s'), board)).toBeGreaterThan(0.99);
  });

  it('finds flush and straight draws that use a hole card', () => {
    expect(drawsOf(two('AhKh'), parseCards('7h2h9c'))).toMatchObject({ flush: true, openEnded: false, gutshot: false });
    expect(drawsOf(two('8s9d'), parseCards('6c7h2d'))).toMatchObject({ flush: false, openEnded: true });
    expect(drawsOf(two('8s9d'), parseCards('6c5h2d'))).toMatchObject({ gutshot: true, openEnded: false });
    expect(drawsOf(two('Kc2d'), parseCards('6c7h8d9s'))).toMatchObject({ openEnded: false, gutshot: false });
  });

  it('counts draws only before the river and shrinks with more opponents', () => {
    const fd = postflopStrength(two('AhKh'), parseCards('7h2h9c'), 1);
    expect(fd).toBeGreaterThan(madeStrength(two('AhKh'), parseCards('7h2h9c')));
    const pair = two('9s8s');
    expect(postflopStrength(pair, parseCards('9c4d2h'), 3)).toBeLessThan(postflopStrength(pair, parseCards('9c4d2h'), 1));
  });
});

describe('botRange', () => {
  it('weighs each holding by the chance of the actions it took', () => {
    let s = startHand({ stacks: [100, 100, 100, 100, 100, 100], button: 0 }, seededRng(4));
    const history: PlayDecision[] = [];
    const action = { kind: 'raise' as const, to: 2.5 };
    history.push({ state: s, action });
    const dead = s.players[0].cards;
    const range = botRange(history, 3, dead, nit);
    const weight = (h: string) => range.find((c) => c.cards.join() === two(h).join() || c.cards.join() === [...two(h)].reverse().join())?.weight ?? 0;
    expect(weight('AsAh')).toBeCloseTo(probOf(s, two('AsAh'), nit, 'raise'), 9);
    expect(weight('7c2d')).toBeLessThan(0.05);
    expect(range.every((c) => !dead.includes(c.cards[0]) && !dead.includes(c.cards[1]))).toBe(true);
    s = act(s, action);
    expect(s.toAct).toBe(4);
  });
});

describe('gradeCall', () => {
  it('is exact on the river against one range', () => {
    // Hero holds the nuts: any call wins the whole pot.
    const deck = deckFor(2, 0, ['6s5s', 'AdAc'], 'Td7c2h4s3d');
    let s = startHandWithDeck({ stacks: [100, 100], button: 0 }, deck);
    s = act(s, { kind: 'call' });
    s = act(s, { kind: 'check' });
    for (let i = 0; i < 4; i++) s = act(s, { kind: 'check' });
    s = act(s, { kind: 'bet', to: 2 });
    const range = [{ cards: two('AdAc'), weight: 1 }, { cards: two('KdKc'), weight: 1 }];
    const g = gradeCall(s, 0, [{ seat: 1, range }], seededRng(1));
    expect(g.exact).toBe(true);
    expect(g.equity).toBe(1);
    expect(g.evCall).toBeCloseTo(potSize(s) + 2 - 2, 9);
  });

  it('weighs equity by the range on earlier streets', () => {
    const deck = deckFor(2, 0, ['AsKs', 'QdQc'], 'Ks7c2h4s3d');
    let s = startHandWithDeck({ stacks: [100, 100], button: 0 }, deck);
    s = act(s, { kind: 'call' });
    s = act(s, { kind: 'check' });
    s = act(s, { kind: 'bet', to: 1 }); // BB bets the flop
    const behind = gradeCall(s, 0, [{ seat: 1, range: [{ cards: two('7d7h'), weight: 1 }] }], seededRng(2), 3000);
    const ahead = gradeCall(s, 0, [{ seat: 1, range: [{ cards: two('QdQc'), weight: 1 }] }], seededRng(2), 3000);
    expect(behind.exact).toBe(false);
    expect(behind.equity).toBeLessThan(0.3);
    expect(ahead.equity).toBeGreaterThan(0.8);
  });
});
