import type { BotProfile } from '@felt/core';
import { PLAYER_TYPES } from './exploits';

/**
 * Play's bot characters. Each one is a player type from the Exploits library
 * turned into a policy (see `core/src/bots.ts`). They are always shown as
 * bots, never as people. Their postflop play follows rules, not a solver, so
 * the app labels it approximate. None has a rating yet: a rating has to be
 * measured from graded decisions before it is shown.
 */
export interface BotCharacter {
  id: string;
  name: string;
  /** Player type id in `PLAYER_TYPES`. */
  type: string;
  /** One short sentence on how it plays. */
  blurb: string;
  /** Drawn portrait features, used by the app's portrait component. */
  look: { hair: 'short' | 'long' | 'bald' | 'curly' | 'bun'; extra?: 'glasses' | 'shades' | 'cap' | 'beard' | 'hood' };
  profile: BotProfile;
}

export const BOTS: BotCharacter[] = [
  {
    id: 'sam',
    name: 'Sam',
    type: 'calling-station',
    blurb: 'Calls almost anything and rarely bluffs.',
    look: { hair: 'curly', extra: 'cap' },
    profile: { strength: 0.4, style: { looseness: 2.6, aggression: 0.1, foldiness: 0.35, bluff: 0.02, limp: 0.75, sizes: [0.5] } },
  },
  {
    id: 'rita',
    name: 'Rita',
    type: 'calling-station',
    blurb: 'Hates to fold a pair.',
    look: { hair: 'long' },
    profile: { strength: 0.45, style: { looseness: 2.2, aggression: 0.15, foldiness: 0.45, bluff: 0.03, limp: 0.6, sizes: [0.5, 0.75] } },
  },
  {
    id: 'lou',
    name: 'Lou',
    type: 'loose-passive',
    blurb: 'Limps a lot and gives up when he misses.',
    look: { hair: 'bald', extra: 'beard' },
    profile: { strength: 0.45, style: { looseness: 2, aggression: 0.2, foldiness: 0.95, bluff: 0.04, limp: 0.65, sizes: [0.33, 0.5] } },
  },
  {
    id: 'nora',
    name: 'Nora',
    type: 'nit',
    blurb: 'Plays few hands and means it when she bets.',
    look: { hair: 'bun', extra: 'glasses' },
    profile: { strength: 0.65, style: { looseness: 0.55, aggression: 0.45, foldiness: 1.6, bluff: 0.02, limp: 0, sizes: [0.66] } },
  },
  {
    id: 'ike',
    name: 'Ike',
    type: 'nit',
    blurb: 'Waits for big pairs and folds to pressure.',
    look: { hair: 'short', extra: 'glasses' },
    profile: { strength: 0.6, style: { looseness: 0.6, aggression: 0.3, foldiness: 1.5, bluff: 0.02, limp: 0.1, sizes: [0.5] } },
  },
  {
    id: 'wes',
    name: 'Wes',
    type: 'weak-tight-reg',
    blurb: 'Solid preflop but folds too much later on.',
    look: { hair: 'short', extra: 'hood' },
    profile: { strength: 0.7, style: { looseness: 0.85, aggression: 0.35, foldiness: 1.3, bluff: 0.05, limp: 0, sizes: [0.5] } },
  },
  {
    id: 'tess',
    name: 'Tess',
    type: 'tag-reg',
    blurb: 'Tight and aggressive with few leaks.',
    look: { hair: 'long', extra: 'shades' },
    profile: { strength: 0.85, style: { looseness: 1, aggression: 0.55, foldiness: 1, bluff: 0.12, limp: 0, sizes: [0.33, 0.75] } },
  },
  {
    id: 'otto',
    name: 'Otto',
    type: 'tag-reg',
    blurb: 'Plays close to the charts.',
    look: { hair: 'short' },
    profile: { strength: 0.85, style: { looseness: 1, aggression: 0.5, foldiness: 1.05, bluff: 0.1, limp: 0, sizes: [0.33, 0.66] } },
  },
  {
    id: 'leo',
    name: 'Leo',
    type: 'lag-reg',
    blurb: 'Opens wide and keeps up the pressure.',
    look: { hair: 'curly', extra: 'beard' },
    profile: { strength: 0.8, style: { looseness: 1.35, aggression: 0.75, foldiness: 0.85, bluff: 0.22, limp: 0, sizes: [0.33, 0.75] } },
  },
  {
    id: 'max',
    name: 'Max',
    type: 'maniac',
    blurb: 'Raises constantly and bluffs every street.',
    look: { hair: 'short', extra: 'shades' },
    profile: { strength: 0.4, style: { looseness: 2.2, aggression: 0.95, foldiness: 0.6, bluff: 0.45, limp: 0, sizes: [0.75, 1.2] } },
  },
];

export interface TablePreset {
  id: string;
  name: string;
  blurb: string;
  /** Bot ids in seat priority order: a smaller table takes the first ones. */
  bots: string[];
}

export const TABLE_PRESETS: TablePreset[] = [
  { id: 'home', name: 'Soft home game', blurb: 'Lots of calling and few bluffs.', bots: ['sam', 'lou', 'max', 'rita', 'nora', 'wes', 'ike', 'tess', 'otto'] },
  { id: 'casino', name: 'Casino 1/2', blurb: 'A mix of regulars and recreational players.', bots: ['lou', 'nora', 'sam', 'tess', 'wes', 'rita', 'ike', 'max', 'otto'] },
  { id: 'tough', name: 'Tough online', blurb: 'Mostly regulars who play well.', bots: ['tess', 'leo', 'otto', 'wes', 'nora', 'max', 'ike', 'lou', 'sam'] },
];

export const botById = (id: string) => BOTS.find((b) => b.id === id);
export const playerTypeOf = (bot: BotCharacter) => PLAYER_TYPES.find((t) => t.id === bot.type);
