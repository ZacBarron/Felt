import { createHash } from 'node:crypto';

/**
 * Plain HTML for the operations console: one stylesheet, one small script
 * for chart tooltips and confirms, no libraries and nothing loaded from
 * elsewhere. Readable on a phone. Colors follow the dataviz reference
 * palette for data (validated for color vision deficiency in light and
 * dark) and the brand's warm neutrals and brass for chrome.
 */

export const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A tagged template that escapes every value unless it is already Html. */
export class Html {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}
export const raw = (s: string) => new Html(s);
export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new Html(out);
}
function render(v: unknown): string {
  if (v instanceof Html) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
}

export const num = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || !Number.isFinite(n) ? 'None' : n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const pct = (r: number | null | undefined, digits = 1) => (r === null || r === undefined ? 'None' : `${(r * 100).toFixed(digits)}%`);
export const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const when = (iso: string | null | undefined) => (iso ? iso.replace('T', ' ').slice(0, 16) : 'None');

const CSS = `
:root{color-scheme:light;--bg:#f4f1ec;--card:#fcfcfb;--ink:#1f1d1a;--ink-2:#52514e;--muted:#898781;--line:#e1e0d9;--axis:#c3c2b7;
--brass:#8a6420;--brass-fill:#b88a3e;--on-brass:#fff;--good:#006300;--bad:#b42727;--warn:#8a5a00;
--s1:#2a78d6;--s2:#eb6834;--s1-wash:rgba(42,120,214,.10);
--h0:#f0efec;--h1:#cde2fb;--h2:#9ec5f4;--h3:#6da7ec;--h4:#3987e5;--h5:#256abf;--h6:#184f95;--h7:#0d366b}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){color-scheme:dark;--bg:#0d0d0d;--card:#1a1a19;--ink:#f0efec;--ink-2:#c3c2b7;--muted:#898781;--line:#2c2c2a;--axis:#383835;
--brass:#e3b261;--brass-fill:#e3b261;--on-brass:#1a1408;--good:#0ca30c;--bad:#e66767;--warn:#fab219;
--s1:#3987e5;--s2:#d95926;--s1-wash:rgba(57,135,229,.14);
--h0:#383835;--h1:#104281;--h2:#184f95;--h3:#1c5cab;--h4:#256abf;--h5:#2a78d6;--h6:#5598e7;--h7:#9ec5f4}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--brass)}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line)}
.top{display:flex;align-items:center;gap:12px;padding:10px 16px;max-width:1200px;margin:0 auto}
.brand{font-weight:700;letter-spacing:.01em;color:var(--ink);text-decoration:none}.brand span{color:var(--brass)}
.who{margin-left:auto;color:var(--muted);font-size:13px}
nav.tabs{display:flex;gap:4px;overflow-x:auto;padding:0 12px 8px;max-width:1200px;margin:0 auto;scrollbar-width:none}
nav.tabs a{flex:none;padding:6px 12px;border-radius:999px;color:var(--ink-2);text-decoration:none;font-size:14px}
nav.tabs a[aria-current=page]{background:var(--ink);color:var(--card)}
main{max-width:1200px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:4px 0 12px}h2{font-size:17px;margin:0 0 4px}h3{font-size:15px;margin:12px 0 6px}
.sub{color:var(--ink-2);margin:0 0 12px;font-size:13.5px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;min-width:0}
.card.wide{grid-column:1/-1}
.tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.tile .k{color:var(--ink-2);font-size:13px}.tile .v{font-size:26px;font-weight:650;line-height:1.15;margin-top:2px}.tile .n{color:var(--muted);font-size:12.5px}
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:14px}
.filters label{display:grid;gap:2px;font-size:12.5px;color:var(--ink-2)}
input,select,textarea{font:inherit;font-size:16px;color:var(--ink);background:var(--card);border:1px solid var(--axis);border-radius:10px;padding:7px 10px;min-height:38px}
textarea{width:100%;min-height:70px}
button,.btn{font:inherit;font-weight:600;border:0;border-radius:999px;padding:8px 16px;min-height:38px;background:var(--brass-fill);color:var(--on-brass);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
button.quiet,.btn.quiet{background:transparent;color:var(--brass);border:1px solid var(--axis)}
button.danger{background:var(--bad);color:#fff}
button:disabled{opacity:.5;cursor:not-allowed}
.presets{display:flex;gap:4px;flex-wrap:wrap}.presets a{padding:7px 12px;border-radius:999px;border:1px solid var(--axis);text-decoration:none;color:var(--ink-2);font-size:13.5px}
.presets a[aria-current=true]{background:var(--ink);color:var(--card);border-color:var(--ink)}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;font-size:13.5px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
th{color:var(--ink-2);font-weight:600}td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
details{margin-top:8px}summary{cursor:pointer;color:var(--ink-2);font-size:13px;min-height:32px;display:flex;align-items:center}
.muted{color:var(--muted)}.good{color:var(--good)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--axis);color:var(--ink-2)}
.pill.on{border-color:var(--good);color:var(--good)}.pill.off{border-color:var(--bad);color:var(--bad)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2);margin:4px 0}
.legend i{display:inline-block;width:14px;height:2px;vertical-align:middle;margin-right:6px;border-radius:1px}
.legend i.box{height:10px;width:10px;border-radius:2px}
.chart{position:relative}.chart svg{display:block;width:100%;min-width:540px;max-width:1000px;height:auto;overflow:visible}
.chart .plot{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-top:4px}
.chart text{fill:var(--muted);font-size:14px;font-family:system-ui,-apple-system,sans-serif}
.chart .lab{fill:var(--ink-2);font-size:14px;font-weight:600}
.grid-line{stroke:var(--line);stroke-width:1}.base-line{stroke:var(--axis);stroke-width:1}
.hit{fill:transparent}.col:hover rect.mark,.col:focus rect.mark{opacity:.8}
.tip{position:absolute;pointer-events:none;background:var(--ink);color:var(--card);padding:6px 9px;border-radius:8px;font-size:12.5px;line-height:1.35;white-space:nowrap;transform:translate(-50%,-110%);z-index:3;display:none}
.tip b{font-size:14px}.tip .row{display:flex;align-items:center;gap:6px}.tip .key{display:inline-block;width:10px;height:2px}
.bars{display:grid;grid-template-columns:minmax(110px,32%) 1fr;align-items:center;gap:8px;font-size:13px}.bar{display:contents}
.bar .name{color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .track{position:relative;height:22px;display:flex;align-items:center;gap:6px}
.bar .fill{height:18px;border-radius:0 4px 4px 0;background:var(--s1);min-width:2px}
.bar .val{color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}.bar .val .muted{margin-left:4px}
.drop{grid-column:2;font-size:12px;color:var(--muted);margin:-6px 0 -2px}
.heat td.c{text-align:center;font-variant-numeric:tabular-nums;border:2px solid var(--card);border-radius:4px;min-width:64px}
.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13.5px}.kv dt{color:var(--ink-2)}.kv dd{margin:0;word-break:break-word}
.stack{display:grid;gap:12px}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.notice{padding:10px 14px;border-radius:12px;background:var(--card);border:1px solid var(--line);margin-bottom:12px}
.notice.ok{border-color:var(--good)}.notice.err{border-color:var(--bad)}
form.inline{display:inline}
.actions details.action{border-top:1px solid var(--line);margin:0}.actions details.action summary{color:var(--ink);font-weight:600;min-height:44px}
.actions form{display:grid;gap:6px;padding:0 0 12px}
.actions .check{display:flex;gap:8px;align-items:center;font-size:13.5px}
.actions .check input{min-height:auto;width:20px;height:20px}
.timeline{list-style:none;margin:0;padding:0;font-size:13px}.timeline li{display:grid;grid-template-columns:110px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid var(--line)}
pre{white-space:pre-wrap;background:var(--bg);padding:10px;border-radius:10px;font-size:12.5px;max-height:420px;overflow:auto}
@media (max-width:560px){main{padding:12px}.tile .v{font-size:22px}h1{font-size:20px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

/**
 * Tooltips for charts (hover, tap and keyboard focus) and a confirm on
 * forms marked data-confirm. Values come from data attributes and go in
 * with textContent, never as HTML.
 */
const SCRIPT = `
(function(){
  function tipFor(chart){var t=chart.querySelector('.tip');if(!t){t=document.createElement('div');t.className='tip';t.setAttribute('role','status');chart.appendChild(t);}return t;}
  function show(chart,x,y,rows){var t=tipFor(chart);t.textContent='';rows.forEach(function(r,i){var d=document.createElement('div');d.className='row';if(r.c){var k=document.createElement('span');k.className='key';k.style.background=r.c;d.appendChild(k);}var b=document.createElement(i===0&&!r.c?'span':'b');b.textContent=r.v;d.appendChild(b);if(r.l){var l=document.createElement('span');l.textContent=r.l;d.appendChild(l);}t.appendChild(d);});t.style.left=x+'px';t.style.top=y+'px';t.style.display='block';}
  function hide(chart){var t=chart.querySelector('.tip');if(t)t.style.display='none';}
  document.querySelectorAll('.chart[data-line]').forEach(function(chart){
    var data=JSON.parse(chart.getAttribute('data-line'));var svg=chart.querySelector('svg');var cross=svg.querySelector('.cross');
    function at(clientX){var r=svg.getBoundingClientRect();var vx=(clientX-r.left)/r.width*data.w;var i=Math.round((vx-data.x0)/data.dx);return Math.max(0,Math.min(data.labels.length-1,i));}
    function go(i){var r=svg.getBoundingClientRect();var x=data.x0+i*data.dx;cross.setAttribute('x1',x);cross.setAttribute('x2',x);cross.style.display='';var rows=[{v:data.labels[i]}];data.series.forEach(function(s){rows.push({c:s.color,v:s.fmt[i],l:s.name});});var cr=chart.getBoundingClientRect();show(chart,r.left-cr.left+x/data.w*r.width,r.top-cr.top+data.top/data.h*r.height,rows);}
    svg.addEventListener('pointermove',function(e){go(at(e.clientX));});
    svg.addEventListener('pointerdown',function(e){go(at(e.clientX));});
    svg.addEventListener('pointerleave',function(){cross.style.display='none';hide(chart);});
    var idx=data.labels.length-1;svg.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){idx=Math.max(0,idx-1);go(idx);}if(e.key==='ArrowRight'){idx=Math.min(data.labels.length-1,idx+1);go(idx);}});
    svg.addEventListener('focus',function(){go(idx);});svg.addEventListener('blur',function(){cross.style.display='none';hide(chart);});
  });
  document.querySelectorAll('.chart [data-tip]').forEach(function(el){
    var chart=el.closest('.chart');
    function on(){var r=chart.getBoundingClientRect();var m=el.getBoundingClientRect();show(chart,m.left-r.left+m.width/2,m.top-r.top,JSON.parse(el.getAttribute('data-tip')));}
    el.addEventListener('pointerenter',on);el.addEventListener('focus',on);el.addEventListener('pointerdown',on);
    el.addEventListener('pointerleave',function(){hide(chart);});el.addEventListener('blur',function(){hide(chart);});
  });
  document.querySelectorAll('form[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!window.confirm(f.getAttribute('data-confirm')))e.preventDefault();});});
})();
`;

const hash = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;

/** Only this page's own style and script run. No other origin is ever contacted. */
export const CSP = `default-src 'none'; style-src ${hash(CSS)}; style-src-attr 'unsafe-inline'; script-src ${hash(SCRIPT)}; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`;

export interface Page {
  title: string;
  /** The tab to mark. */
  tab: string;
  actor?: { name: string; role: string };
  body: Html;
  notice?: { ok: boolean; text: string };
}

export const TABS = [
  { id: 'overview', label: 'Overview', href: '/admin' },
  { id: 'growth', label: 'Growth', href: '/admin/growth' },
  { id: 'product', label: 'Product', href: '/admin/product' },
  { id: 'revenue', label: 'Revenue', href: '/admin/revenue' },
  { id: 'users', label: 'Players', href: '/admin/users' },
  { id: 'lifecycle', label: 'Lifecycle', href: '/admin/lifecycle' },
  { id: 'flags', label: 'Flags', href: '/admin/flags' },
  { id: 'ops', label: 'Operations', href: '/admin/ops' },
  { id: 'audit', label: 'Audit log', href: '/admin/audit' },
  { id: 'access', label: 'Access', href: '/admin/access' },
] as const;

export function page(p: Page): string {
  const nav = p.actor
    ? html`<nav class="tabs" aria-label="Console">${TABS.filter((t) => t.id !== 'access' || p.actor!.role === 'owner').map(
        (t) => html`<a href="${t.href}" ${raw(t.id === p.tab ? 'aria-current="page"' : '')}>${t.label}</a>`,
      )}</nav>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="referrer" content="no-referrer"><title>${esc(p.title)} · Aced console</title><style>${CSS}</style></head><body>
<header><div class="top"><a class="brand" href="/admin">Aced <span>console</span></a>${p.actor ? html`<span class="who">${p.actor.name === p.actor.role ? p.actor.name : `${p.actor.name} · ${p.actor.role}`}</span><form class="inline" method="post" action="/admin/logout"><button class="quiet" type="submit">Sign out</button></form>` : ''}</div>${nav}</header>
<main id="main">${p.notice ? html`<p class="notice ${p.notice.ok ? 'ok' : 'err'}" role="status">${p.notice.text}</p>` : ''}${p.body}</main>
<script>${SCRIPT}</script></body></html>`;
}
