import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../src';

/**
 * Every topic opens with an intro that orients the player: why it matters,
 * when it comes up at the table and what they will be able to do. Each track
 * says in one sentence why it matters. All of it follows docs/VOICE.md.
 */

// Thousands separators are not commas in the sentence.
const sentencesOf = (s: string) => s.replace(/(\d),(\d{3})/g, '$1$2').split(/(?<=[.?])\s+/);

/** The sentence rules from VOICE.md: one comma at most, under 20 words, no semicolons, colons, dashes or exclamation marks. */
function expectVoice(where: string, s: string) {
  expect(s, where).not.toMatch(/[;:!–—]/);
  expect(s, where).not.toMatch(/\s-\s/);
  for (const sentence of sentencesOf(s)) {
    expect((sentence.match(/,/g) ?? []).length, `${where}: ${sentence}`).toBeLessThanOrEqual(1);
    expect(sentence.split(/\s+/).length, `${where}: ${sentence}`).toBeLessThan(20);
  }
  // Lessons teach everything in Suited's own words, and so do intros.
  expect(s, where).not.toMatch(/\b(book|books|author|video|videos|website|podcast|course|https?)\b/i);
}

const modules = CURRICULUM.flatMap((t) => t.modules.map((m) => ({ key: `${t.id}/${m.id}`, m })));

describe('topic intros', () => {
  it('covers every topic in every track', () => {
    expect(modules.length).toBeGreaterThan(20);
    for (const { key, m } of modules) {
      expect(m.intro, key).toBeDefined();
      expect(m.intro.why.length, key).toBeGreaterThan(0);
      expect(m.intro.when.length, key).toBeGreaterThan(0);
    }
  });

  it('says why and when in 1 or 2 whole sentences', () => {
    for (const { key, m } of modules) {
      for (const [field, s] of [
        ['why', m.intro.why],
        ['when', m.intro.when],
      ] as const) {
        const where = `${key} ${field}`;
        expect(s, where).toMatch(/^[A-Z0-9].*\.$/);
        expect(sentencesOf(s).length, where).toBeGreaterThanOrEqual(1);
        expect(sentencesOf(s).length, where).toBeLessThanOrEqual(2);
        expectVoice(where, s);
      }
    }
  });

  it('lists 2 or 3 concrete outcomes that finish "You will"', () => {
    for (const { key, m } of modules) {
      const items = m.intro.youWill;
      expect(items.length, key).toBeGreaterThanOrEqual(2);
      expect(items.length, key).toBeLessThanOrEqual(3);
      expect(new Set(items).size, key).toBe(items.length);
      for (const item of items) {
        const where = `${key} youWill: ${item}`;
        // A fragment in a list: starts with a capital verb, no period, no "You will" repeated.
        expect(item, where).toMatch(/^[A-Z]/);
        expect(item, where).not.toMatch(/[.?]$/);
        expect(item, where).not.toMatch(/^you will/i);
        expect(item.split(/\s+/).length, where).toBeGreaterThanOrEqual(3);
        expectVoice(where, item);
      }
    }
  });

  it('never repeats the same intro across topics', () => {
    const whys = modules.map(({ m }) => m.intro.why);
    const whens = modules.map(({ m }) => m.intro.when);
    expect(new Set(whys).size).toBe(whys.length);
    expect(new Set(whens).size).toBe(whens.length);
  });
});

describe('track intros', () => {
  it('says why each track matters in 1 sentence', () => {
    for (const t of CURRICULUM) {
      const where = `${t.id} why`;
      expect(t.intro.why, where).toMatch(/^[A-Z0-9].*\.$/);
      expect(sentencesOf(t.intro.why).length, where).toBe(1);
      expectVoice(where, t.intro.why);
    }
  });
});
