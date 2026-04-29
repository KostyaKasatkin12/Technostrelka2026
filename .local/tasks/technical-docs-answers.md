# Technical Documentation + Quest Answers Reference File

## What & Why
The project needs two plain-text documents: one describing the backend architecture (API, roles, geodata, file uploads, validation/errors) for assessment/review purposes, and one listing all checkpoint answers from the seeded quests so testers and admins can quickly look up correct responses during demos.

## Done looks like
- `docs/BACKEND.md` exists at the repo root with sections covering: REST API overview (endpoints grouped by domain), role model (player/moderator/admin), geodata handling (coordinate storage, near-me distance calculation approach), file upload flow (local multer, size limits, returned URL), and validation/error conventions (400/401/403/404 patterns with examples).
- `docs/QUEST_ANSWERS.md` exists with a table per quest showing: checkpoint order, checkpoint name, task text, answer type, and the correct answer (codeAnswer or the correct choice text). Sourced from current seed data.
- Both files are plain Markdown, human-readable without a build step.

## Out of scope
- Auto-generated OpenAPI HTML docs
- gRPC/tRPC (the project uses REST)
- Anything requiring code changes

## Steps
1. **Write BACKEND.md** — Describe the Express REST API structure, all route groups (auth, quests, checkpoints, sessions, teams, chat, uploads, moderation, achievements, leaderboard), the role system (player/moderator with JWT session cookies), geodata (lat/lng stored as numeric columns, Haversine in JS for near-me), file uploads (POST /uploads/image, multer diskStorage, 5 MB limit, returns {url}), and standard error response shapes for 400/401/403/404.
2. **Write QUEST_ANSWERS.md** — Query or read seed data to compile a clear reference table of every quest's checkpoints and their correct answers.

## Relevant files
- `artifacts/api-server/src/routes/` (all route files for accurate endpoint listing)
- `artifacts/api-server/src/seed.ts` (source of truth for checkpoint answers)
- `artifacts/api-server/src/routes/uploads.ts`
