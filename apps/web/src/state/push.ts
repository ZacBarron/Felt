import { api, currentSession, type ServerFeatures, updateMe } from './api';

/** Why reminders cannot be turned on here, or undefined when they can. */
export function pushBlocker(): string | undefined {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    return ios
      ? 'On iPhone, add Suited to your Home Screen first. Tap Share, then Add to Home Screen. Then open Suited from there.'
      : 'This browser cannot show reminders.';
  }
  if (Notification.permission === 'denied') return 'Notifications are blocked for Suited. Allow them in your browser or phone settings.';
  return undefined;
}

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Whether Suited can send this player a push: the server sends them, the
 * player is signed in (pushes go to an account), and this browser can show
 * them. On iPhone that means Suited was opened from the Home Screen.
 */
export function canPush(features: ServerFeatures | null | undefined): boolean {
  return !!features?.push && !!currentSession() && !pushBlocker();
}

/** Asks permission and subscribes this device to the signed in account's pushes. */
export async function subscribePush(): Promise<void> {
  const blocker = pushBlocker();
  if (blocker) throw new Error(blocker);
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Suited needs permission to show notifications.');
  const { key } = await api<{ key: string }>('/push/key');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key).buffer as ArrayBuffer }));
  await api('/push/subscribe', { body: sub.toJSON() });
}

/** Asks permission, subscribes this device, and sets the daily reminder time. */
export async function enableReminders(cueMinutes: number): Promise<void> {
  await subscribePush();
  await updateMe({ reminders: true, cueMinutes, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

/** The trial reminder: on means this device is subscribed and the account wants it. */
export async function setTrialReminder(on: boolean): Promise<void> {
  if (on) await subscribePush();
  await updateMe({ trialReminder: on, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

export async function disableReminders(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api('/push/subscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(() => undefined);
      await sub.unsubscribe();
    }
  } finally {
    await updateMe({ reminders: false });
  }
}
