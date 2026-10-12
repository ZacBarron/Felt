import { db, type StoredEvent } from './db';

/**
 * A local event log for measuring onboarding, the paywall and the habit
 * loops (see docs/MONETIZATION.md). Events stay on this device; developer
 * mode can export them. Nothing is sent anywhere.
 */
export function track(name: string, props?: StoredEvent['props']) {
  void db.events.add({ at: new Date(), name, props }).catch(() => {
    // Storage can be blocked; measurement never breaks the app.
  });
}

export async function exportEvents(): Promise<string> {
  return JSON.stringify(await db.events.orderBy('at').toArray(), null, 2);
}
