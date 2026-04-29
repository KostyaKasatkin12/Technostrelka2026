import { Link } from "wouter";
import { motion } from "framer-motion";
import { Gamepad2, Zap, Trophy, Clock, ArrowRight, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";

const GAMES = [
  {
    id: "city_quiz",
    title: "Городской Квиз",
    description: "Проверь знания о российских городах, граффити и уличной культуре. 15 вопросов — успей до истечения таймера!",
    icon: "🏙️",
    href: "/games/city-quiz",
    difficulty: "Средне",
    time: "3 мин",
    maxScore: 1500,
    color: "from-violet-600 to-cyan-600",
    badge: "ГОРЯЧИЙ",
  },
  {
    id: "urban_scout",
    title: "Городской Скаут",
    description: "Определи город по описанию достопримечательностей, улиц и культурных объектов. Скорость решает всё!",
    icon: "🔍",
    href: "/games/city-quiz?mode=scout",
    difficulty: "Хардкор",
    time: "4 мин",
    maxScore: 2000,
    color: "from-pink-600 to-orange-600",
    badge: "СКОРО",
    disabled: true,
  },
];

export default function GamesPage() {
  const { data: me } = useGetMe();

  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-black uppercase tracking-tighter">Мини-игры</h1>
        </div>
        <p className="text-muted-foreground font-mono text-sm mb-8">
          Соревнуйся с реальными игроками. Побеждай — зарабатывай очки.
        </p>

        {!me?.user && (
          <div className="mb-6 p-4 border-2 border-primary bg-primary/10 flex items-center justify-between">
            <div className="font-mono text-sm text-primary">
              <span className="font-bold uppercase">Войди</span>, чтобы очки сохранялись в профиле
            </div>
            <Link href="/login">
              <Button size="sm" className="rounded-none font-bold uppercase">Войти</Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative border-2 border-border bg-card overflow-hidden group ${game.disabled ? "opacity-60" : ""}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-10 group-hover:opacity-20 transition-opacity`} />

              {game.badge && (
                <div className={`absolute top-3 right-3 text-[10px] font-black uppercase font-mono px-2 py-0.5 border ${game.disabled ? "border-muted-foreground text-muted-foreground" : "border-primary text-primary bg-primary/10"}`}>
                  {game.badge}
                </div>
              )}

              <div className="p-6 relative">
                <div className="text-4xl mb-3">{game.icon}</div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">{game.title}</h2>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{game.description}</p>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <Zap className="h-3 w-3 text-primary" />
                    {game.difficulty}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <Clock className="h-3 w-3 text-primary" />
                    {game.time}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <Star className="h-3 w-3 text-primary" />
                    до {game.maxScore}
                  </div>
                </div>

                {game.disabled ? (
                  <Button disabled className="w-full rounded-none font-bold uppercase">Скоро</Button>
                ) : (
                  <Link href={game.href}>
                    <Button className="w-full rounded-none font-bold uppercase bg-primary text-primary-foreground hover:bg-primary/90">
                      Играть <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 border-2 border-border p-6 bg-card/50">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black uppercase tracking-tight">Как работают очки</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary font-black text-lg leading-none">1.</span>
              <div>Правильный ответ: +100 очков. Быстрее — бонус за скорость.</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-black text-lg leading-none">2.</span>
              <div>Набранные очки конвертируются в очки профиля (1/5 от счёта игры).</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-black text-lg leading-none">3.</span>
              <div>Твой лучший результат отображается в таблице лидеров среди реальных игроков.</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Users className="h-3 w-3" />
          Новые игры добавляются каждый сезон
        </div>
      </motion.div>
    </div>
  );
}
