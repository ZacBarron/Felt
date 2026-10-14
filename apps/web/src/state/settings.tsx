import { DEFAULT_SETTINGS, type GameSettings, type TableAssumptions } from '@felt/core';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { setHapticsEnabled } from '../haptics';
import { markDirty } from './sync';

export interface StudySettings {
  /** New review cards introduced per day. */
  newPerDay: number;
  /** No timer in drills. Speed stops counting toward review scheduling; the rating never used it. */
  untimed?: boolean;
  /** Number keys answer and Enter moves on in drills. Off for Voice Control and switch users. */
  shortcuts?: boolean;
  /** Paint charts with frequencies (75%, 50%, splits) rather than one action per hand. On unless turned off. */
  paintMixes?: boolean;
  /** Review decks: which are on and how many new cards each adds a day. `newPerDay` above is the charts deck. */
  decks?: Partial<Record<'charts' | 'lessons' | 'math' | 'saved', { on?: boolean; newPerDay?: number }>>;
  /** Cards per review session; 0 means everything due. */
  sessionLimit?: number;
}

/**
 * Response time reported for an untimed answer: inside the "Good" window,
 * so a right answer schedules like a steady one, never as slow.
 */
export function untimedMs(targetMs: number) {
  return targetMs * 2;
}

export type Appearance = 'system' | 'light' | 'dark';
export type Palette = 'card-room' | 'ink' | 'oxblood' | 'cobalt';

export const PALETTES: { id: Palette; name: string; note: string; felt: [string, string]; accent: string }[] = [
  { id: 'card-room', name: 'Card room', note: 'Spruce and brass', felt: ['#2a7461', '#0b2421'], accent: '#e3b261' },
  { id: 'ink', name: 'Ink', note: 'Navy and brass', felt: ['#2f4f8a', '#0b1426'], accent: '#e3b261' },
  { id: 'oxblood', name: 'Oxblood', note: 'Wine and cream', felt: ['#8a3142', '#2a0e14'], accent: '#ecd9b4' },
  { id: 'cobalt', name: 'Cobalt', note: 'Blue and ice', felt: ['#4573ff', '#0a1a4a'], accent: '#dfe7ff' },
];

export interface UiSettings {
  haptics: boolean;
  appearance: Appearance;
  palette: Palette;
}

export type Goal = 'win-live' | 'move-up' | 'go-pro' | 'master-gto' | 'tournaments';
export type Experience = 'new' | 'casual' | 'winning' | 'pro';
export type Focus = 'preflop' | 'postflop' | 'sizing' | 'reads' | 'math' | 'mental';

/** What the player told us during onboarding. Drives their plan and copy. */
export interface Profile {
  onboarded: boolean;
  /** Everything the player wants from poker, in the order they picked. */
  goals: Goal[];
  /** Older saves kept a single goal; read through `goals` instead. */
  goal?: Goal;
  experience?: Experience;
  /** The tier the player is aiming for, from `TIERS` in core. */
  target?: string;
  focus: Focus[];
  /** Daily study target in minutes. */
  dailyMinutes: number;
  /** When the player plans to study, as an if-then cue (Gollwitzer 1999). */
  cue?: string;
  /** ISO date the player committed to their plan. */
  committedAt?: string;
  /** Module placement started at, or 'all' when it cleared everything. */
  placedAt?: string;
  /** Name shown on your avatar. Optional. */
  name?: string;
  /** Small square photo as a JPEG data URL, about 160px. Optional. */
  photo?: string;
}

/**
 * Access to Felt Pro. `pro` is what purchases set; `devPro` is a switch for
 * the developer to test either side of the paywall.
 */
export interface Access {
  pro: boolean;
  devPro?: boolean;
  devMode?: boolean;
  /** ISO date a trial ends, when on a trial. */
  trialEndsAt?: string;
  plan?: string;
  /** Paid through this date, as reported by the Felt server. */
  until?: string;
}

/** Results the player entered, used to calibrate the win rate estimate. */
export interface Results {
  hands: number;
  /** Profit in money at the current stakes. */
  profit: number;
}

export interface AppSettings {
  game: GameSettings;
  study: StudySettings;
  ui: UiSettings;
  profile: Profile;
  access: Access;
  results?: Results;
  /** The player's own overrides of the win rate model assumptions. */
  assumptions?: Partial<TableAssumptions>;
}

const DEFAULTS: AppSettings = {
  game: DEFAULT_SETTINGS,
  study: { newPerDay: 15, untimed: false, shortcuts: true },
  ui: { haptics: true, appearance: 'system', palette: 'card-room' },
  profile: { onboarded: false, goals: [], focus: [], dailyMinutes: 10 },
  access: { pro: false },
};
const KEY = 'felt.settings.v1';

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    return {
      game: { ...DEFAULTS.game, ...saved.game },
      study: { ...DEFAULTS.study, ...saved.study },
      ui: { ...DEFAULTS.ui, ...saved.ui },
      profile: {
        ...DEFAULTS.profile,
        ...saved.profile,
        // Saves from before players could pick several goals.
        goals: saved.profile?.goals ?? (saved.profile?.goal ? [saved.profile.goal] : []),
      },
      access: { ...DEFAULTS.access, ...saved.access },
    };
  } catch {
    return DEFAULTS;
  }
}

/** Sets data-theme for the CSS and keeps the browser chrome color in step. */
function applyAppearance(appearance: Appearance) {
  const root = document.documentElement;
  if (appearance === 'system') delete root.dataset.theme;
  else root.dataset.theme = appearance;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => {
    const dark = appearance === 'dark' || (appearance === 'system' && media.matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f2f7');
  };
  update();
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}

const SettingsContext = createContext<{ settings: AppSettings; update: (next: AppSettings) => void } | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);
  useEffect(() => applyAppearance(settings.ui.appearance), [settings.ui.appearance]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.ui.palette === 'card-room') delete root.dataset.palette;
    else root.dataset.palette = settings.ui.palette;
  }, [settings.ui.palette]);

  // What syncs: everything but access, which the server reports itself.
  const synced = JSON.stringify({ ...settings, access: undefined });
  const lastSynced = useRef(synced);
  useEffect(() => {
    setHapticsEnabled(settings.ui.haptics);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings still work for this visit.
    }
    // Settings travel with sync too. Access changes come from the server, so they are not local edits.
    if (synced !== lastSynced.current) {
      lastSynced.current = synced;
      markDirty();
    }
  }, [settings, synced]);
  return <SettingsContext.Provider value={{ settings, update: setSettings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings needs a SettingsProvider');
  return ctx;
}
