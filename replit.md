# Workspace

## Overview

MORIZO — Russian-language full-stack web app for urban quests aimed at teens 14–17. Single artifact monorepo: an embedded Express API served through Vite middleware.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24
- **TypeScript**: 5.9
- **Frontend**: React 19 + Vite 7 + Tailwind v4 + wouter + TanStack Query + Leaflet
- **API**: Express 5 + Drizzle ORM + PostgreSQL + Zod + pino, embedded into Vite via `vite.api-plugin.ts`
- **API codegen**: Orval (from OpenAPI spec) → `@workspace/api-client-react` hooks
- **Auth**: cookie sessions + bcrypt

## Artifacts

- `morizo` — single web artifact at `artifacts/morizo`. The API is hosted in-process by Vite using `server.ssrLoadModule` + sync middleware on `/api`.

## Key Commands

- `pnpm --filter @workspace/morizo run dev` — start the dev server (workflow `artifacts/morizo: web`)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm run typecheck` — full typecheck

## Internal messenger (April 2026)

- **DB schema** (`lib/db/src/schema/index.ts`): `chatChannelsTable` (kind: direct/group/quest/team), `chatMembersTable` (with `lastReadMessageId`), `chatMessagesTable` (with `attachment` jsonb for `quest_link` / `team_invite`).
- **API** (`artifacts/api-server/src/routes/chat.ts`): list/create/get/join/leave channels, list/send messages, mark-read, search users, and `GET /api/chat/stream` (SSE) for live updates. Auto-detects `/quests/:id` URLs in messages and attaches a `quest_link` card.
- **OpenAPI** + codegen hooks (`useListChatChannels`, `useSendChatMessage`, etc.) generated via `@workspace/api-client-react`.
- **UI** (`artifacts/morizo/src/pages/chat.tsx`): channel list + chat view with quest/team attachment cards, dialogs to create direct / team / quest channels and to share quest links into existing chats. Routes `/chat` and `/chat/:id`. `MessageSquare` nav item added in `Layout` and `BottomNav` (replaced Profile in bottom nav).
- **Demo seed**: even on a non-empty DB the seed top-ups three demo channels (quest gathering, team chat, direct DM) so the UI has content out of the box.

## v3.1 features (April 2026)

- **Yandex Maps** заменили Leaflet на главной (`home-map.tsx`), карточке квеста (`quest-map.tsx`) и в пикере координат редактора (`picker-map.tsx`). Лоадер `lib/yandex-maps.ts` подкладывает API-ключ из `VITE_YANDEX_MAPS_API_KEY` и кеширует промис.
- **Города из Геокодера** — `components/city-autocomplete.tsx` подключён в редактирование профиля; использует `ymaps.suggest` с дебаунсом 250 мс и аккуратно дегрейдит при недоступности скрипта.
- **Загрузка картинок** — `POST /api/uploads/image` (multer, 5 МБ, jpg/png/webp) пишет в локальную папку и возвращает URL; компонент `image-upload.tsx` используется для аватарки и обложки профиля. Поля `usersTable.customAvatarUrl` / `customBannerUrl` хранят результат и подменяют дефолтные DiceBear/баннер.
- **3D-человечек + магазин** — `components/avatar-human.tsx` (голова, торс, руки, ноги, шапка/очки/куртка как conditional меши). Магазин `pages/shop.tsx` (вкладки по слотам, покупка/надевание), API `/api/shop/items|me|buy|equip` и каталог из 17 SHOP_ITEMS. Очки списываются с `users.points`, инвентарь в `purchasedItems` jsonb, надетые предметы — `equippedItems`.
- **Синхронизированный командный старт** — `playSessionsTable.scheduledStartAt + lobbyCode`. `POST /api/sessions/lobby` создаёт «якорную» сессию с таймером и автоматически постит quest_link в чат команды + рассылает уведомления; `POST /api/sessions/lobby/:code/join` поднимает участникам собственные сессии под тем же кодом. Страница `pages/play/lobby.tsx` показывает обратный отсчёт, копирование инвайта, Web Share, live-таблицу (poll каждые 3 с).
- **Жалобы и обращения** — таблица `reportsTable`, API `POST /api/reports`, модераторские `GET /api/admin/reports` и `POST /api/admin/reports/:id/resolve`. Кнопка «Пожаловаться» на странице квеста, очередь жалоб с фильтрами в `/admin`.
- **Поделиться квестом** — Web Share API + копирование ссылки в буфер на странице квеста и в лобби.
- **Уведомления** — таблица `notificationsTable` + хелпер `pushNotification` (используется при создании лобби и при принятии жалобы).
- **Тосты ошибок** — все формы (логин, регистрация, создание/редактирование квеста, ответ в сессии, модерация, команды, магазин, лобби) явно показывают `toast.error` с русским сообщением.

## v3 features (April 2026)

- **3D scenes via three.js** — `Hero3D` (city + orb on home page), `Avatar3DEditor`/`Avatar3DView` (profile). Wrapped with `ThreeErrorBoundary` and `isWebGLSupported` so headless/sandboxed envs gracefully fall back to a CSS-only animated scene.
- **Mistral AI** — `artifacts/api-server/src/routes/ai.ts` calls `https://api.mistral.ai/v1/chat/completions` (model env `MISTRAL_MODEL`, default `mistral-small-latest`) when `MISTRAL_API_KEY` is set, else heuristic. New endpoints: `POST /api/ai/quest-assist` (idea generator), `GET /api/ai/status`. AI extras (assist + status) are not in OpenAPI; client uses `fetch` directly.
- **Animated layout** — `AnimatedBackground` (3 drifting blobs + grid + noise), `SplashScreen` (1.1s session-gated splash with concentric pulse rings), `InlineLoader`, page-transition motion in `Layout`.
- **Mobile bottom nav** — `BottomNav` (md:hidden, safe-area aware) with floating "Создать" CTA in the middle slot.
- **Improved admin** — `pages/admin/index.tsx` now has user search (server-side via `useAdminListUsers({ search })`), difficulty pie chart, top-cities horizontal bars, AI status check button, and quick-link cards.
- **3D avatar storage** — saved client-side via `lib/avatar-3d-store.ts` (`localStorage` per user), no DB migration needed. 2D avatars (DiceBear slots) remain the canonical avatar shown in lists/leaderboards.
- **README.md** — full Windows-localhost setup (PostgreSQL via pgAdmin, .env, pnpm install, db push, dev).

## Demo accounts

- Moderator: `moderator@morizo.app` / `demo123`
- Players (e.g. `alex@morizo.app`, `kira@morizo.app`, `max@morizo.app`, …) / `demo123`
- Teams seeded with codes `MORIZO1`, `MORIZO2`, `MORIZO3`

## v3.2 features (April 2026)

- **Google OAuth** — `GET /api/auth/google` + `/api/auth/google/callback` in `auth.ts`. No passport.js — pure fetch to Google's token endpoint, ID token JWT decoded manually. For Google-only users, a random bcrypt hash is stored as password placeholder. New `googleId` column on `usersTable`. "Войти через Google" button on login + register pages.
- **Mini-games** — `/games` lobby page + "Городской Квиз" game (`/games/city-quiz`): 10 random questions from a pool of 15 about Russian cities & street culture, 12s timer, speed bonus. Leaderboard with real players. Scores persisted to `miniGameScoresTable`, converted to profile points (1/5 ratio). API: `POST /api/minigames/:gameId/scores`, `GET /api/minigames/:gameId/leaderboard`, `GET /api/minigames/me`. "Городской Скаут" coming soon.
- **Profile Wall** — `wallPostsTable` + `wallReactionsTable` + `wallCommentsTable` (DB). Full wall API in `routes/wall.ts`: get/create/delete posts, emoji reactions (toggle), comments CRUD, `/api/wall/feed` (latest posts from all users). `ProfileWall` React component with post composer (text + image), 6 emoji reactions, collapsible comments with avatars. "Стена" tab on own profile + public profiles. `/feed` news feed page.
- **Image Crop** — `CropModal` component built on HTML Canvas. Supports drag-to-pan + zoom buttons + grid overlay. Integrated into `ImageUpload` via `enableCrop` + `aspect` props. Avatar upload now shows crop dialog before uploading.
- **3D human model fix** — camera moved from `[0, 0.6, 3.4]`/fov38 to `[0, 0.05, 2.9]`/fov42 + group offset to `-0.88` so the full figure (feet to head) fits in frame. Added neck mesh. Added purple accent point light.
- **Navigation** — "Игры" (Gamepad2) and "Лента" (Rss) added to desktop nav, bottom nav (replaced Plus/create button with Games + Feed).

## Implemented features

- Email/password auth, profile (nickname, ageGroup, bio, bannerUrl, city), session cookies
- 3 selectable avatars per account (DiceBear v9 SVGs across 6 styles) with picker + slot switching
- 3 themes / skins (`neon`, `sunset`, `mono`) persisted to user.theme + localStorage
- Quest catalog with map (Leaflet + OSM tiles), checkpoints, difficulty/duration/rating
- Quest CRUD with statuses: `draft → moderation → published → archived/rejected`
- User-created quests with built-in heuristic AI verifier (`/ai/validate-quest` returns score, status, structured issues with severity, suggestions). Submission gated on a non-rejected verdict.
- Checkpoint editor with `code_word` / `choice` task types, hints, safety rules, lat/lng
- Play sessions: solo or team, progress tracking, scoring (100 + orderIndex*10 per CP, +200 finish bonus)
- Team CRUD, join codes (3–6 members), team detail with captain
- Leaderboards (players + teams) with avatars + city, period filter (all/month/week)
- Achievements (auto-awarded on first quest, 5/10 quests, team play)
- Moderator role + queue, approve/reject with reason
- Admin panel (`/admin`): overview stats (users/quests/sessions/moderation), 7-day signup chart, top authors, full users table with role toggle and avatars
- Profile page: banner, 3-avatar carousel/picker, level bar, recharts activity timeline (`/profile/me/timeline`), achievements, sessions, public profile at `/u/:userId`
- Mobile-first responsive neon/urban theme (font-black uppercase, font-mono, border-2, rounded-none) with framer-motion route transitions and Windows scrollbar/font polish

## Important implementation notes

- The Vite api-plugin loads the Express app via `ssrLoadModule` and caches it in module scope. **Workflow restart is required after any change to `artifacts/api-server/src/**`** — HMR does not apply to the API.
- Routes are registered in order in `app.ts`; **the first matching route wins**. Don't define the same path in two routers (e.g., the old `/admin/users` stub in `moderation.ts` was shadowing the new admin route — it has been removed).
- DB pushes: `pnpm --filter @workspace/db run push-force` after schema changes in `lib/db/src/schema/index.ts`.
- API codegen: re-run `pnpm --filter @workspace/api-spec run codegen` after editing `lib/api-spec/openapi.yaml`.

See the `pnpm-workspace` skill for workspace structure conventions.
