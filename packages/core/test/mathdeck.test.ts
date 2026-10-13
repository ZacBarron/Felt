import { describe, expect, it } from 'vitest';
import { MATH_FACTS, mathFact } from '../src';

describe('math deck', () => {
  it('has unique ids and four distinct choices that include the answer', () => {
    expect(new Set(MATH_FACTS.map((f) => f.id)).size).toBe(MATH_FACTS.length);
    for (const f of MATH_FACTS) {
      expect(f.choices).toHaveLength(4);
      expect(new Set(f.choices).size).toBe(4);
      expect(f.choices).toContain(f.answer);
    }
  });

  it('states the exact values the lessons teach', () => {
    expect(mathFact('math:pot-odds:0.500')?.answer).toBe(25);
    expect(mathFact('math:pot-odds:1.000')?.answer).toBe(33.3);
    expect(mathFact('math:pot-odds:0.667')?.answer).toBe(28.6);
    expect(mathFact('math:mdf:0.500')?.answer).toBe(66.7);
    expect(mathFact('math:mdf:2.000')?.answer).toBe(33.3);
    expect(mathFact('math:alpha:0.750')?.answer).toBe(42.9);
    expect(mathFact('math:outs-flop:9')?.answer).toBe(35);
    expect(mathFact('math:outs-flop:12')?.answer).toBe(45);
    expect(mathFact('math:outs-flop:15')?.answer).toBe(54.1);
    expect(mathFact('math:outs-turn:9')?.answer).toBe(19.6);
    expect(mathFact('math:combos:offsuit')?.answer).toBe(12);
    expect(mathFact('math:combos:pair-one-out')?.answer).toBe(3);
  });

  it('offers the forgot your own call mistake as a choice', () => {
    // Half pot: 0.5 / 1.5 = 33.3% if you leave out your call.
    expect(mathFact('math:pot-odds:0.500')?.choices).toContain(33.3);
  });
});
