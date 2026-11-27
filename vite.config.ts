/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /sip-shelf/ (ADR 0003).
const base = '/sip-shelf/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['catalog.json', 'icons/icon.svg', 'icons/*.png'],
      manifest: {
        name: 'Sip Shelf',
        short_name: 'Sip Shelf',
        description: 'A companion app for Owala water bottles. Not affiliated with Owala.',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#fff1d6',
        theme_color: '#fff1d6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,png,ico,webmanifest}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
