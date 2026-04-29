import { Router, type IRouter, type Response } from "express";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import {
  db,
  chatChannelsTable,
  chatMembersTable,
  chatMessagesTable,
  usersTable,
  questsTable,
  teamsTable,
  teamMembersTable,
  type ChatChannel,
  type ChatMessage,
} from "@workspace/db";
import { requireAuth } from "../lib/auth.ts";
import { pushNotification } from "./notifications.ts";

const router: IRouter = Router();

type SubscribersByChannel = Map<number, Set<Response>>;
const subscribers: SubscribersByChannel = new Map();

function publish(channelId: number, event: string, payload: unknown): void {
  const subs = subscribers.get(channelId);
  if (!subs || subs.size === 0) return;
  const text = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of subs) {
    try {
      res.write(text);
    } catch {
      /* ignore */
    }
  }
}

async function isMember(channelId: number, userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: chatMembersTable.id })
    .from(chatMembersTable)
    .where(
      and(
        eq(chatMembersTable.channelId, channelId),
        eq(chatMembersTable.userId, userId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function ensureMember(channelId: number, userId: number): Promise<void> {
  const exists = await isMember(channelId, userId);
  if (exists) return;
  await db
    .insert(chatMembersTable)
    .values({ channelId, userId })
    .onConflictDoNothing();
}

type EnrichedChannel = ChatChannel & {
  title: string;
  memberCount: number;
  unread: number;
  lastMessage:
    | (ChatMessage & { authorNickname?: string; authorAvatarSlot?: number })
    | null;
  members: Array<{
    userId: number;
    nickname: string;
    activeAvatarSlot: number;
  }>;
};

async function enrichChannel(
  channel: ChatChannel,
  userId: number,
): Promise<EnrichedChannel> {
  const [{ count: memberCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.channelId, channel.id));

  const [me] = await db
    .select({ lastReadAt: chatMembersTable.lastReadAt })
    .from(chatMembersTable)
    .where(
      and(
        eq(chatMembersTable.channelId, channel.id),
        eq(chatMembersTable.userId, userId),
      ),
    )
    .limit(1);

  const [{ count: unread }] = me?.lastReadAt
    ? await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatMessagesTable)
        .where(
          and(
            eq(chatMessagesTable.channelId, channel.id),
            gt(chatMessagesTable.createdAt, me.lastReadAt),
            ne(chatMessagesTable.userId, userId),
          ),
        )
    : [{ count: 0 }];

  const [last] = await db
    .select({
      msg: chatMessagesTable,
      authorNickname: usersTable.nickname,
      authorAvatarSlot: usersTable.activeAvatarSlot,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(usersTable.id, chatMessagesTable.userId))
    .where(eq(chatMessagesTable.channelId, channel.id))
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(1);

  const memberRows = await db
    .select({
      userId: chatMembersTable.userId,
      nickname: usersTable.nickname,
      activeAvatarSlot: usersTable.activeAvatarSlot,
    })
    .from(chatMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, chatMembersTable.userId))
    .where(eq(chatMembersTable.channelId, channel.id))
    .limit(20);

  let title = channel.title ?? "";
  if (!title) {
    if (channel.kind === "direct") {
      const other = memberRows.find((m) => m.userId !== userId);
      title = other?.nickname ?? "Личный чат";
    } else if (channel.kind === "quest" && channel.questId) {
      const [q] = await db
        .select({ title: questsTable.title })
        .from(questsTable)
        .where(eq(questsTable.id, channel.questId))
        .limit(1);
      title = q?.title ? `Квест · ${q.title}` : "Чат квеста";
    } else if (channel.kind === "team" && channel.teamId) {
      const [t] = await db
        .select({ name: teamsTable.name })
        .from(teamsTable)
        .where(eq(teamsTable.id, channel.teamId))
        .limit(1);
      title = t?.name ? `Команда · ${t.name}` : "Чат команды";
    } else {
      title = "Группа";
    }
  }

  return {
    ...channel,
    title,
    memberCount: Number(memberCount ?? 0),
    unread: Number(unread ?? 0),
    members: memberRows.map((m) => ({
      userId: m.userId,
      nickname: m.nickname,
      activeAvatarSlot: m.activeAvatarSlot ?? 0,
    })),
    lastMessage: last
      ? {
          ...last.msg,
          authorNickname: last.authorNickname ?? undefined,
          authorAvatarSlot: last.authorAvatarSlot ?? 0,
        }
      : null,
  };
}

router.get("/chat/channels", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const memberships = await db
    .select({ channelId: chatMembersTable.channelId })
    .from(chatMembersTable)
    .where(eq(chatMembersTable.userId, userId));
  const ids = memberships.map((m) => m.channelId);
  if (ids.length === 0) {
    res.json([]);
    return;
  }
  const channels = await db
    .select()
    .from(chatChannelsTable)
    .where(inArray(chatChannelsTable.id, ids));
  const enriched = await Promise.all(
    channels.map((c) => enrichChannel(c, userId)),
  );
  enriched.sort((a, b) => {
    const ta = a.lastMessage?.createdAt ?? a.createdAt;
    const tb = b.lastMessage?.createdAt ?? b.createdAt;
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  res.json(enriched);
});

router.get("/chat/channels/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Неверный id" });
    return;
  }
  const [channel] = await db
    .select()
    .from(chatChannelsTable)
    .where(eq(chatChannelsTable.id, id))
    .limit(1);
  if (!channel) {
    res.status(404).json({ error: "Канал не найден" });
    return;
  }
  if (!(await isMember(id, userId))) {
    res.status(403).json({ error: "Вы не состоите в этом канале" });
    return;
  }
  res.json(await enrichChannel(channel, userId));
});

router.post("/chat/channels", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const body = req.body as {
    kind?: "direct" | "group" | "quest" | "team";
    title?: string;
    memberIds?: number[];
    questId?: number;
    teamId?: number;
  };
  const kind = body.kind;
  if (!kind || !["direct", "group", "quest", "team"].includes(kind)) {
    res.status(400).json({ error: "Неверный тип канала" });
    return;
  }

  // direct: deduplicate by member pair
  if (kind === "direct") {
    const otherId = (body.memberIds ?? [])[0];
    if (!otherId || otherId === userId) {
      res.status(400).json({ error: "Укажите собеседника" });
      return;
    }
    const [otherUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, otherId))
      .limit(1);
    if (!otherUser) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    const existing = await db
      .select({ channelId: chatMembersTable.channelId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, userId));
    const myChannelIds = existing.map((e) => e.channelId);
    if (myChannelIds.length > 0) {
      const candidates = await db
        .select({
          channel: chatChannelsTable,
          memberCount: sql<number>`count(${chatMembersTable.id})::int`,
        })
        .from(chatChannelsTable)
        .innerJoin(
          chatMembersTable,
          eq(chatMembersTable.channelId, chatChannelsTable.id),
        )
        .where(
          and(
            eq(chatChannelsTable.kind, "direct"),
            inArray(chatChannelsTable.id, myChannelIds),
          ),
        )
        .groupBy(chatChannelsTable.id);
      for (const c of candidates) {
        if (Number(c.memberCount) === 2) {
          const isOther = await isMember(c.channel.id, otherId);
          if (isOther) {
            res.json(await enrichChannel(c.channel, userId));
            return;
          }
        }
      }
    }
    const [created] = await db
      .insert(chatChannelsTable)
      .values({ kind: "direct", createdById: userId })
      .returning();
    await db
      .insert(chatMembersTable)
      .values([
        { channelId: created.id, userId },
        { channelId: created.id, userId: otherId },
      ]);
    res.json(await enrichChannel(created, userId));
    return;
  }

  if (kind === "quest") {
    if (!body.questId) {
      res.status(400).json({ error: "questId обязателен" });
      return;
    }
    const [existing] = await db
      .select()
      .from(chatChannelsTable)
      .where(
        and(
          eq(chatChannelsTable.kind, "quest"),
          eq(chatChannelsTable.questId, body.questId),
        ),
      )
      .limit(1);
    if (existing) {
      await ensureMember(existing.id, userId);
      res.json(await enrichChannel(existing, userId));
      return;
    }
    const [q] = await db
      .select()
      .from(questsTable)
      .where(eq(questsTable.id, body.questId))
      .limit(1);
    if (!q) {
      res.status(404).json({ error: "Квест не найден" });
      return;
    }
    const [created] = await db
      .insert(chatChannelsTable)
      .values({
        kind: "quest",
        questId: body.questId,
        title: `Сбор · ${q.title}`,
        createdById: userId,
      })
      .returning();
    await db.insert(chatMembersTable).values({ channelId: created.id, userId });
    res.json(await enrichChannel(created, userId));
    return;
  }

  if (kind === "team") {
    if (!body.teamId) {
      res.status(400).json({ error: "teamId обязателен" });
      return;
    }
    const isTeamMember = await db
      .select({ id: teamMembersTable.id })
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, body.teamId),
          eq(teamMembersTable.userId, userId),
        ),
      )
      .limit(1);
    if (isTeamMember.length === 0) {
      res.status(403).json({ error: "Вы не состоите в этой команде" });
      return;
    }
    const [existing] = await db
      .select()
      .from(chatChannelsTable)
      .where(
        and(
          eq(chatChannelsTable.kind, "team"),
          eq(chatChannelsTable.teamId, body.teamId),
        ),
      )
      .limit(1);
    if (existing) {
      await ensureMember(existing.id, userId);
      res.json(await enrichChannel(existing, userId));
      return;
    }
    const [t] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, body.teamId))
      .limit(1);
    if (!t) {
      res.status(404).json({ error: "Команда не найдена" });
      return;
    }
    const [created] = await db
      .insert(chatChannelsTable)
      .values({
        kind: "team",
        teamId: body.teamId,
        title: `Команда · ${t.name}`,
        createdById: userId,
      })
      .returning();
    const members = await db
      .select({ userId: teamMembersTable.userId })
      .from(teamMembersTable)
      .where(eq(teamMembersTable.teamId, body.teamId));
    await db
      .insert(chatMembersTable)
      .values(members.map((m) => ({ channelId: created.id, userId: m.userId })))
      .onConflictDoNothing();
    res.json(await enrichChannel(created, userId));
    return;
  }

  // group
  const memberIds = Array.from(new Set([userId, ...(body.memberIds ?? [])]));
  const [created] = await db
    .insert(chatChannelsTable)
    .values({
      kind: "group",
      title: body.title ?? "Группа",
      createdById: userId,
    })
    .returning();
  await db
    .insert(chatMembersTable)
    .values(memberIds.map((uid) => ({ channelId: created.id, userId: uid })))
    .onConflictDoNothing();
  res.json(await enrichChannel(created, userId));
});

router.post(
  "/chat/channels/:id/join",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const [channel] = await db
      .select()
      .from(chatChannelsTable)
      .where(eq(chatChannelsTable.id, id))
      .limit(1);
    if (!channel) {
      res.status(404).json({ error: "Канал не найден" });
      return;
    }
    if (channel.kind === "direct") {
      res.status(403).json({ error: "Нельзя присоединиться к личному чату" });
      return;
    }
    await ensureMember(id, userId);
    res.json(await enrichChannel(channel, userId));
  },
);

router.post(
  "/chat/channels/:id/leave",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    await db
      .delete(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.channelId, id),
          eq(chatMembersTable.userId, userId),
        ),
      );
    res.json({ ok: true });
  },
);

router.get(
  "/chat/channels/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!(await isMember(id, userId))) {
      res.status(403).json({ error: "Доступ запрещён" });
      return;
    }
    const limit = Math.min(Number(req.query.limit ?? 100), 200);
    const rows = await db
      .select({
        msg: chatMessagesTable,
        authorNickname: usersTable.nickname,
        authorAvatarSlot: usersTable.activeAvatarSlot,
      })
      .from(chatMessagesTable)
      .leftJoin(usersTable, eq(usersTable.id, chatMessagesTable.userId))
      .where(eq(chatMessagesTable.channelId, id))
      .orderBy(asc(chatMessagesTable.createdAt))
      .limit(limit);
    res.json(
      rows.map((r) => ({
        ...r.msg,
        authorNickname: r.authorNickname ?? undefined,
        authorAvatarSlot: r.authorAvatarSlot ?? 0,
      })),
    );
  },
);

router.post(
  "/chat/channels/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!(await isMember(id, userId))) {
      res.status(403).json({ error: "Доступ запрещён" });
      return;
    }
    const body = req.body as {
      body?: string;
      attachment?:
        | { kind: "quest_link"; questId: number }
        | { kind: "team_invite"; teamId: number; joinCode: string }
        | null;
    };
    const text = (body.body ?? "").trim();
    if (!text && !body.attachment) {
      res.status(400).json({ error: "Сообщение пустое" });
      return;
    }
    if (text.length > 4000) {
      res.status(400).json({ error: "Слишком длинное сообщение" });
      return;
    }
    let attachment = body.attachment ?? null;

    if (!attachment && text) {
      // Auto-detect /quests/:id links and replace with attachment
      const m = text.match(/\/quests\/(\d+)(?!\/)/);
      if (m) {
        const qid = Number(m[1]);
        const [q] = await db
          .select({ id: questsTable.id })
          .from(questsTable)
          .where(eq(questsTable.id, qid))
          .limit(1);
        if (q) attachment = { kind: "quest_link", questId: qid };
      }
    }
    const [created] = await db
      .insert(chatMessagesTable)
      .values({
        channelId: id,
        userId,
        body: text,
        attachment,
      })
      .returning();
    const [author] = await db
      .select({
        nickname: usersTable.nickname,
        activeAvatarSlot: usersTable.activeAvatarSlot,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const enriched = {
      ...created,
      authorNickname: author?.nickname ?? undefined,
      authorAvatarSlot: author?.activeAvatarSlot ?? 0,
    };
    await db
      .update(chatMembersTable)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(chatMembersTable.channelId, id),
          eq(chatMembersTable.userId, userId),
        ),
      );
    publish(id, "message", enriched);

    const otherMembers = await db
      .select({ userId: chatMembersTable.userId })
      .from(chatMembersTable)
      .where(
        and(
          eq(chatMembersTable.channelId, id),
          ne(chatMembersTable.userId, userId),
        ),
      );

    const channelRow = await db
      .select({ title: chatChannelsTable.title })
      .from(chatChannelsTable)
      .where(eq(chatChannelsTable.id, id))
      .limit(1);

    const channelName = channelRow[0]?.title ?? "чат";
    const senderNick = author?.nickname ?? "Кто-то";
    const preview = text.length > 60 ? text.slice(0, 57) + "…" : text || "📎 вложение";

    await Promise.all(
      otherMembers.map((m) =>
        pushNotification({
          userId: m.userId,
          kind: "chat_message",
          title: `${senderNick} → ${channelName}`,
          body: preview,
          href: `/chat?channel=${id}`,
        }),
      ),
    );

    res.json(enriched);
  },
);

router.post(
  "/chat/channels/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!(await isMember(id, userId))) {
      res.status(403).json({ error: "Доступ запрещён" });
      return;
    }
    await db
      .update(chatMembersTable)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(chatMembersTable.channelId, id),
          eq(chatMembersTable.userId, userId),
        ),
      );
    res.json({ ok: true });
  },
);

// Server-Sent Events stream for live messages
router.get(
  "/chat/channels/:id/stream",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (!(await isMember(id, userId))) {
      res.status(403).end();
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(`event: open\ndata: {"ok":true}\n\n`);

    let subs = subscribers.get(id);
    if (!subs) {
      subs = new Set();
      subscribers.set(id, subs);
    }
    subs.add(res);

    const ping = setInterval(() => {
      try {
        res.write(`event: ping\ndata: {"t":${Date.now()}}\n\n`);
      } catch {
        /* ignore */
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(ping);
      subs?.delete(res);
      if (subs && subs.size === 0) subscribers.delete(id);
    });
  },
);

router.get("/chat/users/search", requireAuth, async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  if (q.length < 1) {
    res.json([]);
    return;
  }
  const rows = await db
    .select({
      id: usersTable.id,
      nickname: usersTable.nickname,
      activeAvatarSlot: usersTable.activeAvatarSlot,
      city: usersTable.city,
    })
    .from(usersTable)
    .where(sql`lower(${usersTable.nickname}) like ${`%${q}%`}`)
    .limit(10);
  res.json(
    rows
      .filter((r) => r.id !== req.user!.id)
      .map((r) => ({
        id: r.id,
        nickname: r.nickname,
        activeAvatarSlot: r.activeAvatarSlot ?? 0,
        city: r.city ?? undefined,
      })),
  );
});

export default router;
