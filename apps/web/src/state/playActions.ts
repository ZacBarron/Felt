import { type HandState, legalActions, potSize, straddleOf } from '@felt/core';
import { HERO } from './play';

/**
 * The player's choices at the table as pure steps: the raise sizes to offer,
 * the one size the Simple layout shows, and the line that says what is
 * happening. The page only draws them.
 */

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
const round = (x: number) => Math.round(x * 2) / 2;

export interface SizeOption {
  label: string;
  to: number;
  /** The player's own open size from Settings. */
  mine?: boolean;
}

/**
 * Raise sizes to offer, like an online client. Unopened before the flop
 * that is your open plus 1bb for each limper (in straddles if there is
 * one), then multiples of the raise, then shares of the pot after the flop.
 */
export function sizeOptions(state: HandState, open: number): SizeOption[] {
  const legal = legalActions(state);
  const r = legal.raise;
  if (!r) return [];
  const pot = potSize(state);
  const clampTo = (to: number) => Math.min(r.max, Math.max(r.min, round(to)));
  let list: SizeOption[];
  const preflop = state.log.filter((a) => a.street === 'preflop');
  if (state.street === 'preflop' && !preflop.some((a) => a.kind === 'raise')) {
    const unit = Math.max(1, straddleOf(state) / state.bb);
    const limps = preflop.filter((a) => a.kind === 'call').length;
    list = [...new Set([2.5, 3, open])].sort((x, y) => x - y).map((x) => ({ label: `${fmt((x + limps) * unit)}bb`, to: (x + limps) * unit, mine: x === open }));
  } else if (state.street === 'preflop') {
    list = [3, 4].map((x) => ({ label: `${x}x`, to: state.currentBet * x }));
  } else {
    // A pot sized raise calls first, then raises by the pot after the call.
    const potTo = (f: number) => (r.kind === 'bet' ? pot * f : state.currentBet + (pot + legal.call) * f);
    list = [
      { label: '⅓ pot', to: potTo(1 / 3) },
      { label: '½ pot', to: potTo(0.5) },
      { label: '¾ pot', to: potTo(0.75) },
      { label: 'Pot', to: potTo(1) },
    ];
  }
  const seen = new Set<number>();
  return [{ label: 'Min', to: r.min }, ...list.map((o) => ({ ...o, to: clampTo(o.to) })), { label: 'All in', to: r.max }].filter((o) => {
    if (seen.has(o.to)) return false;
    seen.add(o.to);
    return true;
  });
}

/**
 * The one raise size the Simple layout shows: your open before the flop,
 * three times a raise, half the pot after the flop. Those are the sizes a
 * coach reaches for first. Anything else is under More sizes.
 */
export function simpleSize(options: readonly SizeOption[]): number | undefined {
  const pick = options.find((o) => o.mine) ?? options.find((o) => o.label === '3x') ?? options.find((o) => o.label === '½ pot') ?? options.find((o) => o.label !== 'Min' && o.label !== 'All in') ?? options[0];
  return pick?.to;
}

/**
 * One short line for the Simple layout that says what is happening, such as
 * "Sam raised to 6. It's 4 more to call." `name` gives a seat's name.
 */
export function situationLine(state: HandState, name: (seat: number) => string): string {
  if (state.result || state.toAct === null) return '';
  const me = state.players[HERO];
  if (me.folded) return 'You folded. The hand plays on without you.';
  if (state.toAct !== HERO) return me.allIn ? `You are all in. Waiting for ${name(state.toAct)}.` : `Waiting for ${name(state.toAct)}.`;

  const legal = legalActions(state);
  const street = state.log.filter((a) => a.street === state.street);
  const last = [...street].reverse().find((a) => a.kind === 'bet' || a.kind === 'raise');
  const more = me.street > 0 ? 'more ' : '';
  const price = legal.call > 0 ? (legal.callAllIn ? `Calling puts you all in for ${fmt(legal.call)}.` : `It's ${fmt(legal.call)} ${more}to call.`) : '';
  const who = (seat: number) => (seat === HERO ? 'You' : name(seat));

  if (last) {
    const did = last.allIn ? `went all in for ${fmt(last.to)}` : last.kind === 'bet' ? `bet ${fmt(last.to)}` : `raised to ${fmt(last.to)}`;
    return `${who(last.seat)} ${did}. ${price}`.trim();
  }
  const calls = street.filter((a) => a.kind === 'call');
  const checks = street.filter((a) => a.kind === 'check');
  const folds = street.filter((a) => a.kind === 'fold').length;
  if (state.street === 'preflop') {
    const callers = calls.length === 1 ? `${who(calls[0].seat)} called` : `${calls.length} players called`;
    if (legal.call === 0) return calls.length ? `${callers}. You can check or raise.` : 'You can check or raise.';
    if (calls.length) return `${callers}. ${price}`;
    return `${folds ? 'Everyone folded to you.' : 'You act first.'} ${price}`;
  }
  if (checks.length === 1) return `${who(checks[0].seat)} checked. You can check or bet.`;
  if (checks.length > 1) return 'Everyone checked to you. You can check or bet.';
  return 'You act first. You can check or bet.';
}
