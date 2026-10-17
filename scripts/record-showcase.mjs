// Records short clips of the real app for the marketing site's phone showcase.
// Needs the app dev server (pnpm dev, default http://localhost:8820), Playwright and ffmpeg:
//   APP_URL=http://localhost:8820 PLAYWRIGHT_PATH=... node scripts/record-showcase.mjs
// Frames come from Chromium's screencast, so motion is the app's own animation.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const APP = process.env.APP_URL ?? 'http://localhost:8820';
const OUT = process.env.OUT ?? 'apps/site/public/clips';
const ONLY = process.env.ONLY?.split(',');
const W = 393;
const H = 806;
const SCALE = 2;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A month of believable study, so screens with data look lived in. */
async function seed(page) {
  await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('felt'); r.onsuccess = () => res(r.result); });
    const put = (store, rows) => new Promise((res) => { const tx = db.transaction(store, 'readwrite'); rows.forEach((row) => tx.objectStore(store).put(row)); tx.oncomplete = res; });
    const day = 86400000;
    const now = Date.now();
    let x = 7;
    const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
    const domains = ['preflop', 'preflop', 'preflop', 'postflop', 'postflop', 'math', 'exploit', 'theory'];
    const answers = [];
    for (let i = 0; i < 260; i++) {
      const d = Math.floor(i / 9.5);
      answers.push({ at: new Date(now - (27 - d) * day + (i % 9) * 600000 - 3 * 3600000), itemId: `seed:${i}`, domain: domains[i % domains.length], difficulty: 1050 + Math.floor(rnd() * 600) + d * 6, score: rnd() < 0.62 + d * 0.006 ? 1 : rnd() < 0.3 ? 0.5 : 0, source: i % 5 === 0 ? 'daily' : i % 3 === 0 ? 'play' : 'review' });
    }
    await put('answers', answers);
    const keys = ['basics/rules/goal', 'basics/rules/rankings', 'basics/rules/best-five', 'basics/rules/hand-flow', 'basics/first-strategy/position', 'basics/first-strategy/starting-hands', 'foundations/math/pot-odds', 'foundations/math/ev', 'preflop/rfi/rfi-ep'];
    await put('lessons', keys.map((key, i) => ({ key, status: 'done', step: 9, correct: 3, answered: 3, updatedAt: new Date(now - (20 - i * 2) * day) })));
  });
}

/** The clips: each is a short, real interaction. */
const CLIPS = {
  async play(p) {
    await p.goto(APP + '/play');
    await wait(900);
    await p.getByRole('button', { name: /Play now/ }).click().catch(() => {});
    for (let i = 0; i < 40 && !(await p.locator('.play-actions').count()); i++) await wait(300);
    await wait(1400);
    const raise = p.locator('.play-actions button', { hasText: /Raise|Bet/ }).last();
    if (await raise.count()) await raise.click();
    else await p.locator('.play-actions button').last().click().catch(() => {});
    await wait(4200);
  },
  async ranges(p) {
    await p.goto(APP + '/ranges');
    await wait(1200);
    await p.getByText('Quiz', { exact: true }).first().click().catch(() => {});
    await wait(1600);
    for (let k = 0; k < 2; k++) {
      await p.locator('.btn-action').nth(k % 2).click().catch(() => {});
      await wait(2000);
      await p.getByRole('button', { name: /Next hand/ }).click().catch(() => {});
      await wait(1200);
    }
  },
  async lesson(p) {
    await p.goto(APP + '/learn/foundations/math/pot-odds');
    await wait(1500);
    for (let i = 0; i < 3; i++) {
      await p.keyboard.press('ArrowRight');
      await wait(1300);
    }
  },
  async daily(p) {
    await p.goto(APP + '/daily');
    await wait(1400);
    await p.getByRole('button', { name: /Start the challenge|Resume/ }).click().catch(() => {});
    await wait(1800);
    await p.locator('.btn-action, .choice').first().click().catch(() => {});
    await wait(2600);
  },
  async today(p) {
    await p.goto(APP + '/');
    await wait(1800);
    for (let y = 0; y <= 700; y += 14) {
      await p.mouse.wheel(0, 14);
      await wait(16);
    }
    await wait(1200);
  },
};

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
mkdirSync(OUT, { recursive: true });
for (const [name, run] of Object.entries(CLIPS)) {
  if (ONLY && !ONLY.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, colorScheme: 'dark', isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('felt.rangesIntro', '1');
    localStorage.setItem('felt.moments', JSON.stringify({ tier: 9, streak: 999 }));
    localStorage.setItem('felt.invite.dismissed.v1', String(Date.now()));
    localStorage.setItem('felt.play.settings.v1', JSON.stringify({ speed: 'quick', skipFolds: true, showGrades: true }));
    if (!localStorage.getItem('felt.settings.v1')) localStorage.setItem('felt.settings.v1', JSON.stringify({ profile: { onboarded: true, goals: ['win-live'], focus: [], dailyMinutes: 10, name: 'Alex Rivera' } }));
  });
  const page = await ctx.newPage();
  await page.goto(APP + '/');
  await wait(1200);
  await seed(page);
  // Warm the route once off camera so fonts and code are loaded.
  await page.goto(APP + '/learn');
  await wait(800);

  const dir = join(tmpdir(), `aced-clip-${name}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    const file = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * SCALE, maxHeight: H * SCALE, everyNthFrame: 1 });
  await run(page);
  await cdp.send('Page.stopScreencast');
  await wait(200);
  // Drop the first frames (route change flash), hold the last one.
  const list = frames.slice(2);
  let concat = '';
  list.forEach((f, i) => {
    const next = list[i + 1];
    concat += `file '${f.file}'\nduration ${next ? Math.max(0.001, next.t - f.t).toFixed(4) : '0.8'}\n`;
  });
  concat += `file '${list.at(-1).file}'\n`;
  writeFileSync(join(dir, 'list.txt'), concat);
  const vf = `fps=30,scale=${W * SCALE}:${H * SCALE}:flags=lanczos,format=yuv420p`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-movflags', '+faststart', '-an', join(OUT, `${name}.mp4`)]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(OUT, `${name}.mp4`), '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-an', join(OUT, `${name}.webm`)]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.2', '-i', join(OUT, `${name}.mp4`), '-vframes', '1', '-q:v', '4', join(OUT, `${name}.jpg`)]);
  console.log(name, list.length, 'frames');
  await ctx.close();
}
await browser.close();
