# MORIZO — Backend Architecture Reference

> **Stack:** Node.js 22 · Express 5 · Drizzle ORM · PostgreSQL · TypeScript  
> **Monorepo path:** `artifacts/api-server/`  
> All routes are mounted under the `/api` prefix by the Vite dev-proxy and the production Express server.

---

## Table of Contents

1. [Project layout](#project-layout)
2. [Authentication & session model](#authentication--session-model)
3. [Role system](#role-system)
4. [REST API — endpoint reference](#rest-api--endpoint-reference)
5. [Geodata handling](#geodata-handling)
6. [File upload flow](#file-upload-flow)
7. [Validation & error conventions](#validation--error-conventions)

---

## Project layout

```
artifacts/api-server/
├── src/
│   ├── index.ts          – Express app bootstrap, middleware, route mounting
│   ├── seed.ts           – Demo data (users, quests, checkpoints, sessions, chats)
│   ├── lib/
│   │   ├── auth.ts       – Session cookie helpers, requireAuth / requireModerator middleware
│   │   └── ...
│   └── routes/
│       ├── auth.ts       – Register, login, logout, OAuth
│       ├── quests.ts     – Quest CRUD, submit, archive
│       ├── checkpoints.ts
│       ├── sessions.ts   – Play sessions, lobby, answer submission
│       ├── teams.ts
│       ├── chat.ts       – Channels, messages, SSE stream
│       ├── moderation.ts – Approve / reject queue
│       ├── leaderboard.ts
│       ├── achievements.ts
│       ├── admin.ts      – Admin overview, user management
│       ├── profile.ts
│       ├── stats.ts
│       ├── reports.ts
│       ├── notifications.ts
│       ├── uploads.ts    – multer image upload + file serving
│       ├── shop.ts
│       ├── wall.ts
│       ├── minigames.ts
│       └── ai.ts
lib/db/
└── src/
    └── schema/           – Drizzle table definitions (shared @workspace/db package)
```

---

## Authentication & session model

Authentication is implemented with a **custom database-backed session table** (`sessionsTable`). There is no `express-session`; sessions are managed entirely by code in `src/lib/auth.ts`.

### Cookie

| Property | Value |
|----------|-------|
| Name | `morizo_sid` |
| Type | HTTP-only, `SameSite: lax` |
| TTL | 30 days |
| Secure flag | Set in production (`NODE_ENV === "production"`) |

### Session lifecycle

1. **Login / Register** — bcrypt password check → `createSession(userId)` inserts a row in `sessionsTable` with a 64-character hex token and `expiresAt` timestamp → `setSessionCookie` sends cookie.
2. **Authenticated requests** — `attachUser` middleware reads the cookie, looks up the session in the DB (validates `expiresAt > now`), and populates `req.user`.
3. **Logout** — `destroySession` deletes the row → `clearSessionCookie` removes the cookie.

### Google OAuth

Available when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars are set. The flow is implemented manually (no Passport library): the `/auth/google` handler redirects the browser to Google's OAuth consent screen, and the `/auth/google/callback` handler exchanges the code for a token via `fetch("https://oauth2.googleapis.com/token")`. After verifying the ID token payload and upserting the user, the same `createSession` + `setSessionCookie` flow is used as for password login.

---

## Role system

Two roles exist. There is no separate superadmin entity.

| Role | Value | Permissions |
|------|-------|-------------|
| Player | `"player"` | Create/edit own quests, play sessions, join teams, use chat |
| Moderator | `"moderator"` | All player permissions + approve/reject quests, admin panel, manage user roles |

Role is stored in `users.role` (Postgres enum: `"player" | "moderator"`).

### Middleware

| Middleware | File | Effect |
|------------|------|--------|
| `requireAuth` | `lib/auth.ts` | Returns `401` if no valid session |
| `requireModerator` | `lib/auth.ts` | Returns `401` if no session, `403` if role ≠ moderator |

> **Note:** authorization is not uniformly middleware-based. Many route handlers perform inline `if (!req.user)` checks and return custom error shapes. `routes/admin.ts` uses a local `requireAdmin` helper function (defined in the same file) rather than the shared `requireModerator` middleware; the behaviour is equivalent but the error shape may differ slightly.

---

## REST API — endpoint reference

All paths below are relative to the `/api` prefix.

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register with email + password |
| POST | `/auth/login` | — | Login; sets `morizo_sid` cookie |
| POST | `/auth/logout` | Session | Destroy session and clear cookie |
| GET | `/auth/me` | — | `{ user }` if logged in, `{ user: null }` otherwise |
| GET | `/auth/google/status` | — | `{ enabled: bool }` — whether Google OAuth is configured |
| GET | `/auth/google` | — | Redirect to Google OAuth consent screen |
| GET | `/auth/google/callback` | — | OAuth callback; sets session cookie |

### Quests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/quests/featured` | — | Up to 6 published quests for the home page |
| GET | `/quests/mine` | Required | Quests authored by the current user |
| GET | `/quests` | — | Paginated catalogue (10 per page). Query params: `page` (int), `city` (string), `difficultyMin` (1–5), `difficultyMax` (1–5), `search` (string), `sort` (`new`\|`popular`\|`rating`) |
| POST | `/quests` | Required | Create a quest (status: draft) |
| GET | `/quests/:id` | — | Quest detail + checkpoints array |
| PATCH | `/quests/:id` | Required (author or mod) | Update quest metadata |
| POST | `/quests/:id/submit` | Required (author) | Submit draft/rejected quest for moderation; requires ≥ 3 checkpoints |
| POST | `/quests/:id/archive` | Required (author or mod) | Archive a published quest |

### Checkpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/quests/:id/checkpoints` | — | List checkpoints ordered by `orderIndex` |
| POST | `/quests/:id/checkpoints` | Required (author) | Add a checkpoint |
| PATCH | `/checkpoints/:checkpointId` | Required (author) | Update a checkpoint |
| DELETE | `/checkpoints/:checkpointId` | Required (author) | Delete a checkpoint |

### Play Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/quests/:id/sessions` | — | Completed sessions for a quest (run history) |
| POST | `/sessions/start` | Required | Start a solo session |
| GET | `/sessions/mine` | Required | Current user's sessions |
| GET | `/sessions/:id` | Required | Session detail with checkpoint state |
| POST | `/sessions/:id/answer` | Required | Submit an answer for the current checkpoint |
| POST | `/sessions/:id/abandon` | Required | Abandon an in-progress session |
| DELETE | `/sessions/:id` | Required | Delete a session record |
| POST | `/sessions/lobby` | Required | Create a multiplayer lobby |
| POST | `/sessions/lobby/:code/join` | Required | Join a lobby by invite code |
| GET | `/sessions/lobby/:code` | Required | Poll lobby state |

### Teams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teams/mine` | Required | Teams the current user belongs to |
| GET | `/teams` | — | All teams |
| POST | `/teams` | Required | Create a team |
| POST | `/teams/join` | Required | Join a team by join code |
| GET | `/teams/:id` | — | Team detail with members |

### Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/chat/channels` | Required | Channels the user is a member of |
| GET | `/chat/channels/:id` | Required | Channel detail + recent messages |
| POST | `/chat/channels` | Required | Create a channel (direct / quest / team) |
| POST | `/chat/channels/:id/join` | Required | Join an existing quest or team channel |
| POST | `/chat/channels/:id/leave` | Required | Leave a channel |
| GET | `/chat/channels/:id/messages` | Required | Paginated message history (up to 200) |
| POST | `/chat/channels/:id/messages` | Required | Send a message (text and/or attachment) |
| POST | `/chat/channels/:id/read` | Required | Mark all messages as read |
| GET | `/chat/channels/:id/stream` | Required | Server-Sent Events stream for live messages |
| GET | `/chat/users/search` | Required | Search users to start a direct conversation |

### Moderation

| Method | Path | Auth (mod) | Description |
|--------|------|------------|-------------|
| GET | `/moderation/queue` | Required | Quests awaiting moderation |
| POST | `/moderation/quests/:id/approve` | Required | Approve a quest → status `published` |
| POST | `/moderation/quests/:id/reject` | Required | Reject with reason; body: `{ reason: string }` |
| GET | `/admin/stats` | Required | Basic platform aggregate stats |

### Admin

| Method | Path | Auth (mod) | Description |
|--------|------|------------|-------------|
| GET | `/admin/overview` | Required | Dashboard stats (users, quests, sessions, top authors, sign-up trend) |
| GET | `/admin/users` | Required | User list; optional `search` query param |
| POST | `/admin/users/:id/role` | Required | Change a user's role |

### Leaderboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leaderboard/users` | — | Top 50 users by XP points |
| GET | `/leaderboard/teams` | — | Top 50 teams by total member XP |

### Achievements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/achievements/mine` | Required | Achievements earned by the current user |

### Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/profile` | Required | Update nickname, bio, city, avatar slot, theme, banner, etc. |
| GET | `/profile/me/timeline` | Required | Activity timeline for the current user |
| GET | `/profile/:userId` | — | Public profile of any user |

### Stats & Activity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats/overview` | — | Platform overview numbers (quests, users, sessions) |
| GET | `/activity/recent` | — | Recent public activity feed |

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Required | Unread notifications for current user |
| POST | `/notifications/:id/read` | Required | Mark a notification as read |
| POST | `/notifications/read-all` | Required | Mark all notifications as read |

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports` | Required | Submit a report about a quest or checkpoint |
| GET | `/reports/mine` | Required | Reports submitted by current user |
| GET | `/admin/reports` | Required (mod) | All reports with status filter |
| POST | `/admin/reports/:id/resolve` | Required (mod) | Resolve or dismiss a report |

### File Uploads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/uploads/image` | Required | Upload cover image (see [File upload flow](#file-upload-flow)) |
| GET | `/uploads/files/:name` | — | Serve an uploaded file by filename |

### AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/validate-quest` | — | AI-powered quest quality check |
| POST | `/ai/quest-assist` | — | AI writing assistance for quest content |
| GET | `/ai/status` | — | AI provider status (`{ enabled, provider, model }`) |

### Shop

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/shop/items` | — | Available shop items |
| GET | `/shop/me` | Required | Current user's purchased items |
| POST | `/shop/buy` | Required | Purchase an item |
| POST | `/shop/equip` | Required | Equip a purchased item |

---

## Geodata handling

### Coordinate storage

Checkpoint locations are stored as two `doublePrecision` (float8) columns in the `checkpoints` table:

```
lat  double precision   – latitude  (e.g. 56.3287)
lng  double precision   – longitude (e.g. 44.0028)
```

Values are set by the quest author via the Yandex Maps picker in the editor (click on map or geocode an address). The server stores and returns them as-is; no server-side distance computation occurs.

### Near-me filtering

There is no dedicated server-side near-me endpoint. The server returns the full paginated catalogue via `GET /api/quests`. A client-side near-me distance filter is planned (see task backlog) and will use the browser's Web Geolocation API combined with a Haversine formula in TypeScript to rank results by proximity. The city-centre fallback coordinate is already defined as a constant in `artifacts/morizo/src/lib/yandex-maps.ts`: **56.3269° N, 44.0075° E**.

---

## File upload flow

Quest cover photos are saved to the server's local filesystem via [multer](https://github.com/expressjs/multer).

### Request

```
POST /api/uploads/image
Content-Type: multipart/form-data
Cookie: morizo_sid=<token>

file=<binary image data>
```

Field name **must** be `file`. Requires a valid session cookie (`requireAuth`).

### Constraints enforced by the server

| Constraint | Value |
|------------|-------|
| Max file size | 5 MB |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Storage | Local disk — `artifacts/api-server/uploads/` |
| Filename | `{Date.now()}-{8 random chars}.{ext}` |

### Success response (200)

```json
{
  "url": "/api/uploads/files/1714300000000-abc12345.jpg",
  "filename": "1714300000000-abc12345.jpg",
  "size": 204800,
  "mimetype": "image/jpeg"
}
```

The returned `url` is a root-relative path; requests to `/api/uploads/files/:name` are served by the `GET /uploads/files/:name` handler which path-traversal-guards the filename and streams the file with `res.sendFile`.

### Error responses

| HTTP | `error` key | Cause |
|------|-------------|-------|
| 400 | `upload_failed` | File too large or wrong MIME type |
| 400 | `no_file` | `file` field missing from request |
| 401 | `UNAUTHORIZED` | No or expired session cookie |

---

## Validation & error conventions

### Request validation

Route handlers use [Zod](https://zod.dev/) schemas to validate request bodies and URL params. Invalid input returns **400** immediately with the Zod error message.

### Error response shapes

Most route handlers return:

```json
{ "error": "Human-readable message in Russian" }
```

The `requireAuth` and `requireModerator` middleware return a two-field shape:

```json
{ "error": "UNAUTHORIZED", "message": "Не авторизован" }
{ "error": "FORBIDDEN",    "message": "Нужны права модератора" }
```

Some upload handlers also include a `message` field alongside `error`.

### HTTP status codes

| Code | Meaning | Common causes |
|------|---------|---------------|
| 200 | OK | Successful read or mutation |
| 400 | Bad Request | Zod validation failure, business rule violation |
| 401 | Unauthorized | Missing or expired `morizo_sid` cookie |
| 403 | Forbidden | Insufficient role or ownership mismatch |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Unhandled database or runtime error |

### Example 400 — checkpoint minimum not met

```http
POST /api/quests/7/submit
→ 400
{ "error": "Добавьте минимум 3 точки маршрута перед отправкой" }
```

### Example 401 — no session (from requireAuth middleware)

```http
GET /api/quests/mine
→ 401
{ "error": "UNAUTHORIZED", "message": "Не авторизован" }
```

### Example 403 — insufficient role (from requireModerator middleware)

```http
GET /api/admin/overview
→ 403
{ "error": "FORBIDDEN", "message": "Нужны права модератора" }
```

### Example 404 — quest not found

```http
GET /api/quests/9999
→ 404
{ "error": "Квест не найден" }
```
