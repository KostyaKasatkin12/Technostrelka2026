# Performance & Smoothness Pass

## What & Why
The app feels heavy in a few specific areas: the animated background uses expensive GPU blur on every frame, 3D avatars create multiple WebGL Canvases on list pages, and the play session polls the server every 6 seconds even when nothing is happening. This task trims those pain points without removing features.

## Done looks like
- The animated background no longer causes dropped frames on mid-range phones (replace the three giant `blur-3xl` animated blobs with a static subtle gradient or a much lighter CSS animation)
- Avatar 3D canvases are lazy-loaded — the 3D view only initialises when visible on screen (Intersection Observer / React.lazy), falling back to the 2D avatar on list pages instead
- The play session polling interval is increased to 15 s and paused when the tab is hidden (Page Visibility API)
- The chat SSE handler does a targeted query update instead of invalidating the entire channel list on every message, cutting unnecessary re-renders
- Route-based code splitting is confirmed active so pages not yet visited don't inflate the initial JS bundle

## Out of scope
- Switching to a fully different 3D library or removing 3D avatars
- Server-side caching changes

## Steps
1. **Animated background** — Replace the animated blur blobs with a lightweight static gradient (or CSS animation with `transform` only, no `filter`) so it no longer triggers compositor layers on every frame
2. **Avatar lazy rendering** — On pages that show avatar in a list (leaderboard, team members, chat), render the 2D DiceBear fallback; reserve the 3D canvas for the profile page only, and load it with `React.lazy` + `Suspense`
3. **Session polling** — Change `refetchInterval` in the play session query from 6000 to 15000 and add a `refetchIntervalInBackground: false` option so it pauses when the tab is hidden
4. **Chat SSE optimisation** — Instead of invalidating both message list and channel list on every SSE event, update the specific channel's `lastMessageAt` + unread count in the React Query cache directly

## Relevant files
- `artifacts/morizo/src/components/animated-bg.tsx`
- `artifacts/morizo/src/components/avatar-3d.tsx`
- `artifacts/morizo/src/pages/play/session.tsx`
- `artifacts/morizo/src/pages/chat.tsx`
- `artifacts/morizo/src/hooks/use-unread-chat.ts`
