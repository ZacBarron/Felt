import { describe, expect, it } from 'vitest';
import { auditMarkdown, auditQuestions, countBy, DEPTHS, lessonFocus, POSITIONS, POT_TYPES, STREETS } from './audit';

/**
 * Guards the coverage that docs/research/lesson-audit.md reports, so the
 * thin spots it found stay covered. Run with AUDIT=1 to print the tables.
 */
describe('lesson audit', () => {
  const { base, variants } = auditQuestions();
  const all = [...base, ...variants];

  it('prints the audit when asked', () => {
    const md = auditMarkdown();
    if (process.env.AUDIT) console.log(md);
    expect(md).toContain('By pot type');
  });

  it('asks about every seat, not just the button and the big blind', () => {
    // Lessons deal a random version on each visit, so every version counts toward what players see.
    const seats = countBy(all, (r) => r.positions, POSITIONS);
    const floors: Record<(typeof POSITIONS)[number], number> = { UTG: 25, 'UTG+1': 8, 'UTG+2': 4, LJ: 15, HJ: 25, CO: 50, BTN: 100, SB: 60, BB: 100, Straddle: 20 };
    for (const seat of POSITIONS) expect(seats[seat], seat).toBeGreaterThanOrEqual(floors[seat]);
  });

  it('covers 3bet, 4bet, limped, multiway and straddled pots', () => {
    const pots = countBy(base, (r) => r.pot, POT_TYPES);
    expect(pots['3bet']).toBeGreaterThanOrEqual(60);
    expect(pots['4bet']).toBeGreaterThanOrEqual(14);
    expect(pots.Limped).toBeGreaterThanOrEqual(15);
    expect(pots.Multiway).toBeGreaterThanOrEqual(25);
    expect(pots.Straddled).toBeGreaterThanOrEqual(10);
    const focus = lessonFocus();
    expect(focus['3bet pots (title says 3bet or squeeze)']).toBeGreaterThanOrEqual(12);
    expect(focus['4bet pots (title says 4bet)']).toBeGreaterThanOrEqual(4);
  });

  it('states stack depths and asks about every street', () => {
    const depths = countBy(all, (r) => [r.depth], DEPTHS);
    const floors = { 'Under 50bb': 12, '50 to 99bb': 8, '100bb': 25, 'Over 100bb': 20 } as const;
    for (const [d, n] of Object.entries(floors)) expect(depths[d as keyof typeof floors], d).toBeGreaterThanOrEqual(n);
    const streets = countBy(base, (r) => [r.street], STREETS);
    for (const s of ['Preflop', 'Flop', 'Turn', 'River'] as const) expect(streets[s], s).toBeGreaterThanOrEqual(20);
  });
});
