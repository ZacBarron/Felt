import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { installGlobalHaptics } from './haptics';
import { currentSession, refreshMe } from './state/api';
import { SettingsProvider } from './state/settings';
import { pullIfNewer, pushNow, startSync, syncMeta } from './state/sync';
import './styles.css';

installGlobalHaptics();

// Hosted test pages cannot rely on the address bar, so they keep routes in memory.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

/**
 * When signed in, a newer copy from another device is brought in before the
 * app renders, so the first screen is already up to date. Never waits more
 * than a few seconds; offline, the app starts with what is on this device.
 */
async function boot() {
  if (currentSession()) {
    await Promise.race([pullIfNewer().catch(() => false), new Promise((r) => setTimeout(r, 3500))]);
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <SettingsProvider>
        <Router>
          <App />
        </Router>
      </SettingsProvider>
    </React.StrictMode>,
  );
  startSync();
  if (currentSession()) {
    void refreshMe().catch(() => undefined);
    if (syncMeta().dirty) void pushNow().catch(() => undefined);
  }
}

void boot();
