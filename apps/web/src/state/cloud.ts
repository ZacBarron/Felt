import { useSyncExternalStore } from 'react';

/**
 * Cloud saves through the claude.ai artifact platform: when Suited runs as a
 * hosted artifact, the viewer is signed in to claude.ai and each person has
 * a private place to store data that only they can read. Suited keeps its
 * usual snapshot there, split into parts small enough for one document.
 *
 * Outside claude.ai (the app on its own domain), none of this exists and
 * Suited uses its own server account instead (see api.ts).
 */

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnap>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface ArtifactDb {
  doc(path: string): DocRef;
}
interface ArtifactUser {
  me(): Promise<{ id: string | null; name: string }>;
}
interface ClaudeHost {
  use(name: string): Promise<unknown>;
}

export interface ClaudeCloud {
  uid: string;
  name: string;
  db: ArtifactDb;
}

let cloud: ClaudeCloud | null = null;
let checked = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const claudeCloud = () => cloud;

export function useClaudeCloud(): { cloud: ClaudeCloud | null; checked: boolean } {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (checked ? (cloud ? cloudState : noCloud) : unchecked),
  );
}
const unchecked = { cloud: null, checked: false };
const noCloud = { cloud: null, checked: true };
let cloudState: { cloud: ClaudeCloud | null; checked: boolean } = noCloud;

/** Connects to the artifact platform's store and identity, if Suited is running there. */
export async function connectClaudeCloud(): Promise<ClaudeCloud | null> {
  if (checked) return cloud;
  const host = (globalThis as { claude?: ClaudeHost }).claude;
  try {
    if (!host?.use) return null;
    const [db, user] = (await Promise.all([host.use('db'), host.use('user')])) as [ArtifactDb | null, ArtifactUser | null];
    if (!db || !user) return null;
    const me = await user.me();
    if (!me?.id) return null;
    cloud = { uid: me.id, name: me.name, db };
    cloudState = { cloud, checked: true };
    return cloud;
  } catch {
    return null;
  } finally {
    checked = true;
    notify();
  }
}

// Snapshot storage ---------------------------------------------------------------

/** Characters per part: a document holds 256 KiB, and a character can take 3 bytes. */
export const PART_CHARS = 80_000;

export interface CloudManifest {
  version: number;
  updatedAt?: string;
  device?: string | null;
  parts?: number;
}

const base = (c: ClaudeCloud) => `data/users/${c.uid}`;
const manifestRef = (c: ClaudeCloud) => c.db.doc(`${base(c)}/sync`);
const partRef = (c: ClaudeCloud, version: number, i: number) => c.db.doc(`${base(c)}/part-${version}-${i}`);

export function splitParts(text: string, size = PART_CHARS): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts.length ? parts : [''];
}

export async function cloudMeta(c: ClaudeCloud): Promise<CloudManifest> {
  const snap = await manifestRef(c).get();
  const body = snap.exists ? (snap.data() as Partial<CloudManifest>) : undefined;
  return { version: typeof body?.version === 'number' ? body.version : 0, updatedAt: body?.updatedAt, device: body?.device ?? null, parts: body?.parts };
}

export async function cloudGet(c: ClaudeCloud): Promise<CloudManifest & { data?: string }> {
  const meta = await cloudMeta(c);
  if (!meta.version || !meta.parts) return meta;
  const parts: string[] = [];
  for (let i = 0; i < meta.parts; i++) {
    const snap = await partRef(c, meta.version, i).get();
    const chunk = snap.exists ? snap.data()?.chunk : undefined;
    if (typeof chunk !== 'string') throw new Error('Your cloud copy is incomplete. Suited will try again.');
    parts.push(chunk);
  }
  return { ...meta, data: parts.join('') };
}

export class CloudConflict extends Error {
  constructor(readonly cloud: CloudManifest) {
    super('The cloud copy changed on another device.');
  }
}

/**
 * Writes a new version: parts first under new names, then the manifest
 * that points at them, then the old parts are removed. A reader never sees
 * a manifest pointing at parts that are not there yet.
 */
export async function cloudPut(c: ClaudeCloud, baseVersion: number, data: string, device: string): Promise<{ version: number; updatedAt: string }> {
  const current = await cloudMeta(c);
  if (current.version !== baseVersion) throw new CloudConflict(current);
  const version = baseVersion + 1;
  const parts = splitParts(data);
  for (let i = 0; i < parts.length; i++) await partRef(c, version, i).set({ chunk: parts[i] });
  const updatedAt = new Date().toISOString();
  await manifestRef(c).set({ version, updatedAt, device, parts: parts.length });
  if (current.version && current.parts) {
    for (let i = 0; i < current.parts; i++) await partRef(c, current.version, i).delete().catch(() => undefined);
  }
  return { version, updatedAt };
}
