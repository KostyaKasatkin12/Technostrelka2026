# New Checkpoint Task Types: QR Scan + Photo Confirmation

## What & Why
The current checkpoint types (code word and multiple choice) suit text puzzles. Adding QR-code scanning and photo-confirmation types makes quests more varied and physical: a QR code on a landmark unlocks the next stage; a photo of the team at the location proves they were there.

## Done looks like
- **QR type**: In the play session, if a checkpoint is `taskType: "qr"`, the interface shows a "Scan QR" button that opens the device camera (via `jsQR` or the browser's Barcode Detection API); a match against the stored `codeAnswer` string unlocks the checkpoint
- **Photo type**: If `taskType: "photo"`, the player uploads a photo (file picker or camera capture); the photo is uploaded to the existing image-upload endpoint and the URL is stored; the checkpoint is marked correct immediately after a successful upload (moderation happens async — out of scope for now)
- The quest editor gains two new task-type options ("QR-код" and "Фото команды") with appropriate fields: QR type needs a `codeAnswer` field for the expected QR payload; photo type has no answer field
- The existing `code_word` and `choice` task types are unaffected
- All new types are stored in the existing `checkpoints` table via an extended `taskType` enum

## Out of scope
- Automated photo verification or AI moderation
- Generating QR codes for quest creators (they print their own)
- Server-side QR decoding

## Steps
1. **Schema update** — Extend `taskTypeEnum` in the DB schema to include `"qr"` and `"photo"` values; run `db:push` to apply
2. **Quest editor** — In the checkpoint editor (`edit.tsx`), add the two new task types to the type selector dropdown; for `qr` show a `codeAnswer` field ("Ожидаемый текст QR-кода"); for `photo` hide the answer fields and show an explanatory note
3. **Play session — QR** — Add a QR scanner panel that activates the device camera, uses `jsQR` to decode frames from a `<video>` + `<canvas>`, and submits the decoded string as the answer to the existing checkpoint-submit endpoint
4. **Play session — Photo** — Add a "Загрузить фото" button that opens a file input with `capture="environment"`; on selection, POST to `/api/uploads/image`, store the returned URL, and call the checkpoint-submit endpoint with the URL as the "answer"; mark correct server-side unconditionally for now
5. **Server-side submit handler** — In the sessions route, handle the two new types: `qr` answers are compared the same way as `code_word`; `photo` answers are always accepted as correct (URL non-empty)

## Relevant files
- `lib/db/src/schema/index.ts`
- `artifacts/api-server/src/routes/sessions.ts`
- `artifacts/morizo/src/pages/quests/edit.tsx`
- `artifacts/morizo/src/pages/play/session.tsx`
- `artifacts/api-server/src/routes/uploads.ts`
