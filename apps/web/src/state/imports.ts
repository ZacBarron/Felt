import { STARTER_CHARTS } from '@felt/content';
import { actionRange, buildChart, type HeroHand, heroView, parseHand, parseSessionsCsv, type SessionImport, splitHands } from '@felt/core';
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

const RFI_CHARTS = STARTER_CHARTS.filter((s) => s.spot === 'rfi').map((spec) => ({ spec, chart: buildChart(spec) }));

/**
 * Opening raise frequency from Felt's charts for a seat and hand, using the
 * 6 handed charts for tables of six or fewer and 9 handed charts otherwise.
 */
export function chartOpenFreq(tableMax: number) {
  const size = tableMax <= 6 ? 6 : 9;
  return (position: string, hand: string): number | undefined => {
    const found = RFI_CHARTS.find((c) => c.spec.tableSize === size && c.spec.hero === position);
    if (!found) return undefined;
    return actionRange(found.chart, 'raise').get(hand) ?? 0;
  };
}

export function chartIdFor(tableMax: number, position: string): string | undefined {
  const size = tableMax <= 6 ? 6 : 9;
  return RFI_CHARTS.find((c) => c.spec.tableSize === size && c.spec.hero === position)?.spec.id;
}

export const asHeroHand = (h: StoredHand): HeroHand => ({ ...h, date: h.at, hand: h.hand });
