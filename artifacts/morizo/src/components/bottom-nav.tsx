import { Link, useLocation } from "wouter";
import { Compass, Gamepad2, Trophy, MessageSquare, Rss } from "lucide-react";
import { motion } from "framer-motion";

const NAV = [
  { href: "/quests", label: "Квесты", icon: Compass },
  { href: "/games", label: "Игры", icon: Gamepad2 },
  { href: "/feed", label: "Лента", icon: Rss },
  { href: "/chat", label: "Чат", icon: MessageSquare },
  { href: "/leaderboard", label: "Топ", icon: Trophy },
];

/**
 * Mobile-only bottom navigation bar (always visible on small screens).
 * Sticks to bottom, respects safe-area, never overlays on md+.
 */
export function BottomNav({
  authed,
  unreadChat = 0,
}: {
  authed: boolean;
  unreadChat?: number;
}) {
  const [location] = useLocation();
  if (!authed) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 border-border bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Нижняя навигация"
    >
      <ul className="grid grid-cols-5">
        {NAV.map((item) => {
          const active =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          const isChat = item.href === "/chat";
          const showBadge = isChat && unreadChat > 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                  active ? "text-primary" : "text-foreground/60 active:text-foreground"
                }`}
              >
                <span className="relative">
                  <item.icon className="h-5 w-5" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
                  )}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase">
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottomnav-indicator"
                    className="absolute top-0 h-0.5 w-10 bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
