import { esc, Html, html, num, pct, raw } from './html.ts';

/**
 * Hand written SVG and HTML charts for the console, following the dataviz
 * method: thin marks (2px lines, bars up to 18px with a 4px rounded end),
 * recessive hairline grids, one y axis, a legend for two or more series,
 * selective direct labels, a tooltip on hover, tap and keyboard focus, and
 * a table of every value behind each chart.
 */

export interface Series {
  name: string;
  /** A CSS color, such as var(--s1). */
  color: string;
  values: number[];
}

/** Clean axis steps: 1, 2 or 5 times a power of ten. */
export function niceMax(max: number, ticks = 4): { top: number; step: number } {
  if (!(max > 0)) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { top: step * ticks, step };
}

export const compact = (n: number) => (Math.abs(n) >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1000 ? `${+(n / 1000).toFixed(1)}K` : `${+n.toFixed(2)}`);

const shortDay = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

function table(head: string[], rows: (string | number)[][]): Html {
  return html`<details><summary>Show the numbers</summary><div class="scroll"><table><thead><tr>${head.map((h, i) => html`<th class="${i ? 'r' : ''}">${h}</th>`)}</tr></thead><tbody>${rows.map(
    (r) => html`<tr>${r.map((c, i) => html`<td class="${i ? 'r' : ''}">${c}</td>`)}</tr>`,
  )}</tbody></table></div></details>`;
}

const legend = (series: { name: string; color: string }[], box = false) =>
  series.length < 2 ? '' : html`<div class="legend">${series.map((s) => html`<span><i class="${box ? 'box' : ''}" style="background:${raw(s.color)}"></i>${s.name}</span>`)}</div>`;

/**
 * A line chart over days or weeks, with a crosshair tooltip. Each series is
 * labelled at its end. `format` turns a value into words for the tooltip.
 */
export function lineChart(opts: { title: string; labels: string[]; series: Series[]; format?: (n: number) => string; days?: boolean }): Html {
  const { labels, series } = opts;
  const fmt = opts.format ?? ((n: number) => num(n));
  const W = 720;
  const H = 240;
  const L = 44;
  const R = 60;
  const T = 16;
  const B = 28;
  const max = Math.max(0, ...series.flatMap((s) => s.values));
  const { top, step } = niceMax(max);
  const n = Math.max(1, labels.length - 1);
  const dx = (W - L - R) / n;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const x = (i: number) => L + i * dx;
  const grid = [];
  for (let v = 0; v <= top + 1e-9; v += step) {
    grid.push(html`<line class="${v === 0 ? 'base-line' : 'grid-line'}" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`);
  }
  const ticks = labels.length <= 1 ? [0] : [0, Math.floor(labels.length / 2), labels.length - 1];
  const pretty = (l: string) => (opts.days !== false && /^\d{4}-\d{2}-\d{2}$/.test(l) ? shortDay(l) : l);
  const lines = series.map((s) => {
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const last = s.values.length - 1;
    return html`<path d="${d}" fill="none" stroke="${raw(s.color)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${
      last >= 0
        ? html`<circle cx="${x(last)}" cy="${y(s.values[last])}" r="4" fill="${raw(s.color)}" stroke="var(--card)" stroke-width="2"/><text class="lab" x="${x(last) + 8}" y="${y(s.values[last]) + 4}">${compact(s.values[last])}</text>`
        : ''
    }`;
  });
  const data = {
    w: W,
    h: H,
    x0: L,
    dx,
    top: T,
    labels: labels.map(pretty),
    series: series.map((s) => ({ name: s.name, color: s.color, fmt: s.values.map(fmt) })),
  };
  return html`<figure class="chart" data-line="${JSON.stringify(data)}" style="margin:0">
<figcaption class="sr-only" style="position:absolute;left:-9999px">${opts.title}</figcaption>
${legend(series)}
<div class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.title}. Use the arrow keys for values." tabindex="0">${raw(grid.join(''))}${raw(lines.join(''))}
${ticks.map((i) => html`<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}">${pretty(labels[i] ?? '')}</text>`)}
<line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--axis)" stroke-width="1" style="display:none"/></svg></div>
${table(['', ...series.map((s) => s.name)], labels.map((l, i) => [pretty(l), ...series.map((s) => fmt(s.values[i]))]))}
</figure>`;
}

/** Columns over weeks, for one measure such as money received. The highest column is labelled. */
export function columnChart(opts: { title: string; labels: string[]; values: number[]; format?: (n: number) => string; color?: string }): Html {
  const fmt = opts.format ?? ((n: number) => num(n));
  const W = 560;
  const H = 220;
  const L = 48;
  const T = 20;
  const B = 28;
  const R = 28;
  const { top, step } = niceMax(Math.max(0, ...opts.values));
  const band = (W - L - R) / Math.max(1, opts.values.length);
  const bw = Math.min(18, band - 2);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const grid = [];
  for (let v = 0; v <= top + 1e-9; v += step) grid.push(html`<line class="${v === 0 ? 'base-line' : 'grid-line'}" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`);
  const peak = opts.values.indexOf(Math.max(...opts.values));
  const color = opts.color ?? 'var(--s1)';
  const cols = opts.values.map((v, i) => {
    const cx = L + band * i + band / 2;
    const h = Math.max(0, y(0) - y(v));
    const r = Math.min(4, h / 2, bw / 2);
    // A 4px rounded top, square at the baseline.
    const x0 = cx - bw / 2;
    const y0 = y(0) - h;
    const d = h > 0 ? `M${x0},${y(0)}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${y(0)}Z` : '';
    const tip = JSON.stringify([{ v: opts.labels[i] }, { c: color, v: fmt(v) }]);
    return html`<g class="col" tabindex="0" data-tip="${tip}" aria-label="${opts.labels[i]}: ${fmt(v)}"><rect class="hit" x="${cx - band / 2}" y="${T}" width="${band}" height="${H - T - B}"/>${d ? html`<path class="mark" d="${d}" fill="${raw(color)}"/>` : ''}${
      i === peak && v > 0 ? html`<text class="lab" x="${cx}" y="${y0 - 5}" text-anchor="middle">${compact(v)}</text>` : ''
    }</g>`;
  });
  const ticks = opts.labels.length <= 1 ? [0] : [0, opts.labels.length - 1];
  return html`<figure class="chart" style="margin:0"><div class="plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.title}">${raw(grid.join(''))}${cols}
${ticks.map((i) => html`<text x="${L + band * i + band / 2}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : 'end'}">${shortDay(opts.labels[i] ?? '1970-01-01')}</text>`)}</svg></div>
${table(['Week of', opts.title], opts.labels.map((l, i) => [shortDay(l), fmt(opts.values[i])]))}</figure>`;
}

export interface BarRow {
  label: string;
  value: number;
  /** Shown after the value, such as a share. */
  note?: string;
}

/** Horizontal bars, longest first by default, with the value at the tip. */
export function barChart(opts: { title: string; rows: BarRow[]; format?: (n: number) => string; color?: string; sort?: boolean }): Html {
  const fmt = opts.format ?? ((n: number) => num(n));
  const rows = opts.sort === false ? opts.rows : [...opts.rows].sort((a, b) => b.value - a.value);
  const max = Math.max(1e-9, ...rows.map((r) => r.value));
  if (!rows.length) return html`<p class="muted">No data in this range yet.</p>`;
  return html`<div class="chart" role="img" aria-label="${opts.title}"><div class="bars">${rows.map((r) => {
    const tip = JSON.stringify([{ v: r.label }, { c: opts.color ?? 'var(--s1)', v: fmt(r.value), l: r.note ?? '' }]);
    return html`<div class="bar"><span class="name" title="${r.label}">${r.label}</span><span class="track" tabindex="0" data-tip="${tip}"><span class="fill" style="width:${raw(((r.value / max) * 82).toFixed(2))}%;background:${raw(opts.color ?? 'var(--s1)')}"></span><span class="val">${fmt(r.value)}${r.note ? html`<span class="muted">${r.note}</span>` : ''}</span></span></div>`;
  })}</div>${table(['', opts.title], rows.map((r) => [r.label, `${fmt(r.value)}${r.note ? ` ${r.note}` : ''}`]))}</div>`;
}

/** A funnel: one bar per step in order, with the share of the start and the drop from the step before. */
export function funnelChart(opts: { title: string; cohort: number; steps: { label: string; n: number; ofStart: number | null; ofPrev: number | null }[] }): Html {
  if (!opts.cohort) return html`<p class="muted">No new installs in this range yet.</p>`;
  const max = Math.max(1, ...opts.steps.map((s) => s.n));
  return html`<div class="chart" role="img" aria-label="${opts.title}"><div class="bars">${opts.steps.map((s, i) => {
    const tip = JSON.stringify([{ v: s.label }, { c: 'var(--s1)', v: num(s.n), l: `${pct(s.ofStart)} of the cohort` }, ...(i ? [{ v: `${pct(s.ofPrev)} of the step before` }] : [])]);
    const drop = i && s.ofPrev !== null ? html`<p class="drop">${s.ofPrev >= 1 ? 'No drop' : `${pct(1 - s.ofPrev, 0)} drop from ${opts.steps[i - 1].label.toLowerCase()}`}</p>` : '';
    return html`${drop}<div class="bar"><span class="name">${s.label}</span><span class="track" tabindex="0" data-tip="${tip}"><span class="fill" style="width:${raw(((s.n / max) * 82).toFixed(2))}%"></span><span class="val">${num(s.n)}<span class="muted">${pct(s.ofStart)}</span></span></span></div>`;
  })}</div>${table(['Step', 'Installs', 'Of cohort', 'Of step before'], opts.steps.map((s) => [s.label, num(s.n), pct(s.ofStart), pct(s.ofPrev)]))}</div>`;
}

/** Sequential steps for the heatmap: one hue, light to dark. Text flips to white on the dark steps. */
const HEAT = ['--h1', '--h2', '--h3', '--h4', '--h5', '--h6', '--h7'];
export function heatStep(r: number | null): { bg: string; ink: string } {
  if (r === null) return { bg: 'var(--h0)', ink: 'var(--muted)' };
  const i = Math.min(HEAT.length - 1, Math.floor(Math.max(0, Math.min(1, r)) * HEAT.length * 1.4));
  return { bg: `var(${HEAT[i]})`, ink: i >= 3 ? '#fff' : '#0b0b0b' };
}

/** Retention cohorts as a heatmap table: rows are cohorts, columns are day N, cells are the share back. */
export function heatmap(opts: { title: string; keyLabel: string; rows: { key: string; size: number; rates: (number | null)[] }[]; columns: string[] }): Html {
  if (!opts.rows.length) return html`<p class="muted">No cohorts in this range yet.</p>`;
  return html`<div class="chart scroll"><table class="heat" aria-label="${opts.title}"><thead><tr><th>${opts.keyLabel}</th><th class="r">Installs</th>${opts.columns.map((c) => html`<th class="r">${c}</th>`)}</tr></thead><tbody>${opts.rows.map(
    (r) => html`<tr><td>${r.key}</td><td class="r">${num(r.size)}</td>${r.rates.map((v, j) => {
      const s = heatStep(v);
      const tip = JSON.stringify([{ v: `${r.key}, ${opts.columns[j]}` }, { v: v === null ? 'Too new' : pct(v), l: v === null ? '' : `of ${num(r.size)} installs` }]);
      return html`<td class="c" tabindex="0" data-tip="${tip}" style="background:${raw(s.bg)};color:${raw(s.ink)}">${v === null ? '…' : pct(v, 0)}</td>`;
    })}</tr>`,
  )}</tbody></table><p class="sub">Cells show the share active again on that day. Darker is higher. A dot means the cohort is too new.</p></div>`;
}

export const stat = (k: string, v: string, n?: string) => html`<div class="tile"><div class="k">${k}</div><div class="v">${v}</div>${n ? html`<div class="n">${n}</div>` : ''}</div>`;

export { esc };
