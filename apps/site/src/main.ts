import type { HandClass } from '@felt/core';
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from '../../web/src/ui/wordmark';
import { bbCallEquity, GRID, pct, raiseOverLimpers, SEATS } from './charts';
import { API_URL, APP_URL, CONTENT, FOUNDING, PRICES } from './config';
import { MARK, MARK_FILL, markSvg } from './mark';
import { FOUNDER_NOTE, QUOTES, visibleFounderNote, visibleQuotes } from './proof';
import { type Choice, HANDS, mixLine, SPOT, spotMix, verdict } from './spots';
import './styles.css';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const platform = document.documentElement.dataset.platform ?? 'desktop';
const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* Storage blocked: the page still works. */
    }
  },
};

// Brand ------------------------------------------------------------------------------

for (const el of $$<HTMLAnchorElement>('[data-lockup]')) {
  el.innerHTML = `${markSvg()}<svg class="word" viewBox="${WORDMARK_VIEWBOX}" role="img" aria-label="Aced"><path d="${WORDMARK_PATH}" fill="currentColor"/></svg>`;
}

// Links into the app. The HTML ships real hrefs for /app/, so links work before
// this runs; the Pages preview points them somewhere else.
if (APP_URL !== '/app/') for (const a of $$<HTMLAnchorElement>('[data-app]')) a.href = APP_URL + (a.dataset.app ?? '');

// Numbers come from one config -------------------------------------------------------

const yearlyPerMonth = Math.floor((PRICES.yearly / 12) * 100) / 100;
const saving = Math.floor((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100);
for (const el of $$<HTMLElement>('[data-price]')) el.textContent = money(PRICES[el.dataset.price as 'yearly' | 'monthly']);
for (const el of $$<HTMLElement>('[data-trial-line]')) el.textContent = `Free for ${PRICES.trialDays} days. Then ${money(PRICES.yearly)} a year.`;
for (const el of $$<HTMLElement>('[data-monthly-line]')) el.textContent = `That's about ${money(yearlyPerMonth)} a month. Or pay ${money(PRICES.monthly)} monthly.`;
for (const el of $$<HTMLElement>('[data-save]')) el.textContent = `Save ${saving}%`;
for (const el of $$<HTMLElement>('[data-compare-price]')) el.textContent = `$0 or ${money(PRICES.yearly)}`;
for (const el of $$<HTMLElement>('[data-founding-price]')) el.textContent = money(FOUNDING.price);
for (const el of $$<HTMLElement>('[data-founding-seats]')) el.textContent = String(FOUNDING.seats);
for (const el of $$<HTMLElement>('[data-content]')) el.textContent = String(CONTENT[el.dataset.content as keyof typeof CONTENT]);

/** Show a seat count only when the server reports a real one, and some are sold. */
function showFoundingLeft(taken: number | null) {
  if (!taken) return;
  const left = Math.max(0, FOUNDING.seats - taken);
  for (const el of $$<HTMLElement>('[data-founding-left]')) el.textContent = `${left} of ${FOUNDING.seats} places left. `;
}
showFoundingLeft(FOUNDING.taken);
// When checkout is live the card sells directly. Until then it collects emails.
fetch(`${API_URL}/api/billing/founding`)
  .then((r) => (r.ok ? r.json() : null))
  .then((d: { taken?: unknown; open?: unknown } | null) => {
    if (d && typeof d.taken === 'number') showFoundingLeft(d.taken);
    if (d?.open === true) {
      for (const el of $$<HTMLElement>('[data-founding-buy]')) el.hidden = false;
      for (const el of $$<HTMLElement>('[data-founding-form]')) el.hidden = true;
    }
  })
  .catch(() => {});

// Platform: tailor the app line, the notify form and the in-app browser hint ---------

const platformLink = $<HTMLAnchorElement>('[data-platform-link]');
const notifyForm = $<HTMLFormElement>('.notify');
if (platform === 'ios' || platform === 'android') {
  const name = platform === 'ios' ? 'iPhone' : 'Android';
  if (platformLink) platformLink.textContent = `${name} app soon`;
  const radio = $<HTMLInputElement>(`#list-${platform}`);
  if (radio) radio.checked = true;
  const note = $<HTMLElement>('[data-notify-note]');
  if (note) note.textContent = `One email when the ${name} app is out. Nothing else.`;
}
if (document.documentElement.dataset.inapp) {
  const hint = $<HTMLElement>('[data-inapp-hint]');
  const browser = $<HTMLElement>('[data-inapp-browser]');
  if (browser && platform === 'android') browser.textContent = 'Chrome';
  if (hint) hint.hidden = false;
}

// First touch attribution. Site and app share the origin, so the app can read it.
// It stays on this device and only rides along with a waitlist sign up.
const ATTR_KEY = 'felt.attribution.v1';
const params = new URLSearchParams(location.search);
const ATTR_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'src', 'loc', 'ref'];
if (ATTR_PARAMS.some((k) => params.has(k)) && !store.get(ATTR_KEY)) {
  const found = Object.fromEntries(ATTR_PARAMS.filter((k) => params.has(k)).map((k) => [k, params.get(k)]));
  store.set(ATTR_KEY, JSON.stringify({ ...found, landing: location.pathname, at: Date.now() }));
}
function source(): string | undefined {
  try {
    const a = JSON.parse(store.get(ATTR_KEY) ?? 'null') as Record<string, string> | null;
    return a ? (a.utm_source ?? a.src ?? a.ref ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}

// Nav --------------------------------------------------------------------------------

const nav = $<HTMLElement>('[data-nav]');
const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Range painting: the app's real charts, mixed hands filled by frequency -------------

interface PaintStyle {
  empty: string;
  lit: number;
  pair: number;
}

/**
 * Paint a 13x13 chart. Each cell fills from the left by how often the hand
 * opens, the way solver charts paint a mix. `t` runs the diagonal wave from 0
 * to 1 and beyond.
 */
function drawRange(ctx: CanvasRenderingContext2D, size: number, range: Map<HandClass, number>, t: number, style: PaintStyle) {
  const n = 13;
  const gap = size * 0.008;
  const cell = (size - gap * (n - 1)) / n;
  ctx.clearRect(0, 0, size, size);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const x = c * (cell + gap);
      const y = r * (cell + gap);
      ctx.globalAlpha = 1;
      ctx.fillStyle = style.empty;
      ctx.beginPath();
      ctx.roundRect(x, y, cell, cell, cell * 0.2);
      ctx.fill();
      const f = range.get(GRID[r][c]) ?? 0;
      const k = reduceMotion ? 1 : Math.max(0, Math.min(1, (t * 1.6 - (r + c) / 24) * 2.2));
      const w = cell * f * k;
      if (w <= 0.2) continue;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, cell, cell, cell * 0.2);
      ctx.clip();
      ctx.globalAlpha = r === c ? style.pair : style.lit;
      ctx.fillStyle = r === c ? '#f1cd86' : '#e3b261';
      ctx.fillRect(x, y, w, cell);
      ctx.restore();
    }
  ctx.globalAlpha = 1;
}

/** A canvas that keeps its backing store sharp and only redraws on real size changes. */
function sharpCanvas(canvas: HTMLCanvasElement, redraw: () => void) {
  const ctx = canvas.getContext('2d');
  let size = 0;
  const fit = () => {
    const next = canvas.clientWidth;
    if (!ctx || next === size || next === 0) return;
    size = next;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  };
  window.addEventListener('resize', fit);
  return { ctx, fit, size: () => size };
}

/** Run the diagonal wave once, then stop. */
function wave(ms: number, frame: (t: number) => void) {
  if (reduceMotion) return frame(1);
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    frame(t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Hero: the UTG chart, painted once.
const heroCanvas = $<HTMLCanvasElement>('[data-grid]');
if (heroCanvas) {
  const utg = SEATS[0].range;
  const hero = { t: 1 };
  const style: PaintStyle = { empty: 'rgba(241,237,227,0.035)', lit: 0.3, pair: 0.38 };
  const c = sharpCanvas(heroCanvas, () => c.ctx && drawRange(c.ctx, c.size(), utg, hero.t, style));
  c.fit();
  wave(900, (t) => {
    hero.t = t;
    if (c.ctx) drawRange(c.ctx, c.size(), utg, t, style);
  });
}

// Hero phones and grid drift a little with the pointer (no rotation).
const tilt = $<HTMLElement>('[data-tilt]');
if (tilt && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('pointermove', (e) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    tilt.style.setProperty('--gx', `${(x * 6).toFixed(1)}px`);
    tilt.style.setProperty('--gy', `${(y * 6).toFixed(1)}px`);
    tilt.style.setProperty('--px', `${(x * 10).toFixed(1)}px`);
    tilt.style.setProperty('--py', `${(y * 10).toFixed(1)}px`);
  });
}

// Your move: one live spot from the app's own chart ---------------------------------

const move = $<HTMLElement>('[data-move]');
if (move) {
  let index = 0;
  const cards = $<HTMLElement>('[data-move-cards]', move)!;
  const actions = $<HTMLElement>('[data-move-actions]', move)!;
  const result = $<HTMLElement>('[data-move-result]', move)!;
  const SUITS: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
  const SUIT_NAMES: Record<string, string> = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' };
  const RANK_NAMES: Record<string, string> = { A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: 'ten' };
  const deal = () => {
    const h = HANDS[index];
    cards.innerHTML = h.cards
      .map((cd) => {
        const rank = cd[0] === 'T' ? '10' : cd[0];
        return `<span class="pcard${'hd'.includes(cd[1]) ? ' red' : ''}">${rank}<span class="s">${SUITS[cd[1]]}</span></span>`;
      })
      .join('');
    cards.setAttribute('aria-label', `You have the ${h.cards.map((cd) => `${RANK_NAMES[cd[0]] ?? cd[0]} of ${SUIT_NAMES[cd[1]]}`).join(' and the ')}`);
    cards.setAttribute('role', 'img');
    result.hidden = true;
    actions.classList.remove('answered');
    for (const b of $$<HTMLButtonElement>('[data-choice]', actions)) {
      b.disabled = false;
      b.classList.remove('picked');
    }
  };
  $$<HTMLButtonElement>('[data-choice]', actions).forEach((b) =>
    b.addEventListener('click', () => {
      const h = HANDS[index];
      const mix = spotMix(h.hand);
      const choice = b.dataset.choice as Choice;
      const v = verdict(mix, choice);
      actions.classList.add('answered');
      b.classList.add('picked');
      for (const other of $$<HTMLButtonElement>('[data-choice]', actions)) other.disabled = true;
      const verdictEl = $<HTMLElement>('[data-move-verdict]', move)!;
      verdictEl.textContent = `${v}.`;
      verdictEl.className = `verdict ${v === 'Correct' ? 'good' : v === 'Part of the mix' ? 'mix' : 'miss'}`;
      $<HTMLElement>('[data-move-bar]', move)!.innerHTML = (['raise', 'call', 'fold'] as Choice[])
        .filter((k) => mix[k] > 0)
        .map((k) => `<span style="width:${mix[k] * 100}%;background:var(--act-${k})"></span>`)
        .join('');
      $<HTMLElement>('[data-move-mix]', move)!.textContent = mixLine(mix);
      $<HTMLElement>('[data-move-read]', move)!.textContent = h.read;
      $<HTMLElement>('[data-move-source]', move)!.textContent = SPOT.source;
      result.hidden = false;
    }),
  );
  $<HTMLButtonElement>('[data-move-again]', move)?.addEventListener('click', () => {
    index = (index + 1) % HANDS.length;
    deal();
    $<HTMLButtonElement>('[data-choice]', actions)?.focus();
  });
  $<HTMLElement>('[data-move-table]', move)!.textContent = SPOT.table;
  $<HTMLElement>('[data-move-story]', move)!.textContent = SPOT.story;
  deal();
}

// Your seat changes everything: the signature moment ---------------------------------

const seatsSection = $<HTMLElement>('[data-seats]');
const seatCanvas = $<HTMLCanvasElement>('[data-seat-grid]');
if (seatsSection && seatCanvas) {
  const rail = $<HTMLElement>('[data-rail]', seatsSection)!;
  const shareEl = $<HTMLElement>('[data-seat-share]', seatsSection)!;
  const nameEl = $<HTMLElement>('[data-seat-name]', seatsSection)!;
  const logoNote = $<HTMLElement>('[data-logo-note]', seatsSection);
  const miniMark = $<HTMLElement>('[data-mini-mark]', seatsSection);
  if (miniMark) miniMark.outerHTML = markSvg();
  const lede = $<HTMLElement>('[data-seats-lede]', seatsSection);
  if (lede) lede.textContent = `Under the gun you open about ${pct(SEATS[0].share)} of hands. On the button you open about ${pct(SEATS[3].share)}.`;
  const thumb = document.createElement('span');
  thumb.className = 'thumb';
  rail.append(thumb);
  const buttons = SEATS.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.short;
    b.setAttribute('aria-label', s.name);
    b.addEventListener('click', () => pick(i, true));
    rail.append(b);
    return b;
  });
  const style: PaintStyle = { empty: 'rgba(241,237,227,0.06)', lit: 0.92, pair: 1 };
  let seat = 0;
  let shown = 0;
  const c = sharpCanvas(seatCanvas, () => c.ctx && drawRange(c.ctx, c.size(), SEATS[seat].range, 1, style));
  const moveThumb = () => {
    const b = buttons[seat];
    thumb.style.width = `${b.offsetWidth}px`;
    thumb.style.transform = `translateX(${b.offsetLeft}px)`;
  };
  const countTo = (to: number) => {
    const from = shown;
    shown = to;
    if (reduceMotion) return void (shareEl.textContent = pct(to));
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 600);
      shareEl.textContent = pct(from + (to - from) * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  function pick(i: number, user = false) {
    if (i === seat && !user && shown) return;
    seat = i;
    const s = SEATS[i];
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    moveThumb();
    nameEl.textContent = `of hands open ${i === 0 ? 'under the gun' : `from the ${s.name.toLowerCase()}`}`;
    seatCanvas!.setAttribute('aria-label', `${s.name} opening chart. About ${pct(s.share)} of hands.`);
    logoNote?.classList.toggle('off', i !== 0);
    countTo(s.share);
    c.fit();
    wave(600, (t) => c.ctx && drawRange(c.ctx, c.size(), s.range, t, style));
  }
  window.addEventListener('resize', moveThumb);
  c.fit();
  pick(0);
  // On wide screens the section pins and scroll steps through the seats.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) pick(Number((e.target as HTMLElement).dataset.seatStep));
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    for (const el of $$<HTMLElement>('[data-seat-step]', seatsSection)) io.observe(el);
  }
}

// App clips: real recordings of the app. They play only while on screen (and,
// in the story phone, only for the step in view). Reduced motion and Save-Data
// keep the still poster.
const clips = $$<HTMLVideoElement>('video[data-clip]');
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const stillOnly = reduceMotion || saveData;
const onScreen = new Set<HTMLVideoElement>();
function syncClips() {
  if (stillOnly) return;
  for (const v of clips) {
    const screen = v.closest<HTMLElement>('[data-story-img]');
    const active = !screen || screen.classList.contains('on');
    if (onScreen.has(v) && active) {
      if (v.preload === 'none') v.preload = 'auto';
      v.play().catch(() => {});
    } else v.pause();
  }
}
if (!stillOnly && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) onScreen.add(v);
        else onScreen.delete(v);
      }
      syncClips();
    },
    { rootMargin: '200px 0px' },
  );
  for (const v of clips) io.observe(v);
}

// Story: the sticky phone shows the step in view -------------------------------------

const steps = $$<HTMLElement>('[data-story]');
const shots = $$<HTMLElement>('[data-story-img]');
const show = (key: string) => {
  for (const s of steps) s.classList.toggle('on', s.dataset.story === key);
  for (const screen of shots) {
    const on = screen.dataset.storyImg === key;
    if (on && !screen.classList.contains('on')) {
      // Each step's clip starts from the top when it comes into view.
      const v = $<HTMLVideoElement>('video', screen);
      if (v) v.currentTime = 0;
    }
    screen.classList.toggle('on', on);
  }
  syncClips();
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

// Open size: math and a read, labelled -------------------------------------------------

const openInput = $<HTMLInputElement>('[data-open]');
const limpOut = $<HTMLOutputElement>('[data-limp-out]');
let limpers = 0;
function updateOpen() {
  if (!openInput) return;
  const v = Number(openInput.value);
  const raise = raiseOverLimpers(v, limpers);
  const dollars = money(raise * 2);
  $<HTMLOutputElement>('[data-open-out]')!.textContent = `${v}bb`;
  $<HTMLElement>('[data-open-raise]')!.innerHTML = limpers
    ? `With ${limpers} limper${limpers > 1 ? 's' : ''}: raise to <b>${dollars}</b>`
    : `Raise to <b>${dollars}</b> at 1/2`;
  $<HTMLElement>('[data-open-math]')!.textContent = `The big blind needs ${pct(bbCallEquity(raise, limpers))} equity to call.`;
  $<HTMLElement>('[data-open-read]')!.textContent =
    v <= 3
      ? 'This is the online size. At 1/2 it gets called by almost everyone.'
      : v <= 6
        ? "Most 1/2 players call anyway. That's why the bigger open earns more."
        : 'Very big opens fold out the weak hands you want to play. Tighten your range.';
  openInput.setAttribute('aria-valuetext', `${v} big blinds. ${limpers ? `With ${limpers} limpers, raise` : 'Raise'} to ${dollars} at 1/2`);
  openInput.style.setProperty('--fill', `${((v - Number(openInput.min)) / (Number(openInput.max) - Number(openInput.min))) * 100}%`);
  if (limpOut) limpOut.textContent = String(limpers);
  for (const b of $$<HTMLButtonElement>('[data-limp]')) {
    const d = Number(b.dataset.limp);
    b.disabled = limpers + d < 0 || limpers + d > 3;
  }
}
openInput?.addEventListener('input', updateOpen);
for (const b of $$<HTMLButtonElement>('[data-limp]'))
  b.addEventListener('click', () => {
    limpers = Math.max(0, Math.min(3, limpers + Number(b.dataset.limp)));
    updateOpen();
  });
updateOpen();

// Quotes: real ones always, drafts only while designing -------------------------------

// The founder note: an initial and no photo, by choice.
const note = visibleFounderNote(FOUNDER_NOTE, import.meta.env.PROD);
const noteEl = $<HTMLElement>('[data-founder-note]');
if (note && noteEl) {
  $<HTMLElement>('[data-founder-lines]', noteEl)!.textContent = note.lines.join(' ');
  $<HTMLElement>('[data-founder-signoff]', noteEl)!.textContent = note.signoff;
  $<HTMLElement>('[data-founder-initial]', noteEl)!.textContent = note.signoff.charAt(0);
  if (note.draft) noteEl.insertAdjacentHTML('afterbegin', '<span class="sample">Draft</span>');
  noteEl.hidden = false;
}

const quotes = visibleQuotes(QUOTES, import.meta.env.PROD);
const quoteBox = $<HTMLElement>('[data-quotes]');
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
    for (const el of $$<HTMLElement>('[data-voices-head]')) el.hidden = true;
    const empty = $<HTMLElement>('[data-voices-empty]');
    if (empty) empty.hidden = false;
  }
}

// Waitlist forms -----------------------------------------------------------------------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
for (const form of $$<HTMLFormElement>('[data-waitlist]')) {
  const msg = $<HTMLElement>('[data-msg]', form);
  const button = $<HTMLButtonElement>('button[type="submit"]', form);
  const label = button?.textContent ?? '';
  const say = (text: string, bad = false) => {
    if (!msg) return;
    msg.textContent = text;
    msg.classList.toggle('bad', bad);
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const list = String(data.get('list') ?? form.dataset.waitlist);
    const email = String(data.get('email') ?? '').trim();
    if (!EMAIL.test(email)) return say('Enter an email like you@example.com.', true);
    if (button) {
      button.disabled = true;
      button.textContent = 'Adding you';
      button.setAttribute('aria-busy', 'true');
    }
    say('');
    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, list, source: source(), platform, company: String(data.get('company') ?? '') }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 429) throw new Error('Too many tries. Wait a minute and try again.');
      if (!res.ok) throw new Error(body.error ?? "That didn't go through. Try again.");
      say(list === 'founding' ? "You're on the list. We'll email you when founding places open." : "You're on the list. We'll send one email on launch day.");
      form.reset();
      if (list !== 'founding') {
        const after = $<HTMLElement>('[data-after]');
        if (after) after.hidden = false;
      }
    } catch (err) {
      say(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : "We couldn't reach the server. Try again in a minute.", true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
        button.removeAttribute('aria-busy');
      }
    }
  });
}
// The hero's app line preselects the right phone in the notify form.
platformLink?.addEventListener('click', () => {
  const pick = platform === 'android' ? 'android' : 'ios';
  const radio = $<HTMLInputElement>(`#list-${pick}`, notifyForm ?? document);
  if (radio) radio.checked = true;
});

// Sticky bar on phones: only when no other button or form is on screen ---------------

const bar = $<HTMLElement>('[data-mbar]');
if (bar && 'IntersectionObserver' in window) {
  const blockers = $$<HTMLElement>('.hero .cta-row, .move-next, .plans, .founding, .notify, .final, .voices-empty');
  const seen = new Set<Element>();
  let typing = false;
  const sync = () => {
    const on = seen.size === 0 && !typing && window.scrollY > 200;
    bar.classList.toggle('on', on);
    bar.inert = !on;
  };
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (e.isIntersecting) seen.add(e.target);
      else seen.delete(e.target);
    }
    sync();
  });
  blockers.forEach((b) => io.observe(b));
  window.addEventListener('scroll', sync, { passive: true });
  document.addEventListener('focusin', (e) => {
    if ((e.target as Element).matches('input')) {
      typing = true;
      sync();
    }
  });
  document.addEventListener('focusout', () => {
    typing = false;
    sync();
  });
}

// Final: the mark again, as a big grid that paints in once ------------------------------

const finalMark = $<HTMLElement>('[data-final-mark]');
if (finalMark) {
  finalMark.innerHTML = MARK.map((row, r) =>
    [...row].map((k, c) => `<i style="--c:${MARK_FILL[k as keyof typeof MARK_FILL]};--d:${r + c}"></i>`).join(''),
  ).join('');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        finalMark.classList.add('on');
        io.disconnect();
      }
    });
    io.observe(finalMark);
  } else finalMark.classList.add('on');
}

// FAQ for search engines, from the same text players read ----------------------------

const faq = $$<HTMLDetailsElement>('[data-faq] details').map((d) => ({
  '@type': 'Question',
  name: $<HTMLElement>('summary', d)?.textContent ?? '',
  acceptedAnswer: { '@type': 'Answer', text: $<HTMLElement>('p', d)?.textContent ?? '' },
}));
if (faq.length) {
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq });
  document.head.append(ld);
}
