import { botAtTable } from '@felt/content';
import { act, botMix, type HandState, type PlayAction, type PlayDecision, type Rng, sampleAction, seededRng, stacksAfter, startHand } from '@felt/core';
import { actionText, chartAdvisor, HERO, isClearFold, type PlaySeat } from './play';
import { type HandRecord, refillBots, tableRoom, type TableSession } from './playTable';

/**
 * The table loop as pure steps, so it can be tested without a screen: deal
 * a hand (folding clear folds for the player), apply an action, and finish a
 * hand off screen once the player has folded. The page adds the timing.
 */

/** Seats for a session: the player first, then each bot as it plays in this room. */
export function seatsOf(session: Pick<TableSession, 'bots' | 'table'>): PlaySeat[] {
  const room = tableRoom(session.table);
  return session.bots.map((id) => (id ? { bot: botAtTable(id, room) } : {}));
}

/** One bot decision, sampled from its mix. */
export function botAction(state: HandState, seats: readonly PlaySeat[], rng: Rng): PlayAction {
  const seat = state.toAct!;
  return sampleAction(botMix(state, state.players[seat].cards, seats[seat].bot!.profile, chartAdvisor), rng);
}

/** Plays bots without pausing until the player acts or the hand ends. Pushes each decision to `history`. */
export function fastForward(state: HandState, history: PlayDecision[], seats: readonly PlaySeat[], rng: Rng): HandState {
  while (state.toAct !== null && state.toAct !== HERO) {
    const action = botAction(state, seats, rng);
    history.push({ state, action });
    state = act(state, action);
  }
  return state;
}

/** Plays every remaining decision, the player's included, by sampling the bots. For a hand the player has folded. */
export function playOut(state: HandState, history: PlayDecision[], seats: readonly PlaySeat[], rng: Rng): HandState {
  while (state.toAct !== null) {
    if (state.toAct === HERO) throw new Error('The player still has a decision');
    state = fastForward(state, history, seats, rng);
  }
  return state;
}

/**
 * Books a finished hand: stacks, session totals and the hand record. A
 * skipped clear fold counts its blinds in the result and the skipped total
 * but is not kept as a hand: you made no decision in it.
 */
export function bookHand(s: TableSession, final: HandState, history: PlayDecision[], id: string, seed: number, how: 'played' | 'offscreen' | 'skipped'): TableSession {
  const net = final.result!.net[HERO];
  const skipped = how === 'skipped';
  const hinted = s.live?.id === id ? s.live.hinted : undefined;
  const record: HandRecord = {
    id,
    number: s.stats.hands + s.stats.skipped + 1,
    seed,
    history,
    final,
    ...(how === 'offscreen' ? { offScreen: true } : {}),
    ...(hinted?.length ? { hinted } : {}),
  };
  return {
    ...s,
    stacks: stacksAfter(final),
    stats: { ...s.stats, hands: s.stats.hands + (skipped ? 0 : 1), skipped: s.stats.skipped + (skipped ? 1 : 0), net: s.stats.net + net },
    hands: skipped ? s.hands : [...s.hands.slice(-29), record],
  };
}

/** How many hands one deal may skip before it stops and waits, so the table never spins on its own. */
export const MAX_SKIPS = 30;

/**
 * Deals the next hand. With skip folds on, each hand the player would fold
 * for sure is folded for them and played out at once, and the next is
 * dealt, until a hand the player has to decide on comes up. Bots act before
 * the player with the same seeded draws the screen will replay, so what the
 * player sees matches what the skip test saw.
 */
export function dealNext(s: TableSession, nextSeed: () => number): TableSession {
  let next: TableSession = { ...s, justSkipped: 0 };
  const seats = seatsOf(next);
  for (let tries = 0; tries <= MAX_SKIPS; tries++) {
    if (next.stacks[HERO] + next.pendingChips <= 0) return next;
    const stacks = refillBots(next.stacks, next.table).map((x, i) => (i === HERO ? x + next.pendingChips : x));
    const button = (next.button + 1) % next.table.seats;
    const seed = nextSeed();
    const state = startHand({ stacks, button, sb: next.table.sb, straddle: next.table.straddle }, seededRng(seed));
    const id = `${seed.toString(36)}-${next.stats.hands + next.stats.skipped + 1}`;
    next = { ...next, button, stacks, pendingChips: 0, stats: { ...next.stats, bought: next.stats.bought + next.pendingChips } };
    if (next.settings.skipFolds && tries < MAX_SKIPS) {
      const history: PlayDecision[] = [];
      const ahead = fastForward(state, history, seats, seededRng(seed + 1));
      if (ahead.toAct === HERO && isClearFold(ahead)) {
        history.push({ state: ahead, action: { kind: 'fold' } });
        const final = playOut(act(ahead, { kind: 'fold' }), history, seats, seededRng(seed + 2));
        next = { ...bookHand(next, final, history, id, seed, 'skipped'), justSkipped: (next.justSkipped ?? 0) + 1 };
        continue;
      }
    }
    return { ...next, live: { id, seed, state, history: [], said: {} } };
  }
  return next;
}

/**
 * Marks the player's coming decision as hinted: they asked what a coach would
 * do before acting. The decision is still graded but never rated.
 */
export function markHinted(s: TableSession): TableSession {
  if (!s.live || s.live.state.toAct === null) return s;
  const index = s.live.history.length;
  const hinted = s.live.hinted ?? [];
  return hinted.includes(index) ? s : { ...s, live: { ...s.live, hinted: [...hinted, index] } };
}

/** The rng the screen uses for the bots in a dealt hand: the same draws `dealNext` used. */
export const liveRng = (seed: number) => seededRng(seed + 1);

/**
 * Applies an action to the hand on the table. When the player folds and the
 * table deals on, the rest of the hand plays out at once off screen with
 * `rng` and the hand is booked, so stats, history and the bots' stacks are
 * the same as if the player had watched.
 */
export function applyAction(s: TableSession, action: PlayAction, rng: Rng): TableSession {
  if (!s.live) return s;
  const { state, history, said } = s.live;
  const seat = state.toAct!;
  let nextState = act(state, action);
  const nextHistory = [...history, { state, action }];
  const nextSaid = nextState.street !== state.street ? {} : { ...said, [seat]: actionText(state, action) };
  const offScreen = seat === HERO && action.kind === 'fold' && s.settings.afterFold !== 'watch';
  if (offScreen) {
    nextState = playOut(nextState, nextHistory, seatsOf(s), rng);
    const booked = bookHand(s, nextState, nextHistory, s.live.id, s.live.seed, 'offscreen');
    return { ...booked, live: undefined };
  }
  const next: TableSession = { ...s, live: { ...s.live, state: nextState, history: nextHistory, said: nextSaid } };
  return nextState.result ? bookHand(next, nextState, nextHistory, s.live.id, s.live.seed, 'played') : next;
}
