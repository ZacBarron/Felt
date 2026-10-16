import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { Context, Hono } from 'hono';
import type { Config } from './config.ts';
import { type Db, tx } from './db.ts';
import { newId } from './services.ts';

/**
 * Passkeys (WebAuthn): sign up and sign in with Face ID, a fingerprint or a
 * device PIN, and no password. Credentials are discoverable (resident keys),
 * so signing in needs no username: the browser offers the passkeys it holds
 * for this site. Challenges live on the server, expire after a few minutes
 * and are deleted the moment they are used, so a response cannot be replayed.
 */

/** The library calls, injectable so tests do not need a real authenticator. */
export interface WebAuthnLib {
  generateRegistrationOptions: typeof generateRegistrationOptions;
  verifyRegistrationResponse: typeof verifyRegistrationResponse;
  generateAuthenticationOptions: typeof generateAuthenticationOptions;
  verifyAuthenticationResponse: typeof verifyAuthenticationResponse;
}

export const simpleWebAuthn: WebAuthnLib = {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
};

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const passkeysReady = (config: Config) => !!config.webauthn.rpId && config.webauthn.origins.length > 0;

interface ChallengeRow {
  id: string;
  challenge: string;
  kind: 'register' | 'login';
  user_id: string | null;
  existing: number;
  label: string | null;
  expires_at: string;
}

interface PasskeyRow {
  id: string;
  user_id: string;
  public_key: Uint8Array;
  counter: number;
  transports: string | null;
  device_type: string | null;
  backed_up: number;
  created_at: string;
  last_used: string | null;
}

/** What the passkey routes need from the app around them. */
export interface PasskeyContext {
  db: Db;
  config: Config;
  lib: WebAuthnLib;
  now: () => Date;
  /** The signed in user for this request, if any (the bearer token is optional here). */
  userFor: (c: Context) => { id: string; email: string | null } | undefined;
  /** Creates a session and returns the token and the user as the app shows it. */
  signIn: (userId: string) => { token: string; user: unknown };
  userJson: (userId: string) => unknown;
}

const UNAVAILABLE = 'Passkeys are not set up on this server.';

/** The WebAuthn user handle: the account id as bytes. */
const userHandle = (userId: string) => new Uint8Array(Buffer.from(userId, 'utf8'));

async function body<T>(c: Context): Promise<Partial<T>> {
  try {
    return (await c.req.json()) as Partial<T>;
  } catch {
    return {};
  }
}

export function mountPasskeys(app: Hono<any>, ctx: PasskeyContext) {
  const { db, config, lib, now } = ctx;
  const iso = () => now().toISOString();
  const rpID = () => config.webauthn.rpId!;

  /** Stores a challenge and returns the id the browser sends back with its answer. */
  const saveChallenge = (row: Omit<ChallengeRow, 'id' | 'expires_at'>) => {
    const id = newId();
    tx(db, () => {
      db.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').run(iso());
      db.prepare('INSERT INTO webauthn_challenges (id, challenge, kind, user_id, existing, label, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id,
        row.challenge,
        row.kind,
        row.user_id,
        row.existing,
        row.label,
        new Date(now().getTime() + CHALLENGE_TTL_MS).toISOString(),
      );
    });
    return id;
  };

  /** Takes a challenge out of the store: it works once, whatever happens next. */
  const takeChallenge = (id: unknown, kind: ChallengeRow['kind']): ChallengeRow | 'expired' | undefined => {
    if (typeof id !== 'string') return undefined;
    const row = tx(db, () => {
      const r = db.prepare('SELECT * FROM webauthn_challenges WHERE id = ? AND kind = ?').get(id, kind) as ChallengeRow | undefined;
      if (r) db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(id);
      return r;
    });
    if (!row) return undefined;
    if (Date.parse(row.expires_at) < now().getTime()) return 'expired';
    return row;
  };

  const passkeysOf = (userId: string) => db.prepare('SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at').all(userId) as unknown as PasskeyRow[];

  // Registration: a new account, or one more passkey on the signed in account -------------

  app.post('/api/passkey/register/options', async (c) => {
    if (!passkeysReady(config)) return c.json({ error: UNAVAILABLE }, 503);
    const signedIn = ctx.userFor(c);
    const { name } = await body<{ name: string }>(c);
    // Shown in the passkey manager next to "Suited". The email when there is one, else the player's name.
    const userId = signedIn?.id ?? newId();
    // Without a name, a short code from the account keeps several accounts apart in the passkey picker.
    const fallback = `Suited player ${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}`;
    const label = (signedIn?.email ?? (typeof name === 'string' && name.trim() ? name.trim().slice(0, 64) : fallback)).slice(0, 64);
    const existing = signedIn ? passkeysOf(signedIn.id) : [];
    const options = await lib.generateRegistrationOptions({
      rpName: config.webauthn.rpName,
      rpID: rpID(),
      userName: label,
      userDisplayName: label,
      userID: userHandle(userId),
      timeout: CHALLENGE_TTL_MS,
      attestationType: 'none',
      // Discoverable credentials: sign in later needs no username.
      authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred' },
      excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports ? (JSON.parse(p.transports) as string[]) : undefined })),
    });
    const flowId = saveChallenge({ challenge: options.challenge, kind: 'register', user_id: userId, existing: signedIn ? 1 : 0, label });
    return c.json({ flowId, options });
  });

  app.post('/api/passkey/register/verify', async (c) => {
    if (!passkeysReady(config)) return c.json({ error: UNAVAILABLE }, 503);
    const { flowId, response } = await body<{ flowId: string; response: RegistrationResponseJSON }>(c);
    const flow = takeChallenge(flowId, 'register');
    if (flow === 'expired') return c.json({ error: 'That took too long. Try again.' }, 400);
    if (!flow || !response || typeof response !== 'object') return c.json({ error: 'Start again to create a passkey.' }, 400);
    const signedIn = ctx.userFor(c);
    // Adding a passkey to an account needs that same account to finish the job.
    if (flow.existing && signedIn?.id !== flow.user_id) return c.json({ error: 'Sign in first.' }, 401);

    let verification: Awaited<ReturnType<WebAuthnLib['verifyRegistrationResponse']>>;
    try {
      verification = await lib.verifyRegistrationResponse({
        response,
        expectedChallenge: flow.challenge,
        expectedOrigin: config.webauthn.origins,
        expectedRPID: rpID(),
        requireUserVerification: false,
      });
    } catch (e) {
      console.warn('Passkey registration failed', e);
      return c.json({ error: 'Suited could not check that passkey. Try again.' }, 400);
    }
    if (!verification.verified) return c.json({ error: 'Suited could not check that passkey. Try again.' }, 400);
    const info = verification.registrationInfo;
    const cred = info.credential;
    if (db.prepare('SELECT 1 FROM passkeys WHERE id = ?').get(cred.id)) return c.json({ error: 'This passkey is already saved to a Suited account.' }, 409);

    const userId = flow.user_id!;
    tx(db, () => {
      if (!flow.existing) db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, NULL, ?)').run(userId, iso());
      db.prepare(
        'INSERT INTO passkeys (id, user_id, public_key, counter, transports, device_type, backed_up, created_at, last_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        cred.id,
        userId,
        cred.publicKey,
        cred.counter,
        cred.transports ? JSON.stringify(cred.transports) : null,
        info.credentialDeviceType,
        info.credentialBackedUp ? 1 : 0,
        iso(),
        iso(),
      );
    });
    if (flow.existing) return c.json({ ok: true, user: ctx.userJson(userId) });
    return c.json(ctx.signIn(userId));
  });

  // Sign in: the browser offers this site's passkeys, no username needed ----------------------

  app.post('/api/passkey/login/options', async (c) => {
    if (!passkeysReady(config)) return c.json({ error: UNAVAILABLE }, 503);
    const options = await lib.generateAuthenticationOptions({ rpID: rpID(), userVerification: 'preferred', allowCredentials: [], timeout: CHALLENGE_TTL_MS });
    const flowId = saveChallenge({ challenge: options.challenge, kind: 'login', user_id: null, existing: 0, label: null });
    return c.json({ flowId, options });
  });

  app.post('/api/passkey/login/verify', async (c) => {
    if (!passkeysReady(config)) return c.json({ error: UNAVAILABLE }, 503);
    const { flowId, response } = await body<{ flowId: string; response: AuthenticationResponseJSON }>(c);
    const flow = takeChallenge(flowId, 'login');
    if (flow === 'expired') return c.json({ error: 'That took too long. Try again.' }, 400);
    if (!flow || !response || typeof response !== 'object' || typeof response.id !== 'string')
      return c.json({ error: 'Start again to sign in with a passkey.' }, 400);

    const row = db.prepare('SELECT * FROM passkeys WHERE id = ?').get(response.id) as PasskeyRow | undefined;
    // The browser can be told to forget a passkey the server no longer knows (unknownCredential).
    if (!row)
      return c.json({ error: 'This passkey is not linked to a Suited account. It may have been removed.', unknownCredential: true, credentialId: response.id }, 404);
    const handle = response.response?.userHandle;
    if (handle && handle !== Buffer.from(userHandle(row.user_id)).toString('base64url'))
      return c.json({ error: 'This passkey does not match its account.' }, 400);

    let verification: Awaited<ReturnType<WebAuthnLib['verifyAuthenticationResponse']>>;
    try {
      verification = await lib.verifyAuthenticationResponse({
        response,
        expectedChallenge: flow.challenge,
        expectedOrigin: config.webauthn.origins,
        expectedRPID: rpID(),
        credential: {
          id: row.id,
          publicKey: new Uint8Array(row.public_key),
          counter: row.counter,
          transports: row.transports ? (JSON.parse(row.transports) as never) : undefined,
        },
        requireUserVerification: false,
      });
    } catch (e) {
      console.warn('Passkey sign in failed', e);
      return c.json({ error: 'Suited could not check that passkey. Try again.' }, 400);
    }
    if (!verification.verified) return c.json({ error: 'Suited could not check that passkey. Try again.' }, 400);
    const info = verification.authenticationInfo;
    db.prepare('UPDATE passkeys SET counter = ?, backed_up = ?, device_type = ?, last_used = ? WHERE id = ?').run(
      info.newCounter,
      info.credentialBackedUp ? 1 : 0,
      info.credentialDeviceType,
      iso(),
      row.id,
    );
    return c.json(ctx.signIn(row.user_id));
  });

  // The signed in player's passkeys -------------------------------------------------------

  app.get('/api/passkeys', (c) => {
    const u = ctx.userFor(c);
    if (!u) return c.json({ error: 'Sign in first.' }, 401);
    return c.json({
      passkeys: passkeysOf(u.id).map((p) => ({ id: p.id, createdAt: p.created_at, lastUsed: p.last_used, backedUp: !!p.backed_up })),
    });
  });

  app.delete('/api/passkeys/:id', (c) => {
    const u = ctx.userFor(c);
    if (!u) return c.json({ error: 'Sign in first.' }, 401);
    const keys = passkeysOf(u.id);
    if (!keys.some((p) => p.id === c.req.param('id'))) return c.json({ error: 'That passkey is not on this account.' }, 404);
    // Never remove the last way in.
    if (keys.length === 1 && !u.email) return c.json({ error: 'Add an email or another passkey first. This is your only way to sign in.' }, 409);
    db.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').run(c.req.param('id'), u.id);
    return c.json({ ok: true, user: ctx.userJson(u.id) });
  });
}
