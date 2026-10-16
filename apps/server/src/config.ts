/**
 * Server settings, all from environment variables so the same build runs
 * locally and on any host. Every external service is optional: without its
 * keys the matching feature reports itself as off instead of failing.
 */
export interface Config {
  port: number;
  /** Public address of the app, used in emails and Stripe return links. */
  appUrl: string;
  /** SQLite file. Put it on a persistent disk in production. */
  databasePath: string;
  /** Built web app to serve, if present. */
  webDir?: string;
  production: boolean;
  /** Development only: return sign in codes in the API response. */
  devCodes: boolean;
  email: { resendKey?: string; from: string };
  stripe: { secretKey?: string; webhookSecret?: string; priceAnnual?: string; priceMonthly?: string; trialDays: number };
  push: { publicKey?: string; privateKey?: string; subject: string };
  /** Largest sync snapshot accepted, in bytes. */
  maxSnapshotBytes: number;
  /** The AI coach (Claude). Off when no API key is set. */
  coach: { apiKey?: string; model: string; effort: CoachEffort; dailyLimit: number };
  /**
   * Passkeys (WebAuthn). `rpId` is the domain the app's pages live on, such as
   * zacbarron.github.io; `origins` are the exact page origins allowed to use
   * them. Passkeys are off unless both are set.
   */
  webauthn: { rpId?: string; rpName: string; origins: string[] };
  /**
   * Other sites allowed to call /api from a browser (CORS), such as the
   * GitHub Pages copy of the app. Empty means same origin only.
   */
  allowedOrigins: string[];
  /**
   * Testing only: every signed in player counts as Felt Pro, so the coach and
   * other Pro checks work before purchases are open. Off unless set to true.
   */
  proForEveryone: boolean;
}

export const COACH_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type CoachEffort = (typeof COACH_EFFORTS)[number];

export function loadConfig(raw: Record<string, string | undefined> = process.env): Config {
  // Host dashboards often save a blank field as an empty string. Blank means unset.
  const env = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v.trim() !== ''));
  const production = env.NODE_ENV === 'production';
  return {
    port: Number(env.PORT ?? 8787),
    appUrl: (env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
    databasePath: env.DATABASE_PATH ?? './data/felt.sqlite',
    webDir: env.WEB_DIR,
    production,
    devCodes: !production && env.DEV_CODES !== '0',
    email: { resendKey: env.RESEND_API_KEY, from: env.EMAIL_FROM ?? 'Felt <login@example.com>' },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      priceAnnual: env.STRIPE_PRICE_ANNUAL,
      priceMonthly: env.STRIPE_PRICE_MONTHLY,
      trialDays: Number(env.TRIAL_DAYS ?? 7),
    },
    push: { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT ?? 'mailto:support@example.com' },
    maxSnapshotBytes: Number(env.MAX_SNAPSHOT_BYTES ?? 40 * 1024 * 1024),
    coach: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.COACH_MODEL ?? 'claude-opus-5-5',
      effort: COACH_EFFORTS.find((e) => e === env.COACH_EFFORT) ?? 'medium',
      dailyLimit: positiveInt(env.COACH_DAILY_LIMIT, 40),
    },
    webauthn: {
      rpId: env.WEBAUTHN_RP_ID?.trim().toLowerCase(),
      rpName: env.WEBAUTHN_RP_NAME?.trim() ?? 'Felt',
      origins: originList(env.WEBAUTHN_ORIGINS),
    },
    allowedOrigins: originList(env.ALLOWED_ORIGINS),
    proForEveryone: flag(env.PRO_FOR_EVERYONE),
  };
}

/** A comma separated list of origins, each reduced to scheme, host and port. */
function originList(raw: string | undefined): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!value) continue;
    try {
      out.add(new URL(value).origin);
    } catch {
      console.warn(`Ignoring ${value}: an origin looks like https://example.com`);
    }
  }
  return [...out];
}

/** true, 1, yes or on (any case) turn a switch on. Anything else is off. */
function flag(raw: string | undefined): boolean {
  return ['true', '1', 'yes', 'on'].includes((raw ?? '').trim().toLowerCase());
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
