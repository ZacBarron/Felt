import { db } from './db';

/**
 * Everything Felt knows lives in this browser: IndexedDB for study and
 * imports, localStorage for settings. A backup file is the player's copy,
 * so a cleared browser or a new phone does not cost months of review.
 */

const TABLES = ['cards', 'reviews', 'lessons', 'saved', 'answers', 'daily', 'hands', 'sessions', 'events', 'scenarios', 'logged', 'weekly'] as const;
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

/** Replaces this device's data with a backup. Throws on a file that is not a Felt backup, before touching anything. */
export async function importBackup(text: string): Promise<RestoreSummary> {
  const backup = JSON.parse(text, reviver) as Backup;
  if (backup?.format !== FORMAT || backup.version !== 1 || typeof backup.tables !== 'object') throw new Error('This file is not a Felt backup.');
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
