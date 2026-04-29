import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  questsTable,
  teamsTable,
  playSessionsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/overview", async (req, res): Promise<void> => {
  try {
    const [
      questsTotalRow,
      questsPublishedRow,
      usersTotalRow,
      teamsTotalRow,
      completionsTotalRow,
      cityRows,
    ] = await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(questsTable),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(questsTable)
        .where(eq(questsTable.status, "published")),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(teamsTable),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(playSessionsTable)
        .where(eq(playSessionsTable.status, "completed")),
      db
        .select({
          city: usersTable.city,
          c: sql<number>`count(*)::int`,
        })
        .from(usersTable)
        .where(sql`${usersTable.city} is not null and ${usersTable.city} <> ''`)
        .groupBy(usersTable.city)
        .orderBy(desc(sql`count(*)`))
        .limit(1),
    ]);

    const allCities = await db
      .select({ city: usersTable.city })
      .from(usersTable)
      .where(sql`${usersTable.city} is not null and ${usersTable.city} <> ''`)
      .groupBy(usersTable.city);

    res.json({
      questsTotal: questsTotalRow[0]?.c ?? 0,
      questsPublished: questsPublishedRow[0]?.c ?? 0,
      usersTotal: usersTotalRow[0]?.c ?? 0,
      teamsTotal: teamsTotalRow[0]?.c ?? 0,
      completionsTotal: completionsTotalRow[0]?.c ?? 0,
      citiesTotal: allCities.length,
      topCity: cityRows[0]?.city ?? undefined,
      topCityCount: cityRows[0]?.c ?? undefined,
    });
  } catch (err) {
    (req as any)?.log?.error?.({ err }, "stats/overview failed");
    res.status(500).json({ error: "Не удалось собрать статистику" });
  }
});

router.get("/activity/recent", async (req, res): Promise<void> => {
  try {
    const recentQuests = await db
      .select({
        title: questsTable.title,
        city: questsTable.city,
        publishedAt: questsTable.publishedAt,
        createdAt: questsTable.createdAt,
      })
      .from(questsTable)
      .where(eq(questsTable.status, "published"))
      .orderBy(desc(questsTable.publishedAt))
      .limit(8);

    const recentUsers = await db
      .select({
        nickname: usersTable.nickname,
        city: usersTable.city,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(8);

    const recentTeams = await db
      .select({
        name: teamsTable.name,
        createdAt: teamsTable.createdAt,
      })
      .from(teamsTable)
      .orderBy(desc(teamsTable.createdAt))
      .limit(5);

    const items = [
      ...recentQuests.map((q) => ({
        kind: "quest_published" as const,
        title: q.title,
        subtitle: q.city,
        occurredAt: (q.publishedAt ?? q.createdAt)?.toISOString?.() ??
          new Date().toISOString(),
      })),
      ...recentUsers.map((u) => ({
        kind: "user_joined" as const,
        title: u.nickname,
        subtitle: u.city ?? undefined,
        occurredAt: u.createdAt?.toISOString?.() ?? new Date().toISOString(),
      })),
      ...recentTeams.map((t) => ({
        kind: "team_created" as const,
        title: t.name,
        occurredAt: t.createdAt?.toISOString?.() ?? new Date().toISOString(),
      })),
    ]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 12);

    res.json(items);
  } catch (err) {
    (req as any)?.log?.error?.({ err }, "activity/recent failed");
    res.status(500).json({ error: "Не удалось собрать активность" });
  }
});

export default router;
