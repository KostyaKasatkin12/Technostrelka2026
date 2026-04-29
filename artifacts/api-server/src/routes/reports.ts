import { Router, type Request, type Response } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  reportsTable,
  questsTable,
  checkpointsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireModerator } from "../lib/auth.js";

const router: Router = Router();

const createReportSchema = z.object({
  questId: z.number().int().positive().optional(),
  checkpointId: z.number().int().positive().optional(),
  reason: z.string().min(5, "Опишите проблему — минимум 5 символов").max(2000),
});

router.post("/reports", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation",
      message: parsed.error.issues[0]?.message ?? "Неверные данные",
    });
    return;
  }
  const { questId, checkpointId, reason } = parsed.data;
  if (!questId && !checkpointId) {
    res.status(400).json({
      error: "validation",
      message: "Нужно указать квест или чекпоинт",
    });
    return;
  }
  const [row] = await db
    .insert(reportsTable)
    .values({
      questId: questId ?? null,
      checkpointId: checkpointId ?? null,
      reporterId: req.user!.id,
      reason,
      status: "open",
    })
    .returning();
  res.status(201).json({ report: row });
});

router.get("/reports/mine", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.reporterId, req.user!.id))
    .orderBy(desc(reportsTable.createdAt))
    .limit(50);
  res.json({ reports: rows });
});

router.get(
  "/admin/reports",
  requireAuth,
  requireModerator,
  async (req: Request, res: Response): Promise<void> => {
    const status = String(req.query.status ?? "open");
    const rows = await db
      .select({
        report: reportsTable,
        quest: { id: questsTable.id, title: questsTable.title, status: questsTable.status },
        checkpoint: { id: checkpointsTable.id, name: checkpointsTable.name },
        reporter: { id: usersTable.id, nickname: usersTable.nickname },
      })
      .from(reportsTable)
      .leftJoin(questsTable, eq(questsTable.id, reportsTable.questId))
      .leftJoin(checkpointsTable, eq(checkpointsTable.id, reportsTable.checkpointId))
      .leftJoin(usersTable, eq(usersTable.id, reportsTable.reporterId))
      .where(status === "all" ? sql`TRUE` : eq(reportsTable.status, status))
      .orderBy(desc(reportsTable.createdAt))
      .limit(200);
    res.json({ reports: rows });
  },
);

router.post(
  "/admin/reports/:id/resolve",
  requireAuth,
  requireModerator,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const action = String(req.body?.action ?? "dismissed");
    const note = String(req.body?.note ?? "");
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "bad_id" });
      return;
    }

    const [report] = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.id, id))
      .limit(1);
    if (!report) {
      res.status(404).json({ error: "not_found", message: "Жалоба не найдена" });
      return;
    }

    if (action === "hide_quest" && report.questId) {
      await db
        .update(questsTable)
        .set({ status: "archived" })
        .where(eq(questsTable.id, report.questId));
    }

    await db
      .update(reportsTable)
      .set({
        status: action === "hide_quest" ? "resolved" : "dismissed",
        moderatorId: req.user!.id,
        moderatorNote: note || null,
        resolvedAt: new Date(),
      })
      .where(eq(reportsTable.id, id));
    res.json({ ok: true });
  },
);

export default router;
