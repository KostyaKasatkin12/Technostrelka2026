import { Router, type Request, type Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth.js";

const router: Router = Router();

router.get("/notifications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user!.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  const [{ unread = 0 } = {}] = await db
    .select({
      unread: sql<number>`count(*) filter (where ${notificationsTable.isRead} = false)::int`,
    })
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user!.id));
  res.json({ notifications: rows, unread });
});

router.post(
  "/notifications/:id/read",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "bad_id" });
      return;
    }
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, req.user!.id),
        ),
      );
    res.json({ ok: true });
  },
);

router.post(
  "/notifications/read-all",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.user!.id));
    res.json({ ok: true });
  },
);

export default router;

export async function pushNotification(opts: {
  userId: number;
  kind: string;
  title: string;
  body: string;
  href?: string | null;
}): Promise<void> {
  await db.insert(notificationsTable).values({
    userId: opts.userId,
    kind: opts.kind,
    title: opts.title,
    body: opts.body,
    href: opts.href ?? null,
  });
}
