import { statSync } from 'node:fs';
import type { Context, Hono } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { ACTIONS, type ActionId, exportUser, isAction, runAction } from './admin/actions.ts';
import { authenticate, can, COOKIE, createAdmin, LoginLimiter, login, type Permission, ROLES, SESSION_HOURS, sessionCookie } from './admin/auth.ts';
import { barChart, columnChart, funnelChart, heatmap, lineChart, stat } from './admin/charts.ts';
import { toCsv } from './admin/csv.ts';
import { CSP, Html, html, num, page, pct, raw, usd, when } from './admin/html.ts';
import {
  activesByDay,
  activesByWeek,
  allMetrics,
  cancelReasons,
  conversionBy,
  type ConversionRow,
  counts,
  errorsByDay,
  eventCounts,
  experiments,
  featureUsage,
  type Filters,
  funnel,
  paywall,
  parseFilters,
  RETENTION_DAYS,
  retentionBySource,
  retentionByWeek,
  revenue,
  sources,
  topErrors,
  vitals,
} from './admin/metrics.ts';
import { localDay } from '@felt/core/analytics';
import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { checkFlagValue, type Flags, PROGRAMS } from './flags.ts';
import { emailCopy, type EmailKind, isMarketing, marketingFooter, MARKETING, SUNSET_DAYS, TRANSACTIONAL } from './lifecycle.ts';
import { audit, auditLog, JOBS } from './ops.ts';
import { CLOSING_NOTE, REMINDER, trialEndingNotice } from './push.ts';
import { type Mailer, normalizeEmail, type StripeCall } from './services.ts';

/**
 * The operations console at /admin (docs/ADMIN.md): dashboards, players,
 * actions, flags, lifecycle programs, health and the audit log. Server
 * rendered, no libraries, readable on a phone. Off unless ADMIN_TOKEN is set.
 * JSON for scripts at GET /api/admin/metrics with the token in a header.
 */

/** Uptime and server errors, kept in memory by app.ts. */
export interface OpsState {
  startedAt: string;
  /** Times of recent server errors (ms). */
  errors: number[];
}

export interface AdminDeps {
  db: Db;
  config: Config;
  flags: Flags;
  stripe?: StripeCall;
  mailer: Mailer;
  now: () => Date;
  ops: OpsState;
  random: () => number;
}

type Ctx = Context;

const LISTS = ['ios', 'android', 'founding'];

// The app's own Env type does not matter here: the console reads nothing from it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mountAdmin(app: Hono<any>, deps: AdminDeps) {
  const { db, config, flags, now } = deps;
  const ownerToken = config.admin.token;
  const limiter = new LoginLimiter();
  const address = (c: Ctx) => {
    try {
      return c.req.header('fly-client-ip') ?? c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? getConnInfo(c).remote.address ?? 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const send = (c: Ctx, body: string, status = 200) => {
    c.header('Content-Security-Policy', CSP);
    c.header('Cache-Control', 'no-store');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'no-referrer');
    return c.html(body, status as 200);
  };
  const notice = (c: Ctx) => {
    const ok = c.req.query('ok');
    const err = c.req.query('err');
    return ok ? { ok: true, text: ok } : err ? { ok: false, text: err } : undefined;
  };
  const back = (c: Ctx, to: string, msg: { ok?: string; err?: string }) => {
    const u = new URL(to, 'http://x');
    if (msg.ok) u.searchParams.set('ok', msg.ok);
    if (msg.err) u.searchParams.set('err', msg.err);
    return c.redirect(u.pathname + u.search + u.hash, 303);
  };

  // The console is off without ADMIN_TOKEN: it answers as if it did not exist.
  const off = (c: Ctx) => c.json({ error: 'Not found.' }, 404);

  /** The admin behind a request, or a response sending them to sign in. */
  const who = (c: Ctx, need: Permission = 'read') => {
    if (!ownerToken) return { res: off(c) };
    const auth = authenticate(c, db, ownerToken, now());
    if (!auth) return { res: c.req.path.startsWith('/api/') ? c.json({ error: 'Sign in to the console.' }, 401) : c.redirect('/admin/login', 303) };
    if (!can(auth.actor, need)) return { res: send(c, page({ title: 'Not allowed', tab: '', actor: auth.actor, body: html`<h1>Not allowed</h1><p>Your role is read only for this.</p>` }), 403) };
    return { auth };
  };

  /** A form post: checks the role and, for a cookie sign in, the form token. */
  const post = async (c: Ctx, need: Permission) => {
    const w = who(c, need);
    if (w.res) return { res: w.res };
    const form = (await c.req.parseBody()) as Record<string, string>;
    if (w.auth.csrf && form.csrf !== w.auth.csrf) return { res: c.text('This form expired. Go back and try again.', 403) };
    return { actor: w.auth.actor, form, csrf: w.auth.csrf };
  };

  const csrfField = (csrf?: string) => (csrf ? html`<input type="hidden" name="csrf" value="${csrf}">` : '');

  // Sign in ---------------------------------------------------------------------------

  app.get('/admin/login', (c) => {
    if (!ownerToken) return off(c);
    return send(
      c,
      page({
        title: 'Sign in',
        tab: '',
        notice: notice(c),
        body: html`<div class="card" style="max-width:420px;margin:40px auto"><h1>Sign in to the console</h1><p class="sub">Paste your admin token. You stay signed in for ${SESSION_HOURS} hours on this browser.</p>
<form method="post" action="/admin/login" class="stack"><label for="t">Admin token</label><input id="t" name="token" type="password" autocomplete="current-password" required><button type="submit">Sign in</button></form></div>`,
      }),
    );
  });

  app.post('/admin/login', async (c) => {
    if (!ownerToken) return off(c);
    const t = now().getTime();
    const addr = address(c);
    if (limiter.blocked(addr, t)) return back(c, '/admin/login', { err: 'Too many tries. Wait 15 minutes.' });
    const form = (await c.req.parseBody()) as Record<string, string>;
    const actor = login(db, ownerToken, String(form.token ?? ''));
    if (!actor) {
      limiter.fail(addr, t);
      return back(c, '/admin/login', { err: 'That token is not right.' });
    }
    audit(db, actor, now(), { action: 'sign_in' });
    const cookie = sessionCookie(ownerToken, actor.id, now());
    c.header('Set-Cookie', `${COOKIE}=${cookie}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${config.production ? '; Secure' : ''}`);
    return c.redirect('/admin', 303);
  });

  app.post('/admin/logout', (c) => {
    c.header('Set-Cookie', `${COOKIE}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0${config.production ? '; Secure' : ''}`);
    return c.redirect('/admin/login', 303);
  });

  // Filters -----------------------------------------------------------------------------

  const filtersOf = (c: Ctx) => parseFilters(c.req.query() as Record<string, string>, now());
  const qs = (f: Filters, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ from: f.from, to: f.to, ...(f.source ? { source: f.source } : {}), ...(f.platform ? { platform: f.platform } : {}), ...(f.inApp ? { in_app: f.inApp } : {}), ...extra });
    return `?${p}`;
  };
  const filterBar = (path: string, f: Filters) => {
    const today = localDay(now().getTime(), 0);
    const preset = (days: number) => {
      const from = new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86_400_000).toISOString().slice(0, 10);
      const on = f.to === today && f.from === from;
      return html`<a href="${path}${qs({ ...f, from, to: today })}" aria-current="${on ? 'true' : 'false'}">${days === 1 ? 'Today' : `${days} days`}</a>`;
    };
    const opt = (v: string, label: string, cur?: string) => html`<option value="${v}" ${raw(cur === v ? 'selected' : '')}>${label}</option>`;
    return html`<form class="filters" method="get" action="${path}"><div class="presets">${[1, 7, 30, 90].map(preset)}</div>
<label>From<input type="date" name="from" value="${f.from}"></label><label>To<input type="date" name="to" value="${f.to}"></label>
<label>Source<select name="source">${opt('', 'All')}${sources(db).map((s) => opt(s, s, f.source))}</select></label>
<label>Device<select name="platform">${opt('', 'All')}${opt('ios', 'iPhone', f.platform)}${opt('android', 'Android', f.platform)}${opt('desktop', 'Computer', f.platform)}</select></label>
<label>In-app browser<select name="in_app">${opt('', 'Either')}${opt('1', 'Yes', f.inApp)}${opt('0', 'No', f.inApp)}</select></label>
<button type="submit">Apply</button></form>`;
  };
  const csvLink = (dataset: string, f?: Filters, label = 'Download CSV') => html`<a class="btn quiet" href="/admin/export/${dataset}.csv${f ? qs(f) : ''}">${label}</a>`;
  const today = () => localDay(now().getTime(), 0);
  const seats = () => flags.num('founding.seats');

  const convTable = (rows: ConversionRow[], keyLabel: string) =>
    html`<div class="scroll"><table><thead><tr><th>${keyLabel}</th><th class="r">Installs</th><th class="r">App open</th><th class="r">Activated</th><th class="r">Account</th><th class="r">Trial or founding</th><th class="r">Paid</th></tr></thead><tbody>${rows.map(
      (r) =>
        html`<tr><td>${r.key}</td><td class="r">${num(r.installs)}</td><td class="r">${pct(r.appOpen / r.installs)}</td><td class="r">${pct(r.activated / r.installs)}</td><td class="r">${pct(r.account / r.installs)}</td><td class="r">${pct(r.trial / r.installs)}</td><td class="r">${num(r.paid)} <span class="muted">${pct(r.paid / r.installs)}</span></td></tr>`,
    )}</tbody></table></div>`;

  // Overview ------------------------------------------------------------------------------

  app.get('/admin', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const f = filtersOf(c);
    const days = activesByDay(db, f);
    const site = funnel(db, f, true);
    const rev = revenue(db, f, now(), seats());
    const week = activesByWeek(db, { ...f, from: f.to });
    const activated = site.steps.find((s) => s.id === 'activated');
    const body = html`<h1>Overview</h1>${filterBar('/admin', f)}
<div class="tiles">${stat('Active today', num(days.at(-1)?.active ?? 0), 'Installs with any event')}${stat('Active this week', num(week.at(-1)?.active ?? 0), 'Monday to today')}${stat('New installs', num(days.reduce((a, d) => a + d.new, 0)), 'In this range')}${stat('Activation', pct(activated?.ofStart ?? null), 'Site visitors with a graded answer in their first visit')}${stat('MRR', usd(rev.mrr), 'List prices, before coupons')}${stat('Paying', num(rev.active.annual + rev.active.monthly), `${num(rev.trials)} in a trial`)}${stat('Founding places left', num(rev.founding.left), `of ${num(rev.founding.seats)}`)}</div>
<div class="grid">
<section class="card wide"><h2>Active installs</h2><p class="sub">Each day: installs with any event, and installs seen for the first time.</p>${lineChart({ title: 'Active and new installs by day', labels: days.map((d) => d.day), series: [{ name: 'Active', color: 'var(--s1)', values: days.map((d) => d.active) }, { name: 'New', color: 'var(--s2)', values: days.map((d) => d.new) }] })}</section>
<section class="card"><h2>Site funnel</h2><p class="sub">New installs that arrived on the site in this range: ${num(site.cohort)}.</p>${funnelChart({ title: 'Site funnel', ...site })}</section>
<section class="card wide"><h2>Money received by week</h2><p class="sub">From Stripe's amounts, before refunds. ${usd(rev.received)} in this range.</p>${columnChart({ title: 'Money received', labels: rev.weekly.map((x) => x.week), values: rev.weekly.map((x) => x.amount), format: usd })}</section>
<section class="card wide"><h2>Retention by week of first visit</h2>${heatmap({ title: 'Retention cohorts', keyLabel: 'Week of', rows: retentionByWeek(db, f, today()), columns: RETENTION_DAYS.map((d) => `Day ${d}`) })}</section>
</div>`;
    return send(c, page({ title: 'Overview', tab: 'overview', actor: w.auth.actor, body, notice: notice(c) }));
  });

  // Growth ----------------------------------------------------------------------------------

  app.get('/admin/growth', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const f = filtersOf(c);
    const weeks = activesByWeek(db, f);
    const site = funnel(db, f, true);
    const all = funnel(db, f, false);
    const bySource = conversionBy(db, f, 'source');
    const creator = conversionBy(db, f, 'utm_source');
    const room = conversionBy(db, f, 'loc');
    const body = html`<h1>Growth</h1>${filterBar('/admin/growth', f)}
<div class="grid">
<section class="card wide"><h2>Weekly active installs</h2>${columnChart({ title: 'Weekly active installs', labels: weeks.map((x) => x.week), values: weeks.map((x) => x.active) })}</section>
<section class="card"><h2>Site funnel</h2><p class="sub">${num(site.cohort)} new installs that started on the site. Activated means a graded answer in the first visit.</p>${funnelChart({ title: 'Site funnel', ...site })}<p>${csvLink('funnel', f)}</p></section>
<section class="card"><h2>All new installs</h2><p class="sub">${num(all.cohort)} new installs, the site and the app.</p>${funnelChart({ title: 'All installs funnel', ...all })}</section>
<section class="card wide"><h2>Retention by week</h2>${heatmap({ title: 'Retention by week', keyLabel: 'Week of', rows: retentionByWeek(db, f, today()), columns: RETENTION_DAYS.map((d) => `Day ${d}`) })}<p>${csvLink('retention', f)}</p></section>
<section class="card wide"><h2>Retention by first touch source</h2>${heatmap({ title: 'Retention by source', keyLabel: 'Source', rows: retentionBySource(db, f, today()).slice(0, 20), columns: RETENTION_DAYS.map((d) => `Day ${d}`) })}</section>
<section class="card wide"><h2>Conversion by source</h2><p class="sub">Source is the creator tag, else src, ref or the referring site.</p>${barChart({ title: 'New installs by source', rows: bySource.slice(0, 12).map((r) => ({ label: r.key, value: r.installs, note: `${pct(r.paid / r.installs)} paid` })) })}${convTable(bySource, 'Source')}<p>${csvLink('sources', f)}</p></section>
<section class="card wide"><h2>By creator</h2><p class="sub">utm_source on the link.</p>${convTable(creator, 'Creator')}</section>
<section class="card wide"><h2>By card room</h2><p class="sub">loc on the link, such as a QR code at a room.</p>${convTable(room, 'Card room')}</section>
</div>`;
    return send(c, page({ title: 'Growth', tab: 'growth', actor: w.auth.actor, body }));
  });

  // Product ---------------------------------------------------------------------------------

  app.get('/admin/product', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const f = filtersOf(c);
    const feats = featureUsage(db, f);
    const pw = paywall(db, f);
    const exps = experiments(db, f, today());
    const reasons = cancelReasons(db, f);
    const bill = counts(db, f, ['payment_failed', 'payment_recovered', 'billing_banner_shown', 'billing_banner_tapped']);
    const vit = vitals(db, f);
    const errs = errorsByDay(db, f);
    const LIMIT: Record<string, [number, number]> = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500] };
    const body = html`<h1>Product</h1>${filterBar('/admin/product', f)}
<div class="grid">
<section class="card"><h2>Feature use</h2><p class="sub">Installs that used each feature in this range.</p>${barChart({ title: 'Installs by feature', rows: feats.map((x) => ({ label: x.label, value: x.installs, note: `${num(x.events)} times` })) })}</section>
<section class="card"><h2>Paywall</h2><p class="sub">Views by where they came from. Converted means a trial or founding start after the view.</p>${barChart({ title: 'Paywall views by source', rows: pw.map((x) => ({ label: x.from, value: x.views, note: `${pct(x.converted / Math.max(1, x.installs))} converted` })) })}
<div class="scroll"><table><thead><tr><th>From</th><th class="r">Views</th><th class="r">Installs</th><th class="r">Checkouts</th><th class="r">Converted</th></tr></thead><tbody>${pw.map((x) => html`<tr><td>${x.from}</td><td class="r">${num(x.views)}</td><td class="r">${num(x.installs)}</td><td class="r">${num(x.checkouts)}</td><td class="r">${num(x.converted)} <span class="muted">${pct(x.converted / Math.max(1, x.installs))}</span></td></tr>`)}</tbody></table></div></section>
<section class="card wide"><h2>A/B tests</h2><p class="sub">Each arm from its first exposure. Run each test for at least 2 full weeks. Small arms swing a lot.</p>${
      exps.length
        ? html`<div class="scroll"><table><thead><tr><th>Test</th><th>Arm</th><th class="r">Exposed</th><th class="r">CTA click</th><th class="r">App open</th><th class="r">Activated</th><th class="r">Back day 1</th><th class="r">Paid</th></tr></thead><tbody>${exps.map(
            (x) => html`<tr><td>${x.exp}</td><td>${x.variant}</td><td class="r">${num(x.exposed)}</td><td class="r">${pct(x.cta / x.exposed)}</td><td class="r">${pct(x.appOpen / x.exposed)}</td><td class="r">${pct(x.activated / x.exposed)}</td><td class="r">${pct(x.d1)}</td><td class="r">${num(x.paid)}</td></tr>`,
          )}</tbody></table></div><p>${csvLink('experiments', f)}</p>`
        : html`<p class="muted">No exposures in this range yet.</p>`
    }</section>
<section class="card"><h2>Cancel reasons</h2>${barChart({ title: 'Cancels by reason', rows: reasons.map((r) => ({ label: r.reason, value: r.n, note: r.shown ? `${pct(r.taken / r.shown, 0)} took the offer` : 'no offer' })) })}</section>
<section class="card"><h2>Billing recovery</h2><div class="tiles">${stat('Payments failed', num(bill.payment_failed))}${stat('Recovered', num(bill.payment_recovered), pct(bill.payment_recovered / Math.max(1, bill.payment_failed)))}${stat('Banner shown', num(bill.billing_banner_shown))}${stat('Banner tapped', num(bill.billing_banner_tapped), pct(bill.billing_banner_tapped / Math.max(1, bill.billing_banner_shown)))}</div></section>
<section class="card"><h2>Web vitals</h2><p class="sub">The 75th percentile from a sample of page loads. Good is under the first number.</p><div class="scroll"><table><thead><tr><th>Metric</th><th>Where</th><th class="r">Loads</th><th class="r">p75</th><th class="r">Good</th></tr></thead><tbody>${vit.map((v) => {
      const lim = LIMIT[v.metric] ?? [0, 0];
      const tone = v.p75 <= lim[0] ? 'good' : v.p75 <= lim[1] ? 'warn' : 'bad';
      const word = tone === 'good' ? 'Good' : tone === 'warn' ? 'Needs work' : 'Poor';
      return html`<tr><td>${v.metric}</td><td>${v.app}</td><td class="r">${num(v.n)}</td><td class="r ${tone}">${v.metric === 'CLS' ? v.p75.toFixed(3) : `${num(v.p75)} ms`} · ${word}</td><td class="r">${pct(v.good, 0)}</td></tr>`;
    })}</tbody></table></div><p class="sub">Thresholds: LCP 2500 ms, CLS 0.1, INP 200 ms.</p></section>
<section class="card wide"><h2>Errors in the browser</h2>${lineChart({ title: 'Errors by day', labels: errs.map((e) => e.day), series: [{ name: 'Errors', color: 'var(--s1)', values: errs.map((e) => e.n) }] })}
<div class="scroll"><table><thead><tr><th>Where</th><th>Type</th><th>Code</th><th>Route</th><th class="r">Times</th><th class="r">Installs</th></tr></thead><tbody>${topErrors(db, f).map((e) => html`<tr><td>${e.app}</td><td>${e.name}</td><td><code>${e.hash}</code></td><td>${e.route}</td><td class="r">${num(e.n)}</td><td class="r">${num(e.installs)}</td></tr>`)}</tbody></table></div><p class="sub">Codes are hashes of the message. Match one with hashMessage() in @felt/core/analytics.</p></section>
<section class="card wide"><h2>Every event</h2><div class="scroll"><table><thead><tr><th>Event</th><th class="r">Count</th></tr></thead><tbody>${eventCounts(db, f).map((e) => html`<tr><td>${e.name}</td><td class="r">${num(e.n)}</td></tr>`)}</tbody></table></div><p>${csvLink('events', f)}</p></section>
</div>`;
    return send(c, page({ title: 'Product', tab: 'product', actor: w.auth.actor, body }));
  });

  // Revenue ---------------------------------------------------------------------------------

  app.get('/admin/revenue', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const f = filtersOf(c);
    const r = revenue(db, f, now(), seats());
    const body = html`<h1>Revenue</h1>${filterBar('/admin/revenue', f)}
<div class="tiles">${stat('MRR', usd(r.mrr), 'List prices, before coupons')}${stat('ARR', usd(r.arr), 'MRR times 12')}${stat('Yearly plans', num(r.active.annual))}${stat('Monthly plans', num(r.active.monthly))}${stat('In a trial', num(r.trials))}${stat('Founding sold', num(r.founding.sold), `${num(r.founding.comped)} comped, ${num(r.founding.held)} held`)}${stat('Founding left', num(r.founding.left), `of ${num(r.founding.seats)}`)}</div>
<div class="tiles">${stat('Received', usd(r.received), 'In this range, from Stripe')}${stat('Refunds', usd(r.refunds), `${num(r.refundCount)} refunds`)}${stat('Churn', pct(r.churnRate), `${num(r.churned)} ended. Our estimate of the share live at the start`)}${stat('Payment failed', num(r.failed))}${stat('Recovered', num(r.recovered), pct(r.recovered / Math.max(1, r.failed)))}${stat('Cancelling', num(r.cancelling), 'Ends at period end')}${stat('Paused', num(r.paused))}${stat('Past due', num(r.pastDue))}</div>
<div class="grid">
<section class="card wide"><h2>Money received by week</h2><p class="sub">First payments, renewals and founding places, from Stripe's own amounts.</p>${columnChart({ title: 'Money received', labels: r.weekly.map((x) => x.week), values: r.weekly.map((x) => x.amount), format: usd })}</section>
<section class="card wide"><h2>Lifetime value by first touch</h2><p class="sub">Money received per account so far, by the link that first brought the account. Accounts with sharing off show as unknown.</p>${barChart({ title: 'Revenue by source', rows: r.bySource.filter((x) => x.revenue > 0).map((x) => ({ label: x.source, value: x.revenue, note: `${usd(x.ltv)} per account` })), format: usd })}
<div class="scroll"><table><thead><tr><th>Source</th><th class="r">Accounts</th><th class="r">Paying</th><th class="r">Revenue</th><th class="r">Per account</th></tr></thead><tbody>${r.bySource.map((x) => html`<tr><td>${x.source}</td><td class="r">${num(x.accounts)}</td><td class="r">${num(x.paying)}</td><td class="r">${usd(x.revenue)}</td><td class="r">${usd(x.ltv)}</td></tr>`)}</tbody></table></div></section>
</div><p class="sub">MRR is arithmetic on list prices for live paying plans. Churn is an estimate: it counts the start from today's live plans.</p>`;
    return send(c, page({ title: 'Revenue', tab: 'revenue', actor: w.auth.actor, body }));
  });

  // Players ---------------------------------------------------------------------------------

  interface UserRow {
    id: string;
    email: string | null;
    handle: string | null;
    created_at: string;
    plan: string | null;
    sub_status: string | null;
    lifetime: number;
    pro_until: string | null;
    bonus_until: string | null;
    trialing: number;
    last_active_at: string | null;
    first_source: string | null;
  }
  const status = (u: UserRow) => {
    const t = now().toISOString();
    if (u.lifetime) return 'Founding';
    if (u.trialing && (u.pro_until ?? '') > t) return 'Trial';
    if ((u.pro_until ?? '') > t) return `Pro ${u.plan ?? ''}`.trim();
    if ((u.bonus_until ?? '') > t) return 'Granted Pro';
    return 'Free';
  };

  app.get('/admin/users', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const q = (c.req.query('q') ?? '').trim().slice(0, 200);
    const cols = 'id, email, handle, created_at, plan, sub_status, lifetime, pro_until, bonus_until, trialing, last_active_at, first_source';
    const rows = q
      ? (db.prepare(`SELECT ${cols} FROM users WHERE id = ? OR email LIKE ? OR handle LIKE ? OR stripe_customer = ? ORDER BY created_at DESC LIMIT 50`).all(q, `%${q.toLowerCase()}%`, `%${q}%`, q) as unknown as UserRow[])
      : (db.prepare(`SELECT ${cols} FROM users ORDER BY created_at DESC LIMIT 25`).all() as unknown as UserRow[]);
    const total = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
    const body = html`<h1>Players</h1><p class="sub">${num(total)} accounts. Search by email, id, name or Stripe customer.</p>
<form class="filters" method="get" action="/admin/users"><label style="flex:1;min-width:220px">Search<input name="q" value="${q}" type="search" autocomplete="off"></label><button type="submit">Search</button>${can(w.auth.actor, 'act') ? csvLink('users', undefined, 'Download all as CSV') : ''}</form>
<div class="card"><div class="scroll"><table><thead><tr><th>Player</th><th>Plan</th><th>Joined</th><th>Last visit</th><th>First touch</th></tr></thead><tbody>${rows.map(
      (u) => html`<tr><td><a href="/admin/users/${encodeURIComponent(u.id)}">${u.email ?? u.handle ?? u.id}</a><div class="muted">${u.id}</div></td><td>${status(u)}</td><td>${when(u.created_at)}</td><td>${when(u.last_active_at)}</td><td>${u.first_source ?? 'None'}</td></tr>`,
    )}</tbody></table></div>${rows.length ? '' : html`<p class="muted">No players match.</p>`}</div>`;
    return send(c, page({ title: 'Players', tab: 'users', actor: w.auth.actor, body }));
  });

  app.get('/admin/users/:id', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const id = c.req.param('id');
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as (UserRow & Record<string, unknown>) | undefined;
    if (!u) return send(c, page({ title: 'Not found', tab: 'users', actor: w.auth.actor, body: html`<h1>No player with that id</h1><p><a href="/admin/users">Back to players</a></p>` }), 404);
    // Looking at a player's account is logged too, as the privacy page promises.
    audit(db, w.auth.actor, now(), { action: 'view_user', target: id });
    const all = <T>(sql: string, ...args: (string | number)[]) => db.prepare(sql).all(id, ...args) as unknown as T[];
    const passkeys = all<{ device_type: string | null; created_at: string; last_used: string | null }>('SELECT device_type, created_at, last_used FROM passkeys WHERE user_id = ? ORDER BY created_at');
    const sessions = all<{ created_at: string; last_seen: string }>('SELECT created_at, last_seen FROM sessions WHERE user_id = ? ORDER BY last_seen DESC');
    const pushes = all<{ endpoint: string; created_at: string }>('SELECT endpoint, created_at FROM push_subs WHERE user_id = ?');
    const snap = db.prepare('SELECT version, bytes, updated_at, device FROM snapshots WHERE user_id = ?').get(id) as { version: number; bytes: number; updated_at: string; device: string | null } | undefined;
    const answers = db.prepare('SELECT COUNT(*) AS n, SUM(score >= 1) AS right, MAX(at) AS last FROM answers WHERE user_id = ?').get(id) as { n: number; right: number | null; last: string | null };
    const rating = db.prepare('SELECT rating FROM answers WHERE user_id = ? ORDER BY at DESC LIMIT 1').get(id) as { rating: number } | undefined;
    const dailies = (db.prepare('SELECT COUNT(*) AS n FROM daily_results WHERE user_id = ?').get(id) as { n: number }).n;
    const notices = all<{ kind: string; key: string; at: string }>('SELECT kind, key, at FROM notices_sent WHERE user_id = ? ORDER BY at DESC LIMIT 50');
    const pushLog = all<{ kind: string; at: string }>('SELECT kind, at FROM push_log WHERE user_id = ? ORDER BY at DESC LIMIT 50');
    const feedback = all<{ reason: string; detail: string | null; offer_shown: string | null; offer_taken: number; at: string }>('SELECT reason, detail, offer_shown, offer_taken, at FROM cancel_feedback WHERE user_id = ? ORDER BY at DESC');
    const notes = all<{ at: string; author: string; body: string }>('SELECT at, author, body FROM staff_notes WHERE user_id = ? ORDER BY at DESC');
    const installs = all<{ install_id: string; platform: string; source: string; first_day: string; last_day: string }>('SELECT install_id, platform, source, first_day, last_day FROM installs WHERE user_id = ?');
    const events = installs.length
      ? (db
          .prepare(`SELECT at, name, app, props FROM events WHERE install_id IN (${installs.map(() => '?').join(', ')}) ORDER BY at DESC LIMIT 100`)
          .all(...installs.map((i) => i.install_id)) as { at: number; name: string; app: string; props: string | null }[])
      : [];
    const stripeBase = (config.stripe.secretKey ?? '').startsWith('sk_test') ? 'https://dashboard.stripe.com/test' : 'https://dashboard.stripe.com';
    const act = can(w.auth.actor, 'act');
    const csrf = w.auth.csrf;
    const host = (e: string) => {
      try {
        return new URL(e).host;
      } catch {
        return 'unknown';
      }
    };
    const kv = (pairs: [string, unknown][]) => html`<dl class="kv">${pairs.map(([k, v]) => html`<dt>${k}</dt><dd>${v instanceof Html ? v : v === null || v === undefined || v === '' ? 'None' : String(v)}</dd>`)}</dl>`;
    const actionForm = (id2: ActionId) => {
      const a = ACTIONS[id2];
      const extra =
        id2 === 'grant_pro'
          ? html`<label>Days<input name="days" type="number" min="1" max="3650" value="30" required></label>`
          : id2 === 'extend_trial'
            ? html`<label>Days<input name="days" type="number" min="1" max="60" value="7" required></label>`
            : id2 === 'pause_sub'
              ? html`<label>Months<select name="months"><option value="1">1 month</option><option value="2">2 months</option></select></label>`
              : id2 === 'delete_user'
                ? html`<label>Type the player's id or email to confirm<input name="confirm_text" required autocomplete="off"></label>`
                : '';
      return html`<details class="action"><summary>${a.label}</summary><form method="post" action="/admin/users/${encodeURIComponent(id)}/action" data-confirm="${a.label} for ${u.email ?? u.id}?">${csrfField(csrf)}<input type="hidden" name="action" value="${id2}">
<span class="sub">${a.note}${a.stripe && !deps.stripe ? ' Needs Stripe.' : ''}</span>${extra}
<label>Reason<input name="reason" required minlength="3" maxlength="500" placeholder="Why, for the audit log"></label>
<label class="check"><input type="checkbox" name="confirm" value="yes" required>I checked this is the right player</label>
<button type="submit" class="${a.danger ? 'danger' : ''}" ${raw(a.stripe && !deps.stripe ? 'disabled' : '')}>${a.label}</button></form></details>`;
    };
    const body = html`<p><a href="/admin/users">Players</a></p><h1>${u.email ?? u.handle ?? u.id}</h1><p class="sub">${status(u)} · joined ${when(u.created_at)}</p>
<div class="grid">
<section class="card"><h2>Profile</h2>${kv([
      ['Id', u.id],
      ['Email', u.email],
      ['Display name', u.handle],
      ['Time zone', u.tz],
      ['Last visit', when(u.last_active_at)],
      ['Last study day', u.last_study_day],
      ['Marketing email', u.email_opt_in ? `On since ${when(u.email_opt_in_at as string)}` : 'Off'],
      ['Holdout', u.holdout ? 'Yes, no marketing email' : 'No'],
      ['First touch', u.first_source ? `${u.first_source}${u.first_utm_source ? `, creator ${u.first_utm_source}` : ''}${u.first_loc ? `, room ${u.first_loc}` : ''}` : 'Unknown'],
      ['Revenue so far', usd(Number(u.revenue_cents ?? 0) / 100)],
    ])}</section>
<section class="card"><h2>Plan</h2>${kv([
      ['Status', status(u)],
      ['Plan', u.plan],
      ['Stripe status', u.sub_status],
      ['Paid through', when(u.pro_until)],
      ['Granted Pro until', when(u.bonus_until)],
      ['Cancels at period end', u.cancel_at_period_end ? 'Yes' : 'No'],
      ['Paused until', when(u.paused_until as string | null)],
      ['Payment problem', u.billing_issue ? `Since ${when(u.billing_issue_at as string)}` : 'No'],
      ['Comp reason', u.comp_reason],
      ['Stripe customer', u.stripe_customer ? html`<a href="${stripeBase}/customers/${String(u.stripe_customer)}" target="_blank" rel="noopener noreferrer">${String(u.stripe_customer)}</a>` : null],
    ])}</section>
<section class="card"><h2>Devices and sync</h2>${kv([
      ['Sessions', `${sessions.length}${sessions[0] ? `, last seen ${when(sessions[0].last_seen)}` : ''}`],
      ['Passkeys', passkeys.length ? passkeys.map((p) => `${p.device_type ?? 'key'} made ${when(p.created_at)}`).join('; ') : 'None'],
      ['Push devices', pushes.length ? pushes.map((p) => `${host(p.endpoint)} since ${when(p.created_at)}`).join('; ') : 'None'],
      ['Reminders', u.reminders ? `On at ${u.cue_minutes ?? '?'} minutes after midnight` : 'Off'],
      ['Sync copy', snap ? `Version ${snap.version}, ${num(snap.bytes / 1024)} KB, ${when(snap.updated_at)}${snap.device ? ` from ${snap.device}` : ''}` : 'None'],
      ['Installs linked', installs.length ? installs.map((i) => `${i.platform} from ${i.source}, ${i.first_day} to ${i.last_day}`).join('; ') : 'None (sharing off or not linked)'],
    ])}</section>
<section class="card"><h2>Rating and progress</h2>${kv([
      ['Graded answers', `${num(answers.n)}${answers.n ? `, ${pct((answers.right ?? 0) / answers.n, 0)} right` : ''}`],
      ['Last answer', when(answers.last)],
      ['Aced Rating at last answer', rating ? `About ${Math.round(rating.rating)}` : 'None'],
      ['Daily challenges', num(dailies)],
    ])}</section>
<section class="card"><h2>Emails and pushes</h2><ul class="timeline">${[...notices.map((n) => ({ at: n.at, what: `${n.kind.startsWith('email-') ? 'Email' : 'Notice'} ${n.kind.replace(/^email-/, '')}` })), ...pushLog.map((p) => ({ at: p.at, what: `Push ${p.kind}` }))]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 40)
      .map((x) => html`<li><span class="muted">${when(x.at)}</span><span>${x.what}</span></li>`)}</ul>${notices.length || pushLog.length ? '' : html`<p class="muted">Nothing sent yet.</p>`}</section>
<section class="card"><h2>Cancel feedback</h2>${feedback.length ? html`<ul class="timeline">${feedback.map((x) => html`<li><span class="muted">${when(x.at)}</span><span>${x.reason}${x.offer_shown ? ` · offer ${x.offer_shown} ${x.offer_taken ? 'taken' : 'not taken'}` : ''}${x.detail ? html`<br>${x.detail}` : ''}</span></li>`)}</ul>` : html`<p class="muted">None.</p>`}</section>
<section class="card wide"><h2>Recent events</h2>${events.length ? html`<ul class="timeline">${events.map((e) => html`<li><span class="muted">${when(new Date(e.at).toISOString())}</span><span>${e.name} <span class="muted">${e.app}${e.props ? ` ${e.props}` : ''}</span></span></li>`)}</ul>` : html`<p class="muted">No usage events linked to this account.</p>`}</section>
<section class="card"><h2>Staff notes</h2>${notes.map((n) => html`<p><span class="muted">${when(n.at)} · ${n.author}</span><br>${n.body}</p>`)}
${can(w.auth.actor, 'note') ? html`<form method="post" action="/admin/users/${encodeURIComponent(id)}/note" class="stack">${csrfField(csrf)}<label for="note">Add a note</label><textarea id="note" name="body" maxlength="2000" required></textarea><button type="submit">Save note</button></form>` : ''}</section>
<section class="card actions"><h2>Actions</h2><p class="sub">Each one asks for a reason and a confirm, and goes in the audit log.</p>${act ? html`${(Object.keys(ACTIONS) as ActionId[]).map(actionForm)}<details class="action"><summary>Export their data</summary><form method="post" action="/admin/users/${encodeURIComponent(id)}/export">${csrfField(csrf)}<span class="sub">Everything stored about the player, as JSON, for a privacy request.</span><label>Reason<input name="reason" required minlength="3" maxlength="500"></label><label class="check"><input type="checkbox" name="confirm" value="yes" required>I checked this is the right player</label><button type="submit" class="quiet">Download JSON</button></form></details>` : html`<p class="muted">Your role is read only.</p>`}</section>
<section class="card wide"><h2>Audit log for this player</h2>${auditTable(auditLog(db, { target: id, limit: 50 }))}</section>
</div>`;
    return send(c, page({ title: String(u.email ?? u.id), tab: 'users', actor: w.auth.actor, body, notice: notice(c) }));
  });

  app.post('/admin/users/:id/note', async (c) => {
    const p = await post(c, 'note');
    if (p.res) return p.res;
    const id = c.req.param('id');
    const body = String(p.form.body ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, 2000);
    if (!body) return back(c, `/admin/users/${encodeURIComponent(id)}`, { err: 'Write the note first.' });
    if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(id)) return back(c, '/admin/users', { err: 'No player with that id.' });
    db.prepare('INSERT INTO staff_notes (user_id, at, author, body) VALUES (?, ?, ?, ?)').run(id, now().toISOString(), p.actor.name, body);
    audit(db, p.actor, now(), { action: 'add_note', target: id, after: { body } });
    return back(c, `/admin/users/${encodeURIComponent(id)}`, { ok: 'Note saved.' });
  });

  app.post('/admin/users/:id/action', async (c) => {
    const p = await post(c, 'act');
    if (p.res) return p.res;
    const id = c.req.param('id');
    const to = `/admin/users/${encodeURIComponent(id)}`;
    if (p.form.confirm !== 'yes') return back(c, to, { err: 'Tick the confirm box first.' });
    const action = p.form.action;
    if (!isAction(action)) return back(c, to, { err: 'Unknown action.' });
    try {
      const result = await runAction(deps, p.actor, id, action, {
        reason: String(p.form.reason ?? ''),
        days: Number(p.form.days),
        months: Number(p.form.months),
        confirmText: String(p.form.confirm_text ?? ''),
      });
      if (result.ok && action === 'delete_user') return back(c, '/admin/users', { ok: result.message });
      return back(c, to, result.ok ? { ok: result.message } : { err: result.message });
    } catch (e) {
      console.error('Admin action failed', e);
      return back(c, to, { err: `That did not work: ${e instanceof Error ? e.message : 'unknown error'}` });
    }
  });

  app.post('/admin/users/:id/export', async (c) => {
    const p = await post(c, 'act');
    if (p.res) return p.res;
    const id = c.req.param('id');
    const reason = String(p.form.reason ?? '').trim();
    if (p.form.confirm !== 'yes' || reason.length < 3) return back(c, `/admin/users/${encodeURIComponent(id)}`, { err: 'Write a reason and tick the confirm box.' });
    const data = exportUser(db, id);
    if (!data) return back(c, '/admin/users', { err: 'No player with that id.' });
    audit(db, p.actor, now(), { action: 'export_user', target: id, reason });
    c.header('Content-Disposition', `attachment; filename="aced-player-${id}.json"`);
    c.header('Cache-Control', 'no-store');
    return c.body(JSON.stringify(data, null, 2), 200, { 'Content-Type': 'application/json; charset=utf-8' });
  });

  // Flags -------------------------------------------------------------------------------------

  const flagInput = (key: string, csrf?: string, returnTo = '/admin/flags') => {
    const d = flags.def(key)!;
    const v = flags.get(key);
    const field =
      d.kind === 'bool'
        ? html`<select name="value"><option value="true" ${raw(v === true ? 'selected' : '')}>On</option><option value="false" ${raw(v === false ? 'selected' : '')}>Off</option></select>`
        : d.kind === 'string'
          ? html`<input name="value" value="${String(v)}" maxlength="140">`
          : html`<input name="value" type="number" value="${String(v)}" step="${d.kind === 'percent' || Number.isInteger(d.default) ? '1' : '0.01'}" ${raw(d.min !== undefined ? `min="${d.min}"` : '')} ${raw(d.max !== undefined ? `max="${d.max}"` : '')}>`;
    return html`<form method="post" action="/admin/flags/${encodeURIComponent(key)}" class="row">${csrfField(csrf)}<input type="hidden" name="return" value="${returnTo}">${field}<input name="reason" placeholder="Reason" required minlength="3" maxlength="300"><button type="submit">Save</button><button type="submit" name="reset" value="1" class="quiet">Reset</button></form>`;
  };
  const show = (v: unknown) => (v === true ? html`<span class="pill on">On</span>` : v === false ? html`<span class="pill off">Off</span>` : v === '' ? html`<span class="muted">Empty</span>` : String(v));

  app.get('/admin/flags', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const edit = can(w.auth.actor, 'flags');
    const groups = [...new Set(flags.defs.map((d) => d.group))];
    const body = html`<h1>Flags and config</h1><p class="sub">Changes apply at once and are logged. Public flags reach the site and the app on their next start. Both keep safe defaults when the server is down.</p>
${groups.map(
  (g) => html`<section class="card" style="margin-bottom:12px"><h2>${g}</h2><div class="scroll"><table><thead><tr><th>Flag</th><th>Value</th><th>Default</th><th>Last change</th>${edit ? html`<th>Change</th>` : ''}</tr></thead><tbody>${flags.defs
    .filter((d) => d.group === g)
    .map((d) => {
      const m = flags.meta(d.key);
      return html`<tr><td><code>${d.key}</code>${d.public ? html` <span class="pill">public</span>` : ''}<div class="sub" style="white-space:normal;max-width:360px">${d.note}</div></td><td>${show(flags.get(d.key))}${d.kind === 'percent' ? '%' : ''}</td><td>${show(d.default)}</td><td>${m.set ? `${when(m.updatedAt)} by ${m.updatedBy}` : html`<span class="muted">Default</span>`}</td>${edit ? html`<td>${flagInput(d.key, w.auth.csrf)}</td>` : ''}</tr>`;
    })}</tbody></table></div></section>`,
)}`;
    return send(c, page({ title: 'Flags', tab: 'flags', actor: w.auth.actor, body, notice: notice(c) }));
  });

  app.post('/admin/flags/:key', async (c) => {
    const p = await post(c, 'flags');
    if (p.res) return p.res;
    const key = c.req.param('key');
    const returnTo = ['/admin/flags', '/admin/lifecycle'].includes(p.form.return) ? p.form.return : '/admin/flags';
    const def = flags.def(key);
    if (!def) return back(c, returnTo, { err: 'Unknown flag.' });
    const reason = String(p.form.reason ?? '').trim().slice(0, 300);
    if (reason.length < 3) return back(c, returnTo, { err: 'Write a reason. It goes in the audit log.' });
    if (p.form.reset) {
      const r = flags.reset(key);
      audit(db, p.actor, now(), { action: 'reset_flag', target: `flag:${key}`, reason, before: r.before, after: r.after });
      return back(c, returnTo, { ok: `${key} is back to its default.` });
    }
    const checked = checkFlagValue(def, p.form.value);
    if (!checked.ok) return back(c, returnTo, { err: `${key}: ${checked.error}` });
    const r = flags.set(key, checked.value, p.actor.name, now().toISOString());
    audit(db, p.actor, now(), { action: 'set_flag', target: `flag:${key}`, reason, before: r.before, after: r.after });
    return back(c, returnTo, { ok: `${key} saved.` });
  });

  // Lifecycle ---------------------------------------------------------------------------------

  const since = (days: number) => new Date(now().getTime() - days * 86_400_000).toISOString();
  const pushKind: Record<string, string> = { 'push-reminder': 'reminder', 'push-closing': 'closing', 'push-trial-ending': 'trial-ending' };
  const sentCount = (program: string, days: number) =>
    pushKind[program]
      ? (db.prepare('SELECT COUNT(*) AS n FROM push_log WHERE kind = ? AND at > ?').get(pushKind[program], since(days)) as { n: number }).n
      : (db.prepare('SELECT COUNT(*) AS n FROM notices_sent WHERE kind = ? AND at > ?').get(`email-${program}`, since(days)) as { n: number }).n;
  const opened = (channel: string, kind: string, days: number) =>
    (
      db
        .prepare("SELECT COUNT(*) AS n FROM events e WHERE e.name = 'notification_opened' AND e.day >= ? AND json_extract(e.props, '$.channel') = ? AND json_extract(e.props, '$.kind') = ?")
        .get(since(days).slice(0, 10), channel, kind) as { n: number }
    ).n;

  const sample = () => ({
    appUrl: config.appUrl,
    date: (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    week: { decisions: 42, right: 31, ratingChange: 18, dailies: 4 },
    coupon: { id: 'SAMPLE', percentOff: 30, duration: 'once' as const },
  });
  const previewOf = (program: string) => {
    if (program === 'push-reminder') return { subject: REMINDER.title, text: `${REMINDER.body}\n\nOpens ${REMINDER.url}` };
    if (program === 'push-closing') return { subject: CLOSING_NOTE.title, text: `${CLOSING_NOTE.body}\n\nOpens ${CLOSING_NOTE.url}` };
    if (program === 'push-trial-ending') {
      const n = trialEndingNotice(new Date(now().getTime() + 2 * 86_400_000).toISOString(), 'UTC');
      return { subject: n.title, text: `${n.body}\n\nOpens ${n.url}` };
    }
    const kind = program as EmailKind;
    const copy = emailCopy(kind, now().toISOString(), sample());
    return isMarketing(kind) ? { ...copy, text: `${copy.text}\n\n${marketingFooter(`${config.lifecycle.serverUrl}/api/email/unsubscribe?token=SAMPLE`, config.lifecycle.postalAddress ?? '(MAIL_POSTAL_ADDRESS is not set)')}` } : copy;
  };
  const isEmailProgram = (p: string): p is EmailKind => ([...TRANSACTIONAL, ...MARKETING] as readonly string[]).includes(p);

  app.get('/admin/lifecycle', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const edit = can(w.auth.actor, 'flags');
    const unsub30 = (db.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'email_unsubscribed' AND day >= ?").get(since(30).slice(0, 10)) as { n: number }).n;
    const groups = db.prepare('SELECT holdout, COUNT(*) AS n FROM users GROUP BY holdout').all() as { holdout: number; n: number }[];
    const holdoutN = groups.find((g) => g.holdout === 1)?.n ?? 0;
    const allN = groups.reduce((a, g) => a + g.n, 0);
    const supp = suppression();
    const body = html`<h1>Lifecycle</h1><p class="sub">Each program sends on its own schedule from the 5 minute job. A paused program sends nothing until it is back on. Email opens are not tracked. Opened counts app opens from the message's link.</p>
<div class="tiles">${stat('Email', flags.bool('email.enabled') ? 'On' : 'Off', 'All lifecycle email')}${stat('Push', flags.bool('push.enabled') ? 'On' : 'Off', `Caps ${flags.num('push.day_cap')} a day, ${flags.num('push.week_cap')} a week`)}${stat('Marketing email', config.lifecycle.postalAddress ? 'Ready' : 'Off', config.lifecycle.postalAddress ? 'Postal address set' : 'Set MAIL_POSTAL_ADDRESS')}${stat('Unsubscribes', num(unsub30), 'Last 30 days')}</div>
<section class="card" style="margin-bottom:12px"><h2>Programs</h2><div class="scroll"><table><thead><tr><th>Program</th><th>State</th><th class="r">Sent 7 days</th><th class="r">Sent 30 days</th><th class="r">Opened 30 days</th><th>Preview</th>${edit ? html`<th>Pause or resume</th>` : ''}</tr></thead><tbody>${PROGRAMS.map((p) => {
      const on = flags.bool(`program.${p.id}`);
      const sent30 = sentCount(p.id, 30);
      const opens = opened(p.channel, p.channel === 'push' ? pushKind[p.id] : p.id, 30);
      return html`<tr><td><strong>${p.name}</strong> <span class="pill">${p.channel}</span><div class="sub" style="white-space:normal;max-width:320px">${p.note}</div></td><td>${show(on)}</td><td class="r">${num(sentCount(p.id, 7))}</td><td class="r">${num(sent30)}</td><td class="r">${num(opens)} <span class="muted">${pct(opens / Math.max(1, sent30), 0)}</span></td><td><a href="/admin/lifecycle/preview/${p.id}">Preview</a></td>${
        edit
          ? html`<td><form method="post" action="/admin/flags/program.${p.id}" class="row">${csrfField(w.auth.csrf)}<input type="hidden" name="return" value="/admin/lifecycle"><input type="hidden" name="value" value="${on ? 'false' : 'true'}"><input name="reason" placeholder="Reason" required minlength="3"><button type="submit" class="${on ? 'quiet' : ''}">${on ? 'Pause' : 'Resume'}</button></form></td>`
          : ''
      }</tr>`;
    })}</tbody></table></div></section>
<div class="grid">
<section class="card"><h2>Send a test</h2>${edit ? html`<form method="post" action="/admin/lifecycle/test" class="stack">${csrfField(w.auth.csrf)}<label>Email<select name="program">${PROGRAMS.filter((p) => p.channel === 'email').map((p) => html`<option value="${p.id}">${p.name}</option>`)}</select></label><label>To<input name="to" type="email" required></label><label>Reason<input name="reason" required minlength="3"></label><button type="submit">Send a test</button></form><p class="sub">Tests go out with sample numbers and a subject that starts with [Test].</p>` : html`<p class="muted">Your role is read only.</p>`}</section>
<section class="card"><h2>Holdout</h2><p class="sub">New accounts join the holdout by chance. They never get marketing email, so the emails can be measured against them.</p><div class="tiles">${stat('Share for new accounts', pct(flags.num('lifecycle.holdout'), 0))}${stat('In the holdout', num(holdoutN), `of ${num(allN)} accounts`)}</div>${edit ? flagInput('lifecycle.holdout', w.auth.csrf, '/admin/lifecycle') : ''}</section>
<section class="card"><h2>Suppression lists</h2><p class="sub">Who gets no marketing email, and why. Account and payment email still goes.</p><div class="scroll"><table><thead><tr><th>List</th><th class="r">Accounts</th><th></th></tr></thead><tbody>
<tr><td>Unsubscribed</td><td class="r">${num(supp.unsubscribed)}</td><td>${csvLink('suppression-unsubscribed', undefined, 'CSV')}</td></tr>
<tr><td>Holdout</td><td class="r">${num(supp.holdout)}</td><td>${csvLink('suppression-holdout', undefined, 'CSV')}</td></tr>
<tr><td>Sunset: no visit in ${SUNSET_DAYS} days</td><td class="r">${num(supp.sunset)}</td><td>${csvLink('suppression-sunset', undefined, 'CSV')}</td></tr>
<tr><td>Never opted in</td><td class="r">${num(supp.never)}</td><td></td></tr></tbody></table></div></section>
</div>`;
    return send(c, page({ title: 'Lifecycle', tab: 'lifecycle', actor: w.auth.actor, body, notice: notice(c) }));
  });

  const sunsetBefore = () => new Date(now().getTime() - SUNSET_DAYS * 86_400_000).toISOString();
  const SUPPRESSION: Record<string, () => string> = {
    unsubscribed: () => 'email_opt_in = 0 AND email_opt_in_at IS NOT NULL',
    holdout: () => 'holdout = 1',
    sunset: () => `email_opt_in = 1 AND (last_active_at IS NULL OR last_active_at < '${sunsetBefore()}')`,
  };
  function suppression() {
    const n = (where: string) => (db.prepare(`SELECT COUNT(*) AS n FROM users WHERE email IS NOT NULL AND ${where}`).get() as { n: number }).n;
    return { unsubscribed: n(SUPPRESSION.unsubscribed()), holdout: n(SUPPRESSION.holdout()), sunset: n(SUPPRESSION.sunset()), never: n('email_opt_in = 0 AND email_opt_in_at IS NULL') };
  }

  app.get('/admin/lifecycle/preview/:program', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const program = c.req.param('program');
    if (!PROGRAMS.some((p) => p.id === program)) return back(c, '/admin/lifecycle', { err: 'Unknown program.' });
    const copy = previewOf(program);
    const body = html`<p><a href="/admin/lifecycle">Lifecycle</a></p><h1>Preview</h1><section class="card"><p class="sub">Sample numbers. Links carry n=${program.startsWith('push') ? 'push' : 'email'}.kind so opens can be counted.</p><h2>${copy.subject}</h2><pre>${copy.text}</pre></section>`;
    return send(c, page({ title: 'Preview', tab: 'lifecycle', actor: w.auth.actor, body }));
  });

  app.post('/admin/lifecycle/test', async (c) => {
    const p = await post(c, 'flags');
    if (p.res) return p.res;
    const program = String(p.form.program ?? '');
    const to = normalizeEmail(p.form.to);
    const reason = String(p.form.reason ?? '').trim();
    if (!isEmailProgram(program)) return back(c, '/admin/lifecycle', { err: 'Pick an email program.' });
    if (!to) return back(c, '/admin/lifecycle', { err: 'Enter a valid email address.' });
    if (reason.length < 3) return back(c, '/admin/lifecycle', { err: 'Write a reason.' });
    const copy = previewOf(program);
    await deps.mailer.send(to, `[Test] ${copy.subject}`, copy.text);
    audit(db, p.actor, now(), { action: 'send_test', target: `program:${program}`, reason, after: { to } });
    return back(c, '/admin/lifecycle', { ok: `Sent a test to ${to}.` });
  });

  // Operations --------------------------------------------------------------------------------

  app.get('/admin/ops', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const t = now().getTime();
    const errs = (ms: number) => deps.ops.errors.filter((x) => x > t - ms).length;
    let size = 0;
    try {
      size = config.databasePath === ':memory:' ? 0 : statSync(config.databasePath).size;
    } catch {
      size = 0;
    }
    const pages = db.prepare('PRAGMA page_count').get() as { page_count: number };
    const pageSize = db.prepare('PRAGMA page_size').get() as { page_size: number };
    const dbBytes = size || pages.page_count * pageSize.page_size;
    const lastHook = (db.prepare('SELECT MAX(at) AS at FROM stripe_events').get() as { at: string | null }).at;
    const jobs = db.prepare('SELECT * FROM job_runs').all() as { job: string; last_run: string | null; last_ok: string | null; last_error: string | null; last_error_at: string | null; runs: number; failures: number }[];
    const byJob = new Map(jobs.map((j) => [j.job, j]));
    const clientErrors = (db.prepare("SELECT COUNT(*) AS n FROM events WHERE name = 'error' AND day >= ?").get(localDay(t - 86_400_000, 0)) as { n: number }).n;
    const tables = ['users', 'sessions', 'snapshots', 'answers', 'events', 'installs', 'install_days', 'milestones', 'waitlist', 'audit_log'];
    const rows = tables.map((name) => ({ name, n: (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n }));
    const lists = db.prepare('SELECT list, COUNT(*) AS n, MAX(joined_at) AS last FROM waitlist GROUP BY list').all() as { list: string; n: number; last: string }[];
    const up = Math.round((t - Date.parse(deps.ops.startedAt)) / 3_600_000);
    const on = (b: boolean, label = b ? 'On' : 'Off') => html`<span class="pill ${b ? 'on' : 'off'}">${label}</span>`;
    const body = html`<h1>Operations</h1>
<div class="tiles">${stat('Up for', `${num(up)} h`, `Since ${when(deps.ops.startedAt)}`)}${stat('Database', `${num(dbBytes / 1_048_576, 1)} MB`)}${stat('Server errors', num(errs(3_600_000)), `${num(errs(86_400_000))} in 24 hours`)}${stat('Browser errors', num(clientErrors), 'Last 24 hours')}${stat('Last webhook', lastHook ? when(lastHook) : 'Never', byJob.get('webhook')?.failures ? `${num(byJob.get('webhook')!.failures)} failed` : 'None failed')}</div>
<div class="grid">
<section class="card"><h2>Services</h2><dl class="kv"><dt>Email</dt><dd>${on(!!config.email.resendKey, config.email.resendKey ? 'Resend' : config.devCodes ? 'Development only' : 'Off')} ${on(flags.bool('email.enabled'), flags.bool('email.enabled') ? 'Sending' : 'Paused')}</dd>
<dt>Push</dt><dd>${on(!!(config.push.publicKey && config.push.privateKey))} ${on(flags.bool('push.enabled'), flags.bool('push.enabled') ? 'Sending' : 'Paused')}</dd>
<dt>Stripe</dt><dd>${on(!!deps.stripe)} ${config.stripe.secretKey?.startsWith('sk_test') ? 'Test mode' : ''}</dd>
<dt>Coach</dt><dd>${on(!!config.coach.apiKey && flags.bool('coach.enabled'))}</dd>
<dt>Analytics</dt><dd>${on(flags.bool('analytics.enabled'), flags.bool('analytics.enabled') ? 'Collecting' : 'Paused')}</dd>
<dt>Pro for everyone</dt><dd>${on(!config.proForEveryone, config.proForEveryone ? 'On (testing)' : 'Off')}</dd></dl></section>
<section class="card"><h2>Scheduled jobs</h2><div class="scroll"><table><thead><tr><th>Job</th><th>Last run</th><th>Last success</th><th class="r">Runs</th><th class="r">Failed</th><th>Last error</th></tr></thead><tbody>${JOBS.map((j) => {
      const r = byJob.get(j);
      return html`<tr><td>${j.replace('_', ' ')}</td><td>${when(r?.last_run)}</td><td>${when(r?.last_ok)}</td><td class="r">${num(r?.runs ?? 0)}</td><td class="r ${r?.failures ? 'bad' : ''}">${num(r?.failures ?? 0)}</td><td style="white-space:normal">${r?.last_error ? `${when(r.last_error_at)}: ${r.last_error}` : 'None'}</td></tr>`;
    })}</tbody></table></div></section>
<section class="card"><h2>Waitlists</h2><div class="scroll"><table><thead><tr><th>List</th><th class="r">Emails</th><th>Latest</th><th></th></tr></thead><tbody>${LISTS.map((l) => {
      const r = lists.find((x) => x.list === l);
      return html`<tr><td>${l === 'founding' ? 'Founding members' : l === 'ios' ? 'iPhone app' : 'Android app'}</td><td class="r">${num(r?.n ?? 0)}</td><td>${when(r?.last)}</td><td>${can(w.auth.actor, 'act') ? html`<a class="btn quiet" href="/admin/export/waitlist.csv?list=${l}">CSV</a>` : ''}</td></tr>`;
    })}</tbody></table></div></section>
<section class="card"><h2>Rows</h2><div class="scroll"><table><tbody>${rows.map((r) => html`<tr><td>${r.name}</td><td class="r">${num(r.n)}</td></tr>`)}</tbody></table></div></section>
</div>`;
    return send(c, page({ title: 'Operations', tab: 'ops', actor: w.auth.actor, body }));
  });

  // Audit log ---------------------------------------------------------------------------------

  const auditTable = (rows: ReturnType<typeof auditLog>) =>
    rows.length
      ? html`<div class="scroll"><table><thead><tr><th>When</th><th>Who</th><th>What</th><th>On</th><th>Why</th><th>Before</th><th>After</th></tr></thead><tbody>${rows.map(
          (r) =>
            html`<tr><td>${when(r.at)}</td><td>${r.actor} <span class="muted">${r.role}</span></td><td>${r.action}</td><td>${r.target?.startsWith('flag:') || r.target?.startsWith('program:') || !r.target ? (r.target ?? 'None') : html`<a href="/admin/users/${encodeURIComponent(r.target)}">${r.target}</a>`}</td><td style="white-space:normal;min-width:160px">${r.reason ?? 'None'}</td><td style="white-space:normal;max-width:260px"><code>${r.before ?? ''}</code></td><td style="white-space:normal;max-width:260px"><code>${r.after ?? ''}</code></td></tr>`,
        )}</tbody></table></div>`
      : html`<p class="muted">Nothing yet.</p>`;

  app.get('/admin/audit', (c) => {
    const w = who(c);
    if (w.res) return w.res;
    const before = Number(c.req.query('before')) || undefined;
    const rows = auditLog(db, { limit: 100, before });
    const next = rows.length === 100 ? rows.at(-1)!.id : undefined;
    const body = html`<h1>Audit log</h1><p class="sub">Every sign in, look and change in the console. Newest first.</p><section class="card">${auditTable(rows)}<p class="row">${next ? html`<a class="btn quiet" href="/admin/audit?before=${next}">Older</a>` : ''}${csvLink('audit')}</p></section>`;
    return send(c, page({ title: 'Audit log', tab: 'audit', actor: w.auth.actor, body }));
  });

  // Access ------------------------------------------------------------------------------------

  app.get('/admin/access', (c) => {
    const w = who(c, 'access');
    if (w.res) return w.res;
    const admins = db.prepare('SELECT id, name, role, created_at, created_by, last_seen, disabled FROM admins ORDER BY created_at').all() as {
      id: string;
      name: string;
      role: string;
      created_at: string;
      created_by: string;
      last_seen: string | null;
      disabled: number;
    }[];
    const token = c.req.query('token');
    const body = html`<h1>Access</h1><p class="sub">The owner signs in with ADMIN_TOKEN. Add a named admin for each person, so the audit log shows who did what.</p>
${token ? html`<div class="notice ok" role="status"><strong>Copy this token now.</strong> It is shown once.<pre>${token}</pre></div>` : ''}
<div class="grid"><section class="card"><h2>Admins</h2><div class="scroll"><table><thead><tr><th>Name</th><th>Role</th><th>Added</th><th>Last seen</th><th></th></tr></thead><tbody>
<tr><td>owner</td><td>owner</td><td>ADMIN_TOKEN</td><td>Not tracked</td><td></td></tr>
${admins.map((a) => html`<tr><td>${a.name}</td><td>${a.role}</td><td>${when(a.created_at)} by ${a.created_by}</td><td>${when(a.last_seen)}</td><td>${a.disabled ? html`<span class="pill off">Off</span>` : html`<form method="post" action="/admin/access/${encodeURIComponent(a.id)}/disable" data-confirm="Turn off ${a.name}?">${csrfField(w.auth.csrf)}<input name="reason" placeholder="Reason" required minlength="3"><button class="danger" type="submit">Turn off</button></form>`}</td></tr>`)}
</tbody></table></div></section>
<section class="card"><h2>Add an admin</h2><form method="post" action="/admin/access" class="stack">${csrfField(w.auth.csrf)}<label>Name<input name="name" required maxlength="40" pattern="[A-Za-z0-9 ._-]+"></label><label>Role<select name="role">${Object.entries(ROLES).map(([r, note]) => html`<option value="${r}">${r}: ${note}</option>`)}</select></label><label>Reason<input name="reason" required minlength="3"></label><button type="submit">Add admin</button></form></section></div>`;
    return send(c, page({ title: 'Access', tab: 'access', actor: w.auth.actor, body, notice: notice(c) }));
  });

  app.post('/admin/access', async (c) => {
    const p = await post(c, 'access');
    if (p.res) return p.res;
    const name = String(p.form.name ?? '').trim();
    const role = p.form.role === 'owner' ? 'owner' : p.form.role === 'support' ? 'support' : undefined;
    const reason = String(p.form.reason ?? '').trim();
    if (!/^[A-Za-z0-9 ._-]{2,40}$/.test(name) || name === 'owner') return back(c, '/admin/access', { err: 'Use 2 to 40 letters, numbers, spaces or . _ -' });
    if (!role) return back(c, '/admin/access', { err: 'Pick a role.' });
    if (reason.length < 3) return back(c, '/admin/access', { err: 'Write a reason.' });
    if (db.prepare('SELECT 1 FROM admins WHERE name = ?').get(name)) return back(c, '/admin/access', { err: 'That name is taken.' });
    const made = createAdmin(db, name, role, p.actor, now());
    audit(db, p.actor, now(), { action: 'add_admin', target: `admin:${made.id}`, reason, after: { name, role } });
    // Shown once, on the page this redirect opens. It is never stored in plain text.
    return c.redirect(`/admin/access?token=${encodeURIComponent(made.token)}`, 303);
  });

  app.post('/admin/access/:id/disable', async (c) => {
    const p = await post(c, 'access');
    if (p.res) return p.res;
    const id = c.req.param('id');
    const reason = String(p.form.reason ?? '').trim();
    if (reason.length < 3) return back(c, '/admin/access', { err: 'Write a reason.' });
    const changed = Number(db.prepare('UPDATE admins SET disabled = 1 WHERE id = ?').run(id).changes);
    if (!changed) return back(c, '/admin/access', { err: 'No admin with that id.' });
    audit(db, p.actor, now(), { action: 'disable_admin', target: `admin:${id}`, reason });
    return back(c, '/admin/access', { ok: 'Turned off.' });
  });

  // Exports -------------------------------------------------------------------------------------

  /** Datasets that hold personal data need the act permission, and each download is logged. */
  const PERSONAL = new Set(['users', 'waitlist', 'suppression-unsubscribed', 'suppression-holdout', 'suppression-sunset', 'audit']);

  app.get('/admin/export/:file', (c) => {
    const dataset = c.req.param('file').replace(/\.csv$/, '');
    const w = who(c, PERSONAL.has(dataset) ? 'act' : 'read');
    if (w.res) return w.res;
    const f = filtersOf(c);
    let rows: Record<string, unknown>[] | undefined;
    if (dataset === 'users')
      rows = db
        .prepare('SELECT id, email, handle, created_at, plan, sub_status, lifetime, pro_until, bonus_until, trialing, email_opt_in, holdout, first_source, first_utm_source, first_loc, revenue_cents, last_active_at FROM users ORDER BY created_at')
        .all() as Record<string, unknown>[];
    else if (dataset === 'waitlist') {
      const list = c.req.query('list');
      rows = (list && LISTS.includes(list)
        ? db.prepare('SELECT email, list, joined_at, source, platform FROM waitlist WHERE list = ? ORDER BY joined_at').all(list)
        : db.prepare('SELECT email, list, joined_at, source, platform FROM waitlist ORDER BY joined_at').all()) as Record<string, unknown>[];
    } else if (dataset.startsWith('suppression-') && SUPPRESSION[dataset.slice(12)])
      rows = db.prepare(`SELECT id, email, email_opt_in_at, last_active_at, holdout FROM users WHERE email IS NOT NULL AND ${SUPPRESSION[dataset.slice(12)]()}`).all() as Record<string, unknown>[];
    else if (dataset === 'audit') rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50000').all() as Record<string, unknown>[];
    else if (dataset === 'funnel') rows = [...funnel(db, f, true).steps.map((s) => ({ cohort: 'site', ...s })), ...funnel(db, f, false).steps.map((s) => ({ cohort: 'all', ...s }))];
    else if (dataset === 'sources') rows = conversionBy(db, f, 'source') as unknown as Record<string, unknown>[];
    else if (dataset === 'retention')
      rows = retentionByWeek(db, f, today()).map((r) => ({ week: r.key, installs: r.size, ...Object.fromEntries(RETENTION_DAYS.map((d, j) => [`day_${d}`, r.rates[j]])) }));
    else if (dataset === 'experiments') rows = experiments(db, f, today()) as unknown as Record<string, unknown>[];
    else if (dataset === 'events') rows = eventCounts(db, f);
    if (!rows) return c.text('Unknown export.', 404);
    if (PERSONAL.has(dataset)) audit(db, w.auth.actor, now(), { action: 'export_csv', target: `export:${dataset}`, after: { rows: rows.length } });
    c.header('Content-Disposition', `attachment; filename="aced-${dataset}-${today()}.csv"`);
    c.header('Cache-Control', 'no-store');
    return c.body(toCsv(rows), 200, { 'Content-Type': 'text/csv; charset=utf-8' });
  });

  // JSON for scripts ------------------------------------------------------------------------------

  const metricsJson = (c: Ctx) => {
    const w = who(c);
    if (w.res) return w.res;
    c.header('Cache-Control', 'no-store');
    return c.json(allMetrics(db, filtersOf(c), now(), seats()));
  };
  app.get('/api/admin/metrics', metricsJson);
  app.get('/admin/metrics.json', metricsJson);

}
