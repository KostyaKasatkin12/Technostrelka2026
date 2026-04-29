# Anti-cheat: Limit Code-Word Attempts

## What & Why
Players can currently brute-force code-word checkpoints by submitting answers as fast as they want. A simple server-side attempt counter with a growing cooldown discourages guessing and makes the game fairer without being frustrating.

## Done looks like
- After a wrong code-word answer the player must wait before trying again (first wrong: 10 s cooldown; second: 30 s; third+: 60 s)
- The wait is enforced server-side — the submit endpoint returns a `429` with `retryAfter` seconds if the cooldown has not elapsed
- The frontend reads `retryAfter` and shows a countdown ("Повторная попытка через N сек…") on the submit button so the player knows how long to wait
- Choice-type checkpoints are not rate-limited (wrong choices have no penalty — this matches common quest game design)
- A maximum of 5 wrong attempts per checkpoint per session is tracked and stored; no further penalty beyond the 60 s cooldown is imposed at this stage

## Out of scope
- Banning users who exceed attempts
- Photo or QR checkpoint types (separate task)

## Steps
1. **Track attempts in DB** — Add `wrongAttempts` (integer, default 0) and `lastWrongAt` (timestamp nullable) columns to `session_answers` or, preferably, a new `checkpoint_attempt_state` table keyed on (sessionId, checkpointId)
2. **Cooldown enforcement** — In the checkpoint-submit route, look up the attempt state; if cooldown has not elapsed return `429 { error: "COOLDOWN", retryAfter: N }`; otherwise process the answer and on a wrong answer increment the counter and set `lastWrongAt`
3. **Cooldown schedule** — wrong attempt 1 → 10 s; 2 → 30 s; 3+ → 60 s (configurable constant at the top of the route file)
4. **Frontend countdown** — On `429` response, start a client-side countdown timer displaying the remaining wait; disable the submit button until the timer reaches zero

## Relevant files
- `artifacts/api-server/src/routes/sessions.ts`
- `lib/db/src/schema/index.ts`
- `artifacts/morizo/src/pages/play/session.tsx`
