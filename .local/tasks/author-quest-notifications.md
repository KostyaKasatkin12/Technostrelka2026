# Author Notifications: Quest Started / Completed

## What & Why
Quest creators currently have no way to know when someone is playing their quest. A lightweight notification ("ваш квест начали" / "ваш квест прошли") gives authors useful social feedback and encourages them to keep creating.

Security constraint: the notification must NOT reveal which player started the quest, their current location, or real-time progress. Only aggregate signals ("кто-то" started / completed) are sent, so a malicious author cannot track or stalk specific players.

## Done looks like
- When any player submits the first checkpoint answer in a session, the quest author receives an in-app notification: "Кто-то начал твой квест «[title]»"
- When any player completes all checkpoints, the author receives: "Кто-то прошёл твой квест «[title]» — поздравляем!"
- Notifications appear in the existing notification bell/inbox inside the app (no player identity, no coordinates, no score shared)
- No external push notifications or email in this phase — in-app only

## Out of scope
- Real-time WebSocket push to the author's browser (notifications are fetched on next page load / bell click, not streamed live)
- Revealing player identity, score, or location to the author
- Author visibility into in-progress progress beyond the two trigger events

## Steps
1. **Trigger points** — In the sessions route, detect (a) when `currentIndex` advances from 0 to 1 (first checkpoint answered = "started") and (b) when status changes to "completed"; look up the quest's `authorId` at each trigger
2. **Insert notification** — Insert a row into `notificationsTable` for the author with an appropriate `kind` ("quest_started" / "quest_completed"), `title`, and `body` as described above; no player data in the body
3. **Frontend bell** — Verify the notification bell component already polls / re-fetches the notifications endpoint; no frontend changes needed if it already does

## Relevant files
- `artifacts/api-server/src/routes/sessions.ts`
- `lib/db/src/schema/index.ts:256-275`
- `artifacts/morizo/src/components/` (notification bell component)
