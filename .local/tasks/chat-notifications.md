# Chat notifications for incoming messages

## What & Why
When a user is on a different page and receives a new direct or group message in the chat, they currently have no way to know until they manually navigate to /chat. Adding browser notifications (using the Web Notifications API) and an unread badge on the chat nav link makes the app feel live and keeps users engaged.

## Done looks like
- When a logged-in user receives a new message and the browser tab is not focused, a browser notification pops up showing the sender's name and the message preview (first 80 chars)
- The notification requires one-time permission; if the user denies, the feature is skipped silently
- The "Чат" link in the top navigation bar and the bottom mobile nav show a red dot badge when there are unread messages
- The badge disappears as soon as the user opens /chat
- Notifications only trigger for messages the current user did NOT send

## Out of scope
- Push notifications (requires a service worker + backend setup); this uses the simpler `Notification` browser API only
- Sound alerts
- Per-channel notification mute settings

## Steps
1. **Poll for unread count** — The chat page already fetches channels via `useListChatChannels`. Expose a lightweight hook (or reuse the existing query) that counts channels where `lastMessage` exists and the user is not the sender; run this poll at a 10-second interval when the user is logged in (use `refetchInterval` option in React Query)
2. **Unread badge in navigation** — In layout.tsx and bottom-nav.tsx, import the unread count; if the count is > 0, overlay a small red circle badge on the MessageSquare icon for the chat nav item; clear it when the route changes to /chat
3. **Browser notification on new message** — When the polled channel list returns a new `lastMessage` that wasn't seen before (compare to a ref of previous channel states), and the page is not visible (`document.visibilityState !== 'visible'`), fire a `new Notification(senderName, { body: messageText })` after requesting permission once on mount
4. **Permission request** — On app load (in layout.tsx), if the user is logged in and `Notification.permission === 'default'`, call `Notification.requestPermission()` once; store the result in a ref so it is never called twice per session

## Relevant files
- `artifacts/morizo/src/components/layout.tsx`
- `artifacts/morizo/src/components/bottom-nav.tsx`
- `artifacts/morizo/src/pages/chat.tsx`
