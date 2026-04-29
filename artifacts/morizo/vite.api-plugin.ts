import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import type { Express, Request, Response, NextFunction } from "express";

const API_ENTRY = path.resolve(
  import.meta.dirname,
  "..",
  "api-server",
  "src",
  "app.ts",
);
const SEED_ENTRY = path.resolve(
  import.meta.dirname,
  "..",
  "api-server",
  "src",
  "seed.ts",
);

export function apiPlugin(): Plugin {
  let appPromise: Promise<Express> | null = null;

  return {
    name: "morizo-api",
    configureServer(server: ViteDevServer) {
      const loadApp = async (): Promise<Express> => {
        if (!appPromise) {
          appPromise = (async () => {
            const seedMod = (await server.ssrLoadModule(SEED_ENTRY)) as {
              runSeed: () => Promise<void>;
            };
            try {
              await seedMod.runSeed();
            } catch (err) {
              server.config.logger.error(
                `[api-plugin] seed failed: ${(err as Error).message}`,
              );
            }
            const appMod = (await server.ssrLoadModule(API_ENTRY)) as {
              buildApiApp: () => Express;
            };
            return appMod.buildApiApp();
          })();
        }
        return appPromise;
      };

      // pre-warm
      loadApp().catch((err) => {
        server.config.logger.error(
          `[api-plugin] preload failed: ${(err as Error).message}`,
        );
      });

      // Register synchronously — runs BEFORE Vite's SPA fallback
      server.middlewares.use(
        "/api",
        (req: Request, res: Response, next: NextFunction) => {
          loadApp()
            .then((app) => app(req, res, next))
            .catch((err) => {
              server.config.logger.error(
                `[api-plugin] handler failed: ${(err as Error).message}`,
              );
              res.statusCode = 500;
              res.setHeader("content-type", "application/json");
              res.end(
                JSON.stringify({ error: "API не запустился", detail: String(err) }),
              );
            });
        },
      );
    },
  };
}
