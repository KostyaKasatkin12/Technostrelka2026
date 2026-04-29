import {
  useGetMe,
  useUpdateProfile,
  useMyAchievements,
  useMyTimeline,
  useListMySessions,
  useListMyQuests,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProfileSkeleton } from "@/components/skeleton-cards";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Trophy,
  Compass,
  Sparkles,
  Edit3,
  MapPin,
  CheckCircle2,
  Clock,
  Save,
  TrendingUp,
  Award,
  Target,
  Boxes,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { UserAvatar } from "@/components/avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ensureSlots } from "@/lib/avatars";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { InlineLoader } from "@/components/loading-screen";
import { ShoppingBag, Newspaper } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { ProfileWall } from "@/components/profile-wall";

// Lazy-load heavy 3D human bundle
const AvatarHuman = lazy(() =>
  import("@/components/avatar-human").then((m) => ({ default: m.AvatarHuman })),
);

type ShopMe = {
  points: number;
  equipped: Record<string, string | undefined>;
  purchased: string[];
  items: Array<{
    id: string;
    slot: "hat" | "shirt" | "pants" | "glasses" | "jacket";
    name: string;
    price: number;
    color?: string;
    description: string;
  }>;
};

const BANNER_PRESETS = [
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600",
  "https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=1600",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1600",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600",
];

function formatDayShort(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" });
}

export default function Profile() {
  const { data: me, isLoading } = useGetMe();
  const qc = useQueryClient();
  const update = useUpdateProfile();
  const [, setLocation] = useLocation();
  const { data: achievements = [] } = useMyAchievements({
    query: { enabled: !!me?.user },
  });
  const { data: timeline = [] } = useMyTimeline({
    query: { enabled: !!me?.user },
  });
  const { data: sessions = [] } = useListMySessions({
    query: { enabled: !!me?.user },
  });
  const { data: myQuests = [] } = useListMyQuests({
    query: { enabled: !!me?.user },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [customBannerUrl, setCustomBannerUrl] = useState<string | null>(null);
  const [shopMe, setShopMe] = useState<ShopMe | null>(null);

  useEffect(() => {
    if (me?.user) {
      setBio(me.user.bio ?? "");
      setCity(me.user.city ?? "");
      setBannerUrl(me.user.bannerUrl ?? "");
      setCustomAvatarUrl((me.user as any).customAvatarUrl ?? null);
      setCustomBannerUrl((me.user as any).customBannerUrl ?? null);
    }
  }, [me?.user]);

  // Fetch shop state for the 3D human + equipped items
  useEffect(() => {
    if (!me?.user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/shop/me", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? "Не удалось");
        if (!cancelled) setShopMe(json);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.user?.id]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!me?.user) {
    setLocation("/login");
    return null;
  }

  const user = me.user;
  const slots = ensureSlots(user.avatarSlots, user.nickname);
  const completed = user.completedCount ?? 0;
  const created = myQuests.length;
  const ach = achievements.length;
  const xp = user.points ?? 0;
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
  const xpForLevel = (level - 1) * (level - 1) * 50;
  const xpForNext = level * level * 50;
  const progress =
    xpForNext === xpForLevel
      ? 0
      : Math.round(((xp - xpForLevel) / (xpForNext - xpForLevel)) * 100);

  const handleSaveText = async () => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bio,
          city,
          bannerUrl,
          customAvatarUrl,
          customBannerUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? "Не удалось сохранить");
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast.success("Профиль обновлён");
      setEditOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения профиля");
    }
  };

  const handleAvatarSave = (
    newSlots: { style: string; seed: string }[],
    active: number,
  ) => {
    update.mutate(
      {
        data: {
          avatarSlots: newSlots.slice(0, 3),
          activeAvatarSlot: active,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast.success("Аватар обновлён");
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const banner =
    customBannerUrl ||
    user.bannerUrl ||
    "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600";

  return (
    <div className="page-fade">
      {/* Banner */}
      <div className="relative h-56 md:h-72 w-full overflow-hidden border-b-2 border-border">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${banner})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.25),transparent_60%)]" />
      </div>

      <div className="container max-w-5xl mx-auto px-4 -mt-20 relative">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-border bg-card p-5 md:p-8 flex flex-col md:flex-row gap-6 items-start"
        >
          <div className="flex flex-col items-center gap-3 -mt-16 md:-mt-20">
            <div className="border-4 border-background shadow-[6px_6px_0px_0px_hsl(var(--primary))] relative">
              {customAvatarUrl ? (
                <img
                  src={customAvatarUrl}
                  alt={user.nickname}
                  className="bg-card object-cover"
                  style={{ width: 140, height: 140 }}
                />
              ) : (
                <UserAvatar
                  slots={user.avatarSlots}
                  active={user.activeAvatarSlot ?? 0}
                  nickname={user.nickname}
                  size={140}
                  className="bg-card"
                />
              )}
            </div>
            <AvatarPicker
              slots={slots}
              active={user.activeAvatarSlot ?? 0}
              onChange={handleAvatarSave}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none border-2 font-bold uppercase font-mono"
                >
                  <Sparkles className="h-4 w-4 mr-1" />3 слота
                </Button>
              }
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                  @{user.nickname}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono uppercase text-muted-foreground">
                  <span className="border border-border px-2 py-0.5">
                    {user.role === "moderator" ? "Модератор" : "Игрок"}
                  </span>
                  {user.city && (
                    <span className="border border-border px-2 py-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {user.city}
                    </span>
                  )}
                  <span className="border border-border px-2 py-0.5">
                    LVL {level}
                  </span>
                </div>
                {user.bio && (
                  <p className="mt-3 text-sm text-foreground/80 max-w-md">
                    {user.bio}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none border-2 font-bold uppercase"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-none border-2 max-w-lg" open={editOpen}>
                    <DialogHeader>
                      <DialogTitle className="font-black uppercase">
                        Профиль
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <Label className="font-bold uppercase text-xs">Био</Label>
                        <Textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value.slice(0, 280))}
                          rows={3}
                          maxLength={280}
                          placeholder="Расскажи о себе..."
                          className="rounded-none border-2 mt-1"
                        />
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          {bio.length}/280
                        </div>
                      </div>
                      <div>
                        <Label className="font-bold uppercase text-xs">Город</Label>
                        <div className="mt-1">
                          <CityAutocomplete
                            value={city}
                            onChange={(v) => setCity(v.slice(0, 64))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="font-bold uppercase text-xs">
                          Свой аватар (изображение)
                        </Label>
                        <div className="mt-2">
                          <ImageUpload
                            value={customAvatarUrl}
                            onChange={(url) => setCustomAvatarUrl(url)}
                            label="Загрузить аватар"
                            hint="Квадратное фото, до 5 МБ"
                            height={140}
                            enableCrop
                            aspect={1}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="font-bold uppercase text-xs">
                          Своя обложка профиля
                        </Label>
                        <div className="mt-2">
                          <ImageUpload
                            value={customBannerUrl}
                            onChange={(url) => setCustomBannerUrl(url)}
                            label="Загрузить обложку"
                            hint="Широкая картинка, до 5 МБ"
                            height={120}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="font-bold uppercase text-xs">
                          Готовая обложка
                        </Label>
                        <Input
                          value={bannerUrl}
                          onChange={(e) => setBannerUrl(e.target.value)}
                          className="rounded-none border-2 h-11 mt-1"
                          placeholder="https://..."
                        />
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {BANNER_PRESETS.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setBannerUrl(url)}
                              className={`h-16 bg-cover bg-center border-2 ${
                                bannerUrl === url
                                  ? "border-primary"
                                  : "border-border"
                              }`}
                              style={{ backgroundImage: `url(${url})` }}
                            />
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={handleSaveText}
                        disabled={update.isPending}
                        className="w-full rounded-none font-black uppercase h-11"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Сохранить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <ThemeSwitcher />
              </div>
            </div>

            {/* Level bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground mb-1">
                <span className="font-bold">Уровень {level}</span>
                <span>
                  {xp} / {xpForNext} XP
                </span>
              </div>
              <div className="h-3 bg-muted border-2 border-border relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progress)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-accent"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Trophy, value: xp, label: "Очков", color: "text-primary" },
            {
              icon: Compass,
              value: completed,
              label: "Пройдено",
              color: "text-secondary",
            },
            {
              icon: Target,
              value: created,
              label: "Создано квестов",
              color: "text-accent",
            },
            {
              icon: Award,
              value: ach,
              label: "Ачивок",
              color: "text-chart-5",
            },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.07}>
              <motion.div
                whileHover={{ y: -3, boxShadow: "4px 4px 0px 0px hsl(var(--border))" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="border-2 border-border bg-card p-5 cursor-default"
              >
                <s.icon className={`h-7 w-7 mb-3 ${s.color}`} />
                <div className="text-3xl font-black">
                  <CountUp value={s.value} />
                </div>
                <div className="text-xs font-bold uppercase text-muted-foreground font-mono mt-1">
                  {s.label}
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* Tabs: Activity / 3D Avatar / Wall */}
        <Tabs defaultValue="activity" className="mt-6">
          <TabsList className="rounded-none border-2 border-border bg-card p-1 h-auto flex-wrap gap-1">
            <TabsTrigger
              value="activity"
              className="rounded-none font-bold uppercase font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Активность
            </TabsTrigger>
            <TabsTrigger
              value="wall"
              className="rounded-none font-bold uppercase font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Newspaper className="h-4 w-4 mr-2" />
              Стена
            </TabsTrigger>
            <TabsTrigger
              value="avatar3d"
              className="rounded-none font-bold uppercase font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Boxes className="h-4 w-4 mr-2" />
              3D-аватар
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 border-2 border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black uppercase flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Активность за неделю
                  </h2>
                  <span className="text-xs font-mono text-muted-foreground">
                    {timeline.reduce((s, t) => s + t.points, 0)} XP
                  </span>
                </div>
                <div className="h-56 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timeline.map((t) => ({
                        ...t,
                        label: formatDayShort(t.date),
                      }))}
                    >
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.7}
                          />
                          <stop
                            offset="100%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="hsl(var(--border))"
                        strokeDasharray="2 4"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11, fontFamily: "monospace" }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 11, fontFamily: "monospace" }}
                        width={28}
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
                      <Area
                        type="monotone"
                        dataKey="points"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#grad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border-2 border-border bg-card p-5"
              >
                <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-secondary" />
                  Ачивки
                </h2>
                {achievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-mono">
                    Пока пусто. Пройди первый квест.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {achievements.slice(0, 9).map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        title={a.description}
                        className="aspect-square border-2 border-border bg-muted flex flex-col items-center justify-center p-2 text-center hover:border-primary cursor-help"
                      >
                        <Award className="h-5 w-5 text-primary mb-1" />
                        <span className="text-[10px] font-bold uppercase leading-tight">
                          {a.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="wall" className="mt-4">
            <ProfileWall userId={user.id} currentUserId={user.id} isModerator={user.role === "moderator"} />
          </TabsContent>

          <TabsContent value="avatar3d" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-border bg-card p-5"
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-black uppercase flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  3D-человечек
                </h2>
                <Link href="/shop">
                  <Button
                    size="sm"
                    className="rounded-none font-bold uppercase font-mono"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    В магазин
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">
                <div className="aspect-square bg-gradient-to-b from-background via-card to-background border-2 border-border overflow-hidden">
                  <Suspense fallback={<InlineLoader label="3D scene" />}>
                    {shopMe ? (
                      <AvatarHuman
                        equipped={shopMe.equipped}
                        items={shopMe.items}
                        size={260}
                      />
                    ) : (
                      <InlineLoader label="3D scene" />
                    )}
                  </Suspense>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-foreground/80">
                    Это твой 3D-человечек. Покупай шапки, очки, куртки и
                    футболки в магазине за очки, заработанные на квестах.
                  </p>
                  <div className="border-2 border-border bg-muted/30 p-3">
                    <div className="text-[11px] font-mono uppercase text-muted-foreground">
                      Баланс
                    </div>
                    <div className="text-2xl font-black tabular-nums">
                      {shopMe?.points ?? xp} XP
                    </div>
                  </div>
                  <div className="border-2 border-border bg-muted/30 p-3">
                    <div className="text-[11px] font-mono uppercase text-muted-foreground mb-1">
                      Надето сейчас
                    </div>
                    {shopMe && Object.keys(shopMe.equipped).length > 0 ? (
                      <ul className="text-xs font-mono space-y-0.5">
                        {Object.entries(shopMe.equipped).map(([slot, itemId]) => {
                          if (!itemId) return null;
                          const item = shopMe.items.find((i) => i.id === itemId);
                          return (
                            <li key={slot} className="flex justify-between">
                              <span className="text-muted-foreground uppercase">
                                {slot}
                              </span>
                              <span className="font-bold">{item?.name ?? itemId}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs font-mono text-muted-foreground">
                        Базовый комплект — открой магазин, чтобы переодеться.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Recent sessions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 border-2 border-border bg-card p-5 mb-12"
        >
          <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Последние прохождения
          </h2>
          {sessions.length === 0 ? (
            <div className="border border-dashed border-border p-8 text-center text-sm font-mono text-muted-foreground">
              Прохождений пока нет.
              <Link
                href="/quests"
                className="block mt-2 text-primary hover:underline"
              >
                Посмотри каталог квестов →
              </Link>
            </div>
          ) : (
            <ul className="divide-y-2 divide-border">
              {sessions.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {s.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/quests/${s.questId}`}
                        className="font-bold truncate hover:text-primary"
                      >
                        {s.questTitle ?? `Квест #${s.questId}`}
                      </Link>
                      <div className="text-xs font-mono text-muted-foreground">
                        {s.questCity}
                        {s.mode === "team" ? " · в команде" : " · соло"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="border border-border px-2 py-0.5 uppercase font-bold">
                      {s.score} очков
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(s.startedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}
