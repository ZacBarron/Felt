import { STARTER_CHARTS } from '@felt/content';
import { actionFrequencies, actionRange, buildChart, type HeroHand, heroView, parseHand, parseSessionsCsv, type SessionImport, splitHands } from '@felt/core';
import { db, type StoredHand } from './db';

/**
 * Bringing in real play: hand histories from online sites or tracking
 * software, and live sessions from a spreadsheet or bankroll app.
 */

export interface HandImportSummary {
  added: number;
  duplicates: number;
  noHero: number;
  errors: number;
}

export async function importHandText(text: string): Promise<HandImportSummary> {
  const rows: StoredHand[] = [];
  let noHero = 0;
  let errors = 0;
  for (const chunk of splitHands(text)) {
    try {
      const h = parseHand(chunk);
      const v = heroView(h);
      if (!v) {
        noHero++;
        continue;
      }
      rows.push({ ...v, at: v.date ?? new Date(), site: h.site, currency: h.currency, tableMax: h.tableMax, raw: chunk });
    } catch {
      errors++;
    }
  }
  const existing = new Set((await db.hands.where('id').anyOf(rows.map((r) => r.id)).primaryKeys()) as string[]);
  const fresh = rows.filter((r) => !existing.has(r.id));
  await db.hands.bulkPut(fresh);
  return { added: fresh.length, duplicates: rows.length - fresh.length, noHero, errors };
}

export async function importSessionCsv(text: string): Promise<SessionImport> {
  const result = parseSessionsCsv(text);
  const importedAt = new Date();
  await db.sessions.bulkAdd(result.sessions.map((s) => ({ ...s, importedAt })));
  return result;
}

export async function clearImports() {
  await db.transaction('rw', db.hands, db.sessions, async () => {
    await db.hands.clear();
    await db.sessions.clear();
  });
}

const RFI_CHARTS = STARTER_CHARTS.filter((s) => s.spot === 'rfi' && s.tableSize === 9).map((spec) => ({ spec, chart: buildChart(spec) }));

/** Opening raise frequency in Suited's 9-handed chart for a seat (UTG through SB) and hand. */
export function chartOpenFreq(seat: string, hand: string): number | undefined {
  const found = RFI_CHARTS.find((c) => c.spec.hero === seat);
  return found ? (actionRange(found.chart, 'raise').get(hand) ?? 0) : undefined;
}

/** Share of all hands the 9-handed chart opens from a seat, weighted by combos. */
export function chartOpenRate(seat: string): number | undefined {
  const found = RFI_CHARTS.find((c) => c.spec.hero === seat);
  return found ? (actionFrequencies(found.chart).raise ?? 0) : undefined;
}

export function chartIdForSeat(seat: string): string | undefined {
  return RFI_CHARTS.find((c) => c.spec.hero === seat)?.spec.id;
}

export const asHeroHand = (h: StoredHand): HeroHand => ({ ...h, date: h.at, hand: h.hand });
