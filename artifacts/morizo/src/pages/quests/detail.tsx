import { useParams, Link, useLocation } from "wouter";
import {
  useGetMe,
  useGetQuest,
  useGetQuestSessions,
  useStartSession,
  useSubmitQuest,
  useArchiveQuest,
  useListMyTeams,
  getGetQuestQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Clock,
  Star,
  Loader2,
  ArrowLeft,
  Pencil,
  Send,
  Archive,
  Users,
  User as UserIcon,
  Play,
  Share2,
  Flag,
  Timer,
  Footprints,
  Bus,
  Car,
  Bike,
  Mountain,
  Trophy,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QuestMap } from "@/components/quest-map";
import { QuestStatusBadge } from "@/components/quest-status-badge";
import { TASK_TYPE_LABEL } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatTimeTaken(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} с`;
  if (s === 0) return `${m} мин`;
  return `${m} мин ${s} с`;
}

function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

const TRAVEL_MODES: { value: "foot" | "transport" | "public_transport" | "dirt_road" | "off_road"; label: string; bonus: string; icon: (props: { className?: string }) => JSX.Element }[] = [
  { value: "foot", label: "Пешком", bonus: "×1.2 к очкам", icon: Footprints },
  { value: "public_transport", label: "Общественный транспорт", bonus: "×1.0 к очкам", icon: Bus },
  { value: "transport", label: "Личный транспорт", bonus: "×0.8 к очкам", icon: Car },
  { value: "dirt_road", label: "По грунтовкам", bonus: "×1.3 к очкам", icon: Bike },
  { value: "off_road", label: "Без дорог", bonus: "×1.5 к очкам", icon: Mountain },
];

export default function QuestDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const { data, isLoading } = useGetQuest(id);
  const { data: sessionsStats } = useGetQuestSessions(id, { limit: 5 }, { query: { enabled: !!id } });
  const { data: myTeams } = useListMyTeams({ query: { enabled: !!me?.user } });
  const startSession = useStartSession();
  const submitQuest = useSubmitQuest();
  const archive = useArchiveQuest();

  const [mode, setMode] = useState<"solo" | "team">("solo");
  const [teamId, setTeamId] = useState<string>("");
  const [travelMode, setTravelMode] = useState<"foot" | "transport" | "public_transport" | "dirt_road" | "off_road">("foot");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [lobbyMinutes, setLobbyMinutes] = useState("5");
  const [lobbyBusy, setLobbyBusy] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="container max-w-screen-xl mx-auto py-12 px-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { quest, checkpoints } = data;
  const isOwner = me?.user?.id === quest.authorId;
  const isModerator = me?.user?.role === "moderator";
  const canPlay = quest.status === "published" && !!me?.user;

  const handleStart = () => {
    if (!me?.user) {
      setLocation("/login");
      return;
    }
    startSession.mutate(
      {
        data: {
          questId: quest.id,
          mode,
          teamId: mode === "team" ? Number(teamId) : undefined,
          travelMode,
        },
      },
      {
        onSuccess: (s) => {
          setLocation(`/play/${s.id}`);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const handleSubmit = () => {
    submitQuest.mutate(
      { id: quest.id },
      {
        onSuccess: () => {
          toast.success("Квест отправлен на модерацию");
          qc.invalidateQueries({ queryKey: getGetQuestQueryKey(id) });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/quests/${quest.id}`;
    const text = `${quest.title} — городской квест в MORIZO`;
    if (navigator.share) {
      try {
        await navigator.share({ title: quest.title, text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleReport = async () => {
    if (reportReason.trim().length < 5) {
      toast.error("Опишите проблему — минимум 5 символов");
      return;
    }
    setReportBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ questId: quest.id, reason: reportReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Не удалось отправить жалобу");
      toast.success("Жалоба отправлена. Модераторы её рассмотрят.");
      setReportOpen(false);
      setReportReason("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setReportBusy(false);
    }
  };

  const handleCreateLobby = async () => {
    if (!teamId) {
      toast.error("Выберите команду");
      return;
    }
    const minutes = Number(lobbyMinutes);
    if (!Number.isFinite(minutes) || minutes < 1) {
      toast.error("Время старта должно быть от 1 минуты");
      return;
    }
    setLobbyBusy(true);
    try {
      const res = await fetch("/api/sessions/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questId: quest.id,
          teamId: Number(teamId),
          startInMinutes: minutes,
          travelMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Не удалось создать лобби");
      toast.success(`Лобби создано · код ${json.lobbyCode}`);
      setLocation(`/play/lobby/${json.lobbyCode}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLobbyBusy(false);
    }
  };

  const handleArchive = () => {
    archive.mutate(
      { id: quest.id },
      {
        onSuccess: () => {
          toast.success("Квест перемещён в архив");
          qc.invalidateQueries({ queryKey: getGetQuestQueryKey(id) });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="container max-w-screen-xl mx-auto py-8 px-4">
      <Link href="/quests">
        <Button variant="ghost" className="mb-4 -ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Назад к каталогу
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {quest.coverUrl && (
            <div className="aspect-[16/9] border-2 border-border overflow-hidden">
              <img
                src={quest.coverUrl}
                alt={quest.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <QuestStatusBadge status={quest.status} />
            <span className="border border-border px-2 py-0.5 text-xs font-bold uppercase font-mono">
              {quest.city}, {quest.district}
            </span>
            <span className="border border-border px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1 font-mono">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {quest.difficulty}/5
            </span>
            <span className="border border-border px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1 font-mono">
              <Clock className="h-3 w-3" />
              {quest.durationMin} мин
            </span>
            {quest.maxTeamSize != null && (
              <span className="border border-border px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1 font-mono">
                <Users className="h-3 w-3" />
                до {quest.maxTeamSize} игроков
              </span>
            )}
            {quest.bestTravelMode && (() => {
              const modeInfo = TRAVEL_MODES.find((m) => m.value === quest.bestTravelMode);
              if (!modeInfo) return null;
              const Icon = modeInfo.icon;
              return (
                <span className="border border-primary/60 bg-primary/5 text-primary px-2 py-0.5 text-xs font-bold uppercase flex items-center gap-1 font-mono">
                  <Icon className="h-3 w-3" />
                  {modeInfo.label}
                </span>
              );
            })()}
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
              {quest.title}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-2">
              Автор: @{quest.authorNickname ?? "—"}
            </p>
          </div>

          <p className="text-lg text-foreground/90 leading-relaxed whitespace-pre-line">
            {quest.description}
          </p>

          {quest.rules && (
            <div className="border-2 border-border bg-card p-4">
              <h3 className="text-sm font-black uppercase mb-2 text-secondary">
                Правила безопасности
              </h3>
              <p className="text-sm text-foreground/80 whitespace-pre-line">
                {quest.rules}
              </p>
            </div>
          )}

          {quest.status === "rejected" && quest.rejectionReason && (
            <div className="border-2 border-destructive bg-destructive/10 p-4">
              <h3 className="text-sm font-black uppercase mb-2 text-destructive">
                Причина отклонения
              </h3>
              <p className="text-sm">{quest.rejectionReason}</p>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-black uppercase mb-4">Маршрут</h2>
            <QuestMap
              points={checkpoints.map((c, i) => ({
                lat: c.lat,
                lng: c.lng,
                name: c.name,
                index: i,
              }))}
              height={400}
              travelMode={travelMode}
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black uppercase">Точки</h2>
            {checkpoints.length === 0 ? (
              <p className="text-muted-foreground font-mono text-sm">
                Точки маршрута пока не добавлены.
              </p>
            ) : (
              checkpoints.map((c, i) => (
                <div
                  key={c.id}
                  className="border-2 border-border bg-card p-4 flex gap-4"
                >
                  <div className="shrink-0 w-10 h-10 border-2 border-primary text-primary font-black font-mono flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg uppercase">{c.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono mb-2">
                      {TASK_TYPE_LABEL[c.taskType]}
                    </p>
                    <p className="text-sm text-foreground/90">{c.task}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {sessionsStats && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-2xl font-black uppercase">Последние прохождения</h2>
                <div className="flex flex-wrap gap-3">
                  <span className="border border-border px-3 py-1 text-xs font-bold font-mono uppercase flex items-center gap-1.5">
                    <Trophy className="h-3 w-3 text-primary" />
                    {sessionsStats.totalCompleted} прохождений
                  </span>
                  {sessionsStats.totalCompleted > 0 && (
                    <span className="border border-border px-3 py-1 text-xs font-bold font-mono uppercase flex items-center gap-1.5">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      Средний счёт: {Math.round(sessionsStats.avgScore)}
                    </span>
                  )}
                </div>
              </div>

              {sessionsStats.recentRuns.length === 0 ? (
                <p className="text-muted-foreground font-mono text-sm">
                  Пока никто не прошёл этот квест. Будь первым!
                </p>
              ) : (
                <div className="space-y-2">
                  {sessionsStats.recentRuns.map((run, i) => (
                    <div
                      key={run.sessionId}
                      className="border-2 border-border bg-card p-3 flex items-center gap-4"
                    >
                      <div className="shrink-0 w-8 h-8 border-2 border-border text-muted-foreground font-black font-mono text-sm flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm uppercase truncate">@{run.nickname}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="font-black font-mono text-primary text-sm">
                          {run.score.toLocaleString("ru-RU")} очков
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeTaken(run.timeTakenSeconds)}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground flex items-center justify-end gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(run.finishedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          {canPlay && (
            <div className="border-2 border-primary bg-card p-5 space-y-4">
              <h3 className="text-xl font-black uppercase">Готов начать?</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode("solo")}
                    className={`flex-1 border-2 p-3 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-colors ${
                      mode === "solo"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <UserIcon className="h-4 w-4" /> Соло
                  </button>
                  <button
                    onClick={() => setMode("team")}
                    className={`flex-1 border-2 p-3 text-sm font-bold uppercase flex items-center justify-center gap-2 transition-colors ${
                      mode === "team"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <Users className="h-4 w-4" /> Команда
                  </button>
                </div>

                {mode === "team" && (
                  <>
                    <Select value={teamId} onValueChange={setTeamId}>
                      <SelectTrigger className="rounded-none border-2">
                        <SelectValue placeholder="Выбери команду" />
                      </SelectTrigger>
                      <SelectContent>
                        {(myTeams ?? []).map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                        {(myTeams?.length ?? 0) === 0 && (
                          <div className="p-2 text-sm text-muted-foreground">
                            Нет команд. Создай или вступи на странице «Команды».
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="border-2 border-border bg-muted/30 p-3 space-y-2">
                      <Label className="text-[11px] font-bold uppercase font-mono flex items-center gap-1">
                        <Timer className="h-3 w-3 text-primary" />
                        Старт через (мин)
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={lobbyMinutes}
                        onChange={(e) => setLobbyMinutes(e.target.value)}
                        className="rounded-none border-2 h-9"
                      />
                      <Button
                        onClick={handleCreateLobby}
                        disabled={lobbyBusy || !teamId}
                        variant="outline"
                        className="w-full rounded-none border-2 font-bold uppercase"
                      >
                        {lobbyBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Users className="h-4 w-4 mr-2" />
                        )}
                        Создать лобби с таймером
                      </Button>
                      <p className="text-[10px] font-mono text-muted-foreground leading-tight">
                        Все участники команды получат уведомление и стартуют
                        одновременно.
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase font-mono">
                    Способ передвижения
                  </Label>
                  <div className="grid grid-cols-1 gap-1">
                    {TRAVEL_MODES.map((tm) => (
                      <button
                        key={tm.value}
                        type="button"
                        onClick={() => setTravelMode(tm.value)}
                        className={`flex items-center gap-3 p-2.5 border-2 text-left transition-colors ${
                          travelMode === tm.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <tm.icon className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase">{tm.label}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{tm.bonus}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleStart}
                  disabled={
                    startSession.isPending ||
                    (mode === "team" && !teamId)
                  }
                  className="w-full h-12 rounded-none font-black uppercase text-base"
                >
                  {startSession.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      {mode === "team" ? "Начать в команде" : "Начать прохождение"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Share + Report */}
          <div className="border-2 border-border bg-card p-5 space-y-2">
            <h3 className="text-sm font-black uppercase text-muted-foreground mb-1">
              Действия
            </h3>
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full rounded-none border-2 font-bold uppercase"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Поделиться квестом
            </Button>
            {me?.user && !isOwner && (
              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full rounded-none border-2 font-bold uppercase text-destructive hover:text-destructive"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Пожаловаться
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none border-2" open={reportOpen}>
                  <DialogHeader>
                    <DialogTitle className="font-black uppercase">
                      Жалоба на квест
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Label className="text-xs font-bold uppercase font-mono">
                      Что не так?
                    </Label>
                    <Textarea
                      value={reportReason}
                      onChange={(e) =>
                        setReportReason(e.target.value.slice(0, 2000))
                      }
                      rows={5}
                      placeholder="Опишите проблему: опасный маршрут, ошибка в задании, оскорбительный контент…"
                      className="rounded-none border-2"
                    />
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {reportReason.length}/2000
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      className="rounded-none"
                      onClick={() => setReportOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button
                      className="rounded-none font-black uppercase"
                      onClick={handleReport}
                      disabled={reportBusy}
                    >
                      {reportBusy && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Отправить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!me?.user && quest.status === "published" && (
            <div className="border-2 border-border bg-card p-5">
              <p className="text-sm text-muted-foreground mb-3">
                Чтобы начать прохождение, войдите в аккаунт.
              </p>
              <Link href="/login">
                <Button className="w-full rounded-none">Войти</Button>
              </Link>
            </div>
          )}

          {(isOwner || isModerator) && (
            <div className="border-2 border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-black uppercase text-muted-foreground">
                Действия автора
              </h3>
              <Link href={`/quests/${quest.id}/edit`}>
                <Button variant="outline" className="w-full rounded-none">
                  <Pencil className="h-4 w-4 mr-2" /> Редактировать
                </Button>
              </Link>
              {(quest.status === "draft" || quest.status === "rejected") && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitQuest.isPending}
                  className="w-full rounded-none"
                >
                  <Send className="h-4 w-4 mr-2" /> Отправить на модерацию
                </Button>
              )}
              {quest.status !== "archived" && (
                <Button
                  onClick={handleArchive}
                  disabled={archive.isPending}
                  variant="outline"
                  className="w-full rounded-none"
                >
                  <Archive className="h-4 w-4 mr-2" /> В архив
                </Button>
              )}
            </div>
          )}

          <div className="border-2 border-border bg-card p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Точек</span>
              <span className="font-bold font-mono">
                {quest.checkpointCount ?? checkpoints.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Прохождений</span>
              <span className="font-bold font-mono">
                {quest.completionCount ?? 0}
              </span>
            </div>
            {quest.avgRating != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Рейтинг</span>
                <span className="font-bold font-mono">
                  {quest.avgRating.toFixed(1)} / 5
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
