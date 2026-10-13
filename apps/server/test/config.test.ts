import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

describe('config', () => {
  it('uses defaults when nothing is set', () => {
    const c = loadConfig({});
    expect(c.port).toBe(8787);
    expect(c.databasePath).toBe('./data/felt.sqlite');
    expect(c.production).toBe(false);
    expect(c.devCodes).toBe(true);
  });

  it('treats blank values as unset', () => {
    const c = loadConfig({ NODE_ENV: 'production', EMAIL_FROM: '', VAPID_SUBJECT: ' ', RESEND_API_KEY: '', STRIPE_SECRET_KEY: '', PORT: '' });
    expect(c.email).toEqual({ resendKey: undefined, from: 'Felt <login@example.com>' });
    expect(c.push.subject).toBe('mailto:support@example.com');
    expect(c.stripe.secretKey).toBeUndefined();
    expect(c.port).toBe(8787);
  });

  it('never returns sign in codes in production', () => {
    expect(loadConfig({ NODE_ENV: 'production', DEV_CODES: '1' }).devCodes).toBe(false);
  });

  it('drops a trailing slash from the app address', () => {
    expect(loadConfig({ APP_URL: 'https://felt.example.com/' }).appUrl).toBe('https://felt.example.com');
  });
});
