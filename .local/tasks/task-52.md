---
title: Fix profile wall: posts only on your own profile
---
# Profile Wall Privacy Fix

## What & Why
Currently the "create post" form inside ProfileWall is rendered even when a logged-in user is viewing someone else's profile. This is confusing — users should only be able to post on their own wall. The backend already stores the logged-in user's ID as the post author regardless of whose profile page is being viewed, but the UI should enforce the rule visually too.

## Done looks like
- The compose/post form is only visible when the viewer is looking at their own profile
- On another user's public profile the wall shows that person's posts but has no compose box
- The feed page (global activity timeline) is read-only — reactions and comments are allowed but no "new post" entry point appears there
- Deleting a post remains restricted to the post author or a moderator (existing behaviour preserved)

## Out of scope
- Removing the ability to react or comment on other users' posts
- Backend changes — the backend logic is already correct

## Steps
1. **Prop audit** — Confirm that `ProfileWall` already receives an `isOwnProfile` or equivalent prop (or can derive it from the logged-in user ID vs the profile owner ID) and thread it through from the profile page components
2. **Hide compose form** — Conditionally render the new-post text area and submit button only when `isOwnProfile` is true
3. **Feed page** — Verify the global feed page has no compose entry point and remove it if present
4. **Delete guard** — Ensure the delete button on a `PostCard` only appears for the post's author or a moderator, not for arbitrary profile owners viewing someone else's post

## Relevant files
- `artifacts/morizo/src/components/profile-wall.tsx`
- `artifacts/morizo/src/pages/wall/feed.tsx`
- `artifacts/api-server/src/routes/wall.ts:68-88`