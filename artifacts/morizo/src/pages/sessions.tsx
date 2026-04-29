import {
  useGetMe,
  useListMySessions,
  useDeleteSession,
  getListMySessionsQueryKey,
  type ListMySessionsQueryResult,
} from "@workspace/api-client-react";
import { Link, useLocation, useSearch } from "wouter";
import { useEffect, useState, useCallback } from "react";
import {
  Play,
  MapPin,
  Trophy,
  Clock,
  Navigation2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Reveal } from "@/components/reveal";
import { SessionsHistorySkeleton } from "@/components/skeleton-cards";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "В процессе",
  completed: "Завершён",
  abandoned: "Брошен",
};

const FILTER_TABS = [
  { value: "all", label: "Все" },
  { value: "in_progress", label: "В процессе" },
  { value: "completed", label: "Завершены" },
  { value: "abandoned", label: "Брошены" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

const TRAVEL_MODE_LABELS: Record<string, string> = {
  foot: "Пешком",
  public_transport: "Общ. транспорт",
  transport: "Транспорт",
  dirt_road: "Грунтовка",
  off_road: "Бездорожье",
};

function formatDuration(startedAt: string, finishedAt: string): string {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms <= 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  if (minutes > 0) return `${minutes} мин ${seconds} с`;
  return `${seconds} с`;
}

export default function Sessions() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { data: me, isLoading: meLoading } = useGetMe();
  const queryKey = getListMySessionsQueryKey();
  const { data, isLoading } = useListMySessions({
    query: { enabled: !!me?.user },
  });
  const queryClient = useQueryClient();
  const { mutate: deleteSession } = useDeleteSession();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const params = new URLSearchParams(search);
  const rawStatus = params.get("status") ?? "all";
  const activeFilter: FilterValue = (
    FILTER_TABS.some((t) => t.value === rawStatus) ? rawStatus : "all"
  ) as FilterValue;

  const setFilter = useCallback(
    (value: FilterValue) => {
      const next = new URLSearchParams(search);
      if (value === "all") {
        next.delete("status");
      } else {
        next.set("status", value);
      }
      const qs = next.toString();
      setLocation(location + (qs ? `?${qs}` : ""), { replace: true });
    },
    [search, location, setLocation],
  );

  function formatElapsed(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m} мин ${s} с` : `${s} с`;
  }

  useEffect(() => {
    if (!meLoading && !me?.user) setLocation("/login");
  }, [me, meLoading, setLocation]);

  function handleDelete(id: number) {
    setConfirmId(null);

    const previous = queryClient.getQueryData<ListMySessionsQueryResult>(queryKey);

    queryClient.setQueryData<ListMySessionsQueryResult>(queryKey, (old) =>
      old ? old.filter((s) => s.id !== id) : old,
    );

    deleteSession(
      { id },
      {
        onError: () => {
          queryClient.setQueryData(queryKey, previous);
        },
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey });
        },
      },
    );
  }

  const filteredData =
    !data || activeFilter === "all"
      ? data
      : data.filter((s) => s.status === activeFilter);

  if (isLoading || !data) {
    return (
      <div className="container max-w-screen-xl mx-auto py-8 px-4">
        <div className="h-10 w-56 shimmer rounded-none mb-6" />
        <SessionsHistorySkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-black uppercase mb-6">Мои прохождения</h1>

      <div className="flex flex-wrap gap-1 mb-6" role="tablist" aria-label="Фильтр по статусу">
        {FILTER_TABS.map((tab) => {
          const isActive = tab.value === activeFilter;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-1.5 text-xs font-bold uppercase border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {data.length === 0 ? (
        <Reveal>
          <div className="border-2 border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">
              Ты ещё не начинал ни одного квеста.
            </p>
            <Link href="/quests">
              <Button className="rounded-none">К каталогу</Button>
            </Link>
          </div>
        </Reveal>
      ) : filteredData!.length === 0 ? (
        <Reveal>
          <div className="border-2 border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">
              Нет прохождений с таким статусом.
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredData!.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.06}>
            <div
              className="border-2 border-border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/quests/${s.questId}`}>
                    <h3 className="font-black uppercase truncate hover:text-primary cursor-pointer">
                      {s.questTitle}
                    </h3>
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {s.questCity}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-bold uppercase border px-2 py-0.5 ${
                      s.status === "in_progress"
                        ? "border-primary text-primary bg-primary/10"
                        : s.status === "completed"
                          ? "border-secondary text-secondary bg-secondary/10"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABELS[s.status]}
                  </span>
                  {confirmId === s.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-none h-7 px-2 text-xs"
                        onClick={() => handleDelete(s.id)}
                      >
                        Удалить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-none h-7 px-2 text-xs"
                        onClick={() => setConfirmId(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Удалить прохождение"
                      onClick={() => setConfirmId(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-mono">
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-primary" /> {s.score} очков
                </span>
                <span className="text-muted-foreground">
                  {s.mode === "team" ? "Команда" : "Соло"}
                </span>
                {s.travelMode && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Navigation2 className="h-3.5 w-3.5" />
                    {TRAVEL_MODE_LABELS[s.travelMode] ?? s.travelMode}
                  </span>
                )}
                {s.status === "completed" && s.finishedAt && s.startedAt && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(s.startedAt, s.finishedAt)}
                  </span>
                )}
              </div>

              {s.status === "completed" && s.scoreBreakdown && (
                <>
                  <button
                    className="flex items-center gap-1 text-xs font-bold uppercase text-primary hover:underline"
                    onClick={() =>
                      setExpandedId(expandedId === s.id ? null : s.id)
                    }
                  >
                    {expandedId === s.id ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    Детализация очков
                  </button>

                  {expandedId === s.id && (
                    <div className="border border-border bg-muted/30 p-3 space-y-1.5 font-mono text-xs">
                      {[
                        {
                          label: "Очки за точки",
                          value: `+${s.scoreBreakdown.checkpointPoints}`,
                        },
                        {
                          label: "Бонус завершения",
                          value: `+${s.scoreBreakdown.completionBonus}`,
                        },
                        {
                          label: "Бонус скорости",
                          value: `+${s.scoreBreakdown.speedBonus}`,
                          sub: `(${formatElapsed(s.scoreBreakdown.elapsedSeconds)})`,
                        },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {row.label}
                            {row.sub && (
                              <span className="text-muted-foreground/60 ml-1.5">
                                {row.sub}
                              </span>
                            )}
                          </span>
                          <span className="font-black">{row.value}</span>
                        </div>
                      ))}

                      <div className="border-t border-border pt-1.5 flex justify-between text-muted-foreground">
                        <span>Промежуточная сумма</span>
                        <span>{s.scoreBreakdown.subtotal}</span>
                      </div>

                      {[
                        {
                          label: "Множитель сложности",
                          value: `×${s.scoreBreakdown.difficultyMultiplier}`,
                        },
                        {
                          label: "Множитель передвижения",
                          value: `×${s.scoreBreakdown.travelMultiplier}`,
                          sub: s.travelMode
                            ? `(${TRAVEL_MODE_LABELS[s.travelMode] ?? s.travelMode})`
                            : undefined,
                        },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {row.label}
                            {row.sub && (
                              <span className="text-muted-foreground/60 ml-1.5">
                                {row.sub}
                              </span>
                            )}
                          </span>
                          <span className="font-black">{row.value}</span>
                        </div>
                      ))}

                      <div className="border-t border-border pt-1.5 flex justify-between font-black">
                        <span>Итого</span>
                        <span className="text-primary">{s.score}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {s.status === "in_progress" ? (
                <Link href={`/play/${s.id}`}>
                  <Button className="w-full rounded-none">
                    <Play className="h-4 w-4 mr-2" /> Продолжить
                  </Button>
                </Link>
              ) : (
                <Link href={`/quests/${s.questId}`}>
                  <Button variant="outline" className="w-full rounded-none">
                    К квесту
                  </Button>
                </Link>
              )}
            </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
