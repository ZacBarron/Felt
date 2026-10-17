/**
 * The Aced mark: a 7x7 range chart drawn as an arrow to the top left corner,
 * where the strongest hands live. A copy of MARK in apps/web/src/ui/Brand.tsx.
 * L is a lit hand, P is a pair on the diagonal, M is a softer mixed cell.
 */
export const MARK = ['PLLLLLL', 'LPL....', 'LLP....', 'L..P...', 'L...P..', 'L....P.', 'L.....P'] as const;
export const MARK_FILL = { P: '#f1cd86', L: '#e3b261', M: '#9c7438', '.': '#1e2a27' } as const;

let uid = 0;

/** The tile mark as an SVG string, on the 120 unit master geometry. */
export function markSvg(className = 'mark'): string {
  const id = `mk${uid++}`;
  let cells = '';
  MARK.forEach((row, r) =>
    [...row].forEach((k, c) => {
      cells += `<rect x="${19 + c * 12}" y="${19 + r * 12}" width="10" height="10" rx="2.4" fill="${MARK_FILL[k as keyof typeof MARK_FILL]}" style="--d:${r + c}" class="${k === '.' ? 'c' : 'c lit'}"/>`;
    }),
  );
  return `<svg class="${className}" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="${id}" cx="0" cy="0" r="1.3" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#18332c"/><stop offset="1" stop-color="#0c1614"/></radialGradient></defs><rect width="120" height="120" rx="27" fill="url(#${id})"/><rect x=".5" y=".5" width="119" height="119" rx="26.5" fill="none" stroke="#f1ede3" stroke-opacity=".1"/>${cells}</svg>`;
}
