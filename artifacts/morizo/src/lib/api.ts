const BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+$/, "");

export class ApiHttpError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any, message: string) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.data = data;
  }
}

async function readBody(res: Response): Promise<any> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(status: number, data: any, fallback: string): string {
  if (data && typeof data === "object") {
    const m = data.error || data.message || data.detail || data.title;
    if (m) return String(m);
    if (Array.isArray(data.errors) && data.errors.length) {
      return data.errors.map((e: any) => e?.message ?? String(e)).join("; ");
    }
  }
  if (typeof data === "string" && data.trim()) return data.slice(0, 300);
  if (status === 401) return "Нужна авторизация";
  if (status === 403) return "Нет доступа";
  if (status === 404) return "Не найдено";
  if (status >= 500) return `Ошибка сервера (${status})`;
  return fallback;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await readBody(res);
    throw new ApiHttpError(res.status, data, extractMessage(res.status, data, `HTTP ${res.status}`));
  }
  const data = await readBody(res);
  if (data === null) return undefined as unknown as T;
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { credentials: "include" });
  } catch (e: any) {
    throw new ApiHttpError(0, null, "Нет связи с сервером. Проверьте интернет.");
  }
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    throw new ApiHttpError(0, null, "Нет связи с сервером. Проверьте интернет.");
  }
  return handle<T>(res);
}

export const AGE_GROUP_LABEL: Record<string, string> = {
  age_14_15: "14–15 лет",
  age_16_17: "16–17 лет",
};

export const QUEST_STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  moderation: "На модерации",
  published: "Опубликован",
  archived: "В архиве",
  rejected: "Отклонён",
};

export const TASK_TYPE_LABEL: Record<string, string> = {
  code_word: "Кодовое слово",
  choice: "Выбор ответа",
};
