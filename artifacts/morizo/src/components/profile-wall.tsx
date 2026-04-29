import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Heart, Send, Trash2, Loader2, ImagePlus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

type Reaction = { emoji: string; count: number; myReaction: boolean };
type Comment = { id: number; body: string; createdAt: string; userId: number; nickname: string; avatarSlots: any; activeAvatarSlot: number };
type Post = {
  id: number;
  body: string;
  imageUrl?: string;
  createdAt: string;
  author: { id: number; nickname: string; avatarSlots: any; activeAvatarSlot: number };
  reactions: Reaction[];
  commentCount: number;
};

const EMOJIS = ["❤️", "🔥", "👊", "😂", "🏙️", "⚡"];

function fmtTime(s: string) {
  try {
    return formatDistanceToNow(new Date(s), { addSuffix: true, locale: ru });
  } catch {
    return "";
  }
}

function PostCard({ post, currentUserId, isModerator, onDelete, onReact }:
  { post: Post; currentUserId?: number; isModerator?: boolean; onDelete: (id: number) => void; onReact: (id: number, emoji: string) => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

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
        const c = await res.json();
        setComments(prev => [...prev, c]);
        setCommentText("");
      } else {
        const d = await res.json();
        toast.error(d?.error ?? "Ошибка отправки");
      }
    } catch {}
    setPostingComment(false);
  };

  const deleteComment = async (cid: number) => {
    const res = await fetch(`/api/wall/comments/${cid}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setComments(prev => prev.filter(c => c.id !== cid));
  };

  const canDelete = currentUserId === post.author.id || isModerator;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="border-2 border-border bg-card"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <UserAvatar slots={post.author.avatarSlots} active={post.author.activeAvatarSlot} nickname={post.author.nickname} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm font-mono">@{post.author.nickname}</span>
              <span className="text-xs font-mono text-muted-foreground">{fmtTime(post.createdAt)}</span>
              {canDelete && (
                <button onClick={() => onDelete(post.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{post.body}</p>
          </div>
        </div>

        {post.imageUrl && (
          <div className="mt-3 border border-border overflow-hidden">
            <img src={post.imageUrl} alt="вложение" className="w-full max-h-72 object-cover" />
          </div>
        )}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {EMOJIS.map(emoji => {
            const r = post.reactions.find(rx => rx.emoji === emoji);
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
            {post.commentCount}
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 pt-3 space-y-3">
              {loadingComments && <div className="text-xs font-mono text-muted-foreground text-center py-2"><Loader2 className="h-3 w-3 animate-spin inline mr-1" />Загрузка…</div>}
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2 group">
                  <UserAvatar slots={c.avatarSlots} active={c.activeAvatarSlot} nickname={c.nickname} size={24} />
                  <div className="flex-1 min-w-0 bg-muted/50 p-2 border border-border">
                    <span className="text-xs font-bold font-mono text-primary mr-2">@{c.nickname}</span>
                    <span className="text-xs leading-relaxed break-words">{c.body}</span>
                  </div>
                  {(currentUserId === c.userId || isModerator) && (
                    <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {currentUserId && (
                <div className="flex gap-2 pt-1">
                  <Textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value.slice(0, 500))}
                    placeholder="Напиши комментарий…"
                    rows={1}
                    className="rounded-none border-2 text-sm min-h-0 h-9 resize-none py-1.5"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitComment(); }}}
                  />
                  <Button
                    size="sm"
                    onClick={submitComment}
                    disabled={postingComment || !commentText.trim()}
                    className="rounded-none shrink-0"
                  >
                    {postingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ProfileWall({ userId, currentUserId, isModerator }: { userId: number; currentUserId?: number; isModerator?: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wall/${userId}/posts`, { credentials: "include" });
      if (res.ok) setPosts(await res.json());
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const submitPost = async () => {
    if (!text.trim() && !imageUrl) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/wall/${userId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text.trim(), imageUrl: imageUrl ?? undefined }),
      });
      if (res.ok) {
        const p = await res.json();
        setPosts(prev => [p, ...prev]);
        setText("");
        setImageUrl(null);
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error((d as any)?.error ?? "Не удалось опубликовать");
      }
    } catch {
      toast.error("Ошибка сети. Попробуйте ещё раз");
    }
    setPosting(false);
  };

  const deletePost = async (id: number) => {
    const res = await fetch(`/api/wall/posts/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setPosts(prev => prev.filter(p => p.id !== id));
    else toast.error("Не удалось удалить");
  };

  const reactPost = async (id: number, emoji: string) => {
    if (!currentUserId) { toast.error("Войди, чтобы ставить реакции"); return; }
    const res = await fetch(`/api/wall/posts/${id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      setPosts(prev => prev.map(p => {
        if (p.id !== id) return p;
        const existing = p.reactions.find(r => r.emoji === emoji);
        const toggled = existing?.myReaction;
        return {
          ...p,
          reactions: toggled
            ? p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, myReaction: false } : r).filter(r => r.count > 0 || r.emoji !== emoji)
            : existing
              ? p.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, myReaction: true } : r)
              : [...p.reactions, { emoji, count: 1, myReaction: true }],
        };
      }));
    }
  };

  const uploadImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Файл больше 5 МБ"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/image", { method: "POST", body: fd, credentials: "include" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message ?? "Ошибка загрузки");
      setImageUrl(d.url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      {currentUserId === userId && (
        <div className="border-2 border-border bg-card p-4 space-y-3">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 1000))}
            placeholder="Что происходит на улицах? Поделись…"
            rows={3}
            className="rounded-none border-2 text-sm resize-none"
          />
          {imageUrl && (
            <div className="relative border border-border inline-block">
              <img src={imageUrl} alt="вложение" className="h-24 object-cover" />
              <button onClick={() => setImageUrl(null)} className="absolute top-1 right-1 bg-background/90 border border-border p-0.5 hover:border-destructive hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadImage(f); }} />
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            </Button>
            <span className="text-xs font-mono text-muted-foreground flex-1">{text.length}/1000</span>
            <Button size="sm" onClick={submitPost} disabled={posting || (!text.trim() && !imageUrl)} className="rounded-none font-bold uppercase">
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1.5" />Опубликовать</>}
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground font-mono text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка…
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="border-2 border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground font-mono text-sm">
          Стена пустая. Будь первым!
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            isModerator={isModerator}
            onDelete={deletePost}
            onReact={reactPost}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
