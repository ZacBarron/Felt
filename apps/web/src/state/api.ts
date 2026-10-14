import { useSyncExternalStore } from 'react';

/**
 * The Felt server is optional: the app works fully offline and on a static
 * host. When a server answers on /api (or VITE_API_URL), accounts, sync,
 * purchases, reminders, leagues and daily stats switch on.
 */

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const SESSION_KEY = 'felt.session.v1';

export interface ServerFeatures {
  accounts: boolean;
  billing: boolean;
  push: boolean;
  /** The AI coach for Felt Pro players. Older servers leave it out, which reads as off. */
  coach: boolean;
}

export interface ServerAccess {
  pro: boolean;
  until: string | null;
  plan: string | null;
  trialing: boolean;
}

export interface ServerUser {
  id: string;
  email: string;
  handle: string | null;
  tz: string | null;
  cueMinutes: number | null;
  reminders: boolean;
  leagues: boolean;
  lastStudyDay: string | null;
  access: ServerAccess;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

// Session store --------------------------------------------------------------

interface Session {
  token: string;
  user: ServerUser;
}

let session: Session | null = readSession();
const listeners = new Set<() => void>();

function readSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
  } catch {
    return null;
  }
}

export function setSession(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: signed in for this visit only.
  }
  listeners.forEach((l) => l());
}

export const currentSession = () => session;

export function useSession(): Session | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}

// Requests -------------------------------------------------------------------

export async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20_000);
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status === 401 && session) setSession(null);
    if (!res.ok) throw new ApiError(typeof body.error === 'string' ? body.error : `The server answered ${res.status}.`, res.status, body);
    return body as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('Could not reach the Felt server. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}

// Feature detection -----------------------------------------------------------

let features: Promise<ServerFeatures | null> | undefined;

/** What the server offers, or null when there is no server (static hosting, offline). */
export function serverFeatures(): Promise<ServerFeatures | null> {
  features ??= api<{ features: ServerFeatures }>('/health', { timeoutMs: 4000 })
    .then((r) => r.features)
    .catch(() => {
      features = undefined;
      return null;
    });
  return features;
}

export async function refreshMe(): Promise<ServerUser | null> {
  if (!session) return null;
  const { user } = await api<{ user: ServerUser }>('/me');
  setSession({ ...session, user });
  return user;
}

export async function updateMe(patch: Partial<Pick<ServerUser, 'handle' | 'tz' | 'cueMinutes' | 'reminders' | 'leagues' | 'lastStudyDay'>>) {
  const { user } = await api<{ user: ServerUser }>('/me', { method: 'PATCH', body: patch });
  if (session) setSession({ ...session, user });
  return user;
}
