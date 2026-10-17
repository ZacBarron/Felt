import { AVATAR_SEEDS, BOTS, botById, LINEUP_TYPES, lineupBots, STAND_IN_NAMES, standInAvatar } from '@felt/content';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { botAvatarUrl } from '../src/ui/BotPortrait';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../public/bots');
const file = (seed: string) => join(dir, `${seed}.svg`);

describe('bot portraits', () => {
  it('has one drawn file for every seed and nothing else', () => {
    expect(new Set(AVATAR_SEEDS).size).toBe(AVATAR_SEEDS.length);
    for (const seed of AVATAR_SEEDS) expect(existsSync(file(seed)), seed).toBe(true);
    const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
    expect(files.sort()).toEqual(AVATAR_SEEDS.map((s) => `${s}.svg`).sort());
  });

  it('seeds every roster bot by its own id', () => {
    for (const b of BOTS) expect(b.avatar).toBe(b.id);
  });

  it('gives every stand in its own face, the same whichever bot it stands in for', () => {
    for (const name of STAND_IN_NAMES) expect(AVATAR_SEEDS).toContain(standInAvatar(name));
    expect(botById('nora.1')!.avatar).toBe(botById('lou.1')!.avatar);
    expect(botById('nora.1')!.avatar).not.toBe(botById('nora.2')!.avatar);
    expect(botById('nora.1')!.avatar).not.toBe(botById('nora')!.avatar);
  });

  it('covers every bot a custom table can seat', () => {
    // Every type, and a full table of one type, which uses the most stand ins.
    const lineups = [[...LINEUP_TYPES], ...LINEUP_TYPES.map((t) => Array(8).fill(t))];
    for (const lineup of lineups) {
      const ids = lineupBots(lineup);
      const faces = ids.map((id) => botById(id)!.avatar);
      for (const seed of faces) expect(AVATAR_SEEDS).toContain(seed);
      // Every seat at a table is a different face.
      expect(new Set(faces).size).toBe(ids.length);
    }
  });

  it('keeps each file small, crisp and free of scripts', () => {
    let total = 0;
    for (const seed of AVATAR_SEEDS) {
      const svg = readFileSync(file(seed), 'utf8');
      total += statSync(file(seed)).size;
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
      expect(svg).not.toMatch(/<script|<image|href="http/);
      expect(svg.length).toBeLessThan(16_000);
    }
    expect(total).toBeLessThan(220_000);
  });

  it('builds the address from the app base', () => {
    expect(botAvatarUrl('sam', '/')).toBe('/bots/sam.svg');
    expect(botAvatarUrl('stand-in-ada', '/Felt/')).toBe('/Felt/bots/stand-in-ada.svg');
    expect(botAvatarUrl('sam', './')).toBe('./bots/sam.svg');
    expect(botAvatarUrl('sam', '/app')).toBe('/app/bots/sam.svg');
  });
});
