# v1 is a static TypeScript, React and Vite web app on GitHub Pages

Sip Shelf v1 is a TypeScript and React app built with Vite, made installable and offline-capable with `vite-plugin-pwa`, storing the Shelf in the browser through Dexie (a wrapper over IndexedDB), tested with Vitest and Playwright (phone-sized, on WebKit as an iPhone as well as Chromium), and deployed to GitHub Pages by a GitHub Action (decided 2026-11-27, Ryan: "8. Yes"). With no server in v1 (ADR 0002), contributors run it with `npm install`.

## Considered Options

- A server-backed stack like Ryan's Docker and PostgreSQL apps: rejected for v1 because the app is public and local-first, and strangers cannot reach his Tailscale-only PC.
- A native app: not ruled out for later, but a web app installs from a link and fits the weekend.
