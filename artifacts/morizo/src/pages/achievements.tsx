import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Award, Compass, Trophy, Map, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { AchievementsSkeleton } from "@/components/skeleton-cards";

type Achievement = {
  id: number;
  code: string;
  name: string;
  description: string;
  icon?: string;
  earnedAt: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  compass: Compass,
  map: Map,
  users: Users,
};

export default function Achievements() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: meLoading } = useGetMe();

  useEffect(() => {
    if (!meLoading && !me?.user) setLocation("/login");
  }, [me, meLoading, setLocation]);

  const { data, isLoading } = useQuery({
    queryKey: ["achievements", "me"],
    queryFn: () => apiGet<Achievement[]>("/achievements/mine"),
    enabled: !!me?.user,
  });

  if (isLoading || !data) {
    return (
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-2">
          <Award className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-black uppercase">Ачивки</h1>
        </div>
        <div className="shimmer h-4 w-20 rounded-none mb-6" />
        <AchievementsSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <Award className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-black uppercase">Ачивки</h1>
      </div>
      <p className="text-muted-foreground font-mono text-sm mb-6">
        Открыто: {data.length}
      </p>

      {data.length === 0 ? (
        <Reveal>
          <div className="border-2 border-dashed border-border p-8 text-center space-y-3">
            <Award className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Ачивок пока нет. Пройди свой первый квест!
            </p>
            <Link href="/quests">
              <Button className="rounded-none">К каталогу</Button>
            </Link>
          </div>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((a, i) => {
            const Icon = (a.icon && ICONS[a.icon]) ?? Award;
            return (
              <Reveal key={a.id} delay={i * 0.05}>
                <div className="border-2 border-primary bg-card p-4 flex gap-3 hover:shadow-[4px_4px_0px_0px_hsl(var(--primary)/0.3)] transition-shadow">
                  <div className="shrink-0 w-12 h-12 border-2 border-primary text-primary flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black uppercase truncate">{a.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {a.description}
                    </p>
                    <p className="font-mono text-xs text-primary mt-2">
                      Открыто {new Date(a.earnedAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
