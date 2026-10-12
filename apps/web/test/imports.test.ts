import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { GG_CASH, STARS_CASH, STARS_TOURNAMENT_1 } from '../../../packages/core/test/fixtures/hands';
import { db } from '../src/state/db';
import { chartOpenFreq, clearImports, importHandText, importSessionCsv } from '../src/state/imports';

beforeEach(async () => {
  await clearImports();
});

describe('imports', () => {
  it('adds hands once, keeps the original text, and skips duplicates', async () => {
    const file = [STARS_CASH, GG_CASH, STARS_TOURNAMENT_1].join('\n\n');
    expect(await importHandText(file)).toEqual({ added: 3, duplicates: 0, noHero: 0, errors: 0 });
    expect(await importHandText(file)).toEqual({ added: 0, duplicates: 3, noHero: 0, errors: 0 });
    const cash = await db.hands.where('game').equals('cash').toArray();
    expect(cash).toHaveLength(2);
    expect(cash.find((h) => h.site === 'pokerstars')?.raw.startsWith('PokerStars Hand #212345678901')).toBe(true);
  });

  it('stores live sessions from a CSV', async () => {
    const r = await importSessionCsv('Date,Hours,Profit\n2026-09-01,4,250\n2026-09-02,5,-120');
    expect(r.sessions).toHaveLength(2);
    expect(await db.sessions.count()).toBe(2);
  });

  it('looks up opening frequencies by chart seat', () => {
    expect(chartOpenFreq('UTG', 'AA')).toBe(1);
    expect(chartOpenFreq('UTG', '72o')).toBe(0);
    expect(chartOpenFreq('BTN', 'K2s')).toBe(1);
    expect(chartOpenFreq('BB', 'AA')).toBeUndefined();
  });
});
