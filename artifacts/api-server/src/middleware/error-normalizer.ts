import type { Request, Response, NextFunction } from "express";

export function normalizeErrorResponses(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    if (
      res.statusCode >= 400 &&
      typeof body === "object" &&
      body !== null &&
      !Array.isArray(body)
    ) {
      const b = body as Record<string, unknown>;
      if (b.error !== undefined && b.message === undefined) {
        b.message = b.error;
      }
    }
    return originalJson(body);
  };

  next();
}
