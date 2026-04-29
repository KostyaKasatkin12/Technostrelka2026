import { Palette, Check } from "lucide-react";
import { useTheme, THEMES } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="rounded-none"
          aria-label="Тема"
        >
          <Palette className="h-5 w-5" />
          {!compact && (
            <span className="ml-2 hidden sm:inline text-xs font-bold uppercase font-mono">
              Тема
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-none border-2">
        <DropdownMenuLabel className="font-black uppercase text-xs">
          Выбери модель
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex items-start gap-3 px-3 py-3 cursor-pointer rounded-none focus:bg-muted"
          >
            <motion.div
              className="flex gap-1 mt-1"
              whileHover={{ scale: 1.1 }}
            >
              <div
                className="w-4 h-4 border border-foreground/20"
                style={{ background: t.preview.primary }}
              />
              <div
                className="w-4 h-4 border border-foreground/20"
                style={{ background: t.preview.secondary }}
              />
              <div
                className="w-4 h-4 border border-foreground/20"
                style={{ background: t.preview.bg }}
              />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-sm">{t.label}</span>
                {theme === t.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">{t.tagline}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
