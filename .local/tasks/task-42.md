---
title: Quest editor: cover image upload + require 3 checkpoints
---
# Quest Editor: Cover Upload + 3-Checkpoint Minimum

## What & Why
Quest authors need to upload a cover photo from their computer (≤ 5 MB), and the moderation flow needs a stricter minimum of 3 checkpoints (was 2). The catalog also needs to be trimmed to 10 results per page to match the UX expectation. Finally, the checkpoint counter below the list should clearly tell the author how many more points they need before they can submit.

## Done looks like
- Quest editor shows a file input ("Загрузить обложку с компьютера") that accepts JPG/PNG/WebP up to 5 MB; after upload a preview thumbnail replaces any placeholder
- Submitting for moderation requires exactly 3+ checkpoints; the server returns a clear error if fewer exist
- Below the checkpoint list, when fewer than 3 checkpoints exist, an inline hint counts down: "Нужно ещё 2 точки перед отправкой" → "Нужно ещё 1 точку" → hint disappears at 3+
- Quest catalog shows 10 cards per page instead of 20; pagination controls still work
- Moderator's quest rejection dialog already works on the server — verify that the rejection reason (if missing from mod panel UI) is wired up so moderators can enter and save it

## Out of scope
- Cloud/S3 storage — files are saved locally (multer, `/uploads/image` route already exists)
- Photo-confirmation uploads during quest play (separate feature)

## Steps
1. **Server — change min checkpoint count** — In the submit route, change the `< 2` guard to `< 3` and update the error message accordingly. Change `PAGE_SIZE` from 20 to 10 in the list-quests route.
2. **Quest editor — file upload UI** — Add a file `<input accept="image/*">` with a 5 MB size guard to `edit.tsx`. On change, POST the file as `multipart/form-data` to `/api/uploads/image`, then set `meta.coverUrl` to the returned URL and show a thumbnail preview.
3. **Quest editor — checkpoint count hint** — Below the checkpoint cards section, derive how many more checkpoints are needed (max(0, 3 − checkpoints.length)) and render a coloured callout when the count is 1 or 2.
4. **Moderator reject-with-reason UI** — Inspect `pages/admin/index.tsx`; if the reject action has no reason text-input, add a small modal/inline field so the moderator can type the reason before confirming, calling the existing `/moderation/quests/:id/reject` endpoint.

## Relevant files
- `artifacts/api-server/src/routes/quests.ts:206-251`
- `artifacts/api-server/src/routes/uploads.ts`
- `artifacts/morizo/src/pages/quests/edit.tsx`
- `artifacts/morizo/src/pages/admin/index.tsx`