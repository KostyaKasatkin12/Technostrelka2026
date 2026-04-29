import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, checkpointsTable, questsTable } from "@workspace/db";
import {
  ListCheckpointsParams,
  CreateCheckpointParams,
  CreateCheckpointBody,
  UpdateCheckpointParams,
  UpdateCheckpointBody,
  DeleteCheckpointParams,
} from "@workspace/api-zod";
import { checkpointDto } from "../lib/quest-formatters.ts";

const router: IRouter = Router();

router.get("/quests/:id/checkpoints", async (req, res): Promise<void> => {
  const params = ListCheckpointsParams.safeParse(req.params);
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
  const cps = await db
    .select()
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, params.data.id))
    .orderBy(checkpointsTable.orderIndex);
  const isOwner = req.user?.id === quest.authorId;
  const isModerator = req.user?.role === "moderator";
  const hideAnswer = !isOwner && !isModerator;
  res.json(cps.map((c) => checkpointDto(c, hideAnswer)));
});

router.post("/quests/:id/checkpoints", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = CreateCheckpointParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateCheckpointBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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
  if (quest.authorId !== req.user.id && req.user.role !== "moderator") {
    res.status(403).json({ error: "Нет прав на изменение квеста" });
    return;
  }

  if (body.data.taskType === "code_word" && !body.data.codeAnswer) {
    res.status(400).json({ error: "Для кодового слова нужно указать ответ" });
    return;
  }
  if (
    body.data.taskType === "choice" &&
    (!body.data.choiceOptions ||
      body.data.choiceOptions.length < 2 ||
      body.data.choiceAnswerIndex == null)
  ) {
    res
      .status(400)
      .json({ error: "Для выбора нужны минимум 2 варианта и индекс ответа" });
    return;
  }

  const maxRow = await db
    .select({ max: sql<number>`coalesce(max(${checkpointsTable.orderIndex}), -1)::int` })
    .from(checkpointsTable)
    .where(eq(checkpointsTable.questId, params.data.id));
  const nextIdx = Number(maxRow[0]?.max ?? -1) + 1;

  const [cp] = await db
    .insert(checkpointsTable)
    .values({
      ...body.data,
      questId: params.data.id,
      orderIndex: nextIdx,
    })
    .returning();
  res.json(checkpointDto(cp));
});

router.patch("/checkpoints/:checkpointId", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const params = UpdateCheckpointParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateCheckpointBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(checkpointsTable)
    .where(eq(checkpointsTable.id, params.data.checkpointId))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Точка не найдена" });
    return;
  }
  const [quest] = await db
    .select()
    .from(questsTable)
    .where(eq(questsTable.id, existing.questId))
    .limit(1);
  if (!quest) {
    res.status(404).json({ error: "Квест не найден" });
    return;
  }
  if (quest.authorId !== req.user.id && req.user.role !== "moderator") {
    res.status(403).json({ error: "Нет прав" });
    return;
  }
  const [updated] = await db
    .update(checkpointsTable)
    .set(body.data)
    .where(eq(checkpointsTable.id, params.data.checkpointId))
    .returning();
  res.json(checkpointDto(updated));
});

router.delete(
  "/checkpoints/:checkpointId",
  async (req, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    const params = DeleteCheckpointParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [existing] = await db
      .select()
      .from(checkpointsTable)
      .where(eq(checkpointsTable.id, params.data.checkpointId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Точка не найдена" });
      return;
    }
    const [quest] = await db
      .select()
      .from(questsTable)
      .where(eq(questsTable.id, existing.questId))
      .limit(1);
    if (!quest || (quest.authorId !== req.user.id && req.user.role !== "moderator")) {
      res.status(403).json({ error: "Нет прав" });
      return;
    }
    await db
      .delete(checkpointsTable)
      .where(eq(checkpointsTable.id, params.data.checkpointId));
    res.json({ ok: true });
  },
);

export default router;
