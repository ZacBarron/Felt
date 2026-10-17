import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

// The marketing site for acedpoker.app. On the domain it lives at "/" and the
// app at "/app/". The GitHub Pages preview puts it at "/Felt/site/" next to the app.
export default defineConfig({
  base: process.env.SITE_BASE ?? '/',
});
