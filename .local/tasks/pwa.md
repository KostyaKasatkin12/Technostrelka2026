# PWA: Install on Phone + Offline Quest List

## What & Why
Making MORIZO installable as a PWA lets teens add it to their home screen like a native app, with an icon, splash screen, and a cached quest catalogue they can browse without a connection.

## Done looks like
- A `manifest.json` is served with correct name, icons (192 × 192 and 512 × 512), theme colour, and `display: standalone`
- The app icons use the MORIZO logo / brand colours
- A service worker (Workbox via vite-plugin-pwa) pre-caches the app shell and static assets
- The quest list page (`/quests`) is network-first for fresh data but falls back to a stale cached copy when offline; a small "Офлайн-режим" banner appears in that case
- Other pages that require the server (play session, profile, chat) show a clear "нет соединения" screen when offline rather than a blank error
- Chrome / Safari "Add to Home Screen" prompt works; the install banner is dismissed after the first use

## Out of scope
- Offline play sessions or background sync for answer submission
- Push notifications (separate from this task)

## Steps
1. **Manifest** — Create `public/manifest.json` with MORIZO branding; link it in `index.html`; generate or add icon PNG assets at 192 and 512 px
2. **Service worker** — Add `vite-plugin-pwa` to the Vite config; configure Workbox to pre-cache the app shell (JS/CSS bundles) with a `StaleWhileRevalidate` strategy for quest list API responses
3. **Offline quest list** — Cache the `GET /api/quests` response (first page) so the catalogue is browseable offline; add a visual "Офлайн" indicator banner in the quest catalogue when `navigator.onLine` is false
4. **Offline fallback page** — Register a fallback route in the service worker that returns a simple offline HTML page for navigation requests that fail

## Relevant files
- `artifacts/morizo/index.html`
- `artifacts/morizo/vite.config.ts`
- `artifacts/morizo/src/pages/quests/list.tsx`
