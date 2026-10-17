import { gridHandClass } from '@felt/core';
import { describe, expect, it } from 'vitest';
import { HAND_NICKNAMES, handNickname } from './nicknames';

describe('hand nicknames', () => {
  it('only name real hand classes', () => {
    const all = new Set(Array.from({ length: 169 }, (_, i) => gridHandClass(Math.floor(i / 13), i % 13)));
    for (const hand of HAND_NICKNAMES.keys()) expect(all.has(hand)).toBe(true);
  });

  it('look up by hand class', () => {
    expect(handNickname('72o')).toBe('The hammer');
    expect(handNickname('72s')).toBeUndefined();
    expect(handNickname('AKs')).toBe(handNickname('AKo'));
  });

  it('follow the voice guide', () => {
    for (const name of HAND_NICKNAMES.values()) {
      expect(name).not.toMatch(/[—!]/);
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });
});
