# Sip Shelf

An open-source companion app for Owala water bottles. Register the bottles you own on a shelf, pick each one's Owala colorway, and the app takes its look from your active bottle's colors. It is an installable web app (PWA) that works offline.

**Sip Shelf is not affiliated with Owala.** Owala is a trademark of its owner.

> Status: early foundation. The catalog currently holds five made-up fixture colorways, not real Owala data.

## Run it

Needs Node 24.

```
npm install
npm run dev        # http://localhost:4252/sip-shelf/
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 4252 |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright on a phone-sized iPhone (WebKit) and Pixel (Chromium); builds and serves the app itself |

The first time, run `npx playwright install chromium webkit`.

## How it works

- Your shelf lives in your browser (IndexedDB, through Dexie) on one device. No accounts, no server. Clearing browser data loses it.
- The app is served from `/sip-shelf/` on GitHub Pages.
- Words used in the code and docs are defined in [GLOSSARY.md](GLOSSARY.md); decisions are in [docs/adr](docs/adr).

## License

[MIT](LICENSE).
