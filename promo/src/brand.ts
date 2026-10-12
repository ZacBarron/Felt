/**
 * Brand tokens for the promo, copied from apps/web/src/styles.css (dark
 * appearance) and docs/BRAND.md. The promo is a separate package, so it
 * keeps its own copy instead of importing across folders.
 */
export const C = {
  paper: '#F4F1EA',
  label: '#F3EFE6',
  label2: 'rgba(243, 239, 230, 0.62)',
  label3: 'rgba(243, 239, 230, 0.3)',
  night: '#080C0B',
  surface: '#131917',
  surface2: '#1C2421',
  base950: '#08181a',
  base900: '#0B2421',
  base700: '#134a42',
  base500: '#21604F',
  felt1: '#2a7461',
  felt2: '#165244',
  felt3: '#0b2421',
  brass: '#E3B261',
  brassText: '#E9B866',
  // Solver action colors, dark appearance (actionColors.ts maps to these tokens).
  raise: '#ff5a4e',
  threeBet: '#c07af5',
  call: '#24a157',
  fold: '#8f8b83',
  green: '#3ccf72',
  onAction: '#08181a',
  // Four color deck on white faces.
  suit: { s: '#1c1c1e', h: '#e0262d', d: '#1f6fe5', c: '#1e9e4a' } as const,
};

export const SERIF = '"Instrument Serif", "Times New Roman", serif';
export const SANS = 'Inter, -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

/** The cells of the F, on a 6x6 grid: the stem, a long top arm, a shorter middle arm. */
export function isFCell(r: number, c: number): boolean {
  return c === 0 || (r === 0 && c <= 4) || (r === 2 && c <= 3);
}

export const MARK_GRID = 6;
export const TAGLINE = 'Instinct, trained.';
