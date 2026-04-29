import { useRoute, Link } from "wouter";
import { useGetPublicProfile, useGetMe } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { ProfileWall } from "@/components/profile-wall";
import {
  Trophy,
  Compass,
  MapPin,
  Award,
  Clock,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/avatar";

export default function PublicProfile() {
  const [, params] = useRoute("/u/:userId");
  const userId = Number(params?.userId ?? 0);
  const { data: me } = useGetMe();
  const { data, isLoading, error } = useGetPublicProfile(userId, {
    query: { enabled: userId > 0 },
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-black uppercase">Профиль не найден</h1>
        <Link href="/leaderboard">
          <Button className="mt-6 rounded-none font-bold uppercase">
            <ArrowLeft className="h-4 w-4 mr-2" /> К рейтингу
          </Button>
        </Link>
      </div>
    );
  }

  const { user, achievements, recentSessions, rank, questsCreated } = data;
  const banner =
    user.bannerUrl ||
    "https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=1600";

  return (
    <div className="page-fade">
      <div className="relative h-48 md:h-64 w-full overflow-hidden border-b-2 border-border">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${banner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
      </div>

      <div className="container max-w-4xl mx-auto px-4 -mt-20 relative">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-border bg-card p-5 md:p-8 flex flex-col md:flex-row gap-6 items-start"
        >
          <div className="-mt-16 md:-mt-20 border-4 border-background shadow-[6px_6px_0px_0px_hsl(var(--primary))]">
            <UserAvatar
              slots={user.avatarSlots}
              active={user.activeAvatarSlot ?? 0}
              nickname={user.nickname}
              size={120}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black uppercase">
              @{user.nickname}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-mono uppercase text-muted-foreground">
              {user.role === "moderator" && (
                <span className="border border-secondary text-secondary px-2 py-0.5">
                  Модератор
                </span>
              )}
              {user.city && (
                <span className="border border-border px-2 py-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {user.city}
                </span>
              )}
              {rank ? (
                <span className="border border-primary text-primary px-2 py-0.5">
                  #{rank} в рейтинге
                </span>
              ) : null}
            </div>
            {user.bio && (
              <p className="mt-3 text-sm text-foreground/80 max-w-md">
                {user.bio}
              </p>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Trophy, value: user.points, label: "Очков" },
            {
              icon: Compass,
              value: user.completedCount ?? 0,
              label: "Пройдено",
            },
            { icon: Award, value: achievements.length, label: "Ачивок" },
            { icon: Clock, value: questsCreated ?? 0, label: "Создал" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-2 border-border bg-card p-4 hover-lift"
            >
              <s.icon className="h-6 w-6 text-primary mb-2" />
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground font-mono">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 mb-12">
          <div className="border-2 border-border bg-card p-5">
            <h2 className="font-black uppercase mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-secondary" /> Ачивки
            </h2>
            {achievements.length === 0 ? (
              <p className="text-sm font-mono text-muted-foreground">
                Пока пусто.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {achievements.slice(0, 9).map((a) => (
                  <div
                    key={a.id}
                    title={a.description}
                    className="aspect-square border-2 border-border bg-muted flex flex-col items-center justify-center p-1.5 text-center"
                  >
                    <Award className="h-4 w-4 text-primary mb-1" />
                    <span className="text-[9px] font-bold uppercase leading-tight">
                      {a.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-2 border-border bg-card p-5">
            <h2 className="font-black uppercase mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" /> Последние прохождения
            </h2>
            {recentSessions.length === 0 ? (
              <p className="text-sm font-mono text-muted-foreground">
                Прохождений нет.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentSessions.slice(0, 6).map((s) => (
                  <li key={s.id} className="py-2 text-sm flex items-center gap-2">
                    {s.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Link
                      href={`/quests/${s.questId}`}
                      className="flex-1 truncate hover:text-primary"
                    >
                      {s.questTitle ?? `Квест #${s.questId}`}
                    </Link>
                    <span className="text-xs font-mono text-muted-foreground">
                      {s.score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-2 border-border bg-card p-5">
            <h2 className="font-black uppercase mb-4 flex items-center gap-2">
              <span className="text-primary">▪</span> Стена
            </h2>
            <ProfileWall userId={userId} currentUserId={me?.user?.id} isModerator={me?.user?.role === "moderator"} />
          </div>
        </div>
      </div>
    </div>
  );
}
