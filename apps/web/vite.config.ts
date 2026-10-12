import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

// A build for sharing as a hosted test page: relative asset paths, in-memory
// routes and no service worker. See scripts/artifact-page.mjs.
declare const process: { env: Record<string, string | undefined> };
const artifact = process.env.FELT_TARGET === 'artifact';

export default defineConfig({
  base: artifact ? './' : '/',
  build: { outDir: artifact ? 'dist-artifact' : 'dist' },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // The solver runs in a module worker so it can import @felt/core.
  worker: { format: 'es' },
  plugins: [
    react(),
    // Installable on a phone and fully usable offline at the table.
    VitePWA({
      disable: artifact,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Felt',
        short_name: 'Felt',
        description: 'Instinct, trained. GTO ranges, spaced review and drills for serious poker players.',
        theme_color: '#0b2421',
        background_color: '#0b2421',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
});
