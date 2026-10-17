// Draws the Aced mark (the UTG range on a night tile) to every icon file.
// Run with `node scripts/make-icons.mjs` on a machine with Playwright installed.
// MARK must match apps/web/src/ui/Brand.tsx, which a unit test holds to the real chart.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');

const MARK = ['PLLLLLL', 'LPL....', 'LLP....', 'L..P...', 'L...P..', 'L....P.', 'L.....P'];
const FILL = { P: '#F1CD86', L: '#E3B261', M: '#9C7438', '.': '#1E2A27' };

/** The mark as SVG. `full` fills the square for icons the OS masks; `scale` shrinks the grid into a safe zone. */
export function markSvg({ full = false, scale = 1 } = {}) {
  const size = 82 * scale;
  const origin = (120 - size) / 2;
  const step = (12 * size) / 82;
  const cell = (10 * size) / 82;
  let cells = '';
  MARK.forEach((row, r) =>
    [...row].forEach((k, c) => {
      cells += `<rect x="${(origin + c * step).toFixed(2)}" y="${(origin + r * step).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="${(cell * 0.24).toFixed(2)}" fill="${FILL[k]}"/>`;
    }),
  );
  const tile = full
    ? '<rect width="120" height="120" fill="url(#t)"/>'
    : '<rect width="120" height="120" rx="27" fill="url(#t)"/><rect x=".5" y=".5" width="119" height="119" rx="26.5" fill="none" stroke="#F1EDE3" stroke-opacity=".1"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><radialGradient id="t" cx="0" cy="0" r="1.3" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#18332C"/><stop offset="1" stop-color="#0C1614"/></radialGradient></defs>${tile}${cells}</svg>`;
}

const OUT = [
  { file: 'apps/web/public/favicon.png', size: 64 },
  { file: 'apps/web/public/icon-192.png', size: 192 },
  { file: 'apps/web/public/icon-512.png', size: 512 },
  { file: 'apps/web/public/apple-touch-icon.png', size: 180, full: true },
  { file: 'apps/web/public/icon-maskable-512.png', size: 512, full: true, scale: 0.78 },
  { file: 'apps/site/public/favicon.png', size: 64 },
  { file: 'apps/site/public/apple-touch-icon.png', size: 180, full: true },
];

writeFileSync('apps/web/public/favicon.svg', markSvg());
writeFileSync('apps/site/public/favicon.svg', markSvg());

const browser = await chromium.launch();
const page = await browser.newPage();
for (const o of OUT) {
  await page.setViewportSize({ width: o.size, height: o.size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${o.size}px;height:${o.size}px}</style>${markSvg(o)}`,
  );
  await page.screenshot({ path: o.file, omitBackground: !o.full });
  console.log('wrote', o.file);
}
await browser.close();
