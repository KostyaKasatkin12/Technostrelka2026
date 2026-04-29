import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  Map,
  User as UserIcon,
  Trophy,
  LogOut,
  Menu,
  X,
  Plus,
  ShieldCheck,
  History,
  Sparkles,
  MessageSquare,
  Gamepad2,
  Rss,
  Search,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserAvatar } from "@/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedBackground } from "@/components/animated-bg";
import { SplashScreen } from "@/components/loading-screen";
import { BottomNav } from "@/components/bottom-nav";
import { useUnreadChat } from "@/hooks/use-unread-chat";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: me } = useGetMe();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadChat = useUnreadChat(me?.user?.id ?? null);
  const chatUnread = location.startsWith("/chat") ? 0 : unreadChat;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/");
      },
    });
  };

  const navItems = [
    { href: "/quests", label: "Квесты", icon: Compass },
    { href: "/teams", label: "Команды", icon: Map },
    { href: "/games", label: "Игры", icon: Gamepad2 },
    { href: "/chat", label: "Чат", icon: MessageSquare },
    { href: "/feed", label: "Лента", icon: Rss },
    { href: "/search", label: "Поиск", icon: Search },
    { href: "/leaderboard", label: "Рейтинг", icon: Trophy },
    { href: "/achievements", label: "Ачивки", icon: Sparkles },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground relative">
      <SplashScreen />
      <AnimatedBackground intensity="subtle" />

      <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background/85 backdrop-blur-md">
        <div className="container flex h-16 max-w-screen-xl items-center px-4 gap-4">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <motion.span
              whileHover={{ rotate: -2, scale: 1.04 }}
              className="font-mono text-2xl font-black tracking-tighter text-primary uppercase"
            >
              MORIZO
            </motion.span>
            <span className="hidden md:inline-block text-[10px] font-mono uppercase tracking-widest border border-border px-1 py-0.5 text-muted-foreground">
              v3
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/" && location.startsWith(item.href));
              const isChat = item.href === "/chat";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3 py-1.5 text-sm font-bold uppercase font-mono tracking-wide transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {isChat && chatUnread > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-2 right-2 h-0.5 bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
            <ThemeSwitcher compact />
            {me?.user ? (
              <>
                <Link href="/quests/new">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none border-2 font-bold uppercase font-mono"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Квест
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 ml-1 group"
                      aria-label="Меню профиля"
                    >
                      <UserAvatar
                        slots={me.user.avatarSlots}
                        active={me.user.activeAvatarSlot ?? 0}
                        nickname={me.user.nickname}
                        size={36}
                        className="border-2 border-border group-hover:border-primary transition-colors"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-none border-2"
                  >
                    <DropdownMenuLabel>
                      <div className="font-black uppercase">
                        @{me.user.nickname}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {me.user.points} очков
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="rounded-none cursor-pointer">
                      <Link href="/profile">
                        <UserIcon className="h-4 w-4 mr-2" />
                        Мой профиль
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-none cursor-pointer">
                      <Link href="/me/quests">
                        <Compass className="h-4 w-4 mr-2" />
                        Мои квесты
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-none cursor-pointer">
                      <Link href="/sessions">
                        <History className="h-4 w-4 mr-2" />
                        История прохождений
                      </Link>
                    </DropdownMenuItem>
                    {me.user.role === "moderator" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          asChild
                          className="rounded-none cursor-pointer"
                        >
                          <Link href="/admin">
                            <ShieldCheck className="h-4 w-4 mr-2 text-secondary" />
                            Админ-панель
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="rounded-none cursor-pointer"
                        >
                          <Link href="/moderation">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Модерация
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-none cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="rounded-none font-bold uppercase">
                    Вход
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none font-bold uppercase">
                    Регистрация
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <ThemeSwitcher compact />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden border-b-2 border-border bg-background overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-2">
                {navItems.map((item) => {
                  const isChat = item.href === "/chat";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 text-lg font-bold uppercase py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="relative">
                        <item.icon className="h-5 w-5 text-primary" />
                        {isChat && chatUnread > 0 && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                        )}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
                <div className="h-px w-full bg-border my-2" />
                {me?.user ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserAvatar
                        slots={me.user.avatarSlots}
                        active={me.user.activeAvatarSlot ?? 0}
                        nickname={me.user.nickname}
                        size={32}
                      />
                      <div>
                        <div className="font-black uppercase">@{me.user.nickname}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {me.user.points} очков
                        </div>
                      </div>
                    </Link>
                    <Link href="/quests/new" onClick={() => setMenuOpen(false)}>
                      <Button
                        className="w-full rounded-none font-bold uppercase"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Создать квест
                      </Button>
                    </Link>
                    {me.user.role === "moderator" && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)}>
                        <Button
                          className="w-full rounded-none font-bold uppercase"
                          variant="outline"
                        >
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Админ
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="destructive"
                      className="w-full justify-start rounded-none"
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Выйти
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-none">
                        Вход
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMenuOpen(false)}>
                      <Button className="w-full rounded-none bg-primary text-primary-foreground">
                        Регистрация
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 w-full pb-24 md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t-2 border-border bg-background/50 py-6 mt-16 hidden md:block">
        <div className="container max-w-screen-xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono uppercase text-muted-foreground">
          <div>© MORIZO 2026 — городские квесты</div>
          <div className="flex items-center gap-3">
            <span>v3.0 · Mistral AI</span>
            <span className="opacity-60">·</span>
            <ThemeSwitcher />
          </div>
        </div>
      </footer>

      <BottomNav authed={!!me?.user} unreadChat={chatUnread} />
    </div>
  );
}
