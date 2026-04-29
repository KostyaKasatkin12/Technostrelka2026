import {
  useGetMe,
  useAdminOverview,
  useAdminListUsers,
  useAdminSetRole,
  useListQuests,
  getAdminListUsersQueryKey,
  getAdminOverviewQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Users,
  Compass,
  CheckSquare,
  Activity,
  TrendingUp,
  Crown,
  Search,
  Sparkles,
  PieChart as PieChartIcon,
  MapPin,
  ArrowRight,
  Flag,
  Check,
  X as XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/avatar";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const DIFFICULTY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AdminPanel() {
  const { data: me, isLoading: meLoading } = useGetMe();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [aiTesting, setAiTesting] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    enabled: boolean;
    provider: string;
    model: string | null;
  } | null>(null);

  const isMod = me?.user?.role === "moderator";

  const { data: overview, isLoading: ovLoading } = useAdminOverview({
    query: { enabled: !!isMod },
  });
  const { data: users = [], isLoading: usersLoading } = useAdminListUsers(
    { search: search || undefined },
    { query: { enabled: !!isMod } },
  );
  const { data: questsResp } = useListQuests(
    {},
    { query: { enabled: !!isMod } },
  );
  const allQuests = questsResp?.items ?? [];
  const setRole = useAdminSetRole();

  const difficultyData = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const q of allQuests) {
      const d = Math.max(1, Math.min(5, q.difficulty ?? 1));
      buckets[d - 1]++;
    }
    return buckets.map((count, i) => ({
      name: `${i + 1}/5`,
      value: count,
    }));
  }, [allQuests]);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of allQuests) {
      const c = q.city || "—";
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [allQuests]);

  const handleAiCheck = async () => {
    setAiTesting(true);
    try {
      const r = await fetch("/api/ai/status", { credentials: "include" });
      const data = await r.json();
      setAiStatus(data);
      toast.success(
        data.enabled
          ? `AI: ${data.provider} (${data.model})`
          : "AI работает в режиме эвристики (ключ не задан)",
      );
    } catch (err) {
      toast.error("Не удалось получить статус AI");
    } finally {
      setAiTesting(false);
    }
  };

  if (meLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!me?.user) {
    setLocation("/login");
    return null;
  }

  if (!isMod) {
    return (
      <div className="container max-w-2xl mx-auto py-20 px-4 text-center">
        <ShieldCheck className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-3xl font-black uppercase">Доступ запрещён</h1>
        <p className="text-muted-foreground font-mono mt-2">
          Эта зона только для модераторов.
        </p>
        <Link href="/">
          <Button className="mt-6 rounded-none font-bold uppercase">
            На главную
          </Button>
        </Link>
      </div>
    );
  }

  const handleRole = (id: number, role: "player" | "moderator") => {
    setRole.mutate(
      { id, data: { role } },
      {
        onSuccess: () => {
          toast.success("Роль обновлена");
          qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          qc.invalidateQueries({ queryKey: getAdminOverviewQueryKey() });
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 page-fade">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-9 w-9 text-secondary" />
            Админ-панель
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">
            Управление городом MORIZO · v3
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleAiCheck}
            disabled={aiTesting}
            className="rounded-none border-2 font-bold uppercase"
          >
            <Sparkles className="h-4 w-4 mr-2 text-primary" />
            {aiTesting ? "..." : aiStatus ? aiStatus.provider : "Проверить AI"}
          </Button>
          <Link href="/moderation">
            <Button
              variant="outline"
              className="rounded-none border-2 font-bold uppercase"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              На модерации
              {overview?.moderation ? (
                <span className="ml-2 bg-secondary text-secondary-foreground px-2 text-xs font-mono">
                  {overview.moderation}
                </span>
              ) : null}
            </Button>
          </Link>
          <Link href="/quests/new">
            <Button className="rounded-none font-bold uppercase bg-primary text-primary-foreground">
              <Compass className="h-4 w-4 mr-2" />
              Новый квест
            </Button>
          </Link>
        </div>
      </motion.div>

      {ovLoading || !overview ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: Users,
                value: overview.users,
                label: `Игроков · ${overview.players}`,
                color: "text-primary",
              },
              {
                icon: Compass,
                value: overview.quests,
                label: `Опубликовано · ${overview.published}`,
                color: "text-secondary",
              },
              {
                icon: Activity,
                value: overview.activeSessions,
                label: `Завершено · ${overview.completions}`,
                color: "text-accent",
              },
              {
                icon: CheckSquare,
                value: overview.moderation,
                label: "На модерации",
                color: "text-chart-5",
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-2 border-border bg-card p-5 hover-lift"
              >
                <s.icon className={`h-7 w-7 ${s.color} mb-3`} />
                <div className="text-3xl font-black">{s.value}</div>
                <div className="text-xs font-bold uppercase font-mono text-muted-foreground mt-1">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 border-2 border-border bg-card p-5"
            >
              <h2 className="font-black uppercase mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Регистрации за 7 дней
              </h2>
              <div className="h-64 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.signupsLast7d}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      strokeDasharray="2 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                        })
                      }
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11, fontFamily: "monospace" }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 11, fontFamily: "monospace" }}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: 0,
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border-2 border-border bg-card p-5"
            >
              <h2 className="font-black uppercase mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-secondary" />
                Топ авторов
              </h2>
              {!overview.topAuthors || overview.topAuthors.length === 0 ? (
                <p className="text-sm font-mono text-muted-foreground">
                  Нет данных
                </p>
              ) : (
                <ul className="space-y-2">
                  {overview.topAuthors.map((a, i) => (
                    <li
                      key={a.userId}
                      className="flex items-center justify-between border border-border bg-background/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black w-5 text-center ${
                            i === 0
                              ? "text-primary"
                              : i === 1
                                ? "text-secondary"
                                : "text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <Link
                          href={`/u/${a.userId}`}
                          className="font-bold text-sm hover:text-primary"
                        >
                          @{a.nickname}
                        </Link>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {a.questCount} квест.
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>

          {/* Difficulty + City breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-border bg-card p-5"
            >
              <h2 className="font-black uppercase mb-4 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-accent" />
                Сложность квестов
              </h2>
              <div className="h-64">
                {difficultyData.every((d) => d.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-sm font-mono text-muted-foreground">
                    Пока нет квестов
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={difficultyData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {difficultyData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={DIFFICULTY_COLORS[i]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "2px solid hsl(var(--border))",
                          borderRadius: 0,
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          textTransform: "uppercase",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border-2 border-border bg-card p-5"
            >
              <h2 className="font-black uppercase mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary" />
                Топ городов
              </h2>
              {cityData.length === 0 ? (
                <p className="text-sm font-mono text-muted-foreground">
                  Нет данных
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {cityData.map((c) => {
                    const max = cityData[0].count || 1;
                    const pct = (c.count / max) * 100;
                    return (
                      <li key={c.city} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold uppercase truncate">
                            {c.city}
                          </span>
                          <span className="text-muted-foreground">
                            {c.count}
                          </span>
                        </div>
                        <div className="h-2 bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full bg-gradient-to-r from-primary to-secondary"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* Users with search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 border-2 border-border bg-card"
      >
        <div className="px-5 py-4 border-b-2 border-border flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-black uppercase flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Пользователи
            <span className="text-xs font-mono text-muted-foreground ml-2">
              {users.length}
            </span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по нику или email..."
              className="pl-9 rounded-none border-2 h-10 font-mono"
            />
          </div>
        </div>
        {usersLoading ? (
          <div className="p-5">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm font-mono text-muted-foreground">
            Никого не найдено
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-mono uppercase text-muted-foreground">
                  <th className="px-4 py-3">Пользователь</th>
                  <th className="px-4 py-3 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 hidden md:table-cell">Город</th>
                  <th className="px-4 py-3 text-right">XP</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">
                    Создано
                  </th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">
                    Пройдено
                  </th>
                  <th className="px-4 py-3 text-right">Роль</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/u/${u.id}`}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        <UserAvatar
                          slots={u.avatarSlots ?? []}
                          active={u.activeAvatarSlot ?? 0}
                          nickname={u.nickname}
                          size={36}
                          className="border border-border"
                        />
                        <span className="font-bold">@{u.nickname}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs">
                      {u.city || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {u.points}
                    </td>
                    <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">
                      {u.questCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">
                      {u.completedCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={u.role === "moderator" ? "default" : "outline"}
                        disabled={
                          setRole.isPending || u.id === me.user!.id
                        }
                        onClick={() =>
                          handleRole(
                            u.id,
                            u.role === "moderator" ? "player" : "moderator",
                          )
                        }
                        className="rounded-none font-bold uppercase text-xs h-7"
                      >
                        {u.role === "moderator" ? "Модератор" : "Игрок"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Reports queue */}
      <ReportsPanel />

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-12">
        {[
          {
            title: "Каталог квестов",
            desc: "Все опубликованные маршруты",
            href: "/quests",
            icon: Compass,
          },
          {
            title: "Очередь модерации",
            desc: "Квесты, ждущие проверки",
            href: "/moderation",
            icon: CheckSquare,
          },
          {
            title: "Новый квест",
            desc: "Создать с нуля",
            href: "/quests/new",
            icon: Sparkles,
          },
        ].map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="border-2 border-border bg-card p-5 hover-lift group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <q.icon className="h-6 w-6 text-primary" />
              <div>
                <div className="font-black uppercase">{q.title}</div>
                <div className="text-xs font-mono text-muted-foreground">
                  {q.desc}
                </div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}

type AdminReport = {
  report: {
    id: number;
    questId: number | null;
    checkpointId: number | null;
    reporterId: number;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
  };
  quest: { id: number; title: string } | null;
  checkpoint: { id: number; title: string } | null;
  reporter: { id: number; nickname: string } | null;
};

function ReportsPanel() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [filter, setFilter] = useState<"open" | "all" | "resolved" | "dismissed">("open");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Не удалось загрузить жалобы");
      setReports(data.reports ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function resolve(id: number, status: "resolved" | "dismissed") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}/resolve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Не удалось обновить");
      toast.success(status === "resolved" ? "Жалоба закрыта" : "Жалоба отклонена");
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="border-2 border-border bg-card mt-6"
    >
      <div className="px-5 py-4 border-b-2 border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-black uppercase">Жалобы и обращения</h2>
          {reports && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border px-2 py-0.5">
              {reports.length}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(
            [
              ["open", "Открытые"],
              ["resolved", "Закрытые"],
              ["dismissed", "Отклонённые"],
              ["all", "Все"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-mono uppercase border-2 ${
                filter === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {loading && !reports ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.report.id}
                className="border-2 border-border p-4 flex flex-col md:flex-row md:items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                        r.report.status === "open"
                          ? "border-primary text-primary"
                          : r.report.status === "resolved"
                            ? "border-secondary text-secondary"
                            : "border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      {r.report.status}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      #{r.report.id} · {new Date(r.report.createdAt).toLocaleString("ru-RU")}
                    </span>
                  </div>
                  <div className="font-bold text-sm mb-1">
                    {r.quest ? (
                      <Link
                        href={`/quests/${r.quest.id}`}
                        className="hover:text-primary underline-offset-4 hover:underline"
                      >
                        {r.quest.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Квест удалён</span>
                    )}
                    {r.checkpoint && (
                      <span className="text-muted-foreground font-mono text-xs ml-2">
                        · точка «{r.checkpoint.title}»
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mb-1">
                    Причина: <span className="text-foreground">{r.report.reason}</span>
                  </div>
                  {r.report.details && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {r.report.details}
                    </p>
                  )}
                  <div className="text-[10px] font-mono uppercase text-muted-foreground mt-2">
                    От: {r.reporter?.nickname ?? "—"}
                  </div>
                </div>
                {r.report.status === "open" && (
                  <div className="flex md:flex-col gap-2 md:w-32 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => resolve(r.report.id, "resolved")}
                      disabled={busyId === r.report.id}
                      className="rounded-none font-bold uppercase flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Решено
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve(r.report.id, "dismissed")}
                      disabled={busyId === r.report.id}
                      className="rounded-none font-bold uppercase flex-1"
                    >
                      <XIcon className="h-4 w-4 mr-1" />
                      Откл.
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm font-mono text-muted-foreground">
            Нет жалоб в этой категории.
          </div>
        )}
      </div>
    </motion.div>
  );
}
