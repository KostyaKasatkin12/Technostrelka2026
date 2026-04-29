import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, achievementsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/achievements/mine", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  const rows = await db
    .select()
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, req.user.id))
    .orderBy(desc(achievementsTable.earnedAt));
  res.json(
    rows.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,
      earnedAt: a.earnedAt,
    })),
  );
});

export default router;
