import { describe, expect, it } from 'vitest';
import { type ClaudeCloud, CloudConflict, cloudGet, cloudMeta, cloudPut, PART_CHARS, splitParts } from '../src/state/cloud';

/** An in-memory stand in for the artifact store's document API. */
function fakeCloud(): { cloud: ClaudeCloud; docs: Map<string, Record<string, unknown>> } {
  const docs = new Map<string, Record<string, unknown>>();
  const db = {
    doc: (path: string) => ({
      get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
      set: async (data: Record<string, unknown>) => {
        // The store refuses documents over 256 KiB.
        if (new TextEncoder().encode(JSON.stringify(data)).length > 256 * 1024) throw new Error('too big');
        docs.set(path, structuredClone(data));
      },
      delete: async () => void docs.delete(path),
    }),
  };
  return { cloud: { uid: 'u1', name: 'Test', db }, docs };
}

describe('claude.ai cloud saves', () => {
  it('splits text into parts that fit a document', () => {
    expect(splitParts('')).toEqual(['']);
    const text = 'x'.repeat(PART_CHARS * 2 + 5);
    const parts = splitParts(text);
    expect(parts).toHaveLength(3);
    expect(parts.join('')).toBe(text);
  });

  it('round trips a large snapshot with non ASCII text under the size cap', async () => {
    const { cloud, docs } = fakeCloud();
    const data = JSON.stringify({ note: '♠♥♦♣ '.repeat(60_000) });
    expect(await cloudMeta(cloud)).toMatchObject({ version: 0 });
    await cloudPut(cloud, 0, data, 'iPhone');
    const back = await cloudGet(cloud);
    expect(back.version).toBe(1);
    expect(back.device).toBe('iPhone');
    expect(back.data).toBe(data);
    expect([...docs.keys()].every((k) => k.startsWith('data/users/u1/'))).toBe(true);
  });

  it('replaces old parts and refuses a stale base version', async () => {
    const { cloud, docs } = fakeCloud();
    await cloudPut(cloud, 0, 'a'.repeat(PART_CHARS + 1), 'Mac');
    await cloudPut(cloud, 1, 'b', 'Mac');
    expect([...docs.keys()].filter((k) => k.includes('/part-')).sort()).toEqual(['data/users/u1/part-2-0']);
    expect((await cloudGet(cloud)).data).toBe('b');
    await expect(cloudPut(cloud, 1, 'c', 'iPhone')).rejects.toBeInstanceOf(CloudConflict);
  });
});
