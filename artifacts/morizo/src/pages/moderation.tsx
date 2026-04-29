import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useApproveQuest,
  useRejectQuest,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Check, X, MapPin, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiGet } from "@/lib/api";
import { toast } from "sonner";

type ModQuest = {
  id: number;
  title: string;
  description: string;
  city: string;
  district: string;
  difficulty: number;
  durationMin: number;
  authorNickname?: string;
  submittedAt?: string;
  checkpointCount: number;
};

export default function Moderation() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: me, isLoading: meLoading } = useGetMe();

  useEffect(() => {
    if (!meLoading && !me?.user) setLocation("/login");
    else if (me?.user && me.user.role !== "moderator") setLocation("/");
  }, [me, meLoading, setLocation]);

  const { data, isLoading } = useQuery({
    queryKey: ["moderation", "queue"],
    queryFn: () => apiGet<ModQuest[]>("/moderation/queue"),
    enabled: me?.user?.role === "moderator",
  });

  const approve = useApproveQuest();
  const reject = useRejectQuest();

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  if (me?.user?.role !== "moderator" || isLoading || !data) {
    return (
      <div className="container max-w-3xl mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleApprove = (id: number) => {
    approve.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Квест опубликован");
          qc.invalidateQueries({ queryKey: ["moderation", "queue"] });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const handleReject = (id: number) => {
    if (!reason.trim()) {
      toast.error("Укажи причину отклонения");
      return;
    }
    reject.mutate(
      { id, data: { reason } },
      {
        onSuccess: () => {
          toast.success("Квест отклонён");
          setRejectingId(null);
          setReason("");
          qc.invalidateQueries({ queryKey: ["moderation", "queue"] });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="h-10 w-10 text-secondary" />
        <h1 className="text-4xl font-black uppercase">Модерация</h1>
      </div>
      <p className="text-muted-foreground font-mono text-sm mb-6">
        В очереди: {data.length}
      </p>

      {data.length === 0 ? (
        <div className="border-2 border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            Очередь пуста. Все квесты обработаны.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((q) => (
            <div key={q.id} className="border-2 border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <Link href={`/quests/${q.id}`}>
                    <h3 className="text-xl font-black uppercase hover:text-primary cursor-pointer">
                      {q.title}
                    </h3>
                  </Link>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    @{q.authorNickname} · {q.checkpointCount} точек
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase font-mono">
                  <span className="border border-border px-2 py-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {q.city}
                  </span>
                  <span className="border border-border px-2 py-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {q.durationMin} мин
                  </span>
                  <span className="border border-border px-2 py-0.5 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {q.difficulty}/5
                  </span>
                </div>
              </div>

              <p className="text-sm text-foreground/80 line-clamp-3 mb-4">
                {q.description}
              </p>

              {rejectingId === q.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Причина отклонения..."
                    rows={2}
                    className="rounded-none border-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReject(q.id)}
                      variant="destructive"
                      disabled={reject.isPending}
                      className="rounded-none"
                    >
                      Подтвердить отклонение
                    </Button>
                    <Button
                      onClick={() => {
                        setRejectingId(null);
                        setReason("");
                      }}
                      variant="ghost"
                      className="rounded-none"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/quests/${q.id}`}>
                    <Button variant="outline" className="rounded-none">
                      Открыть
                    </Button>
                  </Link>
                  <Button
                    onClick={() => handleApprove(q.id)}
                    disabled={approve.isPending}
                    className="rounded-none"
                  >
                    <Check className="h-4 w-4 mr-2" /> Опубликовать
                  </Button>
                  <Button
                    onClick={() => setRejectingId(q.id)}
                    variant="destructive"
                    className="rounded-none"
                  >
                    <X className="h-4 w-4 mr-2" /> Отклонить
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
