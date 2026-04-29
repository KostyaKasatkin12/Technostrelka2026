import { Router, type IRouter } from "express";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import {
  db,
  playSessionsTable,
  sessionAnswersTable,
  questsTable,
  checkpointsTable,
  teamMembersTable,
  usersTable,
  teamsTable,
  achievementsTable,
  chatChannelsTable,
  chatMembersTable,
  chatMessagesTable,
} from "@workspace/db";
import {
  StartSessionBody,
  GetSessionParams,
  SubmitAnswerBody,
  SubmitAnswerParams,
  AbandonSessionParams,
  GetQuestSessionsParams,
  GetQuestSessionsQueryParams,
} from "@workspace/api-zod";
import { questDto, checkpointDto } from "../lib/quest-formatters.ts";
import { pushNotification } from "./notifications.ts";

function newLobbyCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8).toUpperCase();
}

const router: IRouter = Router();

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[\s.,!?-]+/g, "");
}

const TRAVEL_MULTIPLIERS: Record<string, number> = {
  foot: 1.2,
  public_transport: 1.0,
  transport: 0.8,
  dirt_road: 1.3,
  off_road: 1.5,
};

function difficultyMultiplier(difficulty: number): number {
  return 1 + (difficulty - 1) * 0.15;
}

function speedBonus(
  startedAt: Date,
  finishedAt: Date,
  durationMin: number,
): number {
  if (!durationMin || durationMin <= 0) return 0;
  const elapsedSeconds = (finishedAt.getTime() - startedAt.getTime()) / 1000;
  const expectedSeconds = durationMin * 60;
  if (elapsedSeconds >= expectedSeconds) return 0;
  const ratio = (expectedSeconds - elapsedSeconds) / expectedSeconds;
  return Math.round(ratio * 300);
}

async function awardAchievement(
  userId: number,
  code: string,
  name: string,
  description: string,
  icon: string,
): Promise<void> {
  try {
    await db
      .insert(achievementsTable)
      .values({ userId, code, name, description, icon })
      .onConflictDoNothing();
  } catch {
  }
}

async function sessionSummary(s: typeof playSessionsTable.$inferSelect) {
  const [quest] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, s.questId))
    .limit(1);
  let teamName: string | undefined;
  if (s.teamId) {
    const [t] = await db
      .select({ name: teamsTable.name })
      .from(teamsTable)
      .where(eq(teamsTable.id, s.teamId))
      .limit(1);
    teamName = t?.name;
  }
  return {
    id: s.id,
    questId: s.questId,
    questTitle: quest?.title,
    questCity: quest?.city,
    questDifficulty: quest?.difficulty,
    teamId: s.teamId ?? undefined,
    teamName,
    mode: s.mode,
    status: s.status,
    travelMode: s.travelMode,
    currentIndex: s.currentIndex,
    score: s.score,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt ?? undefined,
    scoreBreakdown: s.scoreBreakdown ?? undefined,
  };
}

router.get("/quests/:id/sessions", async (req, res): Promise<void> => {
  const paramsResult = GetQuestSessionsParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }
  const queryResult = GetQuestSessionsQueryParams.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ error: queryResult.error.message });
    return;
  }
  const questId = paramsResult.data.id;
  const limit = queryResult.data.limit;

  const completedSessions = await db
    .select({
      id: playSessionsTable.id,
      userId: playSessionsTable.userId,
      score: playSessionsTable.score,
      startedAt: playSessionsTable.startedAt,
      finishedAt: playSessionsTable.finishedAt,
    })
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.questId, questId),
        eq(playSessionsTable.status, "completed"),
      ),
    )
    .orderBy(desc(playSessionsTable.finishedAt));

  const totalCompleted = completedSessions.length;
  const avgScore =
    totalCompleted > 0
      ? completedSessions.reduce((sum, s) => sum + s.score, 0) / totalCompleted
      : 0;

  const recentRaw = completedSessions.slice(0, limit);

  const userIds = [...new Set(recentRaw.map((s) => s.userId))];
  const users =
    userIds.length > 0
      ? await db
          .select({ id: usersTable.id, nickname: usersTable.nickname })
          .from(usersTable)
          .where(inArray(usersTable.id, userIds))
      : [];
  const nicknameMap = new Map(users.map((u) => [u.id, u.nickname]));

  const recentRuns = recentRaw.map((s) => ({
    sessionId: s.id,
    nickname: nicknameMap.get(s.userId) ?? "—",
    score: s.score,
    timeTakenSeconds:
      s.finishedAt && s.startedAt
        ? Math.round((s.finishedAt.getTime() - s.startedAt.getTime()) / 1000)
        : undefined,
    finishedAt: s.finishedAt,
  }));

  res.json({ totalCompleted, avgScore: Math.round(avgScore), recentRuns });
});

router.post("/sessions/start", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { questId, mode, teamId, travelMode } = parsed.data;

  const [quest] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, questId))
    .limit(1);
  if (!quest || quest.status !== "published") {
    res.status(400).json({ error: "Квест недоступен для прохождения" });
    return;
  }

  if (quest.authorId === req.user.id) {
    res.status(403).json({ error: "Автор не может проходить свой квест" });
    return;
  }

  const cps = await db
    .select()
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, questId));
  if (cps.length === 0) {
    res.status(400).json({ error: "У квеста нет точек маршрута" });
    return;
  }

  if (mode === "team") {
    if (!teamId) {
      res.status(400).json({ error: "Выберите команду" });
      return;
    }
    const member = await db
      .select({ id: teamMembersTable.id })
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.userId, req.user.id),
        ),
      )
      .limit(1);
    if (member.length === 0) {
      res.status(403).json({ error: "Вы не в этой команде" });
      return;
    }

    const allMembers = await db
      .select({ userId: teamMembersTable.userId })
      .from(teamMembersTable)
      .where(eq(teamMembersTable.teamId, teamId));
    if (allMembers.some((m) => m.userId === quest.authorId)) {
      res.status(403).json({
        error: "В команде есть автор квеста — нельзя его проходить",
      });
      return;
    }

    const teamCompleted = await db
      .select({ id: playSessionsTable.id })
      .from(playSessionsTable)
      .where(
        and(
          eq(playSessionsTable.teamId, teamId),
          eq(playSessionsTable.questId, questId),
          eq(playSessionsTable.status, "completed"),
        ),
      )
      .limit(1);
    if (teamCompleted.length > 0) {
      res.status(403).json({
        error: "Ваша команда уже прошла этот квест. Каждый квест засчитывается только один раз.",
      });
      return;
    }
  }

  const soloCompleted = await db
    .select({ id: playSessionsTable.id })
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.userId, req.user.id),
        eq(playSessionsTable.questId, questId),
        eq(playSessionsTable.status, "completed"),
      ),
    )
    .limit(1);
  if (soloCompleted.length > 0) {
    res.status(403).json({
      error: "Вы уже прошли этот квест. Каждый квест засчитывается только один раз.",
    });
    return;
  }

  const inProgress = await db
    .select()
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.userId, req.user.id),
        eq(playSessionsTable.questId, questId),
        eq(playSessionsTable.status, "in_progress"),
      ),
    )
    .limit(1);
  if (inProgress.length > 0) {
    res.json(await sessionSummary(inProgress[0]));
    return;
  }

  const inStarted = await db
    .select()
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.userId, req.user.id),
        eq(playSessionsTable.questId, questId),
        eq(playSessionsTable.status, "started"),
      ),
    )
    .limit(1);
  if (inStarted.length > 0) {
    res.json(await sessionSummary(inStarted[0]));
    return;
  }

  const validTravelMode = travelMode && TRAVEL_MULTIPLIERS[travelMode] !== undefined
    ? travelMode
    : "foot";

  const [s] = await db
    .insert(playSessionsTable)
    .values({
      questId,
      userId: req.user.id,
      teamId: mode === "team" ? teamId : null,
      mode,
      status: "started",
      travelMode: validTravelMode,
      currentIndex: 0,
      score: 0,
    })
    .returning();
  res.json(await sessionSummary(s));
});

router.get("/sessions/mine", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const rows = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.userId, req.user.id))
    .orderBy(desc(playSessionsTable.startedAt));
  const out = await Promise.all(rows.map((s) => sessionSummary(s)));
  res.json(out);
});

router.delete("/sessions/:id", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [s] = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.id, params.data.id))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  if (s.userId !== req.user.id) {
    res.status(403).json({ error: "Нет прав на эту сессию" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(sessionAnswersTable)
      .where(eq(sessionAnswersTable.sessionId, s.id));
    await tx
      .delete(playSessionsTable)
      .where(eq(playSessionsTable.id, s.id));
  });
  res.json({ ok: true });
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [s] = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.id, params.data.id))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  if (s.userId !== req.user.id && req.user.role !== "moderator") {
    res.status(403).json({ error: "Нет прав на эту сессию" });
    return;
  }
  const [quest] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, s.questId))
    .limit(1);
  const cps = await db
    .select()
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, s.questId))
    .orderBy(checkpointsTable.orderIndex);
  const answers = await db
    .select()
    .from(sessionAnswersTable)
    .where(eq(sessionAnswersTable.sessionId, s.id));

  const summary = await sessionSummary(s);
  res.json({
    session: summary,
    quest: quest ? questDto(quest) : null,
    checkpoints: cps.map((c, i) => {
      const isReached = i < s.currentIndex || s.status === "completed";
      return checkpointDto(c, !isReached);
    }),
    answers: answers.map((a) => ({
      checkpointId: a.checkpointId,
      answer: a.answer ?? undefined,
      correct: a.correct,
      attemptedAt: a.attemptedAt,
    })),
  });
});

router.post("/sessions/:id/answer", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = SubmitAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SubmitAnswerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [s] = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.id, params.data.id))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  if (s.userId !== req.user.id) {
    res.status(403).json({ error: "Нет прав" });
    return;
  }
  if (s.status !== "in_progress" && s.status !== "started") {
    res.status(400).json({ error: "Сессия уже завершена" });
    return;
  }
  const cps = await db
    .select()
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, s.questId))
    .orderBy(checkpointsTable.orderIndex);
  const cur = cps[s.currentIndex];
  if (!cur) {
    res.status(400).json({ error: "Нет текущей точки маршрута" });
    return;
  }

  let correct = false;
  let answerStr = "";
  if (cur.taskType === "code_word") {
    answerStr = body.data.codeAnswer ?? "";
    correct =
      !!cur.codeAnswer &&
      normalize(answerStr) === normalize(cur.codeAnswer);
  } else {
    answerStr = body.data.choiceIndex?.toString() ?? "";
    correct =
      cur.choiceAnswerIndex !== null &&
      body.data.choiceIndex === cur.choiceAnswerIndex;
  }

  await db.insert(sessionAnswersTable).values({
    sessionId: s.id,
    checkpointId: cur.id,
    answer: answerStr,
    correct,
  });

  let nextIndex = s.currentIndex;
  let nextScore = s.score;
  let completed = false;
  let message: string | undefined;
  let scoreBreakdown: {
    checkpointPoints: number;
    completionBonus: number;
    speedBonus: number;
    elapsedSeconds: number;
    difficultyMultiplier: number;
    travelMultiplier: number;
    subtotal: number;
  } | undefined;

  if (correct) {
    nextIndex = s.currentIndex + 1;
    const checkpointPoints = 100 + cur.orderIndex * 10;
    nextScore = s.score + checkpointPoints;

    if (nextIndex >= cps.length) {
      completed = true;
      const finishedAt = new Date();

      const [quest] = await db
        .select()
        .from(questsTable)
        .where(eq(questsTable.id, s.questId))
        .limit(1);

      const completionBonus = 200;
      const elapsedSeconds = (finishedAt.getTime() - s.startedAt.getTime()) / 1000;
      const spdBonus = speedBonus(s.startedAt, finishedAt, quest?.durationMin ?? 0);
      const diffMult = difficultyMultiplier(quest?.difficulty ?? 1);
      const travelMult = TRAVEL_MULTIPLIERS[s.travelMode] ?? 1.0;
      const subtotal = nextScore + completionBonus + spdBonus;

      const totalScore = Math.round(subtotal * diffMult * travelMult);

      const breakdownToStore = {
        checkpointPoints: nextScore,
        completionBonus,
        speedBonus: spdBonus,
        elapsedSeconds: Math.round(elapsedSeconds),
        difficultyMultiplier: Math.round(diffMult * 100) / 100,
        travelMultiplier: travelMult,
        subtotal,
      };

      await db
        .update(playSessionsTable)
        .set({
          currentIndex: nextIndex,
          score: totalScore,
          status: "completed",
          finishedAt,
          scoreBreakdown: breakdownToStore,
        })
        .where(eq(playSessionsTable.id, s.id));

      await db
        .update(usersTable)
        .set({
          points: (req.user.points ?? 0) + totalScore,
          completedCount: (req.user.completedCount ?? 0) + 1,
        })
        .where(eq(usersTable.id, req.user.id));

      if (s.teamId) {
        const [t] = await db
          .select()
          .from(teamsTable)
          .where(eq(teamsTable.id, s.teamId))
          .limit(1);
        if (t) {
          await db
            .update(teamsTable)
            .set({
              points: t.points + totalScore,
              completedCount: t.completedCount + 1,
            })
            .where(eq(teamsTable.id, t.id));
        }
      }

      if (quest) {
        await db
          .update(questsTable)
          .set({ completionCount: quest.completionCount + 1 })
          .where(eq(questsTable.id, quest.id));
      }

      await awardAchievement(
        req.user.id,
        "first_quest",
        "Первый квест",
        "Прошёл первый городской квест на MORIZO",
        "trophy",
      );
      const [doneCount] = await db
        .select({ n: usersTable.completedCount })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id))
        .limit(1);
      if (doneCount && doneCount.n >= 5) {
        await awardAchievement(
          req.user.id,
          "explorer_5",
          "Городской исследователь",
          "Прошёл 5 квестов",
          "compass",
        );
      }
      if (doneCount && doneCount.n >= 10) {
        await awardAchievement(
          req.user.id,
          "explorer_10",
          "Знаток города",
          "Прошёл 10 квестов",
          "map",
        );
      }
      if (s.mode === "team") {
        await awardAchievement(
          req.user.id,
          "team_player",
          "Командный игрок",
          "Прошёл квест в команде",
          "users",
        );
      }

      message = "Квест пройден! Новые точки на карте уже ждут.";
      const accumulatedCheckpointPoints = nextScore;
      nextScore = totalScore;
      scoreBreakdown = {
        checkpointPoints: accumulatedCheckpointPoints,
        completionBonus,
        speedBonus: spdBonus,
        elapsedSeconds: Math.round(elapsedSeconds),
        difficultyMultiplier: Math.round(diffMult * 100) / 100,
        travelMultiplier: travelMult,
        subtotal,
      };
    } else {
      const newStatus = s.status === "started" ? "in_progress" : "in_progress";
      await db
        .update(playSessionsTable)
        .set({ currentIndex: nextIndex, score: nextScore, status: newStatus })
        .where(eq(playSessionsTable.id, s.id));
      message = "Верно! Двигаемся к следующей точке.";
    }
  } else {
    message = "Ответ неверный. Подсказка может помочь — попробуй ещё раз.";
  }

  res.json({
    correct,
    completed,
    currentIndex: nextIndex,
    score: nextScore,
    message,
    scoreBreakdown,
  });
});

// ---------- TEAM LOBBY (synchronized start) ----------

router.post("/sessions/lobby", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован", message: "Войдите в аккаунт" });
    return;
  }
  const questId = Number(req.body?.questId);
  const teamId = Number(req.body?.teamId);
  const startInMinutes = Number(req.body?.startInMinutes ?? 5);
  const travelMode = req.body?.travelMode ?? "foot";

  if (!Number.isFinite(questId) || !Number.isFinite(teamId)) {
    res.status(400).json({ error: "validation", message: "Укажите квест и команду" });
    return;
  }
  if (startInMinutes < 1 || startInMinutes > 60 * 24) {
    res.status(400).json({ error: "validation", message: "Время старта от 1 минуты до 24 часов" });
    return;
  }
  const validTravelMode = travelMode && TRAVEL_MULTIPLIERS[travelMode] !== undefined
    ? travelMode
    : "foot";

  const [quest] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, questId))
    .limit(1);
  if (!quest || quest.status !== "published") {
    res.status(400).json({ error: "quest_unavailable", message: "Квест недоступен" });
    return;
  }
  if (quest.authorId === req.user.id) {
    res.status(403).json({
      error: "author_in_team",
      message: "Автор квеста не может его проходить",
    });
    return;
  }

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId))
    .limit(1);
  if (!team) {
    res.status(404).json({ error: "team_not_found", message: "Команда не найдена" });
    return;
  }
  const member = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamId),
        eq(teamMembersTable.userId, req.user.id),
      ),
    )
    .limit(1);
  if (member.length === 0) {
    res.status(403).json({ error: "not_in_team", message: "Вы не в этой команде" });
    return;
  }

  const allMembers = await db
    .select({ userId: teamMembersTable.userId })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.teamId, teamId));
  if (allMembers.some((m) => m.userId === quest.authorId)) {
    res.status(403).json({
      error: "author_in_team",
      message: "В команде автор квеста — нельзя его проходить",
    });
    return;
  }

  const teamCompleted = await db
    .select({ id: playSessionsTable.id })
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.teamId, teamId),
        eq(playSessionsTable.questId, questId),
        eq(playSessionsTable.status, "completed"),
      ),
    )
    .limit(1);
  if (teamCompleted.length > 0) {
    res.status(403).json({
      error: "already_completed",
      message: "Ваша команда уже прошла этот квест. Каждый квест засчитывается только один раз.",
    });
    return;
  }

  const lobbyCode = newLobbyCode();
  const scheduledStartAt = new Date(Date.now() + startInMinutes * 60_000);

  const [leaderSession] = await db
    .insert(playSessionsTable)
    .values({
      questId,
      userId: req.user.id,
      teamId,
      mode: "team",
      status: "started",
      travelMode: validTravelMode,
      currentIndex: 0,
      score: 0,
      scheduledStartAt,
      lobbyCode,
    })
    .returning();

  const teamChannel = await db
    .select({ id: chatChannelsTable.id })
    .from(chatChannelsTable)
    .where(eq(chatChannelsTable.teamId, teamId))
    .limit(1);

  const userIds = allMembers.map((m) => m.userId).filter((id) => id !== req.user!.id);
  for (const uid of userIds) {
    await pushNotification({
      userId: uid,
      kind: "lobby_invite",
      title: `${req.user.nickname} зовёт на квест`,
      body: `«${quest.title}» — старт через ${startInMinutes} мин. Код лобби: ${lobbyCode}`,
      href: `/play/lobby/${lobbyCode}`,
    });
  }

  if (teamChannel[0]) {
    await db.insert(chatMessagesTable).values({
      channelId: teamChannel[0].id,
      userId: req.user.id,
      body: `🎯 Старт квеста «${quest.title}» через ${startInMinutes} мин. Подключайтесь: код лобби ${lobbyCode}`,
      attachment: { kind: "quest_link", questId },
    });
  }

  res.json({
    lobbyCode,
    sessionId: leaderSession.id,
    scheduledStartAt,
    href: `/play/lobby/${lobbyCode}`,
  });
});

router.post("/sessions/lobby/:code/join", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован", message: "Войдите в аккаунт" });
    return;
  }
  const code = String(req.params.code).toUpperCase();
  const [anchor] = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.lobbyCode, code))
    .orderBy(playSessionsTable.id)
    .limit(1);
  if (!anchor) {
    res.status(404).json({ error: "lobby_not_found", message: "Лобби не найдено" });
    return;
  }
  if (!anchor.teamId) {
    res.status(400).json({ error: "no_team", message: "У лобби нет команды" });
    return;
  }
  const member = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, anchor.teamId),
        eq(teamMembersTable.userId, req.user.id),
      ),
    )
    .limit(1);
  if (member.length === 0) {
    res.status(403).json({ error: "not_in_team", message: "Вы не в этой команде" });
    return;
  }

  const [alreadyCompleted] = await db
    .select({ id: playSessionsTable.id })
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.questId, anchor.questId),
        eq(playSessionsTable.userId, req.user.id),
        eq(playSessionsTable.status, "completed"),
      ),
    )
    .limit(1);
  if (alreadyCompleted) {
    res.status(409).json({ error: "already_completed", message: "Вы уже прошли этот квест" });
    return;
  }

  const [existing] = await db
    .select()
    .from(playSessionsTable)
    .where(
      and(
        eq(playSessionsTable.lobbyCode, code),
        eq(playSessionsTable.userId, req.user.id),
      ),
    )
    .limit(1);
  if (existing) {
    res.json({ sessionId: existing.id, lobbyCode: code });
    return;
  }
  const [created] = await db
    .insert(playSessionsTable)
    .values({
      questId: anchor.questId,
      userId: req.user.id,
      teamId: anchor.teamId,
      mode: "team",
      status: "started",
      travelMode: anchor.travelMode,
      currentIndex: 0,
      score: 0,
      scheduledStartAt: anchor.scheduledStartAt,
      lobbyCode: code,
    })
    .returning();
  res.json({ sessionId: created.id, lobbyCode: code });
});

router.get("/sessions/lobby/:code", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован", message: "Войдите" });
    return;
  }
  const code = String(req.params.code).toUpperCase();
  const sessions = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.lobbyCode, code))
    .orderBy(playSessionsTable.startedAt);
  if (sessions.length === 0) {
    res.status(404).json({ error: "lobby_not_found", message: "Лобби не найдено" });
    return;
  }
  const anchor = sessions[0];
  const [quest] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, anchor.questId))
    .limit(1);
  const [team] = anchor.teamId
    ? await db
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.id, anchor.teamId))
        .limit(1)
    : [null];

  const userIds = sessions.map((s) => s.userId);
  const users = userIds.length
    ? await db
        .select({
          id: usersTable.id,
          nickname: usersTable.nickname,
          activeAvatarSlot: usersTable.activeAvatarSlot,
          avatarSlots: usersTable.avatarSlots,
          customAvatarUrl: usersTable.customAvatarUrl,
        })
        .from(usersTable)
        .where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const [{ totalCps = 0 } = {}] = await db
    .select({ totalCps: sql<number>`count(*)::int` })
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, anchor.questId));

  const standings = sessions
    .map((s) => {
      const u = userMap.get(s.userId);
      return {
        userId: s.userId,
        sessionId: s.id,
        nickname: u?.nickname ?? "?",
        avatar: u?.customAvatarUrl ?? null,
        score: s.score,
        currentIndex: s.currentIndex,
        status: s.status,
        finishedAt: s.finishedAt,
        isLeader: s.userId === anchor.userId,
      };
    })
    .sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return -1;
      if (b.status === "completed" && a.status !== "completed") return 1;
      if (b.score !== a.score) return b.score - a.score;
      return b.currentIndex - a.currentIndex;
    });

  const everyoneFinished = sessions.every(
    (s) => s.status !== "in_progress" && s.status !== "started",
  );

  res.json({
    lobbyCode: code,
    quest: quest ? questDto(quest) : null,
    team: team ? { id: team.id, name: team.name } : null,
    leaderUserId: anchor.userId,
    scheduledStartAt: anchor.scheduledStartAt,
    totalCheckpoints: totalCps,
    travelMode: anchor.travelMode,
    standings,
    everyoneFinished,
    canStart: anchor.scheduledStartAt
      ? new Date() >= new Date(anchor.scheduledStartAt)
      : true,
  });
});

router.post("/sessions/:id/abandon", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = AbandonSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [s] = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.id, params.data.id))
    .limit(1);
  if (!s) {
    res.status(404).json({ error: "Сессия не найдена" });
    return;
  }
  if (s.userId !== req.user.id) {
    res.status(403).json({ error: "Нет прав" });
    return;
  }
  if (s.status === "in_progress" || s.status === "started") {
    await db
      .update(playSessionsTable)
      .set({ status: "abandoned", finishedAt: new Date() })
      .where(eq(playSessionsTable.id, s.id));
  }
  const [updated] = await db
    .select()
    .from(playSessionsTable)
    .where(eq(playSessionsTable.id, s.id))
    .limit(1);
  res.json(await sessionSummary(updated));
});

export default router;
