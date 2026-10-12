import { DEFAULT_SETTINGS, type GameSettings } from '@felt/core';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

export interface StudySettings {
  /** New review cards introduced per day. */
  newPerDay: number;
}

export interface AppSettings {
  game: GameSettings;
  study: StudySettings;
}

const DEFAULTS: AppSettings = { game: DEFAULT_SETTINGS, study: { newPerDay: 15 } };
const KEY = 'felt.settings.v1';

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    return { game: { ...DEFAULTS.game, ...saved.game }, study: { ...DEFAULTS.study, ...saved.study } };
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext<{ settings: AppSettings; update: (next: AppSettings) => void } | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);
  useEffect(() => {
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
