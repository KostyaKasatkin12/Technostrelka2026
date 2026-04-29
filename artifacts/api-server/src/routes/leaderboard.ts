import { Router, type IRouter } from "express";
import { desc, sql, eq } from "drizzle-orm";
import { db, usersTable, teamsTable, teamMembersTable, playSessionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/leaderboard/users", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      nickname: usersTable.nickname,
      ageGroup: usersTable.ageGroup,
      points: usersTable.points,
      completedCount: usersTable.completedCount,
      city: usersTable.city,
      avatarSlots: usersTable.avatarSlots,
      activeAvatarSlot: usersTable.activeAvatarSlot,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.points), desc(usersTable.completedCount))
    .limit(50);
  const enriched = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.id,
    nickname: r.nickname,
    points: r.points,
    completedCount: r.completedCount,
    city: r.city ?? undefined,
    avatarSlots: r.avatarSlots ?? [],
    activeAvatarSlot: r.activeAvatarSlot ?? 0,
  }));
  res.json(enriched);
});

router.get("/leaderboard/teams", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: teamsTable.id,
      name: teamsTable.name,
      completedCount: teamsTable.completedCount,
      points: sql<number>`COALESCE(SUM(CASE WHEN ${playSessionsTable.status} = 'completed' THEN ${playSessionsTable.score} ELSE 0 END), 0)::int`,
      memberCount: sql<number>`(SELECT COUNT(*)::int FROM ${teamMembersTable} WHERE ${teamMembersTable.teamId} = ${teamsTable.id})`,
    })
    .from(teamsTable)
    .leftJoin(
      playSessionsTable,
      eq(playSessionsTable.teamId, teamsTable.id),
    )
    .groupBy(teamsTable.id)
    .orderBy(
      desc(sql`COALESCE(SUM(CASE WHEN ${playSessionsTable.status} = 'completed' THEN ${playSessionsTable.score} ELSE 0 END), 0)`),
      desc(teamsTable.completedCount),
    )
    .limit(50);

  const enriched = rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    name: r.name,
    points: r.points,
    completedCount: r.completedCount,
    memberCount: r.memberCount ?? 0,
  }));
  res.json(enriched);
});

export default router;
