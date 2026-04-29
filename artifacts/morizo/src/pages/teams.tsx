import {
  useGetMe,
  useListTeams,
  useListMyTeams,
  useCreateTeam,
  useJoinTeam,
  getListMyTeamsQueryKey,
  getListTeamsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/reveal";
import { TeamsSkeleton } from "@/components/skeleton-cards";

export default function Teams() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: me, isLoading: meLoading } = useGetMe();
  const { data: myTeams } = useListMyTeams({ query: { enabled: !!me?.user } });
  const { data: allTeams, isLoading } = useListTeams();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (!meLoading && !me?.user) setLocation("/login");
  }, [me, meLoading, setLocation]);

  if (isLoading || !allTeams) {
    return (
      <div className="container max-w-screen-xl mx-auto py-8 px-4">
        <div className="h-10 w-40 shimmer rounded-none mb-2" />
        <div className="h-4 w-64 shimmer rounded-none mb-10" />
        <TeamsSkeleton count={6} />
      </div>
    );
  }

  const myTeamIds = new Set((myTeams ?? []).map((t: any) => t.id));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTeam.mutate(
      { data: { name } },
      {
        onSuccess: (t: any) => {
          toast.success(`Команда «${t.name}» создана. Код: ${t.joinCode}`);
          qc.invalidateQueries({ queryKey: getListMyTeamsQueryKey() });
          qc.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          setName("");
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinTeam.mutate(
      { data: { joinCode: joinCode.trim().toUpperCase() } },
      {
        onSuccess: (t: any) => {
          toast.success(`Ты в команде «${t.name}»`);
          qc.invalidateQueries({ queryKey: getListMyTeamsQueryKey() });
          qc.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          setJoinCode("");
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="container max-w-screen-xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-black uppercase mb-2">Команды</h1>
      <p className="text-muted-foreground font-mono text-sm mb-6">
        Создай свою команду или присоединись по коду.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <form
          onSubmit={handleCreate}
          className="border-2 border-border bg-card p-5 space-y-3"
        >
          <h2 className="text-lg font-black uppercase flex items-center gap-2">
            <Plus className="h-5 w-5" /> Создать команду
          </h2>
          <div>
            <Label className="text-xs font-bold uppercase">Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={40}
              className="rounded-none border-2 h-12 mt-1"
            />
          </div>
          <Button
            type="submit"
            disabled={createTeam.isPending}
            className="w-full rounded-none h-12 font-black uppercase"
          >
            Создать
          </Button>
        </form>

        <form
          onSubmit={handleJoin}
          className="border-2 border-border bg-card p-5 space-y-3"
        >
          <h2 className="text-lg font-black uppercase flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Войти по коду
          </h2>
          <div>
            <Label className="text-xs font-bold uppercase">Код команды</Label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              maxLength={10}
              placeholder="MORIZO1"
              className="rounded-none border-2 h-12 mt-1 font-mono uppercase tracking-widest"
            />
          </div>
          <Button
            type="submit"
            disabled={joinTeam.isPending}
            className="w-full rounded-none h-12 font-black uppercase"
          >
            Присоединиться
          </Button>
        </form>
      </div>

      {(myTeams ?? []).length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-black uppercase mb-4">Мои команды</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(myTeams ?? []).map((t: any, i: number) => (
              <Reveal key={t.id} delay={i * 0.06}>
                <TeamCard team={t} mine />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-black uppercase mb-4">Все команды</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allTeams.map((t: any, i: number) => (
            <Reveal key={t.id} delay={i * 0.05}>
              <TeamCard team={t} mine={myTeamIds.has(t.id)} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

function TeamCard({ team, mine }: { team: any; mine?: boolean }) {
  return (
    <Link href={`/teams/${team.id}`}>
      <div className="border-2 border-border bg-card p-4 hover:border-primary transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black uppercase truncate">{team.name}</h3>
          {mine && (
            <span className="text-xs font-bold uppercase text-primary border border-primary/40 bg-primary/10 px-2 py-0.5">
              в команде
            </span>
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {team.memberCount} / 6
          </span>
          {mine && (
            <span className="text-primary">КОД: {team.joinCode}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
