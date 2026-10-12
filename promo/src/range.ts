/**
 * A small copy of the range helpers in packages/core, enough to paint the
 * chart in the promo. The chart is the CO open (100bb cash) from
 * packages/content/src/charts.ts. Those starter charts are approximations,
 * so the promo labels it "Approximate".
 */
const RANKS = 'AKQJT98765432'.split('');

export function handAt(row: number, col: number): string {
  const a = RANKS[row];
  const b = RANKS[col];
  if (row === col) return a + b;
  return row < col ? `${a}${b}s` : `${b}${a}o`;
}

const idx = (r: string) => RANKS.indexOf(r);

/** Parse a range string like "22+, A2s+, K4s:0.85, QTo-Q8o" into frequencies. */
export function parseRange(text: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const raw of text.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const [spec, f] = part.split(':');
    const freq = f === undefined ? 1 : Number(f);
    for (const h of expand(spec)) out.set(h, freq);
  }
  return out;
}

function expand(spec: string): string[] {
  if (spec.includes('-')) {
    const [a, b] = spec.split('-');
    if (a[0] === a[1]) {
      const hi = idx(a[0]);
      const lo = idx(b[0]);
      return range(hi, lo).map((i) => RANKS[i] + RANKS[i]);
    }
    const kind = a.slice(2);
    return range(idx(a[1]), idx(b[1])).map((i) => a[0] + RANKS[i] + kind);
  }
  if (spec.endsWith('+')) {
    const s = spec.slice(0, -1);
    if (s[0] === s[1]) return range(0, idx(s[0])).map((i) => RANKS[i] + RANKS[i]);
    const kind = s.slice(2);
    const top = idx(s[0]) + 1;
    return range(top, idx(s[1])).map((i) => s[0] + RANKS[i] + kind);
  }
  if (spec.length === 2 && spec[0] !== spec[1]) return [`${spec}s`, `${spec}o`];
  return [spec];
}

function range(from: number, to: number): number[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

export const CO_OPEN = parseRange(
  '22+, A2s+, K5s+, K4s:0.85, K3s:0.7, K2s:0.55, Q9s+, Q8s:0.9, Q7s:0.45, Q6s:0.25, Q5s:0.1, J9s+, J8s:0.85, ' +
    'J7s:0.35, J6s:0.05, T9s, T8s:0.95, T7s:0.5, T6s:0.05, 98s, 97s:0.8, 96s:0.15, 87s, 86s:0.5, 76s:0.95, ' +
    '75s:0.3, 65s:0.85, 64s:0.1, 54s:0.65, 53s:0.05, ATo+, A9o:0.85, A8o:0.55, A7o:0.15, A6o:0.05, A5o:0.3, ' +
    'A4o:0.1, KJo+, KTo:0.85, K9o:0.2, QJo, QTo:0.75, Q9o:0.05, JTo:0.7, J9o:0.05, T9o:0.05',
);
