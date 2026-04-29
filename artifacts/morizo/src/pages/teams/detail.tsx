import { useParams, Link } from "wouter";
import { useGetMe, useGetTeam } from "@workspace/api-client-react";
import { Loader2, Users, ArrowLeft, Crown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { data: me } = useGetMe();
  const { data, isLoading } = useGetTeam(id);

  if (isLoading || !data) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { team, members } = data as any;
  const isMember = members.some((m: any) => m.id === me?.user?.id);

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Link href="/teams">
        <Button variant="ghost" className="mb-4 -ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> К командам
        </Button>
      </Link>

      <div className="border-2 border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-black uppercase">{team.name}</h1>
            <p className="font-mono text-xs text-muted-foreground mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {members.length} / 6
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-primary" /> {team.points} очков
              </span>
              <span>{team.completedCount} квестов</span>
            </p>
            {team.captainNickname && (
              <p className="text-sm text-muted-foreground mt-1">
                Капитан: <span className="text-secondary font-bold">@{team.captainNickname}</span>
              </p>
            )}
          </div>
          {isMember && (
            <div className="text-right">
              <div className="text-xs font-mono uppercase text-muted-foreground">
                Код
              </div>
              <div className="text-2xl font-black font-mono text-primary tracking-widest">
                {team.joinCode}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="text-sm font-black uppercase mb-3">Состав</h2>
          <ul className="space-y-2">
            {members.map((m: any) => (
              <li
                key={m.id}
                className="flex items-center gap-3 p-2 border border-border bg-background"
              >
                <div className="w-9 h-9 border-2 border-primary text-primary font-black font-mono flex items-center justify-center uppercase">
                  {m.nickname?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate flex items-center gap-2">
                    {m.nickname}
                    {m.id === team.captainId && (
                      <Crown className="h-4 w-4 text-secondary" />
                    )}
                  </div>
                </div>
                {m.role && (
                  <span className="text-xs font-mono uppercase text-muted-foreground">
                    {m.role === "captain" ? "капитан" : "игрок"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isMember && (
          <div className="border-t border-border pt-4 mt-4 text-sm font-mono text-muted-foreground">
            Поделись кодом с друзьями. Команда может включать до 6 человек.
          </div>
        )}
      </div>
    </div>
  );
}
