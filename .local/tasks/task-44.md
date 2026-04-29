---
title: Expand seed data to 8-12 quests with 3-7 checkpoints and sessions
---
# Expanded Seed Data: 8-12 Quests, 10-20 Sessions, Achievements

## What & Why
The current seed data has 8 quests but many have only 2 checkpoints (which is below the new 3-checkpoint minimum). This task expands the dataset to realistic demo-quality content: 8–12 quests across different Nizhny Novgorod districts, each with 3–7 checkpoints, plus 10–20 play sessions in various states (completed and abandoned). Achievement records are also seeded so the achievements page is non-empty.

## Done looks like
- Running the seed (or a fresh app start) produces 8–12 published quests spread across at least 4 NN districts (Нижегородский, Советский, Сормовский, Канавинский, etc.)
- Every quest has at least 3 checkpoints; some have up to 7
- All checkpoint names are real NN landmarks with realistic tasks and answers
- There are 10–20 play sessions across users: some `completed` (with score > 0, finishedAt set), some `abandoned` (no finishedAt), a few `in_progress`
- Seeded achievements include at least 5 distinct badge types (e.g. "Первый квест", "Горожанин", "Исследователь", "Командный игрок", "Рекордсмен") distributed across users
- Seed is idempotent — running it twice doesn't create duplicates

## Out of scope
- Auto-unlocking achievements at runtime based on game events (separate feature)
- Photo-confirmation checkpoints

## Steps
1. **Audit existing seed** — Check `seed.ts` for quests with fewer than 3 checkpoints and bring them up to 3 by adding real NN checkpoints. Remove or replace quests that can't realistically get 3 real-location checkpoints.
2. **Add new quests** — Write 3–5 additional `SeedQuest` objects for underrepresented districts; each needs 3–7 checkpoints with real NN addresses, lat/lng coordinates, meaningful task text (≥ 20 chars), and correct answers.
3. **Seed play sessions** — After inserting quests/checkpoints, create 10–20 `playSessionsTable` rows across the seeded users: varied statuses, realistic `score` values, `startedAt` and `finishedAt` timestamps spread over the past 30 days.
4. **Seed achievements** — Insert rows into `achievementsTable` for each user: at minimum "Первый квест" (questsCompleted ≥ 1), "Горожанин" (3+ quests), "Исследователь" (3+ districts), "Командный игрок" (team session), "Рекордсмен" (top score). Use realistic `earnedAt` timestamps.
5. **Verify idempotency** — Ensure the seed guard (`if users exist, skip`) still works after the additions.

## Relevant files
- `artifacts/api-server/src/seed.ts`
- `lib/db/src/index.ts` (table references)