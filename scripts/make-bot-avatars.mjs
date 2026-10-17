// Draws every Play bot's portrait once, so the app ships small SVG files and never the generator.
// Run with `node scripts/make-bot-avatars.mjs` after adding a bot or a stand in name.
// The seeds must match AVATAR_SEEDS in packages/content/src/bots.ts; a test checks every seed has a file.
//
// Style: Notionists by Zoish, via DiceBear. The artwork is CC0 1.0, so no attribution is required
// (see docs/BRAND.md, Bot portraits). The background stays transparent: the app tints it by player type.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAvatar } from '@dicebear/core';
import * as notionists from '@dicebear/notionists';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'apps/web/public/bots');

const ROSTER = ['sam', 'rita', 'lou', 'nora', 'ike', 'wes', 'tess', 'otto', 'leo', 'max'];
const STAND_INS = ['Ada', 'Ben', 'Cleo', 'Dev', 'Elle', 'Finn', 'Gail', 'Hank', 'Iris', 'Jay'].map((n) => `stand-in-${n.toLowerCase()}`);
export const SEEDS = [...ROSTER, ...STAND_INS];

/**
 * Head and shoulders with calm mouths: no tongues, gasps or bared teeth, no
 * hand gestures or shirt icons. Reads at 22 to 40px.
 */
const CALM_LIPS = ['variant03', 'variant04', 'variant13', 'variant14', 'variant17', 'variant18', 'variant20', 'variant21', 'variant22', 'variant23', 'variant25', 'variant30'];
const OPTIONS = { scale: 135, translateY: 10, lips: CALM_LIPS, gestureProbability: 0, bodyIconProbability: 0 };

/**
 * Whole numbers are plenty in a 1744 unit drawing shown at 40px, and they cut
 * the files by about a quarter. A space keeps packed numbers such as `1.2.3` apart.
 */
const shrink = (svg) =>
  svg
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    .replace(/(d="[^"]*")/g, (d) => d.replace(/-?\d*\.\d+/g, (n) => {
      const r = Math.round(Number(n));
      return r < 0 ? String(r) : ` ${r}`;
    }).replace(/ {2,}/g, ' ').replace(/([a-zA-Z"]) /g, '$1'))
    .replace(/>\s+</g, '><');

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith('.svg')) rmSync(join(out, f));
let total = 0;
for (const seed of SEEDS) {
  const svg = shrink(createAvatar(notionists, { seed, ...OPTIONS }).toString());
  writeFileSync(join(out, `${seed}.svg`), svg);
  total += svg.length;
}
console.log(`Drew ${SEEDS.length} portraits, ${(total / 1024).toFixed(0)} KB in all.`);
