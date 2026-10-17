import { bucket } from '@felt/core/analytics';
import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { FOUNDING_SEATS } from './lifecycle.ts';
import { PUSH_DAY_CAP, PUSH_WEEK_CAP } from './services.ts';

/**
 * Feature flags and config, editable in the console (docs/ADMIN.md). Each
 * flag has a kind, a safe default and a note. Values live in the flags
 * table; a flag never set reads its default, so a fresh server behaves as
 * before. Public flags are served at GET /api/config for the site and the
 * app, which cache them and fall back to their own defaults when the server
 * cannot be reached.
 */

export type FlagKind = 'bool' | 'percent' | 'number' | 'string';
export type FlagValue = boolean | number | string;

export interface FlagDef {
  key: string;
  kind: FlagKind;
  default: FlagValue;
  /** Served to browsers at /api/config. */
  public: boolean;
  group: 'Analytics' | 'Experiments' | 'Coach' | 'Founding' | 'Messages' | 'Programs' | 'Site';
  note: string;
  min?: number;
  max?: number;
}

/** The lifecycle programs, each with its own on switch (program.<id>). */
export const PROGRAMS = [
  { id: 'trial-ending', channel: 'email', name: 'Trial ending email', note: '2 days before a trial charges, if the player kept the reminder on.' },
  { id: 'push-trial-ending', channel: 'push', name: 'Trial ending push', note: 'The same reminder as a push.' },
  { id: 'billing-issue', channel: 'email', name: 'Payment failed email', note: 'When a renewal fails.' },
  { id: 'billing-issue-again', channel: 'email', name: 'Payment failed, second email', note: 'A week later, if it still fails.' },
  { id: 'weekly-digest', channel: 'email', name: 'Weekly recap', note: 'Marketing. Mondays, after a week with graded answers.' },
  { id: 'winback-news', channel: 'email', name: 'Win back news', note: 'Marketing. 30 to 45 days after paid Pro ends.' },
  { id: 'winback-offer', channel: 'email', name: 'Win back offer', note: 'Marketing. 60 to 90 days after paid Pro ends.' },
  { id: 'push-reminder', channel: 'push', name: 'Daily study reminder', note: 'At the time the player picked, within the push caps.' },
  { id: 'push-closing', channel: 'push', name: 'Closing note', note: 'After 14 days of reminders without a visit, then reminders stop.' },
] as const;
export type ProgramId = (typeof PROGRAMS)[number]['id'];

export function flagDefs(config: Config): FlagDef[] {
  return [
    { key: 'analytics.enabled', kind: 'bool', default: true, public: true, group: 'Analytics', note: 'Collect anonymous usage events from the site and the app. Off stops collection at once.' },
    { key: 'analytics.vitals_sample', kind: 'number', default: 0.25, min: 0, max: 1, public: true, group: 'Analytics', note: 'Share of page loads that report web vitals.' },
    { key: 'exp.hero_cta', kind: 'bool', default: true, public: true, group: 'Experiments', note: 'Run the hero test: start free first (control) or daily challenge first.' },
    { key: 'exp.sticky_bar', kind: 'bool', default: true, public: true, group: 'Experiments', note: 'Run the phone sticky bar test: on (control) or off.' },
    { key: 'coach.enabled', kind: 'bool', default: true, public: false, group: 'Coach', note: 'Kill switch for the AI coach. Off answers that the coach is not turned on.' },
    { key: 'coach.rollout', kind: 'percent', default: 100, min: 0, max: 100, public: false, group: 'Coach', note: 'Share of Pro accounts that get the coach, by account id.' },
    { key: 'coach.daily_limit', kind: 'number', default: config.coach.dailyLimit, min: 1, max: 1000, public: false, group: 'Coach', note: 'Coach messages a player can send a day.' },
    { key: 'founding.open', kind: 'bool', default: true, public: true, group: 'Founding', note: 'Founding checkout open. Off shows the waitlist instead.' },
    { key: 'founding.seats', kind: 'number', default: FOUNDING_SEATS, min: 0, max: 100_000, public: true, group: 'Founding', note: 'The founding cap. Seats already sold always count.' },
    { key: 'push.enabled', kind: 'bool', default: true, public: false, group: 'Messages', note: 'Send push notifications at all.' },
    { key: 'email.enabled', kind: 'bool', default: true, public: false, group: 'Messages', note: 'Send lifecycle email at all. Sign in codes always go.' },
    { key: 'push.day_cap', kind: 'number', default: PUSH_DAY_CAP, min: 0, max: 5, public: false, group: 'Messages', note: 'Most pushes a player gets in a local day.' },
    { key: 'push.week_cap', kind: 'number', default: PUSH_WEEK_CAP, min: 0, max: 14, public: false, group: 'Messages', note: 'Most pushes a player gets in 7 days.' },
    { key: 'lifecycle.holdout', kind: 'number', default: config.lifecycle.holdout, min: 0, max: 1, public: false, group: 'Messages', note: 'Share of new accounts that never get marketing email. Existing accounts keep their group.' },
    ...PROGRAMS.map((p): FlagDef => ({ key: `program.${p.id}`, kind: 'bool', default: true, public: false, group: 'Programs', note: `${p.name}. ${p.note}` })),
    { key: 'site.notice', kind: 'string', default: '', public: true, group: 'Site', note: 'One short line shown under the site header. Empty shows nothing.' },
  ];
}

/** Checks a value for a flag. Returns the value to store or an error to show. */
export function checkFlagValue(def: FlagDef, raw: unknown): { ok: true; value: FlagValue } | { ok: false; error: string } {
  if (def.kind === 'bool') {
    const v = raw === true || raw === 'true' || raw === 'on' ? true : raw === false || raw === 'false' || raw === 'off' ? false : undefined;
    return v === undefined ? { ok: false, error: 'Pick on or off.' } : { ok: true, value: v };
  }
  if (def.kind === 'string') {
    if (typeof raw !== 'string') return { ok: false, error: 'Enter text.' };
    const v = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
    if (v.length > 140) return { ok: false, error: 'Keep it to 140 characters.' };
    return { ok: true, value: v };
  }
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(n)) return { ok: false, error: 'Enter a number.' };
  if ((def.min !== undefined && n < def.min) || (def.max !== undefined && n > def.max)) return { ok: false, error: `Use a number from ${def.min} to ${def.max}.` };
  if (def.kind === 'percent' || def.key.endsWith('_cap') || def.key === 'founding.seats' || def.key === 'coach.daily_limit') {
    if (!Number.isInteger(n)) return { ok: false, error: 'Use a whole number.' };
  }
  return { ok: true, value: n };
}

export interface Flags {
  defs: FlagDef[];
  def(key: string): FlagDef | undefined;
  get<T extends FlagValue>(key: string): T;
  bool(key: string): boolean;
  num(key: string): number;
  /** A percent flag for one id: the same answer every time for that id. */
  on(key: string, id: string): boolean;
  /** Whether the flag was set, and by whom. */
  meta(key: string): { set: boolean; updatedAt?: string; updatedBy?: string };
  set(key: string, value: FlagValue, actor: string, at: string): { before: FlagValue; after: FlagValue };
  /** Back to the default. */
  reset(key: string): { before: FlagValue; after: FlagValue };
  /** Public flags for /api/config. Percent flags go out as { percent }. */
  public(): Record<string, FlagValue | { percent: number }>;
}

export function createFlags(db: Db, config: Config): Flags {
  const defs = flagDefs(config);
  const byKey = new Map(defs.map((d) => [d.key, d]));
  // One process owns the database, so a cache filled on read and cleared on write is exact.
  let cache: Map<string, { value: FlagValue; updated_at: string; updated_by: string }> | undefined;
  const rows = () => {
    if (!cache) {
      cache = new Map();
      for (const r of db.prepare('SELECT key, value, updated_at, updated_by FROM flags').all() as { key: string; value: string; updated_at: string; updated_by: string }[]) {
        try {
          cache.set(r.key, { value: JSON.parse(r.value) as FlagValue, updated_at: r.updated_at, updated_by: r.updated_by });
        } catch {
          // A broken row reads as the default.
        }
      }
    }
    return cache;
  };
  const get = <T extends FlagValue>(key: string): T => {
    const def = byKey.get(key);
    if (!def) throw new Error(`Unknown flag ${key}`);
    const v = rows().get(key)?.value;
    const ok = def.kind === 'bool' ? typeof v === 'boolean' : def.kind === 'string' ? typeof v === 'string' : typeof v === 'number';
    return (ok ? v : def.default) as T;
  };
  return {
    defs,
    def: (key) => byKey.get(key),
    get,
    bool: (key) => get<boolean>(key),
    num: (key) => get<number>(key),
    on: (key, id) => bucket(id, key) * 100 < get<number>(key),
    meta: (key) => {
      const r = rows().get(key);
      return r ? { set: true, updatedAt: r.updated_at, updatedBy: r.updated_by } : { set: false };
    },
    set(key, value, actor, at) {
      const before = get(key);
      db.prepare('INSERT INTO flags (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by').run(
        key,
        JSON.stringify(value),
        at,
        actor,
      );
      cache = undefined;
      return { before, after: get(key) };
    },
    reset(key) {
      const before = get(key);
      db.prepare('DELETE FROM flags WHERE key = ?').run(key);
      cache = undefined;
      return { before, after: get(key) };
    },
    public() {
      const out: Record<string, FlagValue | { percent: number }> = {};
      for (const d of defs) if (d.public) out[d.key] = d.kind === 'percent' ? { percent: get<number>(d.key) } : get(d.key);
      return out;
    },
  };
}
