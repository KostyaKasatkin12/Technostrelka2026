import { Router, type IRouter } from "express";
import { eq, sql, desc, and, gte, count, ilike } from "drizzle-orm";
import {
  db,
  usersTable,
  questsTable,
  achievementsTable,
  playSessionsTable,
} from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { userDto } from "../lib/quest-formatters.ts";

const router: IRouter = Router();

router.patch("/profile", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.bannerUrl !== undefined) updates.bannerUrl = data.bannerUrl;
  if (data.city !== undefined) updates.city = data.city;
  if (data.theme !== undefined) updates.theme = data.theme;
  if (data.avatarSlots !== undefined) updates.avatarSlots = data.avatarSlots;
  if (data.activeAvatarSlot !== undefined)
    updates.activeAvatarSlot = data.activeAvatarSlot;

  // Custom uploaded media (not in OpenAPI yet) — accept raw fields if present
  const raw = req.body as Record<string, unknown>;
  if (typeof raw.customAvatarUrl === "string" || raw.customAvatarUrl === null) {
    updates.customAvatarUrl = raw.customAvatarUrl ?? null;
  }
  if (typeof raw.customBannerUrl === "string" || raw.customBannerUrl === null) {
    updates.customBannerUrl = raw.customBannerUrl ?? null;
  }

  if (Object.keys(updates).length === 0) {
    res.json(userDto(req.user));
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user.id))
    .returning();
  res.json(userDto(updated));
});

router.get("/profile/me/timeline", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const days = 7;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${playSessionsTable.startedAt}), 'YYYY-MM-DD')`,
      sessions: sql<number>`count(*)::int`,
      points: sql<number>`coalesce(sum(${playSessionsTable.score}), 0)::int`,
    })
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.userId, req.user.id),
        gte(playSessionsTable.startedAt, since),
      ),
    )
    .groupBy(sql`date_trunc('day', ${playSessionsTable.startedAt})`);

  const map = new Map(rows.map((r) => [r.day, r]));
  const result: Array<{ date: string; points: number; sessions: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = map.get(key);
    result.push({
      date: key,
      points: row ? Number(row.points) : 0,
      sessions: row ? Number(row.sessions) : 0,
    });
  }
  res.json(result);
});

router.get("/profile/:userId", async (req, res): Promise<void> => {
  const id = Number(req.params.userId);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Некорректный ID" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "Профиль не найден" });
    return;
  }

  const [achs, sessions, questCountRow, rankRow] = await Promise.all([
    db
      .select()
      .from(achievementsTable)
      .where(eq(achievementsTable.userId, id))
      .orderBy(desc(achievementsTable.earnedAt))
      .limit(12),
    db
      .select()
      .from(playSessionsTable)
      .where(eq(playSessionsTable.userId, id))
      .orderBy(desc(playSessionsTable.startedAt))
      .limit(8),
    db
      .select({ n: count(questsTable.id) })
      .from(questsTable)
      .where(eq(questsTable.authorId, id)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(sql`${usersTable.points} > ${user.points}`),
  ]);

  const sessionsWithTitles = await Promise.all(
    sessions.map(async (s) => {
      const [q] = await db
        .select({
          title: questsTable.title,
          city: questsTable.city,
          difficulty: questsTable.difficulty,
        })
        .from(questsTable)
        .where(eq(questsTable.id, s.questId))
        .limit(1);
      return {
        id: s.id,
        questId: s.questId,
        questTitle: q?.title,
        questCity: q?.city,
        questDifficulty: q?.difficulty,
        teamId: s.teamId ?? undefined,
        mode: s.mode,
        status: s.status,
        currentIndex: s.currentIndex,
        score: s.score,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt ?? undefined,
      };
    }),
  );

  res.json({
    user: userDto(user),
    achievements: achs.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon ?? undefined,
      earnedAt: a.earnedAt,
    })),
    recentSessions: sessionsWithTitles,
    questsCreated: Number(questCountRow[0]?.n ?? 0),
    rank: Number(rankRow[0]?.n ?? 0) + 1,
  });
});

router.get("/users/search", async (req, res): Promise<void> => {
  const q = ((req.query.q as string) ?? "").trim();
  if (q.length < 2) { res.json([]); return; }

  const users = await db
    .select({
      id: usersTable.id,
      nickname: usersTable.nickname,
      points: usersTable.points,
      avatarSlots: usersTable.avatarSlots,
      activeAvatarSlot: usersTable.activeAvatarSlot,
      city: usersTable.city,
      bio: usersTable.bio,
    })
    .from(usersTable)
    .where(ilike(usersTable.nickname, `%${q}%`))
    .orderBy(usersTable.points)
    .limit(20);

  res.json(users);
});

export default router;
