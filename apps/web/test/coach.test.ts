import 'fake-indexeddb/auto';
import { STARTER_CHARTS } from '@felt/content';
import { DEFAULT_SETTINGS } from '@felt/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCoachContext, chartMixText, chartSpot, historyForRequest, parseReply, recentMisses, serverPro, starterPrompts } from '../src/state/coach';
import { getChart } from '../src/state/charts';
import { db } from '../src/state/db';
import type { AppSettings } from '../src/state/settings';

const chart = getChart(STARTER_CHARTS.find((c) => c.source === 'starter-approx' && c.basis === 'gto')!.id)!;
/** A hand the chart mixes, so the mix text has more than one part. */
const mixed = [...chart.mixes.entries()].find(([, m]) => Object.values(m).filter((f) => f > 0.005).length > 1)?.[0] ?? 'AA';

const settings = {
  game: DEFAULT_SETTINGS,
  study: { newPerDay: 15 },
  ui: { haptics: true, appearance: 'system', palette: 'card-room' },
  profile: { onboarded: true, goals: ['win-live'], focus: [], dailyMinutes: 10, experience: 'new', target: 'Solid' },
  access: { pro: true },
} as AppSettings;

beforeEach(async () => {
  await db.answers.clear();
});

describe('coach context', () => {
  it('describes a chart spot with its own mix and labels the source', () => {
    const text = chartMixText(chart, mixed);
    const total = [...text.matchAll(/(\d+)%/g)].reduce((t, m) => t + Number(m[1]), 0);
    expect(total).toBeGreaterThanOrEqual(99);
    expect(total).toBeLessThanOrEqual(101);
    const spot = chartSpot({ chartId: chart.spec.id, hand: mixed, chose: 'Fold', verdict: 'Close' })!;
    expect(spot).toMatchObject({ hand: mixed, hero: chart.spec.hero, chose: 'Fold', source: 'Felt starter chart (approximate)', basis: 'baseline' });
    expect(chartSpot({ chartId: 'missing', hand: 'AA' })).toBeUndefined();
  });

  it('lists recent misses newest first, once each, skipping decisions answered right since', async () => {
    const t = (min: number) => new Date(Date.UTC(2026, 9, 14, 10, min));
    await db.answers.bulkAdd([
      { at: t(0), itemId: `chart:${chart.spec.id}:${mixed}`, domain: 'preflop', difficulty: 1300, score: 0, source: 'review' },
      { at: t(1), itemId: `chart:${chart.spec.id}:72o`, domain: 'preflop', difficulty: 1300, score: 0, source: 'review' },
      { at: t(20), itemId: `chart:${chart.spec.id}:72o`, domain: 'preflop', difficulty: 1300, score: 1, source: 'review' },
      { at: t(30), itemId: 'math:pot-odds-1', domain: 'math', difficulty: 1300, score: 0, source: 'review' },
      { at: t(40), itemId: `chart:${chart.spec.id}:${mixed}`, domain: 'preflop', difficulty: 1300, score: 0.7, source: 'review' },
    ]);
    const misses = await recentMisses();
    expect(misses).toHaveLength(1);
    expect(misses[0]).toMatchObject({ kind: 'chart decision', verdict: 'Close', spot: { hand: mixed } });
  });

  it('summarizes the player without a rating until they answer', async () => {
    const ctx = await buildCoachContext(settings, { chartId: chart.spec.id, hand: mixed });
    expect(ctx.rating).toBeUndefined();
    expect(ctx.target).toBe('Solid');
    expect(ctx.experience).toMatch(/^New to poker/);
    expect(ctx.goals).toHaveLength(1);
    expect(ctx.game).toMatchObject({ tableSize: DEFAULT_SETTINGS.tableSize, stackBb: DEFAULT_SETTINGS.stackBb });
    expect(ctx.spot?.hand).toBe(mixed);
    // Small enough for the server's 8000 character limit with room to spare.
    expect(JSON.stringify(ctx).length).toBeLessThan(4000);
  });
});

describe('coach conversation', () => {
  it('leaves out refused exchanges and starts with a question', () => {
    const history = historyForRequest([
      { role: 'user', content: 'Off topic' },
      { role: 'assistant', content: 'I can’t help with that one.', refused: true },
      { role: 'user', content: 'Why fold K9o?' },
      { role: 'assistant', content: 'It is dominated.' },
      { role: 'user', content: 'And from the button?' },
    ]);
    expect(history.map((m) => m.content)).toEqual(['Why fold K9o?', 'It is dominated.', 'And from the button?']);
  });

  it('drops the oldest turns of a long chat', () => {
    const long = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? ('assistant' as const) : ('user' as const), content: `${i} ${'x'.repeat(1500)}` }));
    long.push({ role: 'user', content: 'Last' });
    const history = historyForRequest(long);
    expect(history.at(-1)!.content).toBe('Last');
    expect(history[0].role).toBe('user');
    expect(history.reduce((t, m) => t + m.content.length, 0)).toBeLessThanOrEqual(24_000);
  });

  it('reads light Markdown as paragraphs, bullets and bold, and nothing else', () => {
    const blocks = parseReply('**Fold.** It is dominated.\n\n- Kx loses to KQ\n- 9x rarely wins\nThat is the reason.\n\n<b>raw</b>');
    expect(blocks).toEqual([
      { kind: 'p', parts: [{ text: 'Fold.', bold: true }, { text: ' It is dominated.' }] },
      { kind: 'list', items: [[{ text: 'Kx loses to KQ' }], [{ text: '9x rarely wins' }]] },
      { kind: 'p', parts: [{ text: 'That is the reason.' }] },
      { kind: 'p', parts: [{ text: '<b>raw</b>' }] },
    ]);
  });

  it('offers starter questions that fit the player', () => {
    expect(starterPrompts(undefined)).toContain('Explain how stakes work');
    expect(starterPrompts(undefined, undefined, 'new')).toContain('Explain how stakes work');
    expect(starterPrompts(undefined, undefined, 'winning')).not.toContain('Explain how stakes work');
    expect(starterPrompts(undefined, { chartId: 'x', hand: 'K9o' })[0]).toBe('Why is K9o played this way here?');
    const regular = starterPrompts({
      rating: { overall: { rating: 1400, tier: 'Sharp', stillSettling: false, answers: 300 }, areas: [{ area: 'Preflop', rating: 1400, tier: 'Sharp', stillSettling: false, answers: 300 }] },
      recentMisses: [{ kind: 'lesson question', lesson: 'x', verdict: 'Not quite' }],
    }, undefined, 'winning');
    expect(regular).toEqual(expect.arrayContaining(['Why did I miss my last hand?', 'Explain my weakest area']));
    expect(regular).not.toContain('Explain how stakes work');
  });

  it('trusts only an unexpired Pro entitlement from the server', () => {
    const user = (pro: boolean, until: string | null) => ({ access: { pro, until, plan: null, trialing: false } }) as never;
    const now = new Date('2026-10-14T00:00:00Z');
    expect(serverPro(undefined, now)).toBe(false);
    expect(serverPro(user(false, null), now)).toBe(false);
    expect(serverPro(user(true, '2026-11-01T00:00:00Z'), now)).toBe(true);
    expect(serverPro(user(true, '2026-10-01T00:00:00Z'), now)).toBe(false);
  });
});
