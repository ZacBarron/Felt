const COLORS: Record<string, string> = {
  raise: 'var(--act-raise)',
  '3bet': 'var(--act-3bet)',
  '4bet': 'var(--act-3bet)',
  call: 'var(--act-call)',
  check: 'var(--act-check)',
  fold: 'var(--act-fold)',
  allin: 'color-mix(in srgb, var(--act-raise), #000 58%)',
};

/** Bets are shades of the raise color by size so bigger sizings read as more aggressive. */
export function actionColor(id: string): string {
  if (COLORS[id]) return COLORS[id];
  if (id.startsWith('bet') || id.startsWith('raise')) {
    const size = Number(id.replace(/\D/g, '')) || 50;
    // Bigger bets read as deeper shades.
    const mix = Math.min(55, size / 3);
    return `color-mix(in srgb, var(--act-raise), #000 ${mix}%)`;
  }
  return 'var(--gray)';
}

/** Draw order so aggressive actions sit on the left of every bar, like solver UIs. */
export function sortActions(ids: string[]): string[] {
  const rank = (id: string) => (id === 'fold' ? 4 : id === 'call' || id === 'check' ? 3 : id === 'allin' ? 0 : 1);
  return [...ids].sort((a, b) => rank(a) - rank(b));
}
