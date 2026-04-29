import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Rss, Loader2, RefreshCw, MessageSquare, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/avatar";
import { toast } from "sonner";
import { useGetMe } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

type Comment = { id: number; body: string; createdAt: string; userId: number; nickname: string; avatarSlots: any; activeAvatarSlot: number };
type Post = {
  id: number;
  body: string;
  imageUrl?: string;
  createdAt: string;
  author: { id: number; nickname: string; avatarSlots: any; activeAvatarSlot: number };
  reactions: { emoji: string; count: number; myReaction: boolean }[];
  commentCount: number;
};

const EMOJIS = ["❤️", "🔥", "👊", "😂", "🏙️", "⚡"];

function fmtTime(s: string) {
  try { return formatDistanceToNow(new Date(s), { addSuffix: true, locale: ru }); } catch { return ""; }
}

function PostCard({ post, me, onReact }: { post: Post; me: any; onReact: (id: number, emoji: string) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [localCount, setLocalCount] = useState(post.commentCount);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/wall/posts/${post.id}/comments`, { credentials: "include" });
      if (res.ok) setComments(await res.json());
    } catch {}
    setLoadingComments(false);
  }, [post.id]);

  useEffect(() => {
    if (showComments) loadComments();
  }, [showComments, loadComments]);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/wall/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: commentText.trim() }),
      });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments(prev => [...prev, c]);
        setLocalCount(n => n + 1);
        setCommentText("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error((err as any).error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
    setPostingComment(false);
  };

  const deleteComment = async (id: number) => {
    const res = await fetch(`/api/wall/comments/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== id));
      setLocalCount(n => Math.max(0, n - 1));
    }
  };

  return (
    <div className="border-2 border-border bg-card p-4">
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/u/${post.author.id}`}>
          <UserAvatar slots={post.author.avatarSlots} active={post.author.activeAvatarSlot} nickname={post.author.nickname} size={36} className="hover:opacity-80 transition-opacity cursor-pointer" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href={`/u/${post.author.id}`}>
              <span className="font-bold text-sm font-mono hover:text-primary transition-colors cursor-pointer">@{post.author.nickname}</span>
            </Link>
            <span className="text-xs font-mono text-muted-foreground">{fmtTime(post.createdAt)}</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{post.body}</p>
        </div>
      </div>

      {post.imageUrl && (
        <div className="mb-3 border border-border overflow-hidden">
          <img src={post.imageUrl} alt="вложение" className="w-full max-h-72 object-cover" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {EMOJIS.map(emoji => {
          const r = post.reactions.find(rx => rx.emoji === emoji);
          if (!r && !me) return null;
          return (
            <button
              key={emoji}
              onClick={() => onReact(post.id, emoji)}
              className={`text-xs font-mono px-2 py-0.5 border transition-colors ${r?.myReaction ? "border-primary bg-primary/15 text-primary" : "border-border bg-card hover:border-primary/50"}`}
            >
              {emoji} {r?.count ? r.count : ""}
            </button>
          );
        })}
        <button
          onClick={() => setShowComments(v => !v)}
          className="ml-auto flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {localCount}
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 border-t border-border pt-3 overflow-hidden"
          >
            {loadingComments && (
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground mb-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Загрузка…
              </div>
            )}
            <div className="space-y-2 mb-3">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <UserAvatar slots={c.avatarSlots} active={c.activeAvatarSlot} nickname={c.nickname} size={22} />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold font-mono">@{c.nickname}</span>
                    <span className="ml-1 text-muted-foreground">{fmtTime(c.createdAt)}</span>
                    <p className="mt-0.5 whitespace-pre-wrap break-words leading-snug">{c.body}</p>
                  </div>
                  {(me?.id === c.userId || me?.role === "moderator") && (
                    <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {!loadingComments && comments.length === 0 && (
                <p className="text-xs font-mono text-muted-foreground">Пока нет комментариев</p>
              )}
            </div>
            {me && (
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitComment(); } }}
                  placeholder="Оставь комментарий…"
                  className="rounded-none text-xs font-mono resize-none min-h-0 h-9 py-2"
                  maxLength={500}
                />
                <Button
                  onClick={() => void submitComment()}
                  disabled={postingComment || !commentText.trim()}
                  size="sm"
                  className="rounded-none shrink-0"
                >
                  {postingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FeedPage() {
  const { data: me } = useGetMe();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wall/feed", { credentials: "include" });
      if (res.ok) setPosts(await res.json());
      else if (res.status === 401) setPosts([]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const react = async (id: number, emoji: string) => {
    if (!me?.user) { toast.error("Войди, чтобы ставить реакции"); return; }
    const res = await fetch(`/api/wall/posts/${id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      setPosts(prev => prev.map(p => {
        if (p.id !== id) return p;
        const ex = p.reactions.find(r => r.emoji === emoji);
        const was = ex?.myReaction;
        return {
          ...p,
          reactions: was
            ? p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, myReaction: false } : r).filter(r => r.count > 0 || r.emoji !== emoji)
            : ex
              ? p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, myReaction: true } : r)
              : [...p.reactions, { emoji, count: 1, myReaction: true }],
        };
      }));
    }
  };

  if (!me?.user) {
    return (
      <div className="container max-w-screen-sm mx-auto px-4 py-20 text-center">
        <Rss className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-black uppercase mb-3">Лента</h1>
        <p className="text-sm font-mono text-muted-foreground mb-6">
          Войди, чтобы видеть посты городских игроков
        </p>
        <Link href="/login">
          <Button className="rounded-none font-bold uppercase">Войти</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Rss className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-black uppercase tracking-tight">Лента</h1>
        </div>
        <Button variant="outline" size="sm" className="rounded-none font-bold" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground font-mono text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка…
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="border-2 border-dashed border-border bg-card/50 p-14 text-center text-muted-foreground font-mono text-sm">
          <Rss className="h-8 w-8 mx-auto mb-3 opacity-40" />
          Лента пустая. Найди игроков и загляни на их стену!
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <PostCard post={post} me={me?.user ?? null} onReact={react} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
