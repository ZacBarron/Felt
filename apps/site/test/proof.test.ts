import { describe, expect, it } from 'vitest';
import { FOUNDING } from '../src/config';
import { FOUNDER_NOTE, QUOTES, visibleFounderNote, visibleQuotes } from '../src/proof';

describe('social proof', () => {
  it('never shows a draft quote in a production build', () => {
    expect(visibleQuotes(QUOTES, true).every((q) => !q.draft)).toBe(true);
    expect(visibleQuotes([{ text: 'Real.', name: 'A.', detail: 'Live 1/2', draft: false }], true)).toHaveLength(1);
  });

  it('shows drafts while designing', () => {
    expect(visibleQuotes(QUOTES, false)).toHaveLength(QUOTES.length);
  });

  it('follows the voice guide', () => {
    for (const q of QUOTES) {
      expect(q.text).not.toMatch(/[—!]/);
      expect(q.text.length).toBeLessThan(180);
    }
  });

  it('shows no founding seat count until checkout reports one', () => {
    expect(FOUNDING.taken === null || (FOUNDING.taken >= 0 && FOUNDING.taken <= FOUNDING.seats)).toBe(true);
  });
});

describe('founder note', () => {
  it('stays hidden in production until the founder confirms it', () => {
    expect(visibleFounderNote({ ...FOUNDER_NOTE, draft: true }, true)).toBeUndefined();
    expect(visibleFounderNote({ ...FOUNDER_NOTE, draft: true }, false)).toBeDefined();
    expect(visibleFounderNote({ ...FOUNDER_NOTE, draft: false }, true)).toBeDefined();
  });

  it('keeps the founder semi anonymous and the copy plain', () => {
    expect(FOUNDER_NOTE.signoff).toMatch(/^[A-Z]\.,/);
    for (const line of FOUNDER_NOTE.lines) {
      expect(line).not.toMatch(/—/);
      expect((line.match(/,/g) ?? []).length).toBeLessThanOrEqual(1);
    }
  });
});
