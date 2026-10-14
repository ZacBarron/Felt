import { describe, expect, it } from 'vitest';
import { getChart } from '../src/state/charts';

describe('welcome screen claims', () => {
  it('shows AJo on the button as a raise every time, as the starter chart has it', () => {
    const chart = getChart('9max-100-rfi-btn');
    expect(chart).toBeDefined();
    expect(chart!.mixes.get('AJo')).toEqual({ raise: 1 });
  });
});
