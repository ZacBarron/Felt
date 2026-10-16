import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  sendSignal,
  startAuthentication,
  startRegistration,
  WebAuthnAbortService,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { api, ApiError, apiBase, currentSession, type ServerUser, type Session, setSession, updateSessionUser } from './api';
import { clearDeviceData, requestPersistentStorage } from './backup';
import { track } from './events';
import { firstSync, rememberAccount, resetSync, saveNow } from './sync';

/**
 * Accounts on the Suited server: passkeys first (Face ID, a fingerprint or a
 * device PIN, nothing to remember), an emailed code as the fallback. A
 * passkey account needs no email; one can be added later for recovery and
 * receipts. Pages call these and show the result; nothing here renders.
 */

export const passkeysSupported = () => {
  try {
    return browserSupportsWebAuthn();
  } catch {
    return false;
  }
};

/** Whether passkeys can appear in the browser's autofill list on an email field. */
export const passkeyAutofillSupported = () => browserSupportsWebAuthnAutofill().catch(() => false);

/** Stops a passkey prompt that is waiting, such as autofill when leaving a screen. */
export const cancelPasskeyPrompt = () => {
  try {
    WebAuthnAbortService.cancelCeremony();
  } catch {
    // Nothing waiting.
  }
};

/** The player cancelled or the prompt was replaced: not an error worth showing. */
export class Cancelled extends Error {}

/**
 * Plain words for what went wrong in a passkey prompt. Returns Cancelled
 * when the player closed the prompt, so pages can stay quiet.
 */
function passkeyError(e: unknown, mode: 'create' | 'signin'): Error {
  if (e instanceof ApiError) return e;
  const code = e instanceof WebAuthnError ? e.code : undefined;
  const name = e instanceof WebAuthnError ? (e.cause as { name?: string } | undefined)?.name ?? e.name : (e as { name?: string } | undefined)?.name;
  if (code === 'ERROR_CEREMONY_ABORTED' || name === 'AbortError') return new Cancelled('Cancelled.');
  if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || name === 'InvalidStateError')
    return new Error('This device already has a passkey for your Suited account.');
  if (code === 'ERROR_INVALID_DOMAIN' || code === 'ERROR_INVALID_RP_ID' || name === 'SecurityError')
    return new Error('Passkeys do not work on this address yet. Use an email code instead.');
  if (name === 'NotSupportedError' || code === 'ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT')
    return new Error('This device cannot save a passkey. Use an email code instead.');
  if (name === 'NotAllowedError')
    return mode === 'create'
      ? new Cancelled('No passkey was saved.')
      : new Cancelled('No passkey was used.');
  return new Error(mode === 'create' ? 'Suited could not save a passkey. Try again.' : 'Suited could not sign you in with a passkey. Try again.');
}

// Passkeys ------------------------------------------------------------------------

/** Creates a new account with a passkey. `name` labels it in the passkey manager. */
export async function createPasskeyAccount(name?: string): Promise<Session> {
  const { flowId, options } = await api<{ flowId: string; options: PublicKeyCredentialCreationOptionsJSON }>('/passkey/register/options', {
    body: { name: name?.trim() || undefined },
  });
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (e) {
    throw passkeyError(e, 'create');
  }
  return api<Session>('/passkey/register/verify', { body: { flowId, response } });
}

/** Adds one more passkey to the signed in account, such as one on a second device. */
export async function addPasskey(): Promise<ServerUser> {
  const token = currentSession()?.token;
  const { flowId, options } = await api<{ flowId: string; options: PublicKeyCredentialCreationOptionsJSON }>('/passkey/register/options', { body: {} });
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (e) {
    throw passkeyError(e, 'create');
  }
  const { user } = await api<{ user: ServerUser }>('/passkey/register/verify', { body: { flowId, response } });
  if (token) updateSessionUser(token, user);
  return user;
}

/**
 * Signs in with any passkey this device holds for Suited. With `autofill`,
 * the request waits quietly for the player to pick a passkey from the
 * browser's suggestions on an email field (conditional mediation).
 */
export async function signInWithPasskey({ autofill = false }: { autofill?: boolean } = {}): Promise<Session> {
  const { flowId, options } = await api<{ flowId: string; options: PublicKeyCredentialRequestOptionsJSON }>('/passkey/login/options', { body: {} });
  let response;
  try {
    response = await startAuthentication({ optionsJSON: options, useBrowserAutofill: autofill });
  } catch (e) {
    throw passkeyError(e, 'signin');
  }
  try {
    return await api<Session>('/passkey/login/verify', { body: { flowId, response } });
  } catch (e) {
    // The server no longer knows this passkey: ask the browser to stop offering it.
    if (e instanceof ApiError && e.body.unknownCredential && options.rpId) {
      void sendSignal({ signalName: 'unknownCredential', rpID: options.rpId, credentialID: response.id }).catch(() => undefined);
    }
    throw e;
  }
}

// Email codes ------------------------------------------------------------------------

export const sendEmailCode = (email: string) => api<{ devCode?: string }>('/auth/start', { body: { email } });
export const verifyEmailCode = (email: string, code: string) => api<Session>('/auth/verify', { body: { email, code } });

/** Adds an email to the signed in account: a code first, then the code back. */
export const sendAddEmailCode = (email: string) => api<{ devCode?: string }>('/me/email/start', { body: { email } });
export async function verifyAddEmail(email: string, code: string): Promise<ServerUser> {
  const token = currentSession()?.token;
  const { user } = await api<{ user: ServerUser }>('/me/email/verify', { body: { email, code } });
  if (token) updateSessionUser(token, user);
  return user;
}

// Signing in and out -------------------------------------------------------------------

export type SyncOutcome = 'pushed' | 'pulled' | 'same' | 'choose' | 'offline';

/**
 * Starts a session and brings this device and the account in step:
 * an empty account gets this device's progress, an empty device gets the
 * account's, and when both have progress the player chooses.
 */
export async function completeSignIn(session: Session, how: 'passkey' | 'email', created = false): Promise<SyncOutcome> {
  resetSync();
  setSession(session);
  track(created ? 'account_created' : 'signed_in', { method: how });
  // Progress worth an account is worth keeping: ask the browser not to clear it.
  void requestPersistentStorage();
  try {
    const outcome = await firstSync();
    if (outcome === 'pulled') markOnboardedFromSync();
    return outcome;
  } catch {
    return 'offline';
  }
}

/**
 * After the account's copy replaced this device's: someone who studied
 * there does not see onboarding again here.
 */
export function markOnboardedFromSync() {
  try {
    const raw = localStorage.getItem('felt.settings.v1');
    const saved = raw ? (JSON.parse(raw) as { profile?: { onboarded?: boolean } }) : {};
    if (saved.profile?.onboarded) return;
    localStorage.setItem('felt.settings.v1', JSON.stringify({ ...saved, profile: { goals: [], focus: [], dailyMinutes: 10, ...saved.profile, onboarded: true } }));
  } catch {
    // Storage blocked: onboarding may show once, nothing is lost.
  }
}

export type SaveResult = Awaited<ReturnType<typeof saveNow>>;

/**
 * Logs this device out. The device keeps its copy and works offline as a
 * guest, unless `removeLocal` is set (for a shared phone), which clears
 * Suited from this device. Clearing is only allowed after a save worked.
 */
export async function logOut({ removeLocal = false, saved = false }: { removeLocal?: boolean; saved?: boolean } = {}) {
  if (removeLocal && !saved) throw new Error('Save your progress before removing it from this device.');
  // Ending the session on the server is best effort: offline, the token is simply forgotten here.
  const s = currentSession();
  if (s && !removeLocal) rememberAccount(s.user.id);
  // Forget the session here first, so nothing still running can act as this account.
  setSession(null);
  resetSync();
  if (s) void endServerSession(s.token);
  track('logged_out', { removeLocal });
  if (removeLocal) await clearDeviceData();
}

/** Ends a session on the server. Best effort: offline, the token is simply forgotten on this device. */
async function endServerSession(token: string) {
  await fetch(`${apiBase()}/api/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' }).catch(() => undefined);
}
