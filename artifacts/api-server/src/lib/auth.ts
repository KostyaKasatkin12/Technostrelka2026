import { randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

export const SESSION_COOKIE = "morizo_sid";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function newSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: number): Promise<string> {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ id, userId, expiresAt });
  return id;
}

export async function destroySession(id: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
}

export async function getUserBySessionId(
  id: string,
): Promise<User | null> {
  const now = new Date();
  const rows = await db
    .select({
      user: usersTable,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(and(eq(sessionsTable.id, id), gt(sessionsTable.expiresAt, now)))
    .limit(1);
  return rows[0]?.user ?? null;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const sid = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    SESSION_COOKIE
  ];
  if (sid) {
    const user = await getUserBySessionId(sid);
    if (user) {
      req.user = user;
      req.sessionId = sid;
    }
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Не авторизован" });
    return;
  }
  next();
}

export function requireModerator(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Не авторизован" });
    return;
  }
  if (req.user.role !== "moderator") {
    res.status(403).json({ error: "FORBIDDEN", message: "Нужны права модератора" });
    return;
  }
  next();
}

export function setSessionCookie(res: Response, sid: string): void {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}
