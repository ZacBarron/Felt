/**
 * Fit audit: opens the main screens the way a phone shows them, scrolls to
 * the end, and lists any button or text left hidden behind the bottom bar,
 * the tab bar or the home indicator. Saves a screenshot of each screen.
 *
 * Usage, with the app served by `npx vite preview --port 8812`:
 *   node scripts/fit-audit.cjs <out dir> [port] [device]
 * Devices: iphone16 (393x852, the real safe areas), safari (393x660, a
 * Safari tab with its toolbars) and zoom (320x693, Display Zoom).
 * Launches Chromium with SwiftShader so glass blur renders (see CLAUDE.md).
 */
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const OUT = process.argv[2] ?? 'fit-shots';
const PORT = process.argv[3] || '8812';
const DEVICES = {
  iphone16: { width: 393, height: 852, top: 59, bottom: 34 },
  safari: { width: 393, height: 660, top: 0, bottom: 0 },
  zoom: { width: 320, height: 693, top: 47, bottom: 34 },
};
const D = DEVICES[process.argv[4] ?? 'iphone16'];
require('fs').mkdirSync(OUT, { recursive: true });
const onboarded = { profile: { onboarded: true, experience: 'casual', goals: ['win-live'], focus: [], dailyMinutes: 10, name: 'Zac', firstLessonAt: '2026-10-10T10:00:00Z' }, access: { pro: false } };
const fresh = { profile: { onboarded: false, goals: [], focus: [], dailyMinutes: 10 }, access: { pro: false } };
const ROUTES = [
  ['today', '/', onboarded], ['learn', '/learn', onboarded], ['review', '/review', onboarded], ['ranges', '/ranges', onboarded],
  ['more', '/more', onboarded], ['you', '/you', onboarded], ['settings', '/settings', onboarded], ['account', '/account', onboarded],
  ['pro', '/pro?from=onboarding', onboarded], ['pro-lesson', '/pro?from=lesson', onboarded], ['signin', '/signin', onboarded], ['daily', '/daily', onboarded],
  ['weekly', '/weekly', onboarded], ['league', '/league', onboarded], ['solver', '/solver', onboarded], ['coach', '/coach', onboarded],
  ['glossary', '/glossary', onboarded], ['practice', '/practice', onboarded], ['check', '/check', onboarded], ['saved', '/saved', onboarded],
  ['lesson', '/learn/basics/rules/goal', onboarded], ['welcome', '/welcome', fresh],
];
async function check(page) {
  return page.evaluate(() => {
    const H = innerHeight, inset = window.__feltInset ?? 0;
    const rect = (sel) => { const e = document.querySelector(sel); if (!e) return undefined; const r = e.getBoundingClientRect(); return r.height ? r : undefined; };
    const bar = rect('.bottom-bar'), tab = rect('.tabbar');
    const out = [];
    const els = [...document.querySelectorAll('button, a, input, h1, h2, h3, p, li, label, [role="radio"], [role="switch"]')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0'; });
    for (const e of els) {
      const r = e.getBoundingClientRect();
      const inBar = e.closest('.bottom-bar'), inTab = e.closest('.tabbar');
      const fixedHost = e.closest('dialog[open], .moment, .bottom-bar, .tabbar, .nav-bar');
      let limit;
      if (inTab) limit = H - inset + 12; else if (inBar) limit = tab ? tab.top : H - inset; else if (fixedHost) limit = H - inset; else limit = Math.min(bar ? bar.top : H, tab ? tab.top : H - inset);
      if (r.bottom > limit + 1 && r.top < H) out.push(`${e.tagName.toLowerCase()} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40)}" bottom ${Math.round(r.bottom)} > ${Math.round(limit)}`);
    }
    return out.slice(0, 8);
  });
}
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = {};
  for (const [name, path, settings] of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: D.width, height: D.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript((b) => (window.__feltInset = b), D.bottom);
    await ctx.addInitScript((s) => { localStorage.setItem('felt.settings.v1', JSON.stringify(s)); localStorage.setItem('felt.rangesIntro', '1'); localStorage.setItem('felt.moments', JSON.stringify({ tier: 99, streak: 999 })); localStorage.setItem('felt.studyTimeDismissed', '1'); }, settings);
    const page = await ctx.newPage();
    const client = await ctx.newCDPSession(page);
    await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: D.top, topMax: D.top, bottom: D.bottom, bottomMax: D.bottom, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
    page.on('pageerror', (e) => console.log(name, 'pageerror', e.message));
    await page.goto(`http://localhost:${PORT}${path}`);
    await page.waitForTimeout(1500);
    const top = await check(page);
    await page.screenshot({ path: `${OUT}/${name}-top.png` });
    await page.evaluate(() => { window.scrollTo(0, 1e6); document.querySelectorAll('dialog[open], .moment').forEach((d) => (d.scrollTop = 1e6)); });
    await page.waitForTimeout(500);
    const bottom = await check(page);
    await page.screenshot({ path: `${OUT}/${name}-bottom.png` });
    report[name] = bottom.length ? bottom : top.filter((x) => /dialog|moment/.test(x));
    console.log(report[name].length ? `${name}: ${report[name].join('; ')}` : `${name}: fits`);
    await ctx.close();
  }
  await browser.close();
  process.exitCode = Object.values(report).some((r) => r.length) ? 1 : 0;
})();
