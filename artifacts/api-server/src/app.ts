import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.ts";
import { attachUser } from "./lib/auth.ts";
import { normalizeErrorResponses } from "./middleware/error-normalizer.ts";
import authRouter from "./routes/auth.ts";
import questsRouter from "./routes/quests.ts";
import checkpointsRouter from "./routes/checkpoints.ts";
import teamsRouter from "./routes/teams.ts";
import sessionsRouter from "./routes/sessions.ts";
import leaderboardRouter from "./routes/leaderboard.ts";
import achievementsRouter from "./routes/achievements.ts";
import moderationRouter from "./routes/moderation.ts";
import profileRouter from "./routes/profile.ts";
import adminRouter from "./routes/admin.ts";
import aiRouter from "./routes/ai.ts";
import statsRouter from "./routes/stats.ts";
import chatRouter from "./routes/chat.ts";
import uploadsRouter from "./routes/uploads.ts";
import shopRouter from "./routes/shop.ts";
import reportsRouter from "./routes/reports.ts";
import notificationsRouter from "./routes/notifications.ts";
import wallRouter from "./routes/wall.ts";
import minigamesRouter from "./routes/minigames.ts";

export function buildApiApp(): Express {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(normalizeErrorResponses);
  app.use(attachUser);

  app.get("/health", (_req, res): void => {
    res.json({ ok: true });
  });

  app.use(authRouter);
  app.use(questsRouter);
  app.use(checkpointsRouter);
  app.use(teamsRouter);
  app.use(sessionsRouter);
  app.use(leaderboardRouter);
  app.use(achievementsRouter);
  app.use(moderationRouter);
  app.use(profileRouter);
  app.use(adminRouter);
  app.use(aiRouter);
  app.use(statsRouter);
  app.use(chatRouter);
  app.use(uploadsRouter);
  app.use(shopRouter);
  app.use(reportsRouter);
  app.use(notificationsRouter);
  app.use(wallRouter);
  app.use(minigamesRouter);

  app.use((req: Request, res: Response): void => {
    res.status(404).json({ error: "NOT_FOUND", message: "Маршрут не найден", path: req.path });
  });

  app.use(
    (err: Error, req: Request, res: Response, _next: NextFunction): void => {
      req.log.error({ err }, "Unhandled error");
      res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: "Внутренняя ошибка сервера" });
    },
  );

  return app;
}
