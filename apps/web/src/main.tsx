import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { installGlobalHaptics } from './haptics';
import { currentSession, refreshMe } from './state/api';
import { captureReferral } from './state/referral';
import { startAnalytics } from './state/events';
import { SettingsProvider } from './state/settings';
import { connectClaudeCloud } from './state/cloud';
import { firstSync, pullIfNewer, pushNow, startSync, syncMeta } from './state/sync';
import './styles.css';

installGlobalHaptics();
// Anonymous usage counts, unless the player or the browser said no (docs/ANALYTICS.md).
startAnalytics();
// A friend's invite link: keep the code for sign up and tidy the address.
captureReferral();

// Hosted test pages cannot rely on the address bar, so they keep routes in memory.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

/**
 * When signed in, a newer copy from another device is brought in before the
 * app renders, so the first screen is already up to date. Never waits more
 * than a few seconds; offline, the app starts with what is on this device.
 */
async function boot() {
  // On a hosted claude.ai page, the viewer's claude.ai sign in is their Aced account.
  const claude = connectClaudeCloud();
  const wait = new Promise((r) => setTimeout(r, 3500));
  if (currentSession()) {
    await Promise.race([pullIfNewer().catch(() => false), wait]);
  } else {
    await Promise.race([claude.then((c) => (c && syncMeta().version !== undefined ? pullIfNewer().catch(() => false) : false)), wait]);
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <SettingsProvider>
        <Router basename={import.meta.env.VITE_ROUTER === 'memory' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')}>
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
  void claude.then(async (c) => {
    if (!c || currentSession()) return;
    if (syncMeta().version === undefined) {
      // First visit on this device: an empty device takes the cloud copy, an empty cloud takes this one.
      if ((await firstSync().catch(() => undefined)) === 'pulled') location.reload();
    } else if (syncMeta().dirty) void pushNow().catch(() => undefined);
  });
}

void boot();
