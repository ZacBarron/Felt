import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, NAV_SECTIONS, TABS, tabFor } from '../src/nav';

describe('tabFor', () => {
  it('keeps each tab selected on its own page', () => {
    for (const t of TABS) expect(tabFor(t.to)).toBe(t.to);
  });

  it('keeps the parent tab selected on pushed pages', () => {
    expect(tabFor('/review')).toBe('/train');
    expect(tabFor('/ranges')).toBe('/train');
    expect(tabFor('/scenarios/srp-btn-bb')).toBe('/train');
    expect(tabFor('/coach')).toBe('/learn');
    expect(tabFor('/saved')).toBe('/you');
    expect(tabFor('/learn/postflop/cbet/sizing')).toBe('/learn');
    expect(tabFor('/glossary')).toBe('/learn');
    expect(tabFor('/settings/appearance')).toBe('/you');
    expect(tabFor('/account')).toBe('/you');
    expect(tabFor('/league')).toBe('/you');
  });

  it('puts every section item under a real tab', () => {
    const tabs = new Set(TABS.map((t) => t.to));
    for (const s of NAV_SECTIONS) expect(tabs.has(s.tab)).toBe(true);
    for (const i of NAV_ITEMS) expect(tabs.has(tabFor(i.to))).toBe(true);
  });
});
