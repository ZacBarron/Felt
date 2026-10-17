import { comboCount, gridHandClass, preflopPercentile } from '@felt/core';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '../../web/src/ui/wordmark';
import { API_URL, APP_URL, FOUNDING, PRICES } from './config';
import { QUOTES, visibleQuotes } from './proof';
import './styles.css';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

// Brand ------------------------------------------------------------------------------

/** The tile mark: the suited half of a range chart, as in the app. */
function markSvg(): string {
  const n = 6;
  const pad = 17;
  const gap = 3.2;
  const cell = (100 - 2 * pad - (n - 1) * gap) / n;
  let cells = '';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const fill = c > r ? '#e9b866' : c === r ? 'rgba(255,255,255,.24)' : 'rgba(255,255,255,.08)';
      cells += `<rect x="${pad + c * (cell + gap)}" y="${pad + r * (cell + gap)}" width="${cell}" height="${cell}" rx="${cell * 0.26}" fill="${fill}"/>`;
    }
  return `<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="mk" cx="0" cy="0" r="1.45" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#2a7461"/><stop offset=".45" stop-color="#165244"/><stop offset="1" stop-color="#0b2421"/></radialGradient></defs><rect width="100" height="100" rx="23" fill="url(#mk)"/>${cells}</svg>`;
}

for (const el of $$<HTMLAnchorElement>('[data-lockup]')) {
  el.innerHTML = `${markSvg()}<svg class="word" viewBox="${WORDMARK_VIEWBOX}" role="img" aria-label="Aced"><path d="${WORDMARK_PATH}" fill="currentColor"/></svg>`;
}

// Links into the app -----------------------------------------------------------------

for (const a of $$<HTMLAnchorElement>('[data-app]')) a.href = APP_URL + (a.dataset.app ?? '');

// Prices and the founding offer come from one config.
for (const el of $$<HTMLElement>('[data-price]')) el.textContent = money(PRICES[el.dataset.price as 'yearly' | 'monthly']);
for (const el of $$<HTMLElement>('[data-trial]')) el.textContent = `${PRICES.trialDays} day free trial.`;
for (const el of $$<HTMLElement>('[data-founding-price]')) el.textContent = money(FOUNDING.price);
for (const el of $$<HTMLElement>('[data-founding-seats]')) el.textContent = String(FOUNDING.seats);

// Nav --------------------------------------------------------------------------------

const nav = $<HTMLElement>('[data-nav]');
const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Hero grid: a real range painted the way a solver paints it --------------------------

/** Share of all 1326 combos in each seat's opening range, roughly as in the app's starter charts. */
const SEATS: { name: string; share: number }[] = [
  { name: 'under the gun', share: 0.12 },
  { name: 'hijack', share: 0.19 },
  { name: 'cutoff', share: 0.27 },
  { name: 'button', share: 0.44 },
];

/** The strongest hands until they cover `share` of all combos, by the app's own hand order. */
function rangeFor(share: number): Set<string> {
  const hands: string[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) hands.push(gridHandClass(r, c));
  hands.sort((a, b) => preflopPercentile(a) - preflopPercentile(b));
  const out = new Set<string>();
  let combos = 0;
  for (const h of hands) {
    if (combos / 1326 >= share) break;
    out.add(h);
    combos += comboCount(h);
  }
  return out;
}

function paintGrid(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const caption = $<HTMLElement>('[data-grid-caption]');
  const ranges = SEATS.map((s) => rangeFor(s.share));
  let seat = 3;
  let start = performance.now();
  let size = 0;
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);
  const draw = (now: number) => {
    const n = 13;
    const gap = size * 0.008;
    const cell = (size - gap * (n - 1)) / n;
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, size, size);
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const hand = gridHandClass(r, c);
        const inRange = ranges[seat].has(hand);
        // Cells light along the diagonal wave, like the app's mark animation.
        const delay = (r + c) * 0.045;
        const k = reduceMotion ? 1 : Math.max(0, Math.min(1, (t - delay) / 0.5));
        const lit = inRange ? k : 0;
        ctx.globalAlpha = 0.07 + lit * (c > r ? 0.62 : c === r ? 0.5 : 0.42);
        ctx.fillStyle = inRange ? '#e3b261' : '#f1ede3';
        const x = c * (cell + gap);
        const y = r * (cell + gap);
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, cell * 0.22);
        ctx.fill();
      }
    ctx.globalAlpha = 1;
    if (!reduceMotion && t > 5.2) {
      seat = (seat + 1) % SEATS.length;
      start = now;
      if (caption) caption.textContent = `Painting a${/^[aeiou]/.test(SEATS[seat].name) ? 'n' : ''} ${SEATS[seat].name} open range`;
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  if (caption) caption.textContent = `Painting a ${SEATS[seat].name} open range`;
  requestAnimationFrame(draw);
}

const grid = $<HTMLCanvasElement>('[data-grid]');
if (grid) paintGrid(grid);

// Hero phones lean toward the pointer ------------------------------------------------

const tilt = $<HTMLElement>('[data-tilt]');
if (tilt && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('pointermove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 14;
    const y = (e.clientY / window.innerHeight - 0.5) * 10;
    tilt.style.setProperty('--rx', x.toFixed(2));
    tilt.style.setProperty('--ry', y.toFixed(2));
  });
}

// Story: the sticky phone shows the step in view -------------------------------------

const steps = $$<HTMLElement>('[data-story]');
const shots = $$<HTMLImageElement>('[data-story-img]');
const show = (key: string) => {
  for (const s of steps) s.classList.toggle('on', s.dataset.story === key);
  for (const img of shots) img.classList.toggle('on', img.dataset.storyImg === key);
};
show(steps[0]?.dataset.story ?? 'play');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) show((e.target as HTMLElement).dataset.story ?? 'play');
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  for (const s of steps) io.observe(s);
}

// Open size demo: the same advice the app gives on its opening charts -----------------

const openInput = $<HTMLInputElement>('[data-open]');
const openOut = $<HTMLOutputElement>('[data-open-out]');
const openRaise = $<HTMLElement>('[data-open-raise]');
const openNote = $<HTMLElement>('[data-open-note]');
const CHART_OPEN = 2.5;
function updateOpen() {
  if (!openInput) return;
  const v = Number(openInput.value);
  if (openOut) openOut.textContent = `${v}bb`;
  if (openRaise) openRaise.textContent = money(v * 2);
  if (openNote)
    openNote.textContent =
      v === CHART_OPEN
        ? 'The size the charts assume. Good against players who defend well.'
        : v > CHART_OPEN
          ? 'Bigger opens win more from players who call too much. Open a little tighter from early seats.'
          : 'Smaller opens risk less and can play a few more hands.';
  openInput.style.setProperty('--fill', `${((v - Number(openInput.min)) / (Number(openInput.max) - Number(openInput.min))) * 100}%`);
}
openInput?.addEventListener('input', updateOpen);
updateOpen();

// Quotes: real ones always, drafts only while designing -------------------------------

const quotes = visibleQuotes(QUOTES, import.meta.env.PROD);
const quoteBox = $<HTMLElement>('[data-quotes]');
const voicesEmpty = $<HTMLElement>('[data-voices-empty]');
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
if (quoteBox) {
  if (quotes.length) {
    quoteBox.innerHTML = quotes
      .map((q) => {
        const initials = q.name.replace(/[^A-Z]/g, '').slice(0, 2);
        return `<figure class="quote">${q.draft ? '<span class="sample">Sample</span>' : ''}<blockquote>${esc(q.text)}</blockquote><figcaption><span class="avatar" aria-hidden="true">${initials}</span><span><span class="who">${esc(q.name)}</span><span class="where">${esc(q.detail)}</span></span></figcaption></figure>`;
      })
      .join('');
  } else {
    quoteBox.hidden = true;
    for (const el of $$<HTMLElement>('#voices-title, #voices .eyebrow')) el.hidden = true;
    if (voicesEmpty) voicesEmpty.hidden = false;
  }
}

// Waitlist forms -----------------------------------------------------------------------

for (const form of $$<HTMLFormElement>('[data-waitlist]')) {
  const msg = $<HTMLElement>('[data-msg]', form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const list = String(data.get('list') ?? form.dataset.waitlist);
    const email = String(data.get('email') ?? '').trim();
    const button = $<HTMLButtonElement>('button[type="submit"]', form);
    if (button) button.disabled = true;
    msg?.classList.remove('bad');
    try {
      const res = await fetch(`${API_URL}/api/waitlist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, list }) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'That did not go through. Try again.');
      if (msg) msg.textContent = list === 'founding' ? 'Thanks. We will email you about your place.' : 'You are on the list. One email on launch day.';
      form.reset();
    } catch (err) {
      msg?.classList.add('bad');
      if (msg) msg.textContent = err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'We could not reach the server. Try again soon.';
    } finally {
      if (button) button.disabled = false;
    }
  });
}

// The hero platform pills pick the matching phone in the notify form.
for (const pill of $$<HTMLAnchorElement>('[data-platform]')) {
  pill.addEventListener('click', () => {
    const radio = $<HTMLInputElement>(`#list-${pill.dataset.platform}`);
    if (radio) radio.checked = true;
  });
}
