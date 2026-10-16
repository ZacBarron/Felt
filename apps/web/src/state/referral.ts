import { useEffect, useState } from 'react';
import { api, currentSession, useSession } from './api';

/**
 * Invites: every account has a code, and a link with it brings a friend in.
 * The friend gets a month of Suited Pro when they make an account. You get a
 * month when they have answered 10 graded questions, so the reward follows
 * real study, not a sign up. See docs/ENGAGEMENT.md.
 */

export const REF_PARAM = 'ref';
const PENDING_KEY = 'felt.ref.pending.v1';
const MINE_KEY = 'felt.ref.mine.v1';
/** Months a player can earn from invites in a year. */
export const MAX_REFERRAL_MONTHS = 12;
/** Graded answers a friend gives before the invite counts. */
export const QUALIFY_ANSWERS = 10;

function read(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: string | undefined) {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private mode: the invite still works for this visit.
  }
}

const CODE = /^[A-Z0-9]{4,12}$/;

/** Reads an invite code from the address bar, keeps it for sign up and tidies the address. */
export function captureReferral(href = typeof location === 'undefined' ? '' : location.href): string | undefined {
  if (!href) return undefined;
  const url = new URL(href);
  const code = url.searchParams.get(REF_PARAM)?.trim().toUpperCase();
  if (!code || !CODE.test(code)) return undefined;
  // Your own code on your own link is not an invite.
  if (code !== read(MINE_KEY)) write(PENDING_KEY, code);
  url.searchParams.delete(REF_PARAM);
  try {
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // Some embedded browsers refuse: the code is kept either way.
  }
  return code;
}

/** The invite this device arrived with, until an account claims it. */
export const pendingReferral = () => read(PENDING_KEY);
export const clearPendingReferral = () => write(PENDING_KEY, undefined);

/** The app's home address, with this player's invite code when they have one. */
export function shareUrl(path = '', params: Record<string, string> = {}): string {
  const base = typeof location === 'undefined' ? 'https://zacbarron.github.io/Felt/' : new URL(import.meta.env.BASE_URL ?? '/', location.origin).href;
  const url = new URL(path.replace(/^\//, ''), base);
  const mine = read(MINE_KEY);
  if (mine) url.searchParams.set(REF_PARAM, mine);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.href;
}

export interface ReferralStatus {
  code: string;
  friends: { joinedAt: string; qualified: boolean }[];
  /** Months of Pro earned from invites. */
  months: number;
  /** Months still to earn this year. */
  monthsLeft: number;
  /** The end of free Pro from invites, if any. */
  bonusUntil: string | null;
}

/** This player's invite code and friends, from the server. Saves the code for share links. */
export async function loadReferrals(): Promise<ReferralStatus> {
  const status = await api<ReferralStatus>('/referrals');
  write(MINE_KEY, status.code);
  return status;
}

export function useReferrals(): { status?: ReferralStatus; error?: string } {
  const session = useSession();
  const [state, setState] = useState<{ status?: ReferralStatus; error?: string }>({});
  useEffect(() => {
    if (!session) return;
    let live = true;
    loadReferrals()
      .then((status) => live && setState({ status }))
      .catch((e: Error) => live && setState({ error: e.message }));
    return () => {
      live = false;
    };
  }, [session?.user.id]);
  return state;
}

/** Who invited this device, for the welcome. Null when the code is unknown. */
export async function inviterName(code: string): Promise<{ name: string | null } | null> {
  try {
    return await api<{ name: string | null }>(`/referrals/code/${encodeURIComponent(code)}`);
  } catch {
    return null;
  }
}

/** Claims the pending invite for the signed in account. Safe to call again: the server ignores repeats. */
export async function claimPendingReferral(): Promise<boolean> {
  const code = pendingReferral();
  if (!code || !currentSession()) return false;
  try {
    await api('/referrals/claim', { method: 'POST', body: { code } });
    clearPendingReferral();
    return true;
  } catch {
    return false;
  }
}
