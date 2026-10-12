import { DEFAULT_SETTINGS, type GameSettings } from '@felt/core';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { setHapticsEnabled } from '../haptics';

export interface StudySettings {
  /** New review cards introduced per day. */
  newPerDay: number;
}

export type Appearance = 'system' | 'light' | 'dark';

export interface UiSettings {
  haptics: boolean;
  appearance: Appearance;
}

export interface AppSettings {
  game: GameSettings;
  study: StudySettings;
  ui: UiSettings;
}

const DEFAULTS: AppSettings = { game: DEFAULT_SETTINGS, study: { newPerDay: 15 }, ui: { haptics: true, appearance: 'system' } };
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
    setHapticsEnabled(settings.ui.haptics);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings still work for this visit.
    }
  }, [settings]);
  return <SettingsContext.Provider value={{ settings, update: setSettings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings needs a SettingsProvider');
  return ctx;
}
