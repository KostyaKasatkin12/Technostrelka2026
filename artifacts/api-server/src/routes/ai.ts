import { Router, type IRouter } from "express";
import { AiValidateQuestBody } from "@workspace/api-zod";
import { logger } from "../lib/logger.ts";

const router: IRouter = Router();

const BANNED_WORDS = [
  "блять",
  "сука",
  "хуй",
  "пизд",
  "ебан",
  "fuck",
  "shit",
  "bitch",
];

const RISKY_WORDS = [
  "крыша",
  "пролез",
  "забор",
  "запретн",
  "опасно",
  "трасса",
  "рельсы",
  "стройка",
  "подвал",
  "канализ",
];

type Issue = {
  severity: "info" | "warning" | "error";
  field: string;
  message: string;
};

type Verdict = {
  score: number;
  status: "approved" | "needs_work" | "rejected";
  summary: string;
  issues: Issue[];
  suggestions: string[];
  source?: "mistral" | "heuristic";
};

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL ?? "mistral-small-latest";

/* ------------------ Heuristic verdict (fallback / always available) ------------------ */
function heuristicVerdict(input: {
  title: string;
  description: string;
  rules?: string;
  difficulty?: number;
  durationMin?: number;
  checkpoints?: Array<{ name?: string; task?: string; hint?: string }>;
}): Verdict {
  const { title, description, rules, difficulty, durationMin, checkpoints } = input;
  const issues: Issue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (title.length < 6) {
    issues.push({
      severity: "error",
      field: "title",
      message: "Название слишком короткое — добавь подробностей",
    });
    score -= 20;
  } else if (title.length > 80) {
    issues.push({
      severity: "warning",
      field: "title",
      message: "Название длиннее 80 символов — может обрезаться в карточке",
    });
    score -= 5;
  }
  if (/^[A-ZА-ЯЁ\s\d!?]+$/.test(title) && title.length > 12) {
    issues.push({
      severity: "info",
      field: "title",
      message: "Название целиком в верхнем регистре — выглядит как крик",
    });
    score -= 5;
  }

  const descWords = description.trim().split(/\s+/).filter(Boolean).length;
  if (descWords < 20) {
    issues.push({
      severity: "error",
      field: "description",
      message: `В описании всего ${descWords} слов — нужно минимум 20`,
    });
    score -= 20;
    suggestions.push(
      "Расскажи про настроение маршрута, что игроки увидят и почему это интересно",
    );
  } else if (descWords < 40) {
    issues.push({
      severity: "info",
      field: "description",
      message: "Описание короткое — добавь немного деталей про атмосферу",
    });
    score -= 5;
  }

  const lower = (title + " " + description + " " + (rules ?? "")).toLowerCase();
  for (const w of BANNED_WORDS) {
    if (lower.includes(w)) {
      issues.push({
        severity: "error",
        field: "content",
        message: "Обнаружена ненормативная лексика — переформулируй",
      });
      score -= 30;
      break;
    }
  }
  const riskHits = RISKY_WORDS.filter((w) => lower.includes(w));
  if (riskHits.length > 0) {
    issues.push({
      severity: "warning",
      field: "safety",
      message: `Найдены потенциально небезопасные слова: ${riskHits.join(", ")}. Уточни в правилах.`,
    });
    score -= 10;
    suggestions.push(
      "Добавь раздел про безопасность: где не лазить, как переходить дорогу",
    );
  }

  if (difficulty !== undefined && (difficulty < 1 || difficulty > 5)) {
    issues.push({
      severity: "error",
      field: "difficulty",
      message: "Сложность должна быть от 1 до 5",
    });
    score -= 10;
  }
  if (durationMin !== undefined) {
    if (durationMin < 15) {
      issues.push({
        severity: "warning",
        field: "durationMin",
        message: "Меньше 15 минут — слишком быстро для городского квеста",
      });
      score -= 5;
    } else if (durationMin > 240) {
      issues.push({
        severity: "warning",
        field: "durationMin",
        message: "Дольше 4 часов — игроки могут устать",
      });
      score -= 5;
    }
  }

  if (!rules || rules.trim().length < 10) {
    issues.push({
      severity: "warning",
      field: "rules",
      message: "Правила безопасности отсутствуют или слишком короткие",
    });
    score -= 10;
    suggestions.push(
      "Опиши правила: возрастная группа, что делать в случае непогоды, контакты",
    );
  }

  if (checkpoints) {
    if (checkpoints.length < 2) {
      issues.push({
        severity: "error",
        field: "checkpoints",
        message: "Маршрут должен включать минимум 2 точки",
      });
      score -= 20;
    } else if (checkpoints.length < 4) {
      issues.push({
        severity: "info",
        field: "checkpoints",
        message: "Большинство квестов имеют 4+ точки — подумай добавить ещё",
      });
      score -= 5;
    }
    checkpoints.forEach((c, i) => {
      if (!c.task || c.task.length < 20) {
        issues.push({
          severity: "warning",
          field: `checkpoint[${i}]`,
          message: `Точка «${c.name ?? i + 1}»: задание короче 20 символов`,
        });
        score -= 3;
      }
      if (!c.hint) {
        issues.push({
          severity: "info",
          field: `checkpoint[${i}].hint`,
          message: `Точка «${c.name ?? i + 1}»: нет подсказки на случай тупика`,
        });
      }
    });
  }

  if (suggestions.length === 0 && score >= 80) {
    suggestions.push(
      "Хорошая работа! Можно добавить фотографий точек, чтобы игрокам было интереснее",
    );
  }

  score = Math.max(0, Math.min(100, score));
  let status: Verdict["status"] = "approved";
  let summary = "Квест выглядит классно — можно отправлять модератору";
  if (score < 50) {
    status = "rejected";
    summary = "Слишком много проблем — переработай и попробуй снова";
  } else if (score < 75 || issues.some((i) => i.severity === "error")) {
    status = "needs_work";
    summary = "Есть что улучшить, но в целом неплохо";
  }

  return { score, status, summary, issues, suggestions, source: "heuristic" };
}

/* ------------------ Mistral verdict ------------------ */
async function mistralVerdict(
  input: Parameters<typeof heuristicVerdict>[0],
  apiKey: string,
): Promise<Verdict | null> {
  const cpSummary = (input.checkpoints ?? [])
    .map(
      (c, i) =>
        `${i + 1}. ${c.name ?? "(без названия)"} — ${
          c.task ? c.task.slice(0, 120) : "(без задания)"
        }${c.hint ? ` | подсказка: ${c.hint.slice(0, 60)}` : ""}`,
    )
    .join("\n") || "—";

  const userPrompt = `Проверь черновик городского квеста для подростков 14–17 лет.
Верни СТРОГО валидный JSON и больше ничего.

Черновик:
- Название: ${input.title}
- Описание: ${input.description}
- Сложность: ${input.difficulty ?? "не задана"}/5
- Длительность: ${input.durationMin ?? "не задана"} мин
- Правила/безопасность: ${input.rules ?? "(нет)"}
- Чекпоинты:
${cpSummary}

Оцени по критериям:
1) Безопасность подростков (нет ли крыш, заборов, дорог без перехода и т.п.).
2) Адекватность контента (без матов, расизма, рекламы).
3) Качество описания (≥20 слов, есть атмосфера).
4) Логика маршрута (≥2 чекпоинтов, у каждого внятное задание ≥20 символов).
5) Правила/безопасность присутствуют.

Верни JSON со схемой:
{
  "score": число 0..100,
  "status": "approved" | "needs_work" | "rejected",
  "summary": короткое резюме на русском (≤120 символов),
  "issues": [
    { "severity": "info"|"warning"|"error", "field": "string", "message": "string" }
  ],
  "suggestions": [ "строки на русском" ]
}`;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12_000);
    const resp = await fetch(MISTRAL_API_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты — модератор городских квестов для подростков. Отвечай только валидным JSON по схеме, никакого markdown.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      logger.warn(
        { status: resp.status },
        "[ai/mistral] non-200 response, falling back",
      );
      return null;
    }
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<Verdict>;

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
    const status: Verdict["status"] =
      parsed.status === "approved" || parsed.status === "rejected"
        ? parsed.status
        : "needs_work";
    return {
      score,
      status,
      summary: typeof parsed.summary === "string" ? parsed.summary : "Готово",
      issues: Array.isArray(parsed.issues)
        ? parsed.issues
            .filter(
              (i): i is Issue =>
                !!i &&
                typeof i === "object" &&
                typeof i.field === "string" &&
                typeof i.message === "string" &&
                ["info", "warning", "error"].includes(
                  (i as Issue).severity as string,
                ),
            )
            .slice(0, 30)
        : [],
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((s): s is string => typeof s === "string")
            .slice(0, 10)
        : [],
      source: "mistral",
    };
  } catch (err) {
    logger.warn({ err: String(err) }, "[ai/mistral] call failed, falling back");
    return null;
  }
}

router.post("/ai/validate-quest", async (req, res): Promise<void> => {
  const parsed = AiValidateQuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const apiKey = process.env.MISTRAL_API_KEY;
  if (apiKey) {
    const v = await mistralVerdict(parsed.data, apiKey);
    if (v) {
      res.json(v);
      return;
    }
  }
  res.json(heuristicVerdict(parsed.data));
});

/* ------------------ Quest idea assistant ------------------
   Body: { city: string, vibe?: string, difficulty?: 1..5 }
   Returns: { title, description, rules, durationMin, difficulty, checkpointHints: string[] }
*/
router.post("/ai/quest-assist", async (req, res): Promise<void> => {
  const { city, vibe, difficulty } = (req.body ?? {}) as {
    city?: string;
    vibe?: string;
    difficulty?: number;
  };
  if (!city || typeof city !== "string" || city.length < 2) {
    res.status(400).json({ error: "Укажи город (поле city)" });
    return;
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    // Local stub so the feature works even without a key
    res.json({
      title: `${city}: тропа инсайдеров`,
      description: `Маршрут по неочевидным местам ${city} — тихие дворы, муралы и крафтовые кафе. Подходит для прогулки с друзьями или соло-исследования.`,
      rules:
        "Не лазь на крыши, переходи дорогу только по переходу, бери с собой воду и заряженный телефон.",
      durationMin: 60,
      difficulty: difficulty ?? 2,
      checkpointHints: [
        "Найди мурал во дворе старого дома",
        "Сделай фото у ретро-вывески",
        "Зайди в кофейню и узнай название фирменного напитка",
        "Подойди к памятнику и прочитай табличку",
      ],
      source: "stub",
    });
    return;
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12_000);
    const resp = await fetch(MISTRAL_API_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты помогаешь подросткам 14–17 придумать безопасный городской квест. Отвечай только валидным JSON.",
          },
          {
            role: "user",
            content: `Придумай городской квест для города "${city}". ${
              vibe ? `Настроение: ${vibe}.` : ""
            } Сложность ${difficulty ?? 2}/5. Верни JSON:
{
  "title": "название (5-60 симв)",
  "description": "1-2 абзаца, минимум 30 слов",
  "rules": "правила безопасности на 1-2 предложения",
  "durationMin": число от 30 до 180,
  "difficulty": число 1..5,
  "checkpointHints": ["4-6 коротких идей чекпоинтов"]
}`,
          },
        ],
      }),
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      logger.warn(
        { status: resp.status },
        "[ai/quest-assist] non-200, returning stub",
      );
      res.status(502).json({ error: "AI недоступен, попробуй позже" });
      return;
    }
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      res.status(502).json({ error: "Пустой ответ AI" });
      return;
    }
    const parsed = JSON.parse(content);
    res.json({ ...parsed, source: "mistral" });
  } catch (err) {
    logger.warn({ err: String(err) }, "[ai/quest-assist] failed");
    res.status(502).json({ error: "AI недоступен" });
  }
});

router.get("/ai/status", (_req, res): void => {
  res.json({
    enabled: !!process.env.MISTRAL_API_KEY,
    provider: process.env.MISTRAL_API_KEY ? "mistral" : "heuristic",
    model: process.env.MISTRAL_API_KEY ? MISTRAL_MODEL : null,
  });
});

export default router;
