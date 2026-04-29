import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Search, Loader2, MapPin, Trophy, UserSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/avatar";

type UserResult = {
  id: number;
  nickname: string;
  points: number;
  avatarSlots: Array<{ style: string; seed: string }>;
  activeAvatarSlot: number;
  city: string | null;
  bio: string | null;
};

export default function UserSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (res.ok) setResults(await res.json());
      } catch {}
      setLoading(false);
      setSearched(true);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <div className="container max-w-screen-sm mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <UserSearch className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-black uppercase tracking-tight">Поиск игроков</h1>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Введи никнейм…"
          className="rounded-none border-2 pl-9 font-mono"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <AnimatePresence mode="wait">
        {!searched && query.trim().length < 2 && (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-muted-foreground font-mono text-sm py-16"
          >
            <UserSearch className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Введи минимум 2 символа для поиска
          </motion.div>
        )}

        {searched && !loading && results.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-muted-foreground font-mono text-sm py-16 border-2 border-dashed border-border"
          >
            <UserSearch className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Игроков с таким ником не найдено
          </motion.div>
        )}

        {results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {results.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/u/${user.id}`}>
                  <div className="flex items-center gap-4 p-4 border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                    <UserAvatar
                      slots={user.avatarSlots}
                      active={user.activeAvatarSlot}
                      nickname={user.nickname}
                      size={48}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-black font-mono text-base group-hover:text-primary transition-colors">
                        @{user.nickname}
                      </div>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.bio}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs font-mono text-muted-foreground">
                        {user.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {user.city}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          {user.points} очков
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs font-mono shrink-0 group-hover:text-primary transition-colors">
                      →
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
