import { useGetMe, useListMyQuests } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, MapPin, Star, Clock, Pencil } from "lucide-react";
import { QuestStatusBadge } from "@/components/quest-status-badge";

export default function MyQuests() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: meLoading } = useGetMe();
  const { data, isLoading } = useListMyQuests({
    query: { enabled: !!me?.user },
  });

  useEffect(() => {
    if (!meLoading && !me?.user) setLocation("/login");
  }, [me, meLoading, setLocation]);

  if (isLoading || !data) {
    return (
      <div className="container max-w-screen-xl mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-4xl font-black uppercase">Мои квесты</h1>
        <Link href="/quests/new">
          <Button className="rounded-none h-12 font-black uppercase">
            <Plus className="h-4 w-4 mr-2" /> Новый квест
          </Button>
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Ты ещё не создавал квестов. Стартани свой первый!
          </p>
          <Link href="/quests/new">
            <Button className="rounded-none">Создать квест</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((q: any) => (
            <div
              key={q.id}
              className="border-2 border-border bg-card flex flex-col"
            >
              {q.coverUrl && (
                <Link href={`/quests/${q.id}`}>
                  <div className="aspect-[16/9] overflow-hidden border-b border-border cursor-pointer">
                    <img
                      src={q.coverUrl}
                      alt={q.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                </Link>
              )}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <QuestStatusBadge status={q.status} />
                  <span className="border border-border px-2 py-0.5 text-xs font-bold uppercase font-mono flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {q.city}
                  </span>
                </div>
                <Link href={`/quests/${q.id}`}>
                  <h3 className="font-black uppercase text-lg cursor-pointer hover:text-primary">
                    {q.title}
                  </h3>
                </Link>
                <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" /> {q.difficulty}/5
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {q.durationMin} мин
                  </span>
                  <span>{q.checkpointCount ?? 0} точек</span>
                </div>
                <div className="mt-auto flex gap-2">
                  <Link href={`/quests/${q.id}/edit`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full rounded-none"
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Редактировать
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
