import {
  useGetMe,
  useStatsOverview,
  useFeaturedQuests,
  useLeaderboardUsers,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Zap,
  Trophy,
  Users,
  Sparkles,
  ShieldCheck,
  Wand2,
  ArrowRight,
  MapPin,
  Flame,
  Palette,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Suspense, lazy } from "react";
import { THEMES } from "@/lib/themes";
import { useTheme } from "@/components/theme-provider";
import { UserAvatar } from "@/components/avatar";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";

// Lazy-load the 3D scene so first paint stays fast
const Hero3D = lazy(() =>
  import("@/components/hero-3d").then((m) => ({ default: m.Hero3D })),
);

const CITIES = [
  "Нижний Новгород",
  "Москва",
  "Санкт-Петербург",
  "Казань",
  "Екатеринбург",
  "Калининград",
  "Сочи",
  "Владивосток",
  "Иркутск",
  "Самара",
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  const { data: me, isLoading } = useGetMe();
  const { data: stats } = useStatsOverview();
  const { data: featured = [] } = useFeaturedQuests();
  const { data: leaders = [] } = useLeaderboardUsers();
  const { setTheme, theme } = useTheme();

  const featuredQuests = featured.slice(0, 6);
  const topLeaders = leaders.slice(0, 5);

  return (
    <div className="flex flex-col">
      {/* HERO with 3D city scene */}
      <section className="relative w-full overflow-hidden border-b-2 border-border min-h-[640px] md:min-h-[720px] flex items-center">
        <Suspense fallback={null}>
          <Hero3D />
        </Suspense>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />

        {/* Always-visible neon M watermark on the right */}
        <motion.div
          className="absolute right-[3%] md:right-[8%] top-1/2 -translate-y-1/2 hidden lg:block select-none pointer-events-none z-[1]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <motion.span
            className="text-[280px] xl:text-[360px] leading-none font-black tracking-tighter"
            style={{
              color: "transparent",
              WebkitTextStroke: "2px rgba(167,139,250,0.5)",
              filter: "drop-shadow(0 0 30px rgba(124,58,237,0.5)) drop-shadow(0 0 60px rgba(34,211,238,0.3))",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
            animate={{
              filter: [
                "drop-shadow(0 0 30px rgba(124,58,237,0.5)) drop-shadow(0 0 60px rgba(34,211,238,0.3))",
                "drop-shadow(0 0 40px rgba(197,255,46,0.5)) drop-shadow(0 0 80px rgba(124,58,237,0.4))",
                "drop-shadow(0 0 35px rgba(255,43,214,0.5)) drop-shadow(0 0 70px rgba(34,211,238,0.4))",
                "drop-shadow(0 0 30px rgba(124,58,237,0.5)) drop-shadow(0 0 60px rgba(34,211,238,0.3))",
              ],
              WebkitTextStroke: [
                "2px rgba(167,139,250,0.5)",
                "2px rgba(197,255,46,0.6)",
                "2px rgba(255,43,214,0.5)",
                "2px rgba(167,139,250,0.5)",
              ] as any,
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            M
          </motion.span>
        </motion.div>

        <div className="container relative z-10 px-4 py-16 md:py-24 max-w-screen-xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex flex-col items-start gap-6 max-w-2xl"
          >
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 border-2 border-primary bg-primary/10 px-3 py-1 text-xs font-bold font-mono uppercase text-primary"
            >
              <Zap className="h-3 w-3" />
              Сезон 3 · 3D + Mistral AI
            </motion.div>

            <motion.h1
              variants={item}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.95]"
            >
              Узнай город <br />
              <span
                className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent"
                style={{ WebkitBackgroundClip: "text" }}
              >
                как инсайдер
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="text-lg md:text-xl text-foreground/80 max-w-xl"
            >
              Городские квесты, скрытые дворы, муралы и истории. Преврати обычную
              прогулку в охоту за деталями. Создавай свои квесты с проверкой от ИИ.
            </motion.p>

            <motion.div
              variants={item}
              className="flex flex-wrap items-center gap-3 mt-2"
            >
              {isLoading ? (
                <Skeleton className="h-12 w-40" />
              ) : me?.user ? (
                <>
                  <Link href="/quests">
                    <Button
                      size="lg"
                      className="h-12 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-none font-bold uppercase tracking-wider shadow-[6px_6px_0px_0px_hsl(var(--secondary))] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_0px_hsl(var(--secondary))] transition-all"
                    >
                      Искать квесты <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/quests/new">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 px-8 text-lg rounded-none font-bold uppercase tracking-wider border-2 hover:bg-muted backdrop-blur"
                    >
                      <Wand2 className="mr-2 h-5 w-5" /> Создать квест
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="h-12 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 rounded-none font-bold uppercase tracking-wider shadow-[6px_6px_0px_0px_hsl(var(--secondary))] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_0px_hsl(var(--secondary))] transition-all"
                    >
                      Ворваться
                    </Button>
                  </Link>
                  <Link href="/quests">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 px-8 text-lg rounded-none font-bold uppercase tracking-wider border-2 hover:bg-muted backdrop-blur"
                    >
                      Смотреть каталог
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>

            {stats && (
              <motion.div
                variants={item}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 w-full max-w-3xl"
              >
                {[
                  { value: stats.questsPublished, label: "Квестов" },
                  { value: stats.usersTotal, label: "Игроков" },
                  { value: stats.completionsTotal, label: "Прохождений" },
                  { value: stats.citiesTotal, label: "Городов" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="border-2 border-border bg-card/80 backdrop-blur p-4"
                  >
                    <div className="text-3xl font-black text-primary">
                      <CountUp value={s.value ?? 0} />
                    </div>
                    <div className="text-[10px] font-bold uppercase font-mono text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden border-t border-border bg-background/70 backdrop-blur z-10">
          <div className="flex marquee-slide whitespace-nowrap py-2 text-xs font-mono uppercase text-muted-foreground">
            {[...CITIES, ...CITIES].map((c, i) => (
              <span key={`${c}-${i}`} className="mx-6 inline-flex items-center gap-2">
                <MapPin className="h-3 w-3 text-primary" /> {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container px-4 max-w-screen-xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-10">
            <div>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
                Как это работает
              </h2>
              <p className="text-muted-foreground font-mono text-sm mt-2">
                4 шага от подписки до значка на стене славы
              </p>
            </div>
          </div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              {
                icon: Compass,
                title: "Выбирай маршрут",
                desc: "Десятки квестов в твоём городе по любой теме и сложности.",
                color: "primary",
              },
              {
                icon: Users,
                title: "Зови команду",
                desc: "Соло или с друзьями — играйте вместе в режиме реального времени.",
                color: "secondary",
              },
              {
                icon: Wand2,
                title: "Создавай свои",
                desc: "Авторский редактор с Mistral AI и модерацией.",
                color: "accent",
              },
              {
                icon: Trophy,
                title: "Получай очки",
                desc: "Ачивки, рейтинги, командные победы и уровни.",
                color: "primary",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                variants={item}
                className="border-2 border-border bg-card p-6 hover-lift relative overflow-hidden group"
              >
                <div
                  className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity bg-${f.color}/40`}
                />
                <div className="text-xs font-mono uppercase text-muted-foreground mb-3">
                  Шаг 0{i + 1}
                </div>
                <f.icon className={`h-10 w-10 text-${f.color} mb-3`} />
                <h3 className="text-xl font-black uppercase mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured quests */}
      {featuredQuests.length > 0 && (
        <section className="py-16 border-t-2 border-border bg-card/30">
          <div className="container px-4 max-w-screen-xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Flame className="h-9 w-9 text-secondary" />
                  В тренде
                </h2>
                <p className="text-muted-foreground font-mono text-sm mt-2">
                  Самые проходимые квесты недели
                </p>
              </div>
              <Link href="/quests">
                <Button
                  variant="outline"
                  className="rounded-none border-2 font-bold uppercase"
                >
                  Все квесты <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredQuests.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, boxShadow: "0 12px 32px -8px hsl(var(--primary)/0.25)" }}
                  whileTap={{ scale: 0.98 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 280, damping: 24 }}
                >
                  <Link
                    href={`/quests/${q.id}`}
                    className="block border-2 border-border bg-card group overflow-hidden hover:border-primary transition-colors"
                  >
                    <div
                      className="relative h-44 bg-cover bg-center bg-muted"
                      style={{
                        backgroundImage: q.coverUrl ? `url(${q.coverUrl})` : undefined,
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <span className="border border-primary bg-background/80 px-2 py-0.5 text-[10px] font-mono uppercase text-primary">
                          {q.difficulty}/5
                        </span>
                        <span className="border border-border bg-background/80 px-2 py-0.5 text-[10px] font-mono uppercase">
                          {q.durationMin} мин
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {q.city} · {q.district}
                      </div>
                      <h3 className="font-black uppercase line-clamp-2 group-hover:text-primary transition-colors">
                        {q.title}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top players + Themes */}
      <section className="py-16 border-t-2 border-border">
        <div className="container px-4 max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight flex items-center gap-3 mb-6">
              <Trophy className="h-8 w-8 text-primary" />
              Топ-5 героев
            </h2>
            <div className="border-2 border-border bg-card divide-y-2 divide-border">
              {topLeaders.length === 0 ? (
                <div className="p-6 text-center text-sm font-mono text-muted-foreground">
                  Пока никто не лидирует — стань первым.
                </div>
              ) : (
                topLeaders.map((l) => (
                  <Link
                    key={l.userId}
                    href={`/u/${l.userId}`}
                    className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <RankBadge rank={l.rank} />
                    <UserAvatar
                      slots={l.avatarSlots}
                      active={l.activeAvatarSlot ?? 0}
                      nickname={l.nickname}
                      size={40}
                      className="border border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-black uppercase truncate">
                        @{l.nickname}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground truncate">
                        {l.completedCount} квестов{l.city ? ` · ${l.city}` : ""}
                      </div>
                    </div>
                    <div className="font-mono font-black text-primary">{l.points}</div>
                  </Link>
                ))
              )}
            </div>
            <Link href="/leaderboard">
              <Button
                variant="outline"
                className="mt-4 w-full rounded-none border-2 font-bold uppercase"
              >
                Открыть полный рейтинг
              </Button>
            </Link>
          </div>

          <div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight flex items-center gap-3 mb-6">
              <Palette className="h-8 w-8 text-secondary" />3 темы для всего
            </h2>
            <div className="space-y-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`w-full text-left border-2 ${
                    theme === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-foreground/40"
                  } p-4 flex items-center gap-4 transition-colors`}
                >
                  <div className="flex gap-1">
                    <div
                      className="w-8 h-12 border border-foreground/20"
                      style={{ background: t.preview.primary }}
                    />
                    <div
                      className="w-8 h-12 border border-foreground/20"
                      style={{ background: t.preview.secondary }}
                    />
                    <div
                      className="w-8 h-12 border border-foreground/20"
                      style={{ background: t.preview.bg }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black uppercase">{t.label}</div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {t.tagline}
                    </div>
                  </div>
                  {theme === t.id && (
                    <span className="text-xs font-bold uppercase text-primary border border-primary px-2 py-0.5">
                      активна
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-3">
              Тема сохраняется в твоём профиле и применяется на любом устройстве.
            </p>
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-20 border-t-2 border-border bg-gradient-to-b from-background to-card">
        <div className="container px-4 max-w-3xl mx-auto text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">
            Сделай свой квест
          </h2>
          <p className="text-muted-foreground font-mono text-sm mb-6">
            Авторский редактор + ассистент Mistral AI проверит безопасность и логику
            маршрута. После модерации квест появится в каталоге.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={me?.user ? "/quests/new" : "/register"}>
              <Button
                size="lg"
                className="h-12 px-8 rounded-none font-bold uppercase bg-primary text-primary-foreground"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                {me?.user ? "Создать квест" : "Начать"}
              </Button>
            </Link>
            <Link href="/quests">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 rounded-none font-bold uppercase border-2"
              >
                Посмотреть каталог
              </Button>
            </Link>
          </div>
          {me?.user?.role === "moderator" && (
            <Link href="/admin">
              <Button
                variant="ghost"
                className="mt-4 rounded-none font-mono uppercase text-xs"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Админ-панель
              </Button>
            </Link>
          )}
        </div>
      </section>
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
      className={`shrink-0 w-10 h-10 border-2 font-black font-mono flex items-center justify-center text-sm ${cls}`}
    >
      {rank}
    </div>
  );
}
