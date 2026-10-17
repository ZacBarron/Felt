import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import type { Db } from '../db.ts';
import type { Actor, AdminRole } from '../ops.ts';
import { newId, newToken, sha256 } from '../services.ts';

/**
 * Who is using the console. The owner signs in with ADMIN_TOKEN. Named
 * admins (owner or support) get their own token, made in Access, stored
 * only as a hash. A browser signs in once and gets a signed, HttpOnly
 * cookie limited to /admin. Scripts send the token in a header instead:
 * Authorization: Bearer <token>, or X-Admin-Token.
 *
 * Support is read only, except staff notes. Every change checks `can`.
 */

export const COOKIE = 'aced_admin';
export const SESSION_HOURS = 12;

export const ROLES: Record<AdminRole, string> = {
  owner: 'Everything: actions on players, flags, programs and access.',
  support: 'Read only, plus staff notes on players.',
};

export type Permission = 'read' | 'note' | 'act' | 'flags' | 'access';
export function can(actor: Actor, p: Permission): boolean {
  if (actor.role === 'owner') return true;
  return p === 'read' || p === 'note';
}

const OWNER: Actor = { id: 'owner', name: 'owner', role: 'owner' };

/** The key that signs cookies. Changing ADMIN_TOKEN signs everyone out. */
const keyOf = (ownerToken: string) => sha256(`aced-admin-cookie:${ownerToken}`);
const mac = (key: string, s: string) => createHmac('sha256', key).update(s).digest('base64url');

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function sessionCookie(ownerToken: string, adminId: string, now: Date): string {
  const exp = now.getTime() + SESSION_HOURS * 3_600_000;
  const body = `${adminId}.${exp}`;
  return `${body}.${mac(keyOf(ownerToken), body)}`;
}

/** A token for forms, tied to this sign in, so another site cannot post as you. */
export const csrfFor = (ownerToken: string, cookie: string) => mac(keyOf(ownerToken), `csrf:${cookie}`);

interface AdminRow {
  id: string;
  name: string;
  role: AdminRole;
  disabled: number;
}

function byToken(db: Db, ownerToken: string, token: string): Actor | undefined {
  if (same(token, ownerToken)) return OWNER;
  const row = db.prepare('SELECT id, name, role, disabled FROM admins WHERE token_hash = ?').get(sha256(token)) as AdminRow | undefined;
  return row && !row.disabled ? { id: row.id, name: row.name, role: row.role } : undefined;
}

function byId(db: Db, id: string): Actor | undefined {
  if (id === 'owner') return OWNER;
  const row = db.prepare('SELECT id, name, role, disabled FROM admins WHERE id = ?').get(id) as AdminRow | undefined;
  return row && !row.disabled ? { id: row.id, name: row.name, role: row.role } : undefined;
}

export function readCookie(c: Context, name = COOKIE): string | undefined {
  const header = c.req.header('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

export interface Auth {
  actor: Actor;
  /** Set when signed in with the cookie: forms must send the matching csrf field. */
  csrf?: string;
}

/** The admin behind a request, by header token or by cookie. */
export function authenticate(c: Context, db: Db, ownerToken: string, now: Date): Auth | undefined {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : (c.req.header('X-Admin-Token') ?? '').trim();
  if (token) {
    const actor = byToken(db, ownerToken, token);
    if (actor) touch(db, actor, now);
    return actor ? { actor } : undefined;
  }
  const cookie = readCookie(c);
  if (!cookie) return undefined;
  const [id, exp, sig] = cookie.split('.');
  if (!id || !exp || !sig || !same(sig, mac(keyOf(ownerToken), `${id}.${exp}`)) || Number(exp) < now.getTime()) return undefined;
  const actor = byId(db, id);
  if (actor) touch(db, actor, now);
  return actor ? { actor, csrf: csrfFor(ownerToken, cookie) } : undefined;
}

/** Signs in with a token typed on the login page. */
export function login(db: Db, ownerToken: string, token: string): Actor | undefined {
  return token ? byToken(db, ownerToken, token.trim()) : undefined;
}

const touch = (db: Db, actor: Actor, now: Date) => {
  if (actor.id !== 'owner') db.prepare('UPDATE admins SET last_seen = ? WHERE id = ?').run(now.toISOString(), actor.id);
};

/** Makes a named admin. The token is returned once and only its hash is kept. */
export function createAdmin(db: Db, name: string, role: AdminRole, by: Actor, now: Date): { id: string; token: string } {
  const id = newId();
  const token = `adm_${newToken()}`;
  db.prepare('INSERT INTO admins (id, name, role, token_hash, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, role, sha256(token), now.toISOString(), by.name);
  return { id, token };
}

/** Failed sign ins per address, in memory: a few a quarter hour. */
export class LoginLimiter {
  private tries = new Map<string, number[]>();
  private readonly max: number;
  private readonly windowMs: number;
  constructor(max = 10, windowMs = 15 * 60_000) {
    this.max = max;
    this.windowMs = windowMs;
  }
  blocked(address: string, now: number): boolean {
    const t = (this.tries.get(address) ?? []).filter((x) => x > now - this.windowMs);
    this.tries.set(address, t);
    return t.length >= this.max;
  }
  fail(address: string, now: number) {
    this.tries.set(address, [...(this.tries.get(address) ?? []), now]);
    if (this.tries.size > 5000) this.tries.clear();
  }
}
