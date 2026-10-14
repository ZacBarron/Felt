import { db } from './db';

/**
 * Everything Felt knows lives in this browser: IndexedDB for study and
 * imports, localStorage for settings. A backup file is the player's copy,
 * so a cleared browser or a new phone does not cost months of review.
 */

/** Every table in the database. A test checks this list against the schema, so a new table cannot be left out. */
export const TABLES = ['cards', 'reviews', 'lessons', 'saved', 'answers', 'daily', 'hands', 'sessions', 'events', 'scenarios', 'logged', 'weekly'] as const;
const SETTINGS_KEY = 'felt.settings.v1';
const FORMAT = 'felt-backup';

export interface Backup {
  format: typeof FORMAT;
  version: 1;
  exportedAt: string;
  settings: unknown;
  tables: Record<(typeof TABLES)[number], unknown[]>;
}

// Dates do not survive JSON on their own; tag them so they come back as Dates.
function replacer(this: Record<string, unknown>, key: string, value: unknown) {
  return this[key] instanceof Date ? { $date: (this[key] as Date).toISOString() } : value;
}

function reviver(_key: string, value: unknown) {
  if (value && typeof value === 'object' && '$date' in value && Object.keys(value).length === 1) return new Date((value as { $date: string }).$date);
  return value;
}

export async function exportBackup(now = new Date()): Promise<string> {
  const tables = {} as Backup['tables'];
  for (const name of TABLES) tables[name] = await db.table(name).toArray();
  let settings: unknown = null;
  try {
    settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
  } catch {
    // Settings unavailable; the study data is what matters most.
  }
  const backup: Backup = { format: FORMAT, version: 1, exportedAt: now.toISOString(), settings, tables };
  return JSON.stringify(backup, replacer);
}

export interface RestoreSummary {
  rows: number;
  settings: boolean;
}

/** Reads a backup without applying it. Throws on anything that is not a Felt backup. */
export function parseBackup(text: string): Backup {
  let backup: Backup;
  try {
    backup = JSON.parse(text, reviver) as Backup;
  } catch {
    throw new Error('This file is not a Felt backup.');
  }
  if (backup?.format !== FORMAT || backup.version !== 1 || typeof backup.tables !== 'object' || backup.tables === null)
    throw new Error('This file is not a Felt backup.');
  return backup;
}

/** Replaces this device's data with a backup. Throws on a file that is not a Felt backup, before touching anything. */
export async function importBackup(text: string): Promise<RestoreSummary> {
  const backup = parseBackup(text);
  let rows = 0;
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      const table = db.table(name);
      await table.clear();
      const items = Array.isArray(backup.tables[name]) ? backup.tables[name] : [];
      await table.bulkPut(items);
      rows += items.length;
    }
  });
  let settings = false;
  if (backup.settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings));
      settings = true;
    } catch {
      // Storage blocked: data restored, settings left as they are.
    }
  }
  return { rows, settings };
}

/**
 * Removes everything Felt keeps on this device: every table and every saved
 * setting. Used when logging out of a shared phone, after a successful save.
 */
export async function clearDeviceData(): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) await db.table(name).clear();
  });
  // Only Felt's own keys: on a shared host (like github.io) other apps live on the same origin.
  for (const store of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k?.startsWith('felt.')) keys.push(k);
      }
      keys.forEach((k) => store.removeItem(k));
    } catch {
      // Storage blocked or missing: nothing was saved there either.
    }
  }
}

/**
 * Asks the browser not to clear Felt's storage under pressure. Safari also
 * clears site data after 7 days without a visit unless the app is added to
 * the home screen, which is why the backup exists too.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
