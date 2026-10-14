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

describe('passkey and CORS config', () => {
  it('reads origins as a comma list and drops paths and bad entries', () => {
    const c = loadConfig({
      WEBAUTHN_RP_ID: ' Zacbarron.github.io ',
      WEBAUTHN_ORIGINS: 'https://zacbarron.github.io/Felt/, http://localhost:5173 ,,nonsense',
      ALLOWED_ORIGINS: 'https://zacbarron.github.io',
    });
    expect(c.webauthn).toEqual({ rpId: 'zacbarron.github.io', rpName: 'Felt', origins: ['https://zacbarron.github.io', 'http://localhost:5173'] });
    expect(c.allowedOrigins).toEqual(['https://zacbarron.github.io']);
  });

  it('is off when blank', () => {
    const c = loadConfig({ WEBAUTHN_RP_ID: '', WEBAUTHN_ORIGINS: ' ', ALLOWED_ORIGINS: '', WEBAUTHN_RP_NAME: 'Felt Poker' });
    expect(c.webauthn).toEqual({ rpId: undefined, rpName: 'Felt Poker', origins: [] });
    expect(c.allowedOrigins).toEqual([]);
  });
});
