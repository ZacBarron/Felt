/**
 * Product analytics shared by the site, the app and the server: the event
 * dictionary, validation, coarse device fields, A/B assignment, first touch
 * sources and funnel milestones. See docs/ANALYTICS.md.
 *
 * This file imports nothing, so the server can load it directly
 * (`@felt/core/analytics`) without a bundler.
 *
 * Privacy rules the schema enforces:
 * - Values are short tags, numbers or booleans. Tags cannot hold spaces, so
 *   a sentence, a name or an email address never fits in one.
 * - Every event name and property is on an allowlist. Anything else is dropped.
 */

// Property schema -----------------------------------------------------------------------

/** s: a short tag (letters, digits and _ . : / , # + -), n: a finite number, b: a boolean. */
export type PropType = 's' | 'n' | 'b';
type Value<T extends PropType> = T extends 's' ? string : T extends 'n' ? number : boolean;

/** Where an event may come from. Server events are never accepted from a browser. */
export type Surface = 'site' | 'web' | 'any' | 'server';

interface EventSpec {
  from: Surface;
  props: Record<string, PropType>;
}

const ev = <F extends Surface, P extends Record<string, PropType>>(from: F, props: P) => ({ from, props });

/** First touch fields, as the site stores them in felt.attribution.v1. */
export const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'src', 'loc', 'ref'] as const;
export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
const ATTR_PROPS = { utm_source: 's', utm_medium: 's', utm_campaign: 's', utm_content: 's', src: 's', loc: 's', ref: 's' } as const;

/**
 * Every event Aced may record, with its properties. Adding an event means
 * adding it here, then to docs/ANALYTICS.md. The client's track() is typed
 * against this table, so a call with a wrong name or property does not compile.
 */
export const EVENTS = {
  // Both surfaces
  experiment_exposed: ev('any', { exp: 's', variant: 's' }),
  web_vital: ev('any', { metric: 's', value: 'n', rating: 's', path: 's' }),
  error: ev('any', { kind: 's', name: 's', hash: 's', route: 's' }),

  // Marketing site
  page_view: ev('site', { ...ATTR_PROPS, path: 's', referrer: 's', platform: 's', in_app: 'b', variant: 's' }),
  section_view: ev('site', { section: 's' }),
  cta_click: ev('site', { cta: 's', pos: 's', variant: 's' }),
  nav_click: ev('site', { target: 's' }),
  sticky_shown: ev('site', { variant: 's' }),
  open_demo_used: ev('site', { size: 'n', limpers: 'n' }),
  move_answered: ev('site', { hand: 's', choice: 's', verdict: 's' }),
  move_next: ev('site', {}),
  seat_tab: ev('site', { seat: 's' }),
  story_step: ev('site', { step: 's' }),
  compare_scrolled: ev('site', {}),
  faq_opened: ev('site', { q: 'n' }),
  video_played: ev('site', { clip: 's' }),
  waitlist_submit: ev('site', { list: 's', result: 's' }),
  founding_status_seen: ev('site', { open: 'b', left: 'n' }),
  inapp_hint_shown: ev('site', { platform: 's' }),
  platform_link_click: ev('site', { platform: 's' }),

  // App: opening and habit
  app_open: ev('web', { standalone: 'b', path: 's', via: 's', returning: 'b' }),
  daily_active: ev('web', { standalone: 'b' }),
  notification_opened: ev('web', { channel: 's', kind: 's' }),
  install_prompt_shown: ev('web', { kind: 's' }),
  install_prompt_result: ev('web', { outcome: 's' }),
  push_permission_asked: ev('web', { from: 's' }),
  push_permission_result: ev('web', { result: 's', from: 's' }),
  reminder_added: ev('web', { kind: 's', cue: 's', from: 's', via: 's' }),
  study_cue_set: ev('web', { cue: 's', from: 's' }),
  moment_shown: ev('web', { kind: 's', tier: 's', days: 'n' }),
  moment_share_tapped: ev('web', { tier: 's' }),
  card_shared: ev('web', { kind: 's', design: 's', via: 's' }),
  share_tapped: ev('web', { what: 's', via: 's' }),

  // App: onboarding and placement
  onboarding_started: ev('web', {}),
  onboarding_step_viewed: ev('web', { step: 's', index: 'n' }),
  onboarding_step_answered: ev('web', { step: 's', value: 's' }),
  plan_committed: ev('web', { goals: 's', daily: 'n', focus: 'n' }),
  onboarding_completed: ev('web', { experience: 's', placed: 's' }),
  placement_started: ev('web', { from: 's', experience: 's' }),
  placement_completed: ev('web', { right: 'n', asked: 'n', skipped: 'n', placedAt: 's' }),
  check_started: ev('web', { module: 's', lesson: 's' }),
  check_finished: ev('web', { module: 's', right: 'n', asked: 'n', passed: 'n' }),

  // App: study
  lesson_started: ev('web', { lesson: 's', track: 's', resumed: 'b' }),
  lesson_finished: ev('web', { lesson: 's', track: 's', correct: 'n', total: 'n' }),
  first_lesson_done: ev('web', { correct: 'n', total: 'n' }),
  answer_graded: ev('web', { source: 's', domain: 's', correct: 'b', score: 'n', lesson: 's' }),
  review_started: ev('web', { cards: 'n' }),
  review_finished: ev('web', { cards: 'n', right: 'n' }),
  drill_started: ev('web', { chart: 's', kind: 's' }),
  practice_started: ev('web', { domain: 's' }),
  practice_finished: ev('web', { right: 'n', total: 'n' }),
  daily_started: ev('web', { number: 'n' }),
  daily_finished: ev('web', { number: 'n', right: 'n' }),
  weekly_locked_viewed: ev('web', { week: 's' }),
  weekly_started: ev('web', { week: 's' }),
  weekly_finished: ev('web', { week: 's', right: 'n', accuracy: 'n' }),
  scenario_started: ev('web', { id: 's' }),
  scenario_graded: ev('web', { id: 's', grade: 's' }),

  // App: play
  table_sat: ev('web', { table: 's', custom: 'b', seats: 'n' }),
  hand_dealt: ev('web', { table: 's', skipped: 'n', speed: 's' }),
  decision_graded: ev('web', { tier: 's', grade: 's', street: 's' }),
  play_setting_changed: ev('web', { setting: 's', value: 's' }),
  table_left: ev('web', { hands: 'n' }),
  custom_table_created: ev('web', { seats: 'n', edited: 'b' }),

  // App: tools
  ranges_viewed: ev('web', { spot: 's', seats: 'n' }),
  solver_run: ev('web', { kind: 's', street: 's', exploitability: 'n', ms: 'n' }),
  coach_opened: ev('web', { from: 's', pro: 'b' }),
  coach_asked: ev('web', { turn: 'n' }),
  coach_answered: ev('web', { ok: 'b', refused: 'b' }),

  // App: accounts
  account_prompt_viewed: ev('web', { from: 's', passkeys: 'b', email: 'b' }),
  account_skipped: ev('web', { from: 's' }),
  create_account_tapped: ev('web', { loggedOut: 's' }),
  signin_code_sent: ev('web', {}),
  account_created: ev('web', { method: 's' }),
  signed_in: ev('web', { method: 's' }),
  logged_out: ev('web', { removeLocal: 'b' }),
  sync_conflict_resolved: ev('web', { choice: 's' }),

  // App: Aced Pro
  paywall_viewed: ev('web', { from: 's' }),
  paywall_dismissed: ev('web', { from: 's' }),
  plan_selected: ev('web', { plan: 's', from: 's' }),
  paywall_cta_tapped: ev('web', { from: 's', plan: 's', remind: 'b' }),
  checkout_started: ev('web', { plan: 's', from: 's' }),
  checkout_returned: ev('web', { result: 's', plan: 's' }),
  purchase_result: ev('web', { plan: 's', ok: 'b', reason: 's' }),
  restore_tapped: ev('web', { result: 's' }),
  manage_opened: ev('web', { status: 's', plan: 's' }),
  cancel_started: ev('web', { plan: 's' }),
  cancel_reason_picked: ev('web', { reason: 's' }),
  cancel_offer_shown: ev('web', { offer: 's', reason: 's' }),
  cancel_offer_taken: ev('web', { offer: 's', reason: 's' }),
  cancel_confirmed: ev('web', { reason: 's', offer: 's' }),
  cancel_undone: ev('web', {}),
  billing_banner_shown: ev('web', { where: 's' }),
  billing_banner_tapped: ev('web', { where: 's' }),

  // Server only: things only the server knows. Money events live here, never in the app.
  subscription_started: ev('server', { plan: 's', trial: 'b' }),
  first_payment: ev('server', { plan: 's', after_trial: 'b', amount: 'n' }),
  subscription_renewed: ev('server', { plan: 's', amount: 'n' }),
  subscription_cancelled: ev('server', { plan: 's', reason: 's', offer: 's' }),
  retention_offer_taken: ev('server', { offer: 's', reason: 's' }),
  subscription_paused: ev('server', { months: 'n' }),
  subscription_resumed: ev('server', { from: 's' }),
  subscription_ended: ev('server', { plan: 's' }),
  payment_failed: ev('server', { plan: 's' }),
  payment_recovered: ev('server', { plan: 's' }),
  refund: ev('server', { amount: 'n' }),
  founding_seat_sold: ev('server', { amount: 'n' }),
  email_sent: ev('server', { kind: 's' }),
  email_unsubscribed: ev('server', { via: 's' }),
  push_sent: ev('server', { kind: 's' }),
} satisfies Record<string, EventSpec>;

export type EventName = keyof typeof EVENTS;
type Spec<N extends EventName> = (typeof EVENTS)[N]['props'];
/** The properties of an event. All are optional; undefined values are left out. */
export type EventProps<N extends EventName> = { [K in keyof Spec<N>]?: Value<Spec<N>[K] & PropType> | undefined };
export type ClientEventName = { [N in EventName]: (typeof EVENTS)[N]['from'] extends 'server' ? never : N }[EventName];
export type ServerEventName = { [N in EventName]: (typeof EVENTS)[N]['from'] extends 'server' ? N : never }[EventName];

export const isEventName = (n: unknown): n is EventName => typeof n === 'string' && Object.prototype.hasOwnProperty.call(EVENTS, n);

/** Longest tag, in characters. */
export const MAX_TAG = 80;
const TAG = /^[A-Za-z0-9_.:/,#+-]+$/;
/** Events in one batch. */
export const MAX_BATCH = 50;
/** Largest number a property may hold. */
const MAX_NUMBER = 1e9;

/**
 * Turns a free value (a utm tag, a referrer host) into a tag: lower case,
 * spaces to underscores, other characters dropped, cut to MAX_TAG.
 * Returns undefined when nothing is left.
 */
export function cleanTag(raw: unknown, max = MAX_TAG): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const out = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.:/,#+-]/g, '')
    .slice(0, max);
  return out || undefined;
}

export const validTag = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_TAG && TAG.test(v);

export interface CleanResult {
  props: Record<string, string | number | boolean>;
  /** Properties dropped for an unknown key or a bad value. */
  dropped: number;
}

/** Keeps only the properties the event allows, with values of the right kind. */
export function cleanProps(name: EventName, raw: unknown): CleanResult {
  const spec = EVENTS[name].props as Record<string, PropType>;
  const props: Record<string, string | number | boolean> = {};
  let dropped = 0;
  if (raw === undefined || raw === null) return { props, dropped };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { props, dropped: 1 };
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === undefined) continue;
    const type = Object.prototype.hasOwnProperty.call(spec, k) ? spec[k] : undefined;
    const ok =
      type === 's' ? validTag(v) : type === 'n' ? typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_NUMBER : type === 'b' ? typeof v === 'boolean' : false;
    if (ok) props[k] = type === 'n' ? Math.round((v as number) * 10_000) / 10_000 : (v as string | boolean);
    else dropped++;
  }
  return { props, dropped };
}

// The batch a browser sends --------------------------------------------------------------

export type Platform = 'ios' | 'android' | 'desktop';
export type App = 'site' | 'web';

export interface BatchContext {
  platform: Platform;
  in_app: boolean;
  standalone: boolean;
  /** Minutes to add to UTC for the player's local time (the opposite sign of getTimezoneOffset). */
  tzo: number;
}

export type Attribution = Partial<Record<AttributionKey | 'landing' | 'referrer', string>>;

export interface RawEvent {
  name: string;
  /** Milliseconds since 1970, on the device's clock. */
  at: number;
  props?: Record<string, unknown>;
}

export interface Batch {
  v: 1;
  install: string;
  session: string;
  /** A random id per batch, so a batch sent twice is stored once. */
  batch: string;
  app: App;
  ctx: BatchContext;
  attr?: Attribution;
  events: RawEvent[];
}

export interface CleanEvent {
  name: EventName;
  at: number;
  props: Record<string, string | number | boolean>;
}

export interface CleanBatch extends Omit<Batch, 'events' | 'attr'> {
  attr: Attribution;
  events: CleanEvent[];
  /** Events dropped: unknown names, server names, bad times. */
  rejected: number;
  /** Properties dropped from kept events. */
  droppedProps: number;
}

const ID = /^[A-Za-z0-9_-]{16,40}$/;
export const validId = (v: unknown): v is string => typeof v === 'string' && ID.test(v);
const PLATFORMS: readonly Platform[] = ['ios', 'android', 'desktop'];

/** How far a device clock may be from the server's before the server's time is used. */
export const CLOCK_PAST_MS = 7 * 86_400_000;
export const CLOCK_FUTURE_MS = 10 * 60_000;

/**
 * Checks a batch from a browser. Returns undefined when the envelope is bad
 * (the whole batch is refused). Bad events inside a good envelope are
 * dropped one by one and counted. Times off by more than a week (or ahead
 * by more than 10 minutes) are replaced with the server's time.
 */
export function parseBatch(raw: unknown, serverNow: number): CleanBatch | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const b = raw as Partial<Batch>;
  if (b.v !== 1 || !validId(b.install) || !validId(b.session) || !validId(b.batch)) return undefined;
  if (b.app !== 'site' && b.app !== 'web') return undefined;
  if (!Array.isArray(b.events) || b.events.length === 0 || b.events.length > MAX_BATCH) return undefined;
  const c = (b.ctx ?? {}) as Partial<BatchContext>;
  const ctx: BatchContext = {
    platform: PLATFORMS.includes(c.platform as Platform) ? (c.platform as Platform) : 'desktop',
    in_app: c.in_app === true,
    standalone: c.standalone === true,
    tzo: typeof c.tzo === 'number' && Number.isInteger(c.tzo) && Math.abs(c.tzo) <= 14 * 60 ? c.tzo : 0,
  };
  const attr: Attribution = {};
  if (b.attr && typeof b.attr === 'object') {
    for (const k of [...ATTRIBUTION_KEYS, 'landing', 'referrer'] as const) {
      const v = cleanTag((b.attr as Record<string, unknown>)[k]);
      if (v) attr[k] = v;
    }
  }
  const events: CleanEvent[] = [];
  let rejected = 0;
  let droppedProps = 0;
  for (const e of b.events) {
    const name = (e as RawEvent | undefined)?.name;
    if (!isEventName(name)) {
      rejected++;
      continue;
    }
    const from = EVENTS[name].from;
    if (from === 'server' || (from !== 'any' && from !== b.app)) {
      rejected++;
      continue;
    }
    let at = (e as RawEvent).at;
    if (typeof at !== 'number' || !Number.isFinite(at) || at < serverNow - CLOCK_PAST_MS || at > serverNow + CLOCK_FUTURE_MS) at = serverNow;
    const cleaned = cleanProps(name, (e as RawEvent).props);
    droppedProps += cleaned.dropped;
    events.push({ name, at: Math.round(at), props: cleaned.props });
  }
  return { v: 1, install: b.install, session: b.session, batch: b.batch, app: b.app, ctx, attr, events, rejected, droppedProps };
}

/** The player's local date (YYYY-MM-DD) for a moment, given minutes ahead of UTC. */
export function localDay(at: number, tzo: number): string {
  return new Date(at + tzo * 60_000).toISOString().slice(0, 10);
}

// Coarse device fields, worked out on the device -------------------------------------------

/** iPhone, Android or a computer, from the user agent. iPads that say they are Macs count as iOS. */
export function platformOf(ua: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPod/.test(ua) || (/iPad|Macintosh/.test(ua) && maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** Instagram, TikTok and other apps that open links in their own browser. */
export function inAppBrowser(ua: string): boolean {
  return /Instagram|FBAN|FBAV|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|Line\/|Twitter|Discord/.test(ua);
}

/** A referrer reduced to its host, without www. Our own hosts are left out. */
export function referrerHost(referrer: string, ownHost: string): string | undefined {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (!host || host === ownHost.replace(/^www\./, '')) return undefined;
    return cleanTag(host);
  } catch {
    return undefined;
  }
}

// Hashing, for error messages and A/B buckets ---------------------------------------------

/** FNV-1a, 32 bit. Small and stable everywhere. Not for secrets. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * An error message as an 8 character hash. Numbers, quoted text and
 * addresses are taken out first, so the same bug hashes the same way and no
 * value from the player's data can be sent. The message itself never leaves
 * the device.
 */
export function hashMessage(message: string): string {
  const normalized = message
    .replace(/https?:\/\/\S+/g, 'URL')
    .replace(/(["'`]).*?\1/g, 'S')
    .replace(/\d+(\.\d+)?/g, 'N')
    .trim()
    .slice(0, 300);
  return fnv1a(normalized).toString(16).padStart(8, '0');
}

// A/B tests -------------------------------------------------------------------------------

export interface Variant {
  id: string;
  /** Relative weight. 1 and 1 split evenly. */
  weight: number;
}

export interface Experiment {
  id: string;
  /** The first variant is the control: today's experience. */
  variants: readonly Variant[];
  /** Phones only, desktop always gets the control. */
  phonesOnly?: boolean;
  /** Off sends everyone to the control. */
  on: boolean;
}

/**
 * The site's tests (docs/research ux review, section 2.7). Run at most 2 at
 * once, each for at least 2 full weeks. The inline script in
 * apps/site/index.html buckets the same way (a test checks they agree).
 */
export const EXPERIMENTS: readonly Experiment[] = [
  { id: 'hero_cta', variants: [{ id: 'start', weight: 1 }, { id: 'daily', weight: 1 }], on: true },
  { id: 'sticky_bar', variants: [{ id: 'on', weight: 1 }, { id: 'off', weight: 1 }], phonesOnly: true, on: true },
];

/** A number from 0 to 1, the same for this install and test every time. */
export function bucket(install: string, experiment: string): number {
  return fnv1a(`${experiment}:${install}`) / 0x1_0000_0000;
}

/** The variant an install sees. Stable per install, split by weight. */
export function assign(install: string, exp: Pick<Experiment, 'id' | 'variants'>): string {
  const total = exp.variants.reduce((a, v) => a + Math.max(0, v.weight), 0);
  if (total <= 0) return exp.variants[0].id;
  let point = bucket(install, exp.id) * total;
  for (const v of exp.variants) {
    point -= Math.max(0, v.weight);
    if (point < 0) return v.id;
  }
  return exp.variants[exp.variants.length - 1].id;
}

// Sources and funnel milestones --------------------------------------------------------------

/**
 * One source per install, for the dashboard: the creator tag first, then
 * src, then ref, then the referring site, else direct.
 */
export function sourceOf(attr: Attribution): string {
  return attr.utm_source ?? attr.src ?? attr.ref ?? attr.referrer ?? 'direct';
}

/** Funnel steps, in order. Each install reaches each at most once. */
export const MILESTONES = ['visit', 'cta', 'app_open', 'onboarded', 'decision', 'lesson', 'account', 'paywall', 'trial', 'paid'] as const;
export type Milestone = (typeof MILESTONES)[number];

/** Which event marks which milestone. */
export const MILESTONE_OF: Partial<Record<EventName, Milestone>> = {
  page_view: 'visit',
  cta_click: 'cta',
  app_open: 'app_open',
  onboarding_completed: 'onboarded',
  answer_graded: 'decision',
  lesson_finished: 'lesson',
  account_created: 'account',
  paywall_viewed: 'paywall',
  subscription_started: 'trial',
  founding_seat_sold: 'paid',
  first_payment: 'paid',
};

/** A founding purchase is a trial or founding start too, for the funnel. */
export const ALSO_MILESTONE: Partial<Record<EventName, Milestone>> = { founding_seat_sold: 'trial' };
