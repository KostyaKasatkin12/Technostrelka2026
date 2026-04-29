import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import {
  db,
  teamsTable,
  teamMembersTable,
  usersTable,
} from "@workspace/db";
import {
  CreateTeamBody,
  GetTeamParams,
  JoinTeamBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_TEAM_SIZE = 6;

function genJoinCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function teamSummary(teamId: number) {
  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId))
    .limit(1);
  if (!team) return null;
  const [captain] = await db
    .select({ nickname: usersTable.nickname })
    .from(usersTable)
    .where(eq(usersTable.id, team.captainId))
    .limit(1);
  const [{ n: memberCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.teamId, teamId));
  return {
    id: team.id,
    name: team.name,
    description: team.description ?? undefined,
    joinCode: team.joinCode,
    captainId: team.captainId,
    captainNickname: captain?.nickname,
    memberCount: Number(memberCount ?? 0),
    points: team.points,
    completedCount: team.completedCount,
    createdAt: team.createdAt,
  };
}

router.get("/teams/mine", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const memberships = await db
    .select({ teamId: teamMembersTable.teamId })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.userId, req.user.id));
  const summaries = await Promise.all(
    memberships.map((m) => teamSummary(m.teamId)),
  );
  res.json(summaries.filter(Boolean));
});

router.get("/teams", async (_req, res): Promise<void> => {
  const teams = await db.select().from(teamsTable);
  const summaries = await Promise.all(teams.map((t) => teamSummary(t.id)));
  res.json(summaries.filter(Boolean));
});

router.post("/teams", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let joinCode = genJoinCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db
      .select({ id: teamsTable.id })
      .from(teamsTable)
      .where(eq(teamsTable.joinCode, joinCode))
      .limit(1);
    if (exists.length === 0) break;
    joinCode = genJoinCode();
  }
  const [team] = await db
    .insert(teamsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description,
      joinCode,
      captainId: req.user.id,
    })
    .returning();
  await db.insert(teamMembersTable).values({
    teamId: team.id,
    userId: req.user.id,
    role: "captain",
  });
  const summary = await teamSummary(team.id);
  res.json(summary);
});

router.post("/teams/join", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const parsed = JoinTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.joinCode, parsed.data.joinCode.toUpperCase().trim()))
    .limit(1);
  if (!team) {
    res.status(404).json({ error: "Команда не найдена. Проверьте код" });
    return;
  }
  const [{ n: memberCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.teamId, team.id));
  if (Number(memberCount) >= MAX_TEAM_SIZE) {
    res.status(400).json({ error: "Команда уже заполнена (максимум 6)" });
    return;
  }
  const already = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.teamId, team.id));
  if (already.some((m) => m.id)) {
    const userMember = await db
      .select({ id: teamMembersTable.id })
      .from(teamMembersTable)
      .where(eq(teamMembersTable.userId, req.user.id));
    if (userMember.some((m) => m.id)) {
      const inThis = await db
        .select({ id: teamMembersTable.id })
        .from(teamMembersTable)
        .where(eq(teamMembersTable.teamId, team.id))
        .limit(MAX_TEAM_SIZE);
      const exists = inThis.length > 0;
      if (exists) {
        const summary = await teamSummary(team.id);
        res.json(summary);
        return;
      }
    }
  }
  try {
    await db.insert(teamMembersTable).values({
      teamId: team.id,
      userId: req.user.id,
      role: "member",
    });
  } catch {
    // unique constraint — already a member
  }
  const summary = await teamSummary(team.id);
  res.json(summary);
});

router.get("/teams/:id", async (req, res): Promise<void> => {
  const params = GetTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const summary = await teamSummary(params.data.id);
  if (!summary) {
    res.status(404).json({ error: "Команда не найдена" });
    return;
  }
  const members = await db
    .select({
      id: usersTable.id,
      nickname: usersTable.nickname,
      role: teamMembersTable.role,
    })
    .from(teamMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, teamMembersTable.userId))
    .where(eq(teamMembersTable.teamId, params.data.id));
  res.json({ team: summary, members });
});

export default router;
