import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Clock,
  Trophy,
  Play,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMe } from "@workspace/api-client-react";

type Standing = {
  userId: number;
  sessionId: number;
  nickname: string;
  avatar: string | null;
  score: number;
  currentIndex: number;
  status: "started" | "in_progress" | "completed" | "abandoned";
  finishedAt: string | null;
  isLeader: boolean;
};

type LobbyData = {
  lobbyCode: string;
  quest: {
    id: number;
    title: string;
    city: string;
    difficulty: string;
    coverUrl?: string | null;
  } | null;
  team: { id: number; name: string } | null;
  leaderUserId: number;
  scheduledStartAt: string | null;
  totalCheckpoints: number;
  standings: Standing[];
  everyoneFinished: boolean;
  canStart: boolean;
};

function fmtDuration(ms: number): string {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const joinedRef = useRef(false);

  // Tick clock for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Fetch lobby data, refetching every 3s for live leaderboard
  const { data, isLoading, refetch, error } = useQuery<LobbyData>({
    queryKey: ["lobby", code],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/lobby/${code}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Лобби недоступно");
      return json as LobbyData;
    },
    refetchInterval: 3000,
    enabled: !!code && !!me?.user,
  });

  // Auto-join if not in lobby yet
  useEffect(() => {
    if (!data || !me?.user || joinedRef.current) return;
    const inLobby = data.standings.some((s) => s.userId === me.user!.id);
    if (!inLobby) {
      joinedRef.current = true;
      void (async () => {
        try {
          const res = await fetch(`/api/sessions/lobby/${code}/join`, {
            method: "POST",
            credentials: "include",
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.message ?? "Не удалось присоединиться");
          toast.success("Вы в лобби");
          refetch();
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Ошибка входа в лобби");
        }
      })();
    }
  }, [data, me?.user, code, refetch]);

  const startMs = data?.scheduledStartAt
    ? new Date(data.scheduledStartAt).getTime()
    : 0;
  const remainingMs = Math.max(0, startMs - now);
  const started = remainingMs <= 0 && (data?.canStart ?? false);

  const mySession = useMemo(
    () => data?.standings.find((s) => s.userId === me?.user?.id),
    [data, me?.user?.id],
  );

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/play/lobby/${code}`;
  }, [code]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.quest?.title ?? "MORIZO квест",
          text: `Присоединяйся к команде! Код лобби: ${code}`,
          url: inviteUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void copyCode();
    }
  }

  if (!me?.user) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4">
        <div className="border-2 border-border bg-card p-6 text-center font-mono text-sm">
          Войдите в аккаунт, чтобы присоединиться к лобби.
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    if (error) {
      return (
        <div className="container max-w-3xl mx-auto py-10 px-4">
          <div className="border-2 border-destructive bg-card p-6 text-center font-mono text-sm">
            {(error as Error).message}
          </div>
        </div>
      );
    }
    return (
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="page-fade container max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="border-2 border-border bg-card p-5 md:p-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          командное лобби · live
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black uppercase">
              {data.quest?.title ?? "Квест"}
            </h1>
            <div className="text-xs font-mono uppercase text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>команда: {data.team?.name ?? "—"}</span>
              <span>·</span>
              <span>код: {data.lobbyCode}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-none border-2 font-bold uppercase"
              onClick={copyCode}
            >
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              Ссылка
            </Button>
            <Button
              size="sm"
              className="rounded-none font-bold uppercase"
              onClick={shareInvite}
            >
              Пригласить
            </Button>
          </div>
        </div>
      </div>

      {/* Countdown / Start */}
      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-2 border-primary bg-card p-6 mt-4 text-center"
          >
            <Clock className="h-7 w-7 text-primary mx-auto mb-2" />
            <div className="text-xs font-mono uppercase text-muted-foreground">
              старт через
            </div>
            <div className="text-5xl md:text-6xl font-black tabular-nums my-2">
              {fmtDuration(remainingMs)}
            </div>
            <div className="text-xs font-mono uppercase text-muted-foreground">
              когда отсчёт закончится — все стартуют одновременно
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="go"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-2 border-primary bg-primary/10 p-6 mt-4 text-center"
          >
            <Play className="h-7 w-7 text-primary mx-auto mb-2" />
            <div className="text-xl font-black uppercase">Старт!</div>
            {mySession && (mySession.status === "started" || mySession.status === "in_progress") && (
              <Button
                size="lg"
                className="rounded-none font-black uppercase mt-3 h-12 px-6"
                onClick={() => setLocation(`/play/${mySession.sessionId}`)}
              >
                Открыть квест
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            )}
            {mySession && mySession.status === "completed" && (
              <div className="mt-3 text-sm font-mono">
                Вы прошли! Очков: <b>{mySession.score}</b>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live leaderboard */}
      <div className="mt-6 border-2 border-border bg-card">
        <div className="border-b-2 border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-black uppercase">
              Live-таблица команды
            </h2>
          </div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-primary animate-pulse rounded-full" />
            обновление каждые 3 сек
          </div>
        </div>
        <ul className="divide-y-2 divide-border">
          {data.standings.map((s, i) => {
            const pct =
              data.totalCheckpoints > 0
                ? Math.round((s.currentIndex / data.totalCheckpoints) * 100)
                : 0;
            return (
              <motion.li
                layout
                key={s.userId}
                className={`px-4 py-3 flex items-center gap-3 ${
                  s.userId === me?.user?.id ? "bg-primary/5" : ""
                }`}
              >
                <div className="font-black text-lg w-7 text-right tabular-nums">
                  {i + 1}
                </div>
                <div className="h-10 w-10 border-2 border-border bg-muted overflow-hidden flex items-center justify-center">
                  {s.avatar ? (
                    <img
                      src={s.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Users className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate flex items-center gap-1">
                    {s.nickname}
                    {s.isLeader && (
                      <Crown
                        className="h-3.5 w-3.5 text-primary"
                        aria-label="Лидер команды"
                      />
                    )}
                  </div>
                  <div className="h-1.5 bg-muted border border-border mt-1 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {s.currentIndex}/{data.totalCheckpoints} точек
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black tabular-nums">{s.score}</div>
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">
                    {s.status === "completed"
                      ? "финиш"
                      : s.status === "abandoned"
                      ? "вышел"
                      : "в игре"}
                  </div>
                </div>
              </motion.li>
            );
          })}
          {data.standings.length === 0 && (
            <li className="px-4 py-6 text-center text-sm font-mono text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Ждём игроков…
            </li>
          )}
        </ul>
      </div>

      {data.everyoneFinished && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-2 border-primary bg-card p-5 mt-4 text-center"
        >
          <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
          <div className="text-lg font-black uppercase">Все финишировали!</div>
          <div className="text-sm font-mono text-muted-foreground mt-1">
            Победитель: <b>{data.standings[0]?.nickname}</b> · {data.standings[0]?.score}{" "}
            очков
          </div>
          <Link href="/leaderboard">
            <Button className="rounded-none font-black uppercase mt-3">
              К общей таблице
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
