# Team Achievement Badges

## What & Why
Individual player achievements exist, but teams have no milestones. Team badges encourage players to stick with their team and take on challenges together. Five badges cover the most motivating group milestones.

## Done looks like
- Five team-level badges are tracked and displayed on the team profile page:
  - **"Пятёрка"** — team completed 5 quests together
  - **"Без подсказок"** — team completed a quest without any member using a hint
  - **"Спринтеры"** — team completed a quest in less than 75% of the estimated duration
  - **"Первопроходцы"** — team was the first group to complete a new quest (first team session to finish it)
  - **"Разведчики"** — team completed quests in 3 or more distinct districts
- Badges are stored in a new `team_achievements` table keyed on `(teamId, code)`; insertion is idempotent
- Badges are checked and awarded server-side after each team session completes
- The team profile page shows the badge icons and names in a horizontal strip (locked badges shown as greyed-out silhouettes)

## Out of scope
- Individual-player hints used during a solo run don't affect team badges
- Badge notifications to team members (future work)
- Retroactive awarding for sessions before this task (only future sessions trigger checks)

## Steps
1. **Schema** — Create `team_achievements` table with `id`, `teamId` (FK), `code` (varchar 64), `name`, `description`, `icon`, `earnedAt`; add a unique index on `(teamId, code)`; run `db:push`
2. **Award logic** — Write a `checkTeamAchievements(teamId, sessionId)` function called at the end of every completed team session; it queries completed team sessions for this team and evaluates each badge condition, inserting new rows with `onConflictDoNothing`
3. **Hint tracking** — "Без подсказок": add a `hintUsed` boolean (default false) to the session or session_answers table, set it when the hint is revealed in a team session; use it in the badge evaluation
4. **Team profile page** — Add a "Достижения команды" section showing all 5 badge slots: earned ones display icon + name + date; unearned ones show a locked grey version with the name

## Relevant files
- `lib/db/src/schema/index.ts`
- `artifacts/api-server/src/routes/sessions.ts`
- `artifacts/api-server/src/routes/teams.ts`
- `artifacts/morizo/src/pages/teams/detail.tsx`
- `artifacts/morizo/src/pages/play/session.tsx`
