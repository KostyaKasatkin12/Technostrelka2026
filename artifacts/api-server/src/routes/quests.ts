import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, lte, or, desc, sql, inArray } from "drizzle-orm";
import { db, questsTable, checkpointsTable, usersTable } from "@workspace/db";
import {
  ListQuestsQueryParams,
  CreateQuestBody,
  UpdateQuestBody,
  GetQuestParams,
  UpdateQuestParams,
  SubmitQuestParams,
  ArchiveQuestParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.ts";
import {
  questDto,
  checkpointDto,
  attachQuestExtras,
} from "../lib/quest-formatters.ts";

const router: IRouter = Router();

const PAGE_SIZE = 10;

router.get("/quests/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.status, "published"))
    .orderBy(desc(questsTable.completionCount), desc(questsTable.createdAt))
    .limit(6);
  res.json(await attachQuestExtras(rows));
});

router.get("/quests/mine", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const rows = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.authorId, req.user.id))
    .orderBy(desc(questsTable.createdAt));
  res.json(await attachQuestExtras(rows));
});

router.get("/quests", async (req, res): Promise<void> => {
  const parsed = ListQuestsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { page, city, difficultyMin, difficultyMax, search, sort, bestTravelMode } =
    parsed.data;

  const conds = [eq(questsTable.status, "published" as const)];
  if (city) conds.push(eq(questsTable.city, city));
  if (difficultyMin !== undefined)
    conds.push(gte(questsTable.difficulty, difficultyMin));
  if (difficultyMax !== undefined)
    conds.push(lte(questsTable.difficulty, difficultyMax));
  if (bestTravelMode)
    conds.push(eq(questsTable.bestTravelMode, bestTravelMode));
  if (search) {
    const like = `%${search}%`;
    conds.push(
      or(
        ilike(questsTable.title, like),
        ilike(questsTable.description, like),
        ilike(questsTable.district, like),
      )!,
    );
  }

  const where = and(...conds);
  let order;
  switch (sort) {
    case "popular":
      order = desc(questsTable.completionCount);
      break;
    case "rating":
      order = desc(questsTable.avgRating);
      break;
    default:
      order = desc(questsTable.createdAt);
  }

  const offset = (page - 1) * PAGE_SIZE;
  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(questsTable)
      .where(where)
      .orderBy(order)
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(questsTable)
      .where(where),
  ]);

  res.json({
    items: await attachQuestExtras(items),
    total: Number(totalRows[0]?.n ?? 0),
    page,
    pageSize: PAGE_SIZE,
  });
});

router.post("/quests", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const parsed = CreateQuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quest] = await db
    .insert(questsTable)
    .values({
      ...parsed.data,
      authorId: req.user.id,
      status: "draft",
    })
    .returning();
  req.log.info({ questId: quest.id }, "Quest draft created");
  res.json(questDto(quest, { authorNickname: req.user.nickname, checkpointCount: 0 }));
});

router.get("/quests/:id", async (req, res): Promise<void> => {
  const params = GetQuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quest] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, params.data.id))
    .limit(1);
  if (!quest) {
    res.status(404).json({ error: "Квест не найден" });
    return;
  }
  const [author] = await db
    .select({ nickname: usersTable.nickname })
    .from(usersTable)
    .where(eq(usersTable.id, quest.authorId))
    .limit(1);
  const cps = await db
    .select()
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, quest.id))
    .orderBy(checkpointsTable.orderIndex);

  const isOwner = req.user?.id === quest.authorId;
  const isModerator = req.user?.role === "moderator";
  const hideAnswer = !isOwner && !isModerator;

  res.json({
    quest: questDto(quest, {
      authorNickname: author?.nickname,
      checkpointCount: cps.length,
    }),
    checkpoints: cps.map((c) => checkpointDto(c, hideAnswer)),
  });
});

router.patch("/quests/:id", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = UpdateQuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateQuestBody.safeParse(req.body);
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
  if (existing.authorId !== req.user.id && req.user.role !== "moderator") {
    res.status(403).json({ error: "Только автор может редактировать квест" });
    return;
  }
  const [updated] = await db
    .update(questsTable)
    .set(body.data)
    .where(eq(questsTable.id, params.data.id))
    .returning();
  res.json(questDto(updated));
});

router.post("/quests/:id/submit", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = SubmitQuestParams.safeParse(req.params);
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
  if (existing.authorId !== req.user.id) {
    res.status(403).json({ error: "Только автор может отправить квест" });
    return;
  }
  if (existing.status !== "draft" && existing.status !== "rejected") {
    res
      .status(400)
      .json({ error: "Можно отправлять только черновики или отклонённые квесты" });
    return;
  }
  const cpCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, existing.id));
  if (Number(cpCount[0]?.n ?? 0) < 3) {
    res
      .status(400)
      .json({ error: "Добавьте минимум 3 точки маршрута перед отправкой" });
    return;
  }
  const [updated] = await db
    .update(questsTable)
    .set({ status: "moderation", rejectionReason: null })
    .where(eq(questsTable.id, existing.id))
    .returning();
  res.json(questDto(updated));
});

router.post("/quests/:id/archive", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = ArchiveQuestParams.safeParse(req.params);
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
  if (existing.authorId !== req.user.id && req.user.role !== "moderator") {
    res.status(403).json({ error: "Нет прав на архивацию" });
    return;
  }
  const [updated] = await db
    .update(questsTable)
    .set({ status: "archived" })
    .where(eq(questsTable.id, existing.id))
    .returning();
  res.json(questDto(updated));
});

export default router;
