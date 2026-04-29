import { useEffect, useRef } from "react";
import { useListChatChannels } from "@workspace/api-client-react";

/**
 * Polls chat channels every 10 seconds, returns total unread count and
 * fires browser notifications for new messages while the tab is hidden.
 *
 * @param myUserId  — ID of the logged-in user (null/undefined = hook is dormant)
 */
export function useUnreadChat(myUserId: number | null | undefined) {
  const enabled = !!myUserId;

  const { data: channels } = useListChatChannels({
    query: {
      enabled,
      refetchInterval: enabled ? 10_000 : false,
    },
  });

  // Track "last seen" lastMessage id per channel to detect new messages
  const seenRef = useRef<Map<number, number>>(new Map());
  // Has the ref been initialised (first fetch)?
  const initialisedRef = useRef(false);
  // Notification permission requested this session?
  const permRequestedRef = useRef(false);
  // Previous myUserId to detect account switches
  const prevUserIdRef = useRef<number | null | undefined>(myUserId);

  // Reset tracking state when the logged-in user changes (logout / account switch)
  useEffect(() => {
    if (prevUserIdRef.current !== myUserId) {
      seenRef.current = new Map();
      initialisedRef.current = false;
      prevUserIdRef.current = myUserId;
    }
  }, [myUserId]);

  useEffect(() => {
    if (!channels || !myUserId) return;

    // On first fetch just record the current state — don't fire notifications
    if (!initialisedRef.current) {
      channels.forEach((c) => {
        if (c.lastMessage) {
          seenRef.current.set(c.id, c.lastMessage.id);
        }
      });
      initialisedRef.current = true;
      return;
    }

    // Detect new messages — only notify for direct/group channels per spec
    const newMessages: Array<{ sender: string; body: string }> = [];
    channels.forEach((c) => {
      const lm = c.lastMessage;
      if (!lm) return;
      const prevId = seenRef.current.get(c.id);
      const notifiable = c.kind === "direct" || c.kind === "group";
      if (lm.id !== prevId && lm.userId !== myUserId && notifiable) {
        const preview = lm.body
          ? lm.body.slice(0, 80)
          : lm.attachment?.kind === "quest_link"
            ? "📍 Поделился квестом"
            : lm.attachment?.kind === "team_invite"
              ? "👥 Приглашение в команду"
              : "Новое сообщение";
        newMessages.push({
          sender: lm.authorNickname ?? c.title,
          body: preview,
        });
      }
      seenRef.current.set(c.id, lm.id);
    });

    // Fire browser notifications only when the tab is hidden
    if (
      newMessages.length > 0 &&
      document.visibilityState !== "visible" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      newMessages.forEach(({ sender, body }) => {
        try {
          new Notification(sender, { body, tag: "morizo-chat" });
        } catch {
          // Notification constructor can throw in some contexts — ignore
        }
      });
    }
  }, [channels, myUserId]);

  // Request permission once per session when user is logged in
  useEffect(() => {
    if (!enabled || permRequestedRef.current) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      permRequestedRef.current = true;
      void Notification.requestPermission();
    }
  }, [enabled]);

  const total =
    myUserId && channels
      ? channels.reduce((sum, c) => sum + (c.unread ?? 0), 0)
      : 0;
  return total;
}
