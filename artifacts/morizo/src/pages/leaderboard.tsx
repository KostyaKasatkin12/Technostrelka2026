import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Users, User as UserIcon, MapPin } from "lucide-react";
import {
  useLeaderboardUsers,
  useLeaderboardTeams,
} from "@workspace/api-client-react";
import { UserAvatar } from "@/components/avatar";
import { LeaderboardSkeleton } from "@/components/skeleton-cards";
import { Reveal } from "@/components/reveal";

export default function Leaderboard() {
  const [tab, setTab] = useState<"users" | "teams">("users");
  const [period, setPeriod] = useState<"all" | "month" | "week">("all");

  const usersQ = useLeaderboardUsers({ period });
  const teamsQ = useLeaderboardTeams();

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center gap-3 mb-6"
      >
        <Trophy className="h-10 w-10 text-primary" />
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
          Рейтинг
        </h1>
      </motion.div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex border-2 border-border bg-card flex-1 min-w-[260px]">
          <button
            onClick={() => setTab("users")}
            className={`flex-1 p-3 font-black uppercase text-sm flex items-center justify-center gap-2 transition-colors ${
              tab === "users"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/40"
            }`}
          >
            <UserIcon className="h-4 w-4" /> Игроки
          </button>
          <button
            onClick={() => setTab("teams")}
            className={`flex-1 p-3 font-black uppercase text-sm flex items-center justify-center gap-2 transition-colors ${
              tab === "teams"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/40"
            }`}
          >
            <Users className="h-4 w-4" /> Команды
          </button>
        </div>
        {tab === "users" && (
          <div className="flex border-2 border-border bg-card">
            {(["all", "month", "week"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-3 text-xs font-bold uppercase font-mono transition-colors ${
                  period === p
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-muted/40"
                }`}
              >
                {p === "all" ? "Всё" : p === "month" ? "Месяц" : "Неделя"}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "users" ? (
        usersQ.isLoading ? (
          <LeaderboardSkeleton count={8} />
        ) : (
          <ol className="space-y-2">
            {(usersQ.data ?? []).map((u, i) => (
              <Reveal key={u.userId} delay={i * 0.03}>
                <Link
                  href={`/u/${u.userId}`}
                  className="border-2 border-border bg-card p-3 flex items-center gap-4 hover:border-primary transition-colors block"
                >
                  <motion.div
                    whileHover={{ x: 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-center gap-4 w-full"
                  >
                    <RankBadge rank={u.rank} />
                    <UserAvatar
                      slots={u.avatarSlots}
                      active={u.activeAvatarSlot ?? 0}
                      nickname={u.nickname}
                      size={44}
                      className="border-2 border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-black truncate uppercase">
                        @{u.nickname}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{u.completedCount} квестов</span>
                        {u.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {u.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-black font-mono text-primary text-lg">
                      {u.points}
                    </div>
                  </motion.div>
                </Link>
              </Reveal>
            ))}
            {(usersQ.data ?? []).length === 0 && (
              <p className="text-center text-muted-foreground p-8 font-mono">
                Пока нет данных
              </p>
            )}
          </ol>
        )
      ) : teamsQ.isLoading ? (
        <LeaderboardSkeleton count={8} />
      ) : (
        <ol className="space-y-2">
          {(teamsQ.data ?? []).map((t, i) => (
            <Reveal key={t.id} delay={i * 0.03}>
              <Link
                href={`/teams/${t.id}`}
                className="border-2 border-border bg-card p-3 flex items-center gap-4 hover:border-primary transition-colors block"
              >
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex items-center gap-4 w-full"
                >
                  <RankBadge rank={i + 1} />
                  <div className="flex-1 min-w-0">
                    <div className="font-black truncate uppercase">{t.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {t.completedCount} квестов · {t.memberCount ?? 0} участников
                    </div>
                  </div>
                  <div className="font-black font-mono text-primary text-lg">
                    {t.points}
                  </div>
                </motion.div>
              </Link>
            </Reveal>
          ))}
          {(teamsQ.data ?? []).length === 0 && (
            <p className="text-center text-muted-foreground p-8 font-mono">
              Пока нет данных
            </p>
          )}
        </ol>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: "bg-primary text-primary-foreground border-primary",
    2: "bg-secondary text-secondary-foreground border-secondary",
    3: "bg-accent text-accent-foreground border-accent",
  };
  const cls = colors[rank] ?? "bg-card border-border text-muted-foreground";
  return (
    <div
      className={`shrink-0 w-12 h-12 border-2 font-black font-mono flex items-center justify-center text-lg ${cls}`}
    >
      {rank}
    </div>
  );
}
