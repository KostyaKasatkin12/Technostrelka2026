import { Router, type IRouter } from "express";
import { desc, eq, and, sql } from "drizzle-orm";
import { db, miniGameScoresTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth.ts";

const router: IRouter = Router();

const VALID_GAMES = ["city_quiz", "urban_scout"];
const MAX_DAILY_POINTS = 500;

router.post("/api/minigames/:gameId/scores", requireAuth, async (req, res): Promise<void> => {
  const gameId = String(req.params.gameId);
  if (!VALID_GAMES.includes(gameId)) {
    res.status(400).json({ error: "Неизвестная игра" });
    return;
  }
  const score = Number((req.body as any).score ?? 0);
  if (!Number.isFinite(score) || score < 0) {
    res.status(400).json({ error: "Неверный счёт" });
    return;
  }
  const cappedScore = Math.min(score, MAX_DAILY_POINTS);
  const userId = req.user!.id;

  const [entry] = await db
    .insert(miniGameScoresTable)
    .values({ userId, gameId, score: cappedScore })
    .returning();

  const [best] = await db
    .select({ best: sql<number>`max(score)::int` })
    .from(miniGameScoresTable)
    .where(and(eq(miniGameScoresTable.userId, userId), eq(miniGameScoresTable.gameId, gameId)));

  const pointsToAdd = Math.floor(cappedScore / 5);
  if (pointsToAdd > 0) {
    await db
      .update(usersTable)
      .set({ points: sql`${usersTable.points} + ${pointsToAdd}` })
      .where(eq(usersTable.id, userId));
  }

  res.json({ entry, bestScore: best?.best ?? cappedScore, pointsEarned: pointsToAdd });
});

router.get("/api/minigames/:gameId/leaderboard", async (req, res): Promise<void> => {
  const gameId = String(req.params.gameId);
  if (!VALID_GAMES.includes(gameId)) {
    res.status(400).json({ error: "Неизвестная игра" });
    return;
  }

  const rows = await db
    .select({
      userId: miniGameScoresTable.userId,
      nickname: usersTable.nickname,
      activeAvatarSlot: usersTable.activeAvatarSlot,
      avatarSlots: usersTable.avatarSlots,
      bestScore: sql<number>`max(${miniGameScoresTable.score})::int`,
      playCount: sql<number>`count(*)::int`,
    })
    .from(miniGameScoresTable)
    .innerJoin(usersTable, eq(miniGameScoresTable.userId, usersTable.id))
    .where(eq(miniGameScoresTable.gameId, gameId))
    .groupBy(miniGameScoresTable.userId, usersTable.nickname, usersTable.activeAvatarSlot, usersTable.avatarSlots)
    .orderBy(desc(sql`max(${miniGameScoresTable.score})`))
    .limit(50);

  res.json(rows);
});

router.get("/api/minigames/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const rows = await db
    .select({
      gameId: miniGameScoresTable.gameId,
      bestScore: sql<number>`max(${miniGameScoresTable.score})::int`,
      playCount: sql<number>`count(*)::int`,
    })
    .from(miniGameScoresTable)
    .where(eq(miniGameScoresTable.userId, userId))
    .groupBy(miniGameScoresTable.gameId);
  res.json(rows);
});

export default router;
