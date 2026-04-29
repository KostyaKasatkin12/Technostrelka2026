import { Router, type IRouter } from "express";
import { eq, desc, sql, or } from "drizzle-orm";
import {
  db,
  questsTable,
  usersTable,
  playSessionsTable,
  teamsTable,
  wallPostsTable,
} from "@workspace/db";
import {
  ApproveQuestParams,
  RejectQuestParams,
  RejectQuestBody,
} from "@workspace/api-zod";
import { requireModerator } from "../lib/auth.ts";
import { attachQuestExtras } from "../lib/quest-formatters.ts";

const router: IRouter = Router();

router.use("/moderation", requireModerator);
router.use("/admin", requireModerator);

router.get("/moderation/queue", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.status, "moderation"))
    .orderBy(desc(questsTable.createdAt));
  res.json(await attachQuestExtras(rows));
});

router.post("/moderation/quests/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveQuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Квест не найден" });
    return;
  }
  if (existing.status !== "moderation") {
    res.status(400).json({ error: "Этот квест не на модерации" });
    return;
  }
  const [updated] = await db
    .update(questsTable)
    .set({
      status: "published",
      publishedAt: new Date(),
      rejectionReason: null,
    })
    .where(eq(questsTable.id, existing.id))
    .returning();

  const snippet = existing.description.length > 180
    ? existing.description.slice(0, 180).trimEnd() + "…"
    : existing.description;
  const postBody = `Только что опубликован мой новый квест «${existing.title}»! 🗺️ Проходите его: /quests/${existing.id}\n\n${snippet}`;
  await db.insert(wallPostsTable).values({
    userId: existing.authorId,
    body: postBody,
    imageUrl: existing.coverUrl ?? null,
  }).catch(() => {});

  res.json(updated);
});

router.post("/moderation/quests/:id/reject", async (req, res): Promise<void> => {
  const params = RejectQuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = RejectQuestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Квест не найден" });
    return;
  }
  const [updated] = await db
    .update(questsTable)
    .set({ status: "rejected", rejectionReason: body.data.reason })
    .where(eq(questsTable.id, existing.id))
    .returning();
  res.json(updated);
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [users, quests, sessions, teams] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(usersTable),
    db
      .select({
        status: questsTable.status,
        n: sql<number>`count(*)::int`,
      })
      .from(questsTable)
      .groupBy(questsTable.status),
    db
      .select({
        status: playSessionsTable.status,
        n: sql<number>`count(*)::int`,
      })
      .from(playSessionsTable)
      .groupBy(playSessionsTable.status),
    db.select({ n: sql<number>`count(*)::int` }).from(teamsTable),
  ]);

  const questByStatus: Record<string, number> = {};
  quests.forEach((r) => (questByStatus[r.status] = Number(r.n)));
  const sessionByStatus: Record<string, number> = {};
  sessions.forEach((r) => (sessionByStatus[r.status] = Number(r.n)));

  res.json({
    users: Number(users[0]?.n ?? 0),
    teams: Number(teams[0]?.n ?? 0),
    questByStatus,
    sessionByStatus,
  });
});

export default router;
