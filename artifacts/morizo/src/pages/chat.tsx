import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useListChatChannels,
  useGetChatChannel,
  useListChatMessages,
  useCreateChatChannel,
  useSendChatMessage,
  useMarkChatRead,
  useSearchChatUsers,
  useListMyTeams,
  useListMyQuests,
  getListChatChannelsQueryKey,
  getListChatMessagesQueryKey,
  getGetChatChannelQueryKey,
  type ChatChannel,
  type ChatMessage,
  type ChatUser,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/avatar";
import {
  Loader2,
  Send,
  Plus,
  Search,
  MessageSquare,
  MapPin,
  Users,
  Compass,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatTime(d: string | Date | undefined | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

function ChannelKindBadge({ kind }: { kind: ChatChannel["kind"] }) {
  const map: Record<ChatChannel["kind"], { label: string; className: string }> =
    {
      direct: { label: "ЛИЧНОЕ", className: "border-foreground/40" },
      group: { label: "ГРУППА", className: "border-foreground/40" },
      quest: { label: "КВЕСТ", className: "border-primary text-primary" },
      team: { label: "КОМАНДА", className: "border-secondary text-secondary" },
    };
  const m = map[kind];
  return (
    <span
      className={cn(
        "text-[9px] font-mono font-bold uppercase border px-1.5 py-0.5",
        m.className,
      )}
    >
      {m.label}
    </span>
  );
}

function MessageAttachment({
  attachment,
}: {
  attachment: ChatMessage["attachment"];
}) {
  if (!attachment) return null;
  if (attachment.kind === "quest_link") {
    return (
      <Link
        href={`/quests/${attachment.questId}`}
        className="mt-2 flex items-center gap-2 border-2 border-primary/60 bg-primary/10 px-3 py-2 hover:bg-primary/20 transition-colors"
      >
        <Compass className="h-4 w-4 text-primary shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase text-primary font-bold">
            Квест
          </span>
          <span className="text-sm font-bold">Открыть квест #{attachment.questId}</span>
        </div>
      </Link>
    );
  }
  if (attachment.kind === "team_invite") {
    return (
      <div className="mt-2 flex items-center gap-2 border-2 border-secondary/60 bg-secondary/10 px-3 py-2">
        <Users className="h-4 w-4 text-secondary shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase text-secondary font-bold">
            Приглашение в команду
          </span>
          <span className="text-sm font-bold">
            Код вступления: <span className="font-mono">{attachment.joinCode}</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
}

function NewChannelDialog({
  onCreated,
}: {
  onCreated: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"direct" | "team" | "quest">("direct");
  const [q, setQ] = useState("");
  const { data: searchResults } = useSearchChatUsers(
    { q },
    { query: { enabled: q.length >= 1 && tab === "direct" } },
  );
  const { data: myTeams } = useListMyTeams({ query: { enabled: tab === "team" } });
  const { data: myQuests } = useListMyQuests({
    query: { enabled: tab === "quest" },
  });
  const create = useCreateChatChannel();

  const handleCreate = (
    body:
      | { kind: "direct"; memberIds: [number] }
      | { kind: "team"; teamId: number }
      | { kind: "quest"; questId: number },
  ) => {
    create.mutate(
      { data: body },
      {
        onSuccess: (ch) => {
          setOpen(false);
          onCreated(ch.id);
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-none h-10 font-bold uppercase text-xs gap-1"
        >
          <Plus className="h-4 w-4" /> Новый
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-2 max-w-md" open={open}>
        <DialogHeader>
          <DialogTitle className="font-black uppercase">Новый чат</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {(["direct", "team", "quest"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "py-2 text-xs font-mono font-bold uppercase border-2",
                tab === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {t === "direct" ? "Личное" : t === "team" ? "Команда" : "Квест"}
            </button>
          ))}
        </div>
        {tab === "direct" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-2 border-border px-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Никнейм игрока..."
                className="border-0 focus-visible:ring-0 px-0"
              />
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {(searchResults ?? []).map((u: ChatUser) => (
                <button
                  key={u.id}
                  onClick={() =>
                    handleCreate({ kind: "direct", memberIds: [u.id] })
                  }
                  className="w-full text-left flex items-center gap-3 px-2 py-2 border-2 border-transparent hover:border-primary"
                >
                  <UserAvatar
                    nickname={u.nickname}
                    active={u.activeAvatarSlot}
                    size={36}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{u.nickname}</div>
                    {u.city && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {u.city}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {q.length > 0 &&
                (searchResults?.length ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Никого не найдено
                  </p>
                )}
            </div>
          </div>
        )}
        {tab === "team" && (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {(myTeams ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Вы не состоите в командах. Создайте команду на странице «Команды».
              </p>
            ) : (
              (myTeams ?? []).map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => handleCreate({ kind: "team", teamId: t.id })}
                  className="w-full text-left flex items-center gap-3 px-2 py-2 border-2 border-transparent hover:border-secondary"
                >
                  <Users className="h-5 w-5 text-secondary" />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {t.memberCount} чел · {t.points} XP
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
        {tab === "quest" && (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {(myQuests ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                У вас нет квестов. Создайте квест, чтобы открыть для него сбор.
              </p>
            ) : (
              (myQuests ?? []).map((q: any) => (
                <button
                  key={q.id}
                  onClick={() => handleCreate({ kind: "quest", questId: q.id })}
                  className="w-full text-left flex items-center gap-3 px-2 py-2 border-2 border-transparent hover:border-primary"
                >
                  <Compass className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="font-bold text-sm line-clamp-1">
                      {q.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {q.city} · сбор команды
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({
  channelId,
  onSent,
}: {
  channelId: number;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: myQuests } = useListMyQuests({ query: { enabled: open } });
  const { data: myTeams } = useListMyTeams({ query: { enabled: open } });
  const send = useSendChatMessage();

  const sendQuest = (questId: number, title: string) => {
    send.mutate(
      {
        id: channelId,
        data: {
          body: `Зову на квест: ${title}`,
          attachment: { kind: "quest_link", questId },
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          onSent();
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };
  const sendTeamInvite = (teamId: number, name: string, joinCode: string) => {
    send.mutate(
      {
        id: channelId,
        data: {
          body: `Приглашаю в команду «${name}»`,
          attachment: { kind: "team_invite", teamId, joinCode },
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          onSent();
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-none h-10 px-3"
          title="Поделиться квестом или командой"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-2 max-w-md" open={open}>
        <DialogHeader>
          <DialogTitle className="font-black uppercase">Поделиться</DialogTitle>
        </DialogHeader>
        <div>
          <p className="text-xs font-mono uppercase font-bold mb-2 text-primary">
            Квесты
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
            {(myQuests ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">У вас пока нет квестов.</p>
            ) : (
              (myQuests ?? []).map((q: any) => (
                <button
                  key={q.id}
                  onClick={() => sendQuest(q.id, q.title)}
                  className="w-full text-left flex items-center gap-2 px-2 py-2 border-2 border-transparent hover:border-primary"
                >
                  <Compass className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold line-clamp-1">{q.title}</span>
                </button>
              ))
            )}
          </div>
          <p className="text-xs font-mono uppercase font-bold mb-2 text-secondary">
            Приглашения в команды
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(myTeams ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Вы не состоите в командах.
              </p>
            ) : (
              (myTeams ?? []).map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => sendTeamInvite(t.id, t.name, t.joinCode)}
                  className="w-full text-left flex items-center gap-2 px-2 py-2 border-2 border-transparent hover:border-secondary"
                >
                  <Users className="h-4 w-4 text-secondary" />
                  <div className="flex-1">
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      Код: {t.joinCode}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelView({
  channelId,
  onClose,
}: {
  channelId: number;
  onClose?: () => void;
}) {
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const { data: channel } = useGetChatChannel(channelId);
  const { data: messages } = useListChatMessages(channelId, undefined, {
    query: { refetchOnMount: "always" },
  });
  const send = useSendChatMessage();
  const markRead = useMarkChatRead();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // SSE subscription for live messages
  useEffect(() => {
    if (!channelId || !me?.user) return;
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const url = `${base}/api/chat/channels/${channelId}/stream`;
    const es = new EventSource(url, { withCredentials: true });
    es.addEventListener("message", () => {
      qc.invalidateQueries({
        queryKey: getListChatMessagesQueryKey(channelId),
      });
      qc.invalidateQueries({ queryKey: getListChatChannelsQueryKey() });
    });
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [channelId, me?.user, qc]);

  // Mark read on view + scroll bottom on new messages
  useEffect(() => {
    if (!channelId) return;
    markRead.mutate(
      { id: channelId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListChatChannelsQueryKey() });
          qc.invalidateQueries({
            queryKey: getGetChatChannelQueryKey(channelId),
          });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, messages?.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    send.mutate(
      { id: channelId, data: { body } },
      {
        onSuccess: () => {
          setText("");
          qc.invalidateQueries({
            queryKey: getListChatMessagesQueryKey(channelId),
          });
          qc.invalidateQueries({ queryKey: getListChatChannelsQueryKey() });
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const myId = me?.user?.id;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b-2 border-border px-4 py-3 flex items-center gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 -ml-1 hover:bg-muted"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-black uppercase text-base truncate">
              {channel.title}
            </h2>
            <ChannelKindBadge kind={channel.kind} />
          </div>
          <p className="text-[10px] font-mono uppercase text-muted-foreground">
            {channel.memberCount} участн.
            {channel.kind === "quest" && channel.questId && (
              <>
                {" · "}
                <Link
                  href={`/quests/${channel.questId}`}
                  className="text-primary hover:underline"
                >
                  открыть квест
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {(messages ?? []).map((m) => {
          const mine = m.userId === myId;
          return (
            <div
              key={m.id}
              className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
            >
              <UserAvatar
                nickname={m.authorNickname ?? "?"}
                active={m.authorAvatarSlot ?? 0}
                size={28}
              />
              <div
                className={cn(
                  "max-w-[78%] border-2 px-3 py-2",
                  mine
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card",
                )}
              >
                {!mine && (
                  <div className="text-[10px] font-mono font-bold uppercase text-muted-foreground mb-0.5">
                    {m.authorNickname}
                  </div>
                )}
                {m.body && (
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {m.body}
                  </div>
                )}
                <MessageAttachment attachment={m.attachment} />
                <div className="text-[9px] font-mono text-muted-foreground mt-1 text-right">
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        {(messages ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
            <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Сообщений пока нет — напишите первым.</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t-2 border-border px-3 py-3 flex items-center gap-2"
      >
        <ShareDialog
          channelId={channelId}
          onSent={() => {
            qc.invalidateQueries({
              queryKey: getListChatMessagesQueryKey(channelId),
            });
            qc.invalidateQueries({ queryKey: getListChatChannelsQueryKey() });
          }}
        />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение..."
          className="rounded-none border-2 h-10 flex-1"
        />
        <Button
          type="submit"
          disabled={!text.trim() || send.isPending}
          className="rounded-none h-10 font-black uppercase"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: meLoading } = useGetMe();
  const { data: channels, isLoading } = useListChatChannels({
    query: { enabled: !!me?.user, refetchInterval: 15000 },
  });
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (!meLoading && !me?.user) setLocation("/login");
  }, [me, meLoading, setLocation]);

  // Auto-select first channel on desktop
  useEffect(() => {
    if (!activeId && channels && channels.length > 0) {
      setActiveId(channels[0].id);
    }
  }, [channels, activeId]);

  const sortedChannels = useMemo(() => channels ?? [], [channels]);

  if (isLoading) {
    return (
      <div className="container max-w-screen-xl mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl mx-auto py-4 md:py-8 px-2 md:px-4">
      <div className="flex items-center justify-between gap-4 mb-4 px-2 md:px-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase">Чат</h1>
          <p className="text-muted-foreground font-mono text-xs">
            Сбор команд, обсуждение квестов, личные сообщения.
          </p>
        </div>
        <NewChannelDialog onCreated={(id) => setActiveId(id)} />
      </div>

      <div className="border-2 border-border bg-card grid md:grid-cols-[300px_1fr] min-h-[70vh] max-h-[80vh]">
        <aside
          className={cn(
            "border-r-2 border-border md:flex flex-col min-h-0",
            activeId !== null ? "hidden" : "flex",
          )}
        >
          <div className="overflow-y-auto flex-1">
            {sortedChannels.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Пока нет чатов. Нажмите «Новый», чтобы начать диалог или собрать
                команду на квест.
              </div>
            ) : (
              <ul>
                {sortedChannels.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "w-full text-left px-3 py-3 border-b border-border hover:bg-muted/50 flex gap-3 items-start",
                        activeId === c.id && "bg-primary/10",
                      )}
                    >
                      <div className="shrink-0">
                        {c.kind === "direct" ? (
                          <UserAvatar
                            nickname={c.title}
                            active={
                              c.members.find((m) => m.userId !== me?.user?.id)
                                ?.activeAvatarSlot ?? 0
                            }
                            size={40}
                          />
                        ) : c.kind === "team" ? (
                          <div className="h-10 w-10 bg-secondary/20 border-2 border-secondary flex items-center justify-center">
                            <Users className="h-5 w-5 text-secondary" />
                          </div>
                        ) : c.kind === "quest" ? (
                          <div className="h-10 w-10 bg-primary/20 border-2 border-primary flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 bg-muted border-2 border-border flex items-center justify-center">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate flex-1">
                            {c.title}
                          </span>
                          {c.lastMessage?.createdAt && (
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {formatTime(c.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {c.lastMessage
                              ? c.lastMessage.body ||
                                (c.lastMessage.attachment?.kind === "quest_link"
                                  ? "📍 Поделился квестом"
                                  : c.lastMessage.attachment?.kind ===
                                      "team_invite"
                                    ? "👥 Приглашение в команду"
                                    : "Вложение")
                              : "Нет сообщений"}
                          </p>
                          {c.unread > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] font-mono font-bold px-1.5 min-w-[20px] text-center">
                              {c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            "flex flex-col min-h-0",
            activeId === null ? "hidden md:flex" : "flex",
          )}
        >
          {activeId !== null ? (
            <ChannelView channelId={activeId} onClose={() => setActiveId(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p className="font-mono text-sm">Выберите чат слева</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
