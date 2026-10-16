import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, SESSION_IDLE_DAYS } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { type Db, openDb } from '../src/db.ts';
import { CHALLENGE_TTL_MS, simpleWebAuthn, type WebAuthnLib } from '../src/passkeys.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = Omit<Response, 'json'> & { json(): Promise<any> };

const config = loadConfig({
  DEV_CODES: '1',
  WEBAUTHN_RP_ID: 'felt.example',
  WEBAUTHN_ORIGINS: 'https://felt.example, https://felt.example/ignored-path',
  ALLOWED_ORIGINS: 'https://zacbarron.github.io',
});

let db: Db;
let clock: Date;
let app: ReturnType<typeof createApp>;
/** What the fake verifiers saw, and what they should answer. */
let seen: { register: Record<string, unknown>[]; login: Record<string, unknown>[] };
let nextCounter: number;
let verifyOk: boolean;

/**
 * Real option generation (it is plain data), fake verification: the tests
 * check the server's bookkeeping, not the library's cryptography.
 */
const fakeLib: WebAuthnLib = {
  ...simpleWebAuthn,
  verifyRegistrationResponse: (async (opts: Record<string, unknown>) => {
    seen.register.push(opts);
    const response = opts.response as { id: string };
    if (!verifyOk) return { verified: false };
    return {
      verified: true,
      registrationInfo: {
        fmt: 'none',
        aaguid: '00000000-0000-0000-0000-000000000000',
        credential: { id: response.id, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal', 'hybrid'] },
        credentialType: 'public-key',
        attestationObject: new Uint8Array(),
        userVerified: true,
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
        origin: 'https://felt.example',
        rpID: 'felt.example',
      },
    };
  }) as unknown as WebAuthnLib['verifyRegistrationResponse'],
  verifyAuthenticationResponse: (async (opts: Record<string, unknown>) => {
    seen.login.push(opts);
    const response = opts.response as { id: string };
    return {
      verified: verifyOk,
      authenticationInfo: {
        credentialID: response.id,
        newCounter: nextCounter,
        userVerified: true,
        credentialDeviceType: 'multiDevice',
        credentialBackedUp: true,
        origin: 'https://felt.example',
        rpID: 'felt.example',
      },
    };
  }) as unknown as WebAuthnLib['verifyAuthenticationResponse'],
};

beforeEach(() => {
  db = openDb(':memory:');
  clock = new Date('2026-10-14T15:00:00Z');
  seen = { register: [], login: [] };
  nextCounter = 1;
  verifyOk = true;
  app = createApp({ db, config, mailer: { send: async () => undefined }, webauthn: fakeLib, now: () => clock });
});

const call = (method: string, path: string, body?: unknown, token?: string, headers: Record<string, string> = {}): Promise<Res> =>
  app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as Promise<Res>;

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

/** A registration answer as the browser would send it (the fake verifier only reads the id). */
const regResponse = (id: string) => ({ id, rawId: id, type: 'public-key', response: { clientDataJSON: 'x', attestationObject: 'y' }, clientExtensionResults: {} });
const authResponse = (id: string, userHandle?: string) => ({
  id,
  rawId: id,
  type: 'public-key',
  response: { clientDataJSON: 'x', authenticatorData: 'y', signature: 'z', ...(userHandle ? { userHandle } : {}) },
  clientExtensionResults: {},
});

async function createAccount(credId = 'cred-1', name = 'Ana') {
  const { flowId, options } = await (await call('POST', '/api/passkey/register/options', { name })).json();
  const res = await call('POST', '/api/passkey/register/verify', { flowId, response: regResponse(credId) });
  return { res, options, body: await res.json() };
}

async function signInWithPasskey(credId: string, userHandle?: string) {
  const { flowId } = await (await call('POST', '/api/passkey/login/options', {})).json();
  return call('POST', '/api/passkey/login/verify', { flowId, response: authResponse(credId, userHandle) });
}

describe('passkey config', () => {
  it('reports passkeys only when an RP ID and origins are set', async () => {
    const health = await (await call('GET', '/api/health')).json();
    expect(health.features).toMatchObject({ accounts: true, email: true, passkeys: true });
    expect(config.webauthn.origins).toEqual(['https://felt.example']);

    const bare = createApp({ db, config: loadConfig({ NODE_ENV: 'production', WEBAUTHN_RP_ID: 'felt.example' }), mailer: { send: async () => undefined } });
    const off = (await (await bare.request('/api/health')).json()) as { features: unknown };
    expect(off.features).toMatchObject({ accounts: false, email: false, passkeys: false });
    expect((await bare.request('/api/passkey/login/options', { method: 'POST' })).status).toBe(503);

    const passkeyOnly = createApp({
      db,
      config: loadConfig({ NODE_ENV: 'production', WEBAUTHN_RP_ID: 'felt.example', WEBAUTHN_ORIGINS: 'https://felt.example' }),
      mailer: { send: async () => undefined },
    });
    expect(((await (await passkeyOnly.request('/api/health')).json()) as { features: unknown }).features).toMatchObject({ accounts: true, email: false, passkeys: true });
    expect((await passkeyOnly.request('/api/auth/start', { method: 'POST', body: JSON.stringify({ email: 'a@b.co' }) })).status).toBe(503);
  });
});

describe('passkey sign up', () => {
  it('offers discoverable, user verifying options for this site', async () => {
    const { flowId, options } = await (await call('POST', '/api/passkey/register/options', { name: 'Ana' })).json();
    expect(typeof flowId).toBe('string');
    expect(options.rp).toEqual({ name: 'Suited', id: 'felt.example' });
    expect(options.user.name).toBe('Ana');
    expect(options.authenticatorSelection).toMatchObject({ residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' });
    expect(options.attestation).toBe('none');
    expect(options.challenge.length).toBeGreaterThan(20);
    expect(options.excludeCredentials).toEqual([]);
    expect(options.timeout).toBe(CHALLENGE_TTL_MS);
  });

  it('creates a new account without an email and signs it in', async () => {
    const { res, options, body } = await createAccount('cred-1');
    expect(res.status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.user).toMatchObject({ email: null, passkeys: 1 });
    // The library checked the right challenge, origins and site.
    expect(seen.register[0]).toMatchObject({ expectedChallenge: options.challenge, expectedOrigin: ['https://felt.example'], expectedRPID: 'felt.example' });
    // The WebAuthn user handle is the account id.
    expect(Buffer.from(options.user.id, 'base64url').toString('utf8')).toBe(body.user.id);
    expect((await call('GET', '/api/me', undefined, body.token)).status).toBe(200);
    const row = db.prepare('SELECT * FROM passkeys WHERE id = ?').get('cred-1') as { user_id: string; transports: string; backed_up: number };
    expect(row).toMatchObject({ user_id: body.user.id, transports: '["internal","hybrid"]', backed_up: 1 });
  });

  it('uses a challenge once and refuses it after it expires', async () => {
    const { flowId } = await (await call('POST', '/api/passkey/register/options', {})).json();
    expect((await call('POST', '/api/passkey/register/verify', { flowId, response: regResponse('cred-a') })).status).toBe(200);
    // Replaying the same flow fails: the challenge is gone.
    const replay = await call('POST', '/api/passkey/register/verify', { flowId, response: regResponse('cred-b') });
    expect(replay.status).toBe(400);
    expect(seen.register).toHaveLength(1);

    const late = await (await call('POST', '/api/passkey/register/options', {})).json();
    clock = new Date(clock.getTime() + CHALLENGE_TTL_MS + 1000);
    const expired = await call('POST', '/api/passkey/register/verify', { flowId: late.flowId, response: regResponse('cred-c') });
    expect(expired.status).toBe(400);
    expect((await expired.json()).error).toMatch(/too long/);
    expect(seen.register).toHaveLength(1);
  });

  it('does not create an account when verification fails, and burns the challenge', async () => {
    verifyOk = false;
    const { flowId } = await (await call('POST', '/api/passkey/register/options', {})).json();
    expect((await call('POST', '/api/passkey/register/verify', { flowId, response: regResponse('cred-x') })).status).toBe(400);
    expect((db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n).toBe(0);
    verifyOk = true;
    expect((await call('POST', '/api/passkey/register/verify', { flowId, response: regResponse('cred-x') })).status).toBe(400);
  });

  it('links another passkey to the signed in account', async () => {
    const first = await createAccount('cred-1');
    const token = first.body.token as string;
    const opts = await (await call('POST', '/api/passkey/register/options', {}, token)).json();
    // The passkey already saved is excluded, so the same authenticator is not registered twice.
    expect(opts.options.excludeCredentials.map((c: { id: string }) => c.id)).toEqual(['cred-1']);
    expect(Buffer.from(opts.options.user.id, 'base64url').toString('utf8')).toBe(first.body.user.id);

    // Someone without that session cannot finish the link.
    expect((await call('POST', '/api/passkey/register/verify', { flowId: opts.flowId, response: regResponse('cred-2') })).status).toBe(401);

    const again = await (await call('POST', '/api/passkey/register/options', {}, token)).json();
    const res = await call('POST', '/api/passkey/register/verify', { flowId: again.flowId, response: regResponse('cred-2') }, token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeUndefined();
    expect(body.user).toMatchObject({ id: first.body.user.id, passkeys: 2 });
    expect((db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n).toBe(1);
    // A passkey already on an account cannot be saved twice.
    const dup = await (await call('POST', '/api/passkey/register/options', {}, token)).json();
    expect((await call('POST', '/api/passkey/register/verify', { flowId: dup.flowId, response: regResponse('cred-1') }, token)).status).toBe(409);
  });

  it('links a passkey to an email account', async () => {
    const start = await (await call('POST', '/api/auth/start', { email: 'ana@example.com' })).json();
    const { token, user } = await (await call('POST', '/api/auth/verify', { email: 'ana@example.com', code: start.devCode })).json();
    expect(user.passkeys).toBe(0);
    const { flowId, options } = await (await call('POST', '/api/passkey/register/options', { name: 'ignored' }, token)).json();
    expect(options.user.name).toBe('ana@example.com');
    const linked = await (await call('POST', '/api/passkey/register/verify', { flowId, response: regResponse('cred-e') }, token)).json();
    expect(linked.user).toMatchObject({ email: 'ana@example.com', passkeys: 1 });
    const res = await signInWithPasskey('cred-e', b64url(user.id));
    expect((await res.json()).user.email).toBe('ana@example.com');
  });
});

describe('passkey sign in', () => {
  it('signs in with a known passkey and stores the new counter', async () => {
    const { body } = await createAccount('cred-1');
    const { flowId, options } = await (await call('POST', '/api/passkey/login/options', {})).json();
    // No username needed: the browser offers its discoverable passkeys.
    expect(options).toMatchObject({ rpId: 'felt.example', allowCredentials: [], userVerification: 'preferred' });
    nextCounter = 7;
    const res = await call('POST', '/api/passkey/login/verify', { flowId, response: authResponse('cred-1', b64url(body.user.id)) });
    expect(res.status).toBe(200);
    const signedIn = await res.json();
    expect(signedIn.user.id).toBe(body.user.id);
    expect(signedIn.token).not.toBe(body.token);
    expect(seen.login[0]).toMatchObject({ expectedChallenge: options.challenge, expectedRPID: 'felt.example', credential: { id: 'cred-1', counter: 0 } });
    const row = db.prepare('SELECT counter, last_used FROM passkeys WHERE id = ?').get('cred-1') as { counter: number; last_used: string };
    expect(row.counter).toBe(7);

    // The next sign in checks against the stored counter.
    clock = new Date(clock.getTime() + 60_000);
    nextCounter = 8;
    expect((await signInWithPasskey('cred-1')).status).toBe(200);
    expect(seen.login[1]).toMatchObject({ credential: { counter: 7 } });
    expect((db.prepare('SELECT last_used FROM passkeys WHERE id = ?').get('cred-1') as { last_used: string }).last_used).toBe(clock.toISOString());
  });

  it('says plainly when a passkey is unknown, so the browser can forget it', async () => {
    const res = await signInWithPasskey('no-such-cred');
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ unknownCredential: true, credentialId: 'no-such-cred' });
    expect(seen.login).toHaveLength(0);
  });

  it('refuses a passkey whose user handle names another account', async () => {
    await createAccount('cred-1');
    expect((await signInWithPasskey('cred-1', b64url('someone-else'))).status).toBe(400);
  });

  it('refuses a failed verification and a reused or expired challenge', async () => {
    await createAccount('cred-1');
    verifyOk = false;
    expect((await signInWithPasskey('cred-1')).status).toBe(400);
    verifyOk = true;

    const { flowId } = await (await call('POST', '/api/passkey/login/options', {})).json();
    expect((await call('POST', '/api/passkey/login/verify', { flowId, response: authResponse('cred-1') })).status).toBe(200);
    expect((await call('POST', '/api/passkey/login/verify', { flowId, response: authResponse('cred-1') })).status).toBe(400);

    const late = await (await call('POST', '/api/passkey/login/options', {})).json();
    clock = new Date(clock.getTime() + CHALLENGE_TTL_MS + 1);
    expect((await call('POST', '/api/passkey/login/verify', { flowId: late.flowId, response: authResponse('cred-1') })).status).toBe(400);
    // A registration flow cannot be used to sign in.
    const reg = await (await call('POST', '/api/passkey/register/options', {})).json();
    expect((await call('POST', '/api/passkey/login/verify', { flowId: reg.flowId, response: authResponse('cred-1') })).status).toBe(400);
  });

  it('cleans up expired challenges', async () => {
    for (let i = 0; i < 3; i++) await call('POST', '/api/passkey/login/options', {});
    clock = new Date(clock.getTime() + CHALLENGE_TTL_MS + 1);
    await call('POST', '/api/passkey/login/options', {});
    expect((db.prepare('SELECT COUNT(*) AS n FROM webauthn_challenges').get() as { n: number }).n).toBe(1);
  });
});

describe('managing passkeys and email', () => {
  it('lists passkeys and never removes the last way in', async () => {
    const { body } = await createAccount('cred-1');
    const token = body.token as string;
    const list = await (await call('GET', '/api/passkeys', undefined, token)).json();
    expect(list.passkeys).toEqual([{ id: 'cred-1', createdAt: clock.toISOString(), lastUsed: clock.toISOString(), backedUp: true }]);
    expect((await call('DELETE', '/api/passkeys/cred-1', undefined, token)).status).toBe(409);
    expect((await call('GET', '/api/passkeys')).status).toBe(401);

    const opts = await (await call('POST', '/api/passkey/register/options', {}, token)).json();
    await call('POST', '/api/passkey/register/verify', { flowId: opts.flowId, response: regResponse('cred-2') }, token);
    const removed = await call('DELETE', '/api/passkeys/cred-1', undefined, token);
    expect(removed.status).toBe(200);
    expect((await removed.json()).user.passkeys).toBe(1);
    expect((await signInWithPasskey('cred-1')).status).toBe(404);
  });

  it('adds an email to a passkey account with a code', async () => {
    const { body } = await createAccount('cred-1');
    const token = body.token as string;
    expect((await call('POST', '/api/me/email/start', { email: 'ana@example.com' })).status).toBe(401);
    const start = await (await call('POST', '/api/me/email/start', { email: 'Ana@Example.com' }, token)).json();
    expect((await call('POST', '/api/me/email/verify', { email: 'ana@example.com', code: '00000x' }, token)).status).toBe(400);
    const res = await call('POST', '/api/me/email/verify', { email: 'ana@example.com', code: start.devCode }, token);
    expect(res.status).toBe(200);
    expect((await res.json()).user).toMatchObject({ id: body.user.id, email: 'ana@example.com', passkeys: 1 });

    // Now the email code signs in to the same account.
    const again = await (await call('POST', '/api/auth/start', { email: 'ana@example.com' })).json();
    const viaEmail = await (await call('POST', '/api/auth/verify', { email: 'ana@example.com', code: again.devCode })).json();
    expect(viaEmail.user.id).toBe(body.user.id);
  });

  it('will not take an email another account uses', async () => {
    const start = await (await call('POST', '/api/auth/start', { email: 'taken@example.com' })).json();
    await call('POST', '/api/auth/verify', { email: 'taken@example.com', code: start.devCode });
    const { body } = await createAccount('cred-1');
    expect((await call('POST', '/api/me/email/start', { email: 'taken@example.com' }, body.token)).status).toBe(409);
  });

  it('deletes passkeys with the account', async () => {
    const { body } = await createAccount('cred-1');
    expect((await call('DELETE', '/api/me', undefined, body.token)).status).toBe(200);
    expect((db.prepare('SELECT COUNT(*) AS n FROM passkeys').get() as { n: number }).n).toBe(0);
  });
});

describe('sessions', () => {
  it('stay signed in while used and end after a long idle stretch', async () => {
    const { body } = await createAccount('cred-1');
    const token = body.token as string;
    // Used every 100 days: the session keeps renewing.
    for (let i = 0; i < 3; i++) {
      clock = new Date(clock.getTime() + 100 * 86_400_000);
      expect((await call('GET', '/api/me', undefined, token)).status).toBe(200);
    }
    expect(SESSION_IDLE_DAYS).toBeGreaterThanOrEqual(90);
    clock = new Date(clock.getTime() + (SESSION_IDLE_DAYS + 1) * 86_400_000);
    expect((await call('GET', '/api/me', undefined, token)).status).toBe(401);
    expect((db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n).toBe(0);
  });

  it('logs out one device without touching the others', async () => {
    const a = (await createAccount('cred-1')).body.token as string;
    const b = await (await signInWithPasskey('cred-1')).json();
    expect((await call('POST', '/api/auth/logout', {}, a)).status).toBe(200);
    expect((await call('GET', '/api/me', undefined, a)).status).toBe(401);
    expect((await call('GET', '/api/me', undefined, b.token)).status).toBe(200);
  });
});

describe('CORS', () => {
  it('lets listed sites call the API with a bearer token', async () => {
    const pre = await app.request('/api/sync', {
      method: 'OPTIONS',
      headers: { Origin: 'https://zacbarron.github.io', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization, content-type' },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('https://zacbarron.github.io');
    expect(pre.headers.get('Access-Control-Allow-Headers')?.toLowerCase()).toContain('authorization');
    expect(pre.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
    expect(pre.headers.get('Access-Control-Allow-Credentials')).toBeNull();

    const res = await app.request('/api/health', { headers: { Origin: 'https://zacbarron.github.io' } });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://zacbarron.github.io');
    expect(res.headers.get('Vary')).toContain('Origin');
  });

  it('gives other sites no access', async () => {
    const res = await app.request('/api/health', { headers: { Origin: 'https://evil.example' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const pre = await app.request('/api/me', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' } });
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('is off by default: same origin only', async () => {
    const plain = createApp({ db, config: loadConfig({ DEV_CODES: '1' }), mailer: { send: async () => undefined } });
    const res = await plain.request('/api/health', { headers: { Origin: 'https://zacbarron.github.io' } });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
