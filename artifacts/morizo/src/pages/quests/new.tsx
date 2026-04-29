import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  useCreateQuest,
  useAiValidateQuest,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wand2,
  Lightbulb,
  ImageIcon,
  Footprints,
  Bus,
  Car,
  Bike,
  Mountain,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CityAutocomplete } from "@/components/city-autocomplete";

type TravelMode = "foot" | "transport" | "public_transport" | "dirt_road" | "off_road";

const TRAVEL_MODES: { value: TravelMode; label: string; icon: LucideIcon }[] = [
  { value: "foot", label: "Пешком", icon: Footprints },
  { value: "public_transport", label: "Общественный транспорт", icon: Bus },
  { value: "transport", label: "Личный транспорт", icon: Car },
  { value: "dirt_road", label: "По грунтовкам", icon: Bike },
  { value: "off_road", label: "Без дорог", icon: Mountain },
];

const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200",
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200",
  "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=1200",
  "https://images.unsplash.com/photo-1513735492246-483525079686?w=1200",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200",
];

const TITLE_MIN = 5;
const TITLE_MAX = 120;
const DESC_MIN = 30;

type VerdictIssue = {
  severity: "info" | "warning" | "error";
  field: string;
  message: string;
};
type Verdict = {
  status: "approved" | "needs_work" | "rejected";
  score: number;
  summary: string;
  issues: VerdictIssue[];
  suggestions: string[];
};

export default function QuestNew() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: meLoading } = useGetMe();
  const create = useCreateQuest();
  const validate = useAiValidateQuest();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Нижний Новгород");
  const [district, setDistrict] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [durationMin, setDurationMin] = useState(60);
  const [rules, setRules] = useState("");
  const [bestTravelMode, setBestTravelMode] = useState<TravelMode | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    if (!meLoading && !me?.user) setLocation("/login");
  }, [me, meLoading, setLocation]);

  const runAi = () => {
    setVerdict(null);
    validate.mutate(
      { data: { title, description, rules, difficulty, durationMin } },
      {
        onSuccess: (v) => {
          setVerdict(v as Verdict);
          if (v.status === "approved") {
            toast.success(`AI одобрил квест: ${v.score}/100`);
          } else if (v.status === "needs_work") {
            toast.warning(`Нужны доработки: ${v.score}/100`);
          } else {
            toast.error(`AI отклонил квест: ${v.score}/100`);
          }
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verdict) {
      toast.error("Сначала проверь квест AI-ассистентом");
      return;
    }
    if (verdict.status === "rejected") {
      toast.error("AI отклонил квест. Исправь проблемы и проверь снова.");
      return;
    }
    create.mutate(
      {
        data: {
          title,
          description,
          city,
          district,
          coverUrl: coverUrl || undefined,
          difficulty,
          durationMin,
          rules: rules || undefined,
          bestTravelMode: bestTravelMode ?? undefined,
        },
      },
      {
        onSuccess: (q) => {
          toast.success("Черновик создан. Добавь точки маршрута.");
          setLocation(`/quests/${q.id}/edit`);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const canValidate =
    title.length >= TITLE_MIN && description.length >= DESC_MIN && district.length >= 2;

  const verdictMeta = verdict
    ? verdict.status === "approved"
      ? {
          icon: CheckCircle2,
          color: "text-primary",
          bg: "bg-primary/10",
          border: "border-primary",
          label: "Одобрено",
        }
      : verdict.status === "needs_work"
      ? {
          icon: AlertTriangle,
          color: "text-secondary",
          bg: "bg-secondary/10",
          border: "border-secondary",
          label: "Нужны доработки",
        }
      : {
          icon: XCircle,
          color: "text-destructive",
          bg: "bg-destructive/10",
          border: "border-destructive",
          label: "Отклонено",
        }
    : null;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 page-fade">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2 flex items-center gap-3">
          <Wand2 className="h-9 w-9 text-primary" />
          Новый квест
        </h1>
        <p className="text-muted-foreground font-mono text-sm mb-6">
          Заполни описание → проверь AI-ассистентом → создай черновик → добавь
          точки → отправь на модерацию.
        </p>
      </motion.div>

      <form onSubmit={submit} className="space-y-5">
        <div className="border-2 border-border bg-card p-5 space-y-5">
          <div>
            <Label className="text-xs font-bold uppercase">Название</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={TITLE_MIN}
              maxLength={TITLE_MAX}
              placeholder="Например: Тайны заречной слободы"
              className="rounded-none border-2 h-12 mt-1"
            />
            <span
              className={`text-[11px] font-mono tabular-nums mt-1 block ${
                title.length < TITLE_MIN ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {title.length < TITLE_MIN
                ? `Нужно ещё ${TITLE_MIN - title.length} симв. (${title.length} / ${TITLE_MIN})`
                : `${title.length} / ${TITLE_MAX} симв.`}
            </span>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase">Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              minLength={DESC_MIN}
              placeholder="Расскажи, что игрок увидит, какую загадку решит..."
              className="rounded-none border-2 mt-1"
            />
            <span
              className={`text-[11px] font-mono tabular-nums mt-1 block ${
                description.length < DESC_MIN ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {description.length < DESC_MIN
                ? `Нужно ещё ${DESC_MIN - description.length} симв. (${description.length} / ${DESC_MIN})`
                : `${description.length} симв.`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold uppercase mb-1 block">Город</Label>
              <CityAutocomplete
                value={city}
                onChange={setCity}
                placeholder="Нижний Новгород..."
                className="mt-0"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase">Район</Label>
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                placeholder="Сормово, Автозавод..."
                className="rounded-none border-2 h-12 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Обложка
            </Label>
            <Input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-none border-2 h-12 mt-1"
            />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
              {COVER_PRESETS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setCoverUrl(url)}
                  className={`h-16 bg-cover bg-center border-2 hover:border-primary transition-colors ${
                    coverUrl === url ? "border-primary" : "border-border"
                  }`}
                  style={{ backgroundImage: `url(${url})` }}
                  aria-label="Обложка"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold uppercase">
                Сложность 1–5
              </Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="rounded-none border-2 h-12 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase">
                Длительность, мин
              </Label>
              <Input
                type="number"
                min={10}
                max={480}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="rounded-none border-2 h-12 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase">
              Правила безопасности
            </Label>
            <Textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={3}
              placeholder="Не вставать на проезжую часть, уважать местных жителей..."
              className="rounded-none border-2 mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold uppercase">Рекомендованный способ передвижения</Label>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 mb-2">
              Выбери способ передвижения, для которого лучше всего подходит этот маршрут. Игроки смогут найти квест по этому признаку.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {TRAVEL_MODES.map((m) => {
                const Icon = m.icon;
                const isActive = bestTravelMode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setBestTravelMode(isActive ? null : m.value)}
                    className={`flex items-center gap-2 px-3 py-2 border-2 font-mono text-sm transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/60 text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <motion.div
          layout
          className="border-2 border-secondary bg-card relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="p-5 relative">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary" />
                <h2 className="font-black uppercase tracking-tight">
                  AI-ассистент модерации
                </h2>
              </div>
              <Button
                type="button"
                onClick={runAi}
                disabled={!canValidate || validate.isPending}
                className="rounded-none bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold uppercase"
              >
                {validate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Думаю...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Проверить
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              Ассистент проверит описание на безопасность, наличие пошаговых
              инструкций и адекватность маршрута. Без одобрения отправить в
              модерацию нельзя.
            </p>

            <AnimatePresence>
              {verdict && verdictMeta && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mt-4 border-2 ${verdictMeta.border} ${verdictMeta.bg} p-4`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <verdictMeta.icon
                        className={`h-6 w-6 ${verdictMeta.color}`}
                      />
                      <span
                        className={`font-black uppercase ${verdictMeta.color}`}
                      >
                        {verdictMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase text-muted-foreground">
                        Оценка
                      </span>
                      <motion.span
                        key={verdict.score}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-2xl font-black ${verdictMeta.color}`}
                      >
                        {verdict.score}
                      </motion.span>
                      <span className="text-sm text-muted-foreground">
                        / 100
                      </span>
                    </div>
                  </div>

                  <div className="h-2 bg-background border border-border mt-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${verdict.score}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full ${
                        verdict.status === "approved"
                          ? "bg-primary"
                          : verdict.status === "needs_work"
                          ? "bg-secondary"
                          : "bg-destructive"
                      }`}
                    />
                  </div>

                  <p className="text-sm mt-3">{verdict.summary}</p>

                  {(() => {
                    const errs = verdict.issues.filter((x) => x.severity === "error");
                    const warns = verdict.issues.filter((x) => x.severity === "warning");
                    const infos = verdict.issues.filter((x) => x.severity === "info");
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        {(errs.length > 0 || warns.length > 0) && (
                          <div className="border border-border bg-background/60 p-3">
                            <div className="text-xs font-bold uppercase text-destructive mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Проблемы
                            </div>
                            <ul className="text-xs space-y-1.5">
                              {[...errs, ...warns].map((p, i) => (
                                <li key={i} className="flex gap-1.5">
                                  <span
                                    className={`mt-0.5 inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                      p.severity === "error"
                                        ? "bg-destructive"
                                        : "bg-secondary"
                                    }`}
                                  />
                                  <span>
                                    <span className="font-mono text-[10px] uppercase text-muted-foreground mr-1">
                                      {p.field}
                                    </span>
                                    {p.message}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {infos.length > 0 && (
                          <div className="border border-border bg-background/60 p-3">
                            <div className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Заметки
                            </div>
                            <ul className="text-xs space-y-1 list-disc pl-4">
                              {infos.map((p, i) => (
                                <li key={i}>{p.message}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {verdict.suggestions.length > 0 && (
                          <div className="border border-border bg-background/60 p-3">
                            <div className="text-xs font-bold uppercase text-secondary mb-2 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" /> Идеи
                            </div>
                            <ul className="text-xs space-y-1 list-disc pl-4">
                              {verdict.suggestions.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <Button
          type="submit"
          disabled={
            create.isPending ||
            !verdict ||
            verdict.status === "rejected"
          }
          className="h-12 rounded-none font-black uppercase w-full text-base"
        >
          {create.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : verdict?.status === "rejected" ? (
            "Исправь проблемы и проверь снова"
          ) : !verdict ? (
            "Сначала проверь AI-ассистентом ↑"
          ) : (
            "Создать черновик"
          )}
        </Button>
      </form>
    </div>
  );
}
