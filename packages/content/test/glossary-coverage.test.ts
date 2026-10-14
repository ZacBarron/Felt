import { describe, expect, it } from 'vitest';
import {
  CURRICULUM,
  findTerms,
  GLOSSARY,
  glossaryTerm,
  IDEAS,
  LESSON_CONTENT,
  PLAYER_TYPES,
  SCENARIOS,
  STARTER_CHARTS,
  TELLS,
} from '../src';

/**
 * A beginner must be able to look up every term wherever it appears. So every
 * abbreviation and piece of jargon in the content must match a glossary entry,
 * and the entries themselves must be sound and follow docs/VOICE.md.
 */

/** Every string under a value, skipping fields that hold ids, cards, ranges or enums rather than words. */
function strings(v: unknown, skip: ReadonlySet<string>): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap((x) => strings(x, skip));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => (skip.has(k) ? [] : strings(x, skip)));
  return [];
}

const LESSON_SKIP = new Set(['key', 'kind', 'cards', 'board', 'chartId', 'choiceCards', 'tone', 'evidence', 'level', 'active', 'unit', 'practice']);
const OTHER_SKIP = new Set(['id', 'kind', 'level', 'cards', 'board', 'ranges', 'line', 'chartId', 'street', 'reliability', 'drills', 'basis', 'stats']);
const CHART_SKIP = new Set(['id', 'game', 'spot', 'basis', 'source', 'range', 'reach', 'hero']);

/** [where, text] for every piece of words the app shows from the content package. */
const SOURCES: [string, string][] = [
  ...[...LESSON_CONTENT.values()].flatMap((l) => strings(l, LESSON_SKIP).map((s): [string, string] => [l.key, s])),
  ...CURRICULUM.flatMap((t) => strings(t, OTHER_SKIP).map((s): [string, string] => [`curriculum ${t.id}`, s])),
  ...PLAYER_TYPES.flatMap((p) => strings(p, OTHER_SKIP).map((s): [string, string] => [`player type ${p.id}`, s])),
  ...TELLS.flatMap((p) => strings(p, OTHER_SKIP).map((s): [string, string] => [`tell ${p.id}`, s])),
  ...SCENARIOS.flatMap((p) => strings(p, OTHER_SKIP).map((s): [string, string] => [`scenario ${p.id}`, s])),
  ...STARTER_CHARTS.flatMap((c) => strings(c, CHART_SKIP).map((s): [string, string] => [`chart ${c.id}`, s])),
  ...IDEAS.flatMap((p) => strings(p, OTHER_SKIP).map((s): [string, string] => [`idea ${p.id}`, s])),
];

/**
 * Not words: hand and card notation, which the app draws as cards (AKs, KTo,
 * 77, A5s+, QQ+, AK, As, Kh, QhJh, Ax), and Roman numerals (II, IV).
 */
const NOTATION = [/^[AKQJT2-9]{2}[so]?\+?$/, /^(?:[AKQJT2-9][shdc])+$/, /^[AKQJT2-9]x$/, /^[IVX]+$/];

/** Capitalised tokens that are not poker jargon. */
const NOT_JARGON = new Set([
  'US', // the country, in "many US rooms"
]);

/**
 * Abbreviation-like tokens: 2 or more capitals with optional digits ("TAG",
 * "UTG+1", "BvB", "$EV"), bet counts ("3bet", "4bets"), c-bets, and units
 * ("bb", "2.5bb", "bb/100", "mbb/hand").
 */
const ABBREVIATIONS = [
  /(?<![A-Za-z0-9$])\$?[A-Za-z0-9]*[A-Z][a-z0-9]*[A-Z][A-Za-z0-9]*(?:\+\d+)?(?![A-Za-z0-9])/g,
  /(?<![A-Za-z0-9])\d+bet(?:s|ting|tors?)?(?![A-Za-z0-9])/g,
  /(?<![A-Za-z0-9])[cC]-?bet(?:s|ting)?(?![A-Za-z0-9])/g,
  /(?<![A-Za-z])m?bb(?:\/(?:100|hand))?(?![A-Za-z0-9])/g,
];

/** Jargon that a beginner may not know. Wherever it appears, it must be a glossary term. */
const JARGON = [
  'equity', 'pot odds', 'implied odds', 'reverse implied odds', 'outs', 'range', 'combo', 'combos', 'blocker', 'blockers',
  'the nuts', 'nut flush', 'set', 'sets', 'trips', 'quads', 'full house', 'two pair', 'kicker', 'overpair', 'underpair',
  'top pair', 'second pair', 'middle pair', 'bottom pair', 'flush draw', 'gutshot', 'open ended', 'open ender',
  'backdoor', 'combo draw', 'overcard', 'overcards', 'limp', 'limper', 'limpers', 'overlimp', 'iso raise', 'isolate',
  'open', 'opener', 'cold call', 'flat', 'flats', 'overcall', 'squeeze', 'straddle', 'donk', 'probe', 'check raise',
  'check-raise', 'block bet', 'overbet', 'polarized', 'polar', 'merged', 'linear', 'condensed', 'capped',
  'range advantage', 'nut advantage', 'equity realization', 'realize', 'solver', 'solvers', 'node locking', 'exploit',
  'baseline', 'calling station', 'station', 'nit', 'maniac', 'whale', 'regular', 'recreational', 'rake', 'rakeback',
  'tilt', 'variance', 'standard deviation', 'bankroll', 'buy in', 'buy ins', 'risk of ruin', 'ante', 'antes',
  'push or fold', 'reshove', 'bubble', 'bounty', 'satellite', 'showdown value', 'value bet', 'thin value', 'bluff',
  'bluffs', 'semi bluff', 'bluff catcher', 'fold equity', 'alpha', 'effective stack', 'position', 'in position',
  'out of position', 'button', 'blinds', 'big blind', 'small blind', 'preflop', 'postflop', 'flop', 'turn', 'river',
  'street', 'streets', 'showdown', 'side pot', 'main pot', 'split pot', 'mixed', 'frequency', 'chart', 'charts',
  'all in', 'shove', 'jam', 'barrel', 'float', 'slowplay', 'slow play', 'trap', 'hero call', 'hero', 'villain',
  'heads up', 'multiway', 'equilibrium', 'indifferent', 'balanced', 'exploitability', 'best response', 'pocket pair',
  'suited', 'offsuit', 'suited connectors', 'broadway', 'wheel', 'premium', 'dominated', 'playability', 'set mining',
  'geometric', 'stack to pot', 'priced in', 'break even', 'dead money', 'initiative', 'steal', 'stab', 'cutoff',
  'hijack', 'lojack', 'under the gun', 'early position', 'late position', 'orbit', 'tell', 'tells', 'image', 'leak',
  'tracker', 'tank', 'card dead', 'win rate', 'downswing', 'upswing', 'sample size', 'confidence interval',
  'stop loss', 'loss limit', 'bad beat', 'cooler', 'chasing', 'card room', 'table stakes', 'string bet', 'muck',
  'rainbow', 'two tone', 'monotone', 'paired', 'dry', 'wet', 'static', 'dynamic', 'blank', 'runout', 'texture',
  'zero sum', 'unexploitable', 'pay jump', 'final table', 'chip leader', 'prize pool', 'payout', 'in the money',
  'covered', 'risk premium', 'chip EV', 'shot', 'purify', 'regret', 'game tree', 'hand reading', 'stats', 'pool',
  'thinner', 'speculative', 'protection', 'free card', 'hole cards', 'starting hand', 'wheel', 'ace high',
  'no flop, no drop', 'jackpot', 'time collection', 'stakes', 'cash game', 'tournament', '6-max', '9-handed',
  'full ring', 'pot sized', 'sizing', 'commitment', 'committed', 'card removal', 'unblock', 'delayed c-bet',
];

const where = (source: string, text: string, start: number, end: number) =>
  `${source}: "${text.slice(start, end)}" in "${text.slice(Math.max(0, start - 30), end + 30)}"`;

const covered = (text: string, start: number, end: number) =>
  findTerms(text, { linkedOnly: false }).some((m) => m.start <= start && m.end >= end);

describe('glossary coverage', () => {
  it('scans the whole content package', () => {
    expect(SOURCES.length).toBeGreaterThan(5000);
  });

  it('explains every abbreviation the content uses', () => {
    const missing: string[] = [];
    const found = new Set<string>();
    for (const [source, text] of SOURCES) {
      for (const re of ABBREVIATIONS) {
        for (const m of text.matchAll(re)) {
          const token = m[0];
          if (NOTATION.some((n) => n.test(token)) || NOT_JARGON.has(token)) continue;
          found.add(token);
          if (!covered(text, m.index!, m.index! + token.length)) missing.push(where(source, text, m.index!, m.index! + token.length));
        }
      }
    }
    expect(missing, 'abbreviations with no glossary entry').toEqual([]);
    // The scan itself works: it sees the abbreviations the lessons are known to use.
    for (const t of ['TAG', 'LAG', 'VPIP', 'PFR', '3bet', 'c-bet', 'UTG+1', 'BB', 'bb', 'bb/100', 'SPR', 'MDF', 'ICM', 'GTO', 'EV']) {
      expect(found, t).toContain(t);
    }
  });

  it('explains every piece of jargon the content uses', () => {
    const missing: string[] = [];
    for (const phrase of new Set(JARGON)) {
      const re = new RegExp(`(?<![A-Za-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![A-Za-z0-9])`, 'gi');
      for (const [source, text] of SOURCES) {
        for (const m of text.matchAll(re)) {
          // Jargon in another sense is listed as an exception on its term, like "your turn" or "set aside".
          if (!covered(text, m.index!, m.index! + m[0].length) && !excepted(text, m.index!)) {
            missing.push(where(source, text, m.index!, m.index! + m[0].length));
          }
        }
      }
    }
    expect(missing, 'jargon with no glossary entry').toEqual([]);
  });
});

/** Whether the text at `index` sits inside a phrase a term lists as another sense. */
function excepted(text: string, index: number): boolean {
  return GLOSSARY.flatMap((t) => t.except ?? []).some((phrase) => {
    const lower = text.toLowerCase();
    const p = phrase.toLowerCase();
    for (let i = lower.indexOf(p); i !== -1; i = lower.indexOf(p, i + 1)) {
      if (i <= index && index < i + p.length) return true;
    }
    return false;
  });
}

describe('glossary entries', () => {
  const spellingsOf = (t: (typeof GLOSSARY)[number]) => [t.term, ...(t.aliases ?? [])];

  it('has unique ids and no spelling shared by 2 terms', () => {
    expect(new Set(GLOSSARY.map((t) => t.id)).size).toBe(GLOSSARY.length);
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const t of GLOSSARY) {
      for (const s of [...spellingsOf(t), ...(t.except ?? [])]) {
        const key = /[A-Z]/.test(s) ? s : s.toLowerCase();
        if (owner.has(key) && owner.get(key) !== t.id) clashes.push(`${s}: ${owner.get(key)} and ${t.id}`);
        owner.set(key, t.id);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('points every term at a lesson that exists', () => {
    const bad = GLOSSARY.filter((t) => t.lesson && !LESSON_CONTENT.has(t.lesson)).map((t) => `${t.id}: ${t.lesson}`);
    expect(bad).toEqual([]);
    // Nearly every term has a lesson to open.
    expect(GLOSSARY.filter((t) => !t.lesson).length).toBeLessThan(5);
  });

  it('finds each term by its own spellings', () => {
    for (const t of GLOSSARY) {
      for (const s of spellingsOf(t)) {
        expect(findTerms(`Say ${s} here.`, { linkedOnly: false }).map((m) => m.id), `${t.id}: ${s}`).toEqual([t.id]);
      }
    }
  });

  it('keeps everyday words off the underline list and the rest on it', () => {
    const unlinked = GLOSSARY.filter((t) => t.link === false).map((t) => t.id);
    // Everyday poker words are defined but not underlined, so lessons do not get crowded.
    for (const id of ['bet', 'board', 'call', 'check', 'chips', 'dealer', 'fold', 'hand', 'pot', 'raise', 'flop', 'big-blind', 'bluff', 'stack', 'position'])
      if (GLOSSARY.some((t) => t.id === id)) expect(unlinked, id).toContain(id);
    // Real jargon stays underlined: a beginner cannot guess it.
    for (const term of ['MDF', 'SPR', 'ICM', 'equity', 'TAG', 'VPIP', 'blocker', 'polarized']) {
      const t = GLOSSARY.find((x) => x.term === term);
      expect(t, term).toBeDefined();
      expect(t!.link, term).not.toBe(false);
    }
    expect(findTerms('The pot is big.')).toEqual([]);
    expect(findTerms('The pot is big.', { linkedOnly: false }).map((m) => m.id)).toEqual(['pot']);
  });

  it('writes definitions in the Felt voice', () => {
    for (const t of GLOSSARY) {
      const s = t.short;
      expect(s, t.id).toMatch(/\.$/);
      expect(s, t.id).not.toMatch(/[;:!–—]/);
      const sentences = s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/);
      expect(sentences.length, t.id).toBeLessThanOrEqual(2);
      for (const sentence of sentences) {
        expect((sentence.match(/,/g) ?? []).length, `${t.id}: ${sentence}`).toBeLessThanOrEqual(1);
        expect(sentence.split(/\s+/).length, `${t.id}: ${sentence}`).toBeLessThan(20);
      }
    }
  });

  it('spells out each abbreviation first', () => {
    for (const t of GLOSSARY.filter((x) => /^[A-Z$][A-Za-z0-9+$]*$/.test(x.term) && /[A-Z].*[A-Z]/.test(x.term))) {
      const first = t.short.split('. ')[0];
      // "Tight aggressive." spells out TAG. The expansion is a phrase, not a sentence.
      expect(first.split(/\s+/).length, t.id).toBeLessThanOrEqual(6);
      expect(first, t.id).not.toContain(t.term);
    }
  });

  it('never explains a term with itself', () => {
    for (const t of GLOSSARY) {
      const re = new RegExp(`(?<![A-Za-z0-9])${t.term.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![A-Za-z0-9])`, /[A-Z]/.test(t.term) ? '' : 'i');
      expect(t.short, t.id).not.toMatch(re);
    }
  });
});

describe('findTerms', () => {
  // Matching is checked on every term, leaving out the first lesson's everyday words for readability.
  const everyday = new Set(['bet', 'board', 'call', 'check', 'chips', 'dealer', 'fold', 'hand', 'pot', 'raise']);
  const words = (text: string, linkedOnly?: boolean) =>
    findTerms(text, { linkedOnly: linkedOnly ?? false })
      .filter((m) => linkedOnly !== undefined || !everyday.has(m.id))
      .map((m) => [text.slice(m.start, m.end), m.id]);

  it('tells the BB seat from the bb unit', () => {
    expect(words('BB calls 2.5bb. The BB folds 3 bb.')).toEqual([
      ['BB', 'big-blind'],
      ['bb', 'bb'],
      ['BB', 'big-blind'],
      ['bb', 'bb'],
    ]);
  });

  it('matches plurals and the longest spelling', () => {
    expect(words('He 3bets. A 3bet. Two 4bets.')).toEqual([
      ['3bets', 'three-bet'],
      ['3bet', 'three-bet'],
      ['4bets', 'four-bet'],
    ]);
    expect(words('UTG+1 opens and UTG folds. UTG+2 calls.')).toEqual([
      ['UTG+1', 'utg1'],
      ['opens', 'open'],
      ['UTG', 'utg'],
      ['UTG+2', 'utg2'],
    ]);
    expect(words('You win 10bb/100, or 0.1bb a hand.')).toEqual([
      ['bb/100', 'bb-per-100'],
      ['bb', 'bb'],
    ]);
    expect(words('Pot odds beat the pot.', false)).toEqual([
      ['Pot odds', 'pot-odds'],
      ['pot', 'pot'],
    ]);
  });

  it('never matches inside a word or in the wrong case', () => {
    expect(words('Better settings. TAGGED. The tag. Nitpick. Tells.')).toEqual([['Tells', 'tell']]);
    expect(words('Sbarro and bbq.')).toEqual([]);
    expect(words('The SPR is low and the spr is not.')).toEqual([['SPR', 'spr']]);
  });

  it('skips the everyday sense of a word', () => {
    expect(words('On your turn, check the turn card. Money set aside. A set on the turn.')).toEqual([
      ['turn card', 'turn'],
      ['set', 'set'],
      ['turn', 'turn'],
    ]);
    expect(words('Stats tell you a lot. A tell is weak.')).toEqual([
      ['Stats', 'stat'],
      ['tell', 'tell'],
    ]);
  });

  it('returns sorted matches that never overlap', () => {
    for (const [, text] of SOURCES.slice(0, 2000)) {
      const ms = findTerms(text, { linkedOnly: false });
      for (let i = 1; i < ms.length; i++) expect(ms[i].start).toBeGreaterThanOrEqual(ms[i - 1].end);
    }
  });

  it('looks terms up by id', () => {
    expect(glossaryTerm('tag')?.term).toBe('TAG');
    expect(glossaryTerm('nope')).toBeUndefined();
  });
});
