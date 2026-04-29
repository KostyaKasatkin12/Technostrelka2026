import { Router, type IRouter } from "express";
import { eq, sql, desc, count, and, gte, ilike, or } from "drizzle-orm";
import {
  db,
  usersTable,
  questsTable,
  playSessionsTable,
} from "@workspace/db";
import { AdminSetRoleBody as SetRoleBody } from "@workspace/api-zod";
import { userDto } from "../lib/quest-formatters.ts";

const router: IRouter = Router();

function requireAdmin(
  req: { user?: { role: string } },
  res: { status: (n: number) => { json: (b: unknown) => void } },
): boolean {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return false;
  }
  if (req.user.role !== "moderator") {
    res.status(403).json({ error: "Только для модераторов" });
    return false;
  }
  return true;
}

router.get("/admin/overview", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  const [
    [usersRow],
    [playersRow],
    [modsRow],
    [questsRow],
    [pubRow],
    [modQRow],
    [sessionsRow],
    [activeRow],
    [completionsRow],
    signupsRows,
    topAuthorsRows,
  ] = await Promise.all([
    db.select({ n: count() }).from(usersTable),
    db
      .select({ n: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "player")),
    db
      .select({ n: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "moderator")),
    db.select({ n: count() }).from(questsTable),
    db
      .select({ n: count() })
      .from(questsTable)
      .where(eq(questsTable.status, "published")),
    db
      .select({ n: count() })
      .from(questsTable)
      .where(eq(questsTable.status, "moderation")),
    db.select({ n: count() }).from(playSessionsTable),
    db
      .select({ n: count() })
      .from(playSessionsTable)
      .where(eq(playSessionsTable.status, "in_progress")),
    db
      .select({ n: count() })
      .from(playSessionsTable)
      .where(eq(playSessionsTable.status, "completed")),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${usersTable.createdAt}), 'YYYY-MM-DD')`,
        n: sql<number>`count(*)::int`,
      })
      .from(usersTable)
      .where(gte(usersTable.createdAt, since))
      .groupBy(sql`date_trunc('day', ${usersTable.createdAt})`),
    db
      .select({
        userId: questsTable.authorId,
        nickname: usersTable.nickname,
        n: sql<number>`count(*)::int`,
      })
      .from(questsTable)
      .innerJoin(usersTable, eq(usersTable.id, questsTable.authorId))
      .groupBy(questsTable.authorId, usersTable.nickname)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);

  const signupsMap = new Map(signupsRows.map((r) => [r.day, Number(r.n)]));
  const signupsLast7d: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    signupsLast7d.push({ date: key, count: signupsMap.get(key) ?? 0 });
  }

  res.json({
    users: Number(usersRow.n),
    players: Number(playersRow.n),
    moderators: Number(modsRow.n),
    quests: Number(questsRow.n),
    published: Number(pubRow.n),
    moderation: Number(modQRow.n),
    sessions: Number(sessionsRow.n),
    activeSessions: Number(activeRow.n),
    completions: Number(completionsRow.n),
    signupsLast7d,
    topAuthors: topAuthorsRows.map((r) => ({
      userId: r.userId,
      nickname: r.nickname,
      questCount: Number(r.n),
    })),
  });
});

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const search = typeof req.query.search === "string" ? req.query.search : "";
  const where = search
    ? or(
        ilike(usersTable.nickname, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      nickname: usersTable.nickname,
      role: usersTable.role,
      points: usersTable.points,
      completedCount: usersTable.completedCount,
      city: usersTable.city,
      avatarSlots: usersTable.avatarSlots,
      activeAvatarSlot: usersTable.activeAvatarSlot,
      createdAt: usersTable.createdAt,
      questCount: sql<number>`(select count(*) from ${questsTable} where ${questsTable.authorId} = ${usersTable.id})::int`,
    })
    .from(usersTable)
    .where(where as never)
    .orderBy(desc(usersTable.createdAt))
    .limit(200);

  res.json(
    rows.map((r) => ({
      ...r,
      questCount: Number(r.questCount),
      city: r.city ?? undefined,
      avatarSlots: r.avatarSlots ?? [],
      activeAvatarSlot: r.activeAvatarSlot ?? 0,
    })),
  );
});

router.post("/admin/users/:id/role", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Некорректный ID" });
    return;
  }
  const parsed = SetRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ role: parsed.data.role })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Пользователь не найден" });
    return;
  }
  res.json(userDto(updated));
});

export default router;
