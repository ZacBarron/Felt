/**
 * Session results from a spreadsheet or a bankroll app export (CSV).
 *
 * Live players track sessions, not hands. Any export with a date, a length
 * and a result works: the columns are found by their headers, so exports
 * from different apps load without setup.
 */

export interface SessionRow {
  date?: Date;
  hours: number;
  /** Profit in money; negative for a loss. */
  profit: number;
  stakes?: string;
}

export interface SessionImport {
  sessions: SessionRow[];
  /** Which header each field came from, so the app can show its reading. */
  columns: { date?: string; hours?: string; profit?: string; buyIn?: string; cashOut?: string; stakes?: string };
  skipped: number;
}

/** Splits one CSV line, honoring quotes. */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      out.push(cell.trim());
      cell = '';
    } else cell += c;
  }
  out.push(cell.trim());
  return out;
}

function money(s: string | undefined): number | undefined {
  if (s === undefined || s === '') return undefined;
  const negative = /^\(.*\)$/.test(s) || s.trim().startsWith('-');
  const n = Number(s.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || s.replace(/[^\d]/g, '') === '') return undefined;
  return negative ? -n : n;
}

/** "4.5", "4:30", "270 min", "4h 30m" all become hours. */
export function parseDuration(s: string | undefined, minutesColumn = false): number | undefined {
  if (!s) return undefined;
  const t = s.trim().toLowerCase();
  const hm = t.match(/^(\d+):(\d{1,2})(?::\d{2})?$/);
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60;
  const hAndM = t.match(/^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/);
  if (hAndM && (hAndM[1] || hAndM[2])) return Number(hAndM[1] ?? 0) + Number(hAndM[2] ?? 0) / 60;
  const n = Number(t.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || t.replace(/[^\d]/g, '') === '') return undefined;
  return minutesColumn || /min/.test(t) ? n / 60 : n;
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/) ?? s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const us = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const y = Number(us[3]) < 100 ? 2000 + Number(us[3]) : Number(us[3]);
    return new Date(y, Number(us[1]) - 1, Number(us[2]));
  }
  return undefined;
}

const find = (headers: string[], patterns: RegExp[], exclude?: RegExp) =>
  patterns.map((p) => headers.findIndex((h) => p.test(h) && !(exclude && exclude.test(h)))).find((i) => i >= 0) ?? -1;

export function parseSessionsCsv(text: string): SessionImport {
  const lines = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return { sessions: [], columns: {}, skipped: 0 };
  const delimiter = [',', ';', '\t'].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.toLowerCase());
  const col = {
    date: find(headers, [/^date$/, /start/, /date/, /day/]),
    hours: find(headers, [/hours?/, /duration/, /length/, /time played/, /minutes?|mins?/], /rate|per hour|\/h/),
    profit: find(headers, [/^profit/, /^net/, /result/, /won|win/, /p\/?l/], /rate|per hour|\/h|bb/),
    buyIn: find(headers, [/buy.?in/]),
    cashOut: find(headers, [/cash.?out/]),
    stakes: find(headers, [/stakes?/, /game/, /limit/]),
  };
  const name = (i: number) => (i >= 0 ? headers[i] : undefined);
  const minutes = col.hours >= 0 && /min/.test(headers[col.hours]);
  const sessions: SessionRow[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter);
    const hours = parseDuration(cells[col.hours], minutes);
    let profit = money(cells[col.profit]);
    if (profit === undefined) {
      const buyIn = money(cells[col.buyIn]);
      const cashOut = money(cells[col.cashOut]);
      if (buyIn !== undefined && cashOut !== undefined) profit = cashOut - buyIn;
    }
    if (hours === undefined || profit === undefined || hours <= 0) {
      skipped++;
      continue;
    }
    sessions.push({ date: parseDate(cells[col.date]), hours, profit, stakes: col.stakes >= 0 ? cells[col.stakes] || undefined : undefined });
  }
  return {
    sessions,
    columns: { date: name(col.date), hours: name(col.hours), profit: name(col.profit), buyIn: name(col.buyIn), cashOut: name(col.cashOut), stakes: name(col.stakes) },
    skipped,
  };
}

export interface SessionTotals {
  sessions: number;
  hours: number;
  profit: number;
  perHour: number;
}

export function sessionTotals(rows: readonly SessionRow[]): SessionTotals {
  const hours = rows.reduce((s, r) => s + r.hours, 0);
  const profit = rows.reduce((s, r) => s + r.profit, 0);
  return { sessions: rows.length, hours, profit, perHour: hours > 0 ? profit / hours : 0 };
}
