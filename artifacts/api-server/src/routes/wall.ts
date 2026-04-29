import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  wallPostsTable,
  wallReactionsTable,
  wallCommentsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth.ts";

const router: IRouter = Router();

async function enrichPost(post: typeof wallPostsTable.$inferSelect, viewerId?: number) {
  const [author] = await db
    .select({ nickname: usersTable.nickname, id: usersTable.id, avatarSlots: usersTable.avatarSlots, activeAvatarSlot: usersTable.activeAvatarSlot })
    .from(usersTable)
    .where(eq(usersTable.id, post.userId))
    .limit(1);

  const reactions = await db
    .select({ emoji: wallReactionsTable.emoji, count: sql<number>`count(*)::int` })
    .from(wallReactionsTable)
    .where(eq(wallReactionsTable.postId, post.id))
    .groupBy(wallReactionsTable.emoji);

  const myReactions = viewerId
    ? (await db.select({ emoji: wallReactionsTable.emoji }).from(wallReactionsTable).where(and(eq(wallReactionsTable.postId, post.id), eq(wallReactionsTable.userId, viewerId)))).map(r => r.emoji)
    : [];

  const [{ commentCount }] = await db
    .select({ commentCount: sql<number>`count(*)::int` })
    .from(wallCommentsTable)
    .where(eq(wallCommentsTable.postId, post.id));

  const enrichedReactions = reactions.map(r => ({
    emoji: r.emoji,
    count: r.count,
    myReaction: myReactions.includes(r.emoji),
  }));

  return {
    ...post,
    author: author ?? { nickname: "?", id: post.userId, avatarSlots: [], activeAvatarSlot: 0 },
    reactions: enrichedReactions,
    commentCount,
  };
}

router.get("/api/wall/feed", requireAuth, async (req, res): Promise<void> => {
  const viewerId = req.user!.id;
  const offset = Number(req.query.offset ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 20), 50);

  const posts = await db
    .select()
    .from(wallPostsTable)
    .orderBy(desc(wallPostsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(posts.map(p => enrichPost(p, viewerId)));
  res.json(enriched);
});

router.get("/api/wall/:userId/posts", async (req, res): Promise<void> => {
  const userId = Number(req.params.userId);
  const viewerId = (req as any).user?.id as number | undefined;
  const offset = Number(req.query.offset ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 20), 50);

  const posts = await db
    .select()
    .from(wallPostsTable)
    .where(eq(wallPostsTable.userId, userId))
    .orderBy(desc(wallPostsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(posts.map(p => enrichPost(p, viewerId)));
  res.json(enriched);
});

router.post("/api/wall/:userId/posts", requireAuth, async (req, res): Promise<void> => {
  const viewerId = req.user!.id;
  const body = ((req.body as any).body ?? "").trim();
  const imageUrl = (req.body as any).imageUrl ?? null;

  if (!body && !imageUrl) {
    res.status(400).json({ error: "Пост не может быть пустым" });
    return;
  }
  if (body.length > 2000) {
    res.status(400).json({ error: "Текст слишком длинный" });
    return;
  }

  const [post] = await db
    .insert(wallPostsTable)
    .values({ userId: viewerId, body, imageUrl })
    .returning();

  res.status(201).json(await enrichPost(post, viewerId));
});

router.delete("/api/wall/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [post] = await db.select().from(wallPostsTable).where(eq(wallPostsTable.id, id)).limit(1);
  if (!post) { res.status(404).json({ error: "Пост не найден" }); return; }
  if (post.userId !== req.user!.id && req.user!.role !== "moderator") {
    res.status(403).json({ error: "Нет прав" }); return;
  }
  await db.delete(wallPostsTable).where(eq(wallPostsTable.id, id));
  res.json({ ok: true });
});

router.post("/api/wall/posts/:id/react", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const userId = req.user!.id;
  const emoji = ((req.body as any).emoji ?? "").trim();
  const VALID = ["❤️", "🔥", "👊", "😂", "🏙️", "⚡"];
  if (!VALID.includes(emoji)) { res.status(400).json({ error: "Недопустимый эмодзи" }); return; }

  const existing = await db
    .select({ id: wallReactionsTable.id })
    .from(wallReactionsTable)
    .where(and(eq(wallReactionsTable.postId, postId), eq(wallReactionsTable.userId, userId), eq(wallReactionsTable.emoji, emoji)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(wallReactionsTable).where(eq(wallReactionsTable.id, existing[0].id));
    res.json({ toggled: "off", emoji });
  } else {
    await db.insert(wallReactionsTable).values({ postId, userId, emoji }).onConflictDoNothing();
    res.json({ toggled: "on", emoji });
  }
});

router.get("/api/wall/posts/:id/comments", async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const rows = await db
    .select({
      id: wallCommentsTable.id,
      body: wallCommentsTable.body,
      createdAt: wallCommentsTable.createdAt,
      userId: wallCommentsTable.userId,
      nickname: usersTable.nickname,
      activeAvatarSlot: usersTable.activeAvatarSlot,
      avatarSlots: usersTable.avatarSlots,
    })
    .from(wallCommentsTable)
    .innerJoin(usersTable, eq(wallCommentsTable.userId, usersTable.id))
    .where(eq(wallCommentsTable.postId, postId))
    .orderBy(wallCommentsTable.createdAt);
  res.json(rows);
});

router.post("/api/wall/posts/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const userId = req.user!.id;
  const body = ((req.body as any).body ?? "").trim();
  if (!body) { res.status(400).json({ error: "Комментарий пустой" }); return; }
  if (body.length > 500) { res.status(400).json({ error: "Комментарий слишком длинный" }); return; }

  const [comment] = await db
    .insert(wallCommentsTable)
    .values({ postId, userId, body })
    .returning();

  const [author] = await db.select({ nickname: usersTable.nickname, avatarSlots: usersTable.avatarSlots, activeAvatarSlot: usersTable.activeAvatarSlot }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.status(201).json({ ...comment, nickname: author?.nickname, avatarSlots: author?.avatarSlots ?? [], activeAvatarSlot: author?.activeAvatarSlot ?? 0 });
});

router.delete("/api/wall/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [c] = await db.select().from(wallCommentsTable).where(eq(wallCommentsTable.id, id)).limit(1);
  if (!c) { res.status(404).json({ error: "Не найден" }); return; }
  if (c.userId !== req.user!.id && req.user!.role !== "moderator") { res.status(403).json({ error: "Нет прав" }); return; }
  await db.delete(wallCommentsTable).where(eq(wallCommentsTable.id, id));
  res.json({ ok: true });
});

export default router;
