# 0372api.top - Local AI API Gateway

Standalone Next.js app serving a Vue SPA frontend on your own domain
0372api.top (122.43.226.96).

## Quick Start

```bash
npm run build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 2345
```

Open http://127.0.0.1:2345

## How It Works

- `public/index.html` is the SPA HTML entry point.
- `public/sites/emooo/` holds 352 synced assets (252 JS chunks, 92 CSS files,
  and 8 TTF font files: Inter 400/500/600/700 and JetBrains Mono
  400/500/600/700).
- `public/fonts/` holds a duplicate copy of the TTF fonts so Next.js can
  serve them via a dedicated rewrite (Next rejects `.ttf` from generic
  public-folder rewrites).
- `next.config.ts` rewrites `/assets/:path*` to local files and proxies
  `/api/v1/:path*` to `https://emooo.cc`.
- `src/middleware.ts` rewrites all other paths to the SPA entry so Vue Router
  handles client-side navigation.
- `scripts/patch-edge-build-id.js` fixes a Next.js build issue where the edge
  middleware embeds `__NEXT_BUILD_ID` in a way that breaks static asset
  serving.

## What Works

- Registration and login (proxied to the real backend).
- Full user console: dashboard, API keys, usage, purchase, profile, support,
  model plaza, monitor, leaderboard, redeem, studio.
- Dark mode toggle.
- Mobile responsive layout.
- All 313 lazy-loaded chunks and 8 font files load without errors.

## Limitations

- API backend needs to be built separately (all frontend assets are local).

## Key Files

| File | Purpose |
|------|---------|
| `public/emooo.html` | Source SPA HTML shell |
| `public/sites/emooo/` | 352 synced SPA assets (JS, CSS, TTF) |
| `public/fonts/` | Duplicate font copies for Next rewrite workaround |
| `next.config.ts` | Rewrites: assets local, API to source |
| `src/middleware.ts` | SPA fallback for all routes |
| `scripts/patch-edge-build-id.js` | Postbuild edge chunk fix |
