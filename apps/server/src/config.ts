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
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
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
  };
}
