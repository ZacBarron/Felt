import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { installGlobalHaptics } from './haptics';
import { SettingsProvider } from './state/settings';
import './styles.css';

installGlobalHaptics();

// Hosted test pages cannot rely on the address bar, so they keep routes in memory.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <Router>
        <App />
      </Router>
    </SettingsProvider>
  </React.StrictMode>,
);
