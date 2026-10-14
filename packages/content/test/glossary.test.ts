import { describe, expect, it } from 'vitest';
import { findTerms, GLOSSARY } from '../src';

describe('glossary matching', () => {
  it('finds abbreviations only in capitals and at word edges', () => {
    const text = 'A TAG raises. Two TAGs fold. The tag on the bag. TAGGED.';
    expect(findTerms(text).map((m) => text.slice(m.start, m.end))).toEqual(['TAG', 'TAGs']);
  });

  it('finds spelled out aliases in any case', () => {
    expect(findTerms('Loose aggressive players bet.').map((m) => m.id)).toEqual(['lag']);
  });

  it('has unique ids and one or two sentence definitions', () => {
    expect(new Set(GLOSSARY.map((t) => t.id)).size).toBe(GLOSSARY.length);
    for (const t of GLOSSARY) expect(t.short.split(/(?<=\.)\s/).length, t.id).toBeLessThanOrEqual(2);
  });
});
