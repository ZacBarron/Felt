import { api, updateMe } from './api';

/** Why reminders cannot be turned on here, or undefined when they can. */
export function pushBlocker(): string | undefined {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    return ios
      ? 'On iPhone, add Felt to your Home Screen first. Tap Share, then Add to Home Screen. Then open Felt from there.'
      : 'This browser cannot show reminders.';
  }
  if (Notification.permission === 'denied') return 'Notifications are blocked for Felt. Allow them in your browser or phone settings.';
  return undefined;
}

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Asks permission, subscribes this device, and sets the daily reminder time. */
export async function enableReminders(cueMinutes: number): Promise<void> {
  const blocker = pushBlocker();
  if (blocker) throw new Error(blocker);
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Felt needs permission to show notifications.');
  const { key } = await api<{ key: string }>('/push/key');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key).buffer as ArrayBuffer }));
  await api('/push/subscribe', { body: sub.toJSON() });
  await updateMe({ reminders: true, cueMinutes, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
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
