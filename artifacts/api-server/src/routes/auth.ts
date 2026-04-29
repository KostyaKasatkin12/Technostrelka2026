import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  newSessionId,
} from "../lib/auth.ts";
import { userDto } from "../lib/quest-formatters.ts";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const GOOGLE_ENABLED = !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET;

function getCallbackUrl(req: import("express").Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers.host ?? "localhost";
  return `${proto}://${host}/api/auth/google/callback`;
}

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Проверьте данные регистрации", details: parsed.error.message });
    return;
  }
  const { email, password, nickname, ageGroup } = parsed.data;
  const normEmail = email.toLowerCase().trim();

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normEmail))
    .limit(1);
  if (existing.length > 0) {
    res
      .status(409)
      .json({ error: "Этот email уже зарегистрирован" });
    return;
  }

  const existingNick = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.nickname, nickname))
    .limit(1);
  if (existingNick.length > 0) {
    res.status(409).json({ error: "Этот ник уже занят. Выберите другой" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email: normEmail, passwordHash, nickname, ageGroup })
    .returning();

  const sid = await createSession(user.id);
  setSessionCookie(res, sid);
  req.log.info({ userId: user.id }, "User registered");
  res.json({ user: userDto(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Введите email и пароль" });
    return;
  }
  const normEmail = parsed.data.email.toLowerCase().trim();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normEmail))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Неверный email или пароль" });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Неверный email или пароль" });
    return;
  }
  const sid = await createSession(user.id);
  setSessionCookie(res, sid);
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ user: userDto(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  if (req.sessionId) {
    await destroySession(req.sessionId);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  res.json({ user: req.user ? userDto(req.user) : null });
});

router.get("/auth/google/status", (_req, res): void => {
  res.json({ enabled: GOOGLE_ENABLED });
});

router.get("/auth/google", (req, res): void => {
  if (!GOOGLE_ENABLED) {
    res.status(503).json({ error: "Google OAuth не настроен" });
    return;
  }
  const callbackUrl = getCallbackUrl(req);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  if (!GOOGLE_ENABLED) {
    res.redirect("/?error=google_disabled");
    return;
  }
  const code = req.query.code as string | undefined;
  if (!code) {
    res.redirect("/?error=google_no_code");
    return;
  }
  try {
    const callbackUrl = getCallbackUrl(req);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json() as { id_token?: string; error?: string };
    if (!tokenRes.ok || !tokenData.id_token) {
      res.redirect("/?error=google_token_failed");
      return;
    }

    const [, payloadB64] = tokenData.id_token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as {
      sub: string; email: string; name: string; given_name: string; picture?: string;
    };

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase().trim();
    const displayName = payload.given_name || payload.name || "Игрок";

    let user = (
      await db.select().from(usersTable).where(
        or(eq(usersTable.googleId, googleId), eq(usersTable.email, email))
      ).limit(1)
    )[0];

    if (user) {
      if (!user.googleId) {
        await db.update(usersTable).set({ googleId }).where(eq(usersTable.id, user.id));
      }
    } else {
      const nickname = displayName.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_]/g, "_").slice(0, 28);
      const uniqueNick = `${nickname}_${Math.floor(Math.random() * 9000 + 1000)}`;
      const fakeHash = await bcrypt.hash(newSessionId(), 1);
      [user] = await db
        .insert(usersTable)
        .values({ email, passwordHash: fakeHash, nickname: uniqueNick, ageGroup: "age_16_17", googleId })
        .returning();
    }

    const sid = await createSession(user.id);
    setSessionCookie(res, sid);
    res.redirect("/");
  } catch (err) {
    req.log?.error({ err }, "Google OAuth error");
    res.redirect("/?error=google_error");
  }
});

export default router;
