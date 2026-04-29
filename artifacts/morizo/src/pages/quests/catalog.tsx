import { useListQuests } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Link, useSearch, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Clock,
  Star,
  Compass,
  Footprints,
  Bus,
  Car,
  Bike,
  Mountain,
  Zap,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/reveal";
import { QuestCatalogSkeleton } from "@/components/skeleton-cards";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type TravelMode = "foot" | "transport" | "public_transport" | "dirt_road" | "off_road";

const TRAVEL_MODES: {
  value: TravelMode;
  label: string;
  shortLabel: string;
  bonus: string;
  multiplier: string;
  icon: (props: { className?: string }) => JSX.Element;
}[] = [
  { value: "foot", label: "Пешком", shortLabel: "Пешком", bonus: "×1.2 к очкам", multiplier: "×1.2", icon: Footprints },
  { value: "public_transport", label: "Общественный транспорт", shortLabel: "Транспорт", bonus: "×1.0 к очкам", multiplier: "×1.0", icon: Bus },
  { value: "transport", label: "Личный транспорт", shortLabel: "Авто", bonus: "×0.8 к очкам", multiplier: "×0.8", icon: Car },
  { value: "dirt_road", label: "По грунтовкам", shortLabel: "Грунтовки", bonus: "×1.3 к очкам", multiplier: "×1.3", icon: Bike },
  { value: "off_road", label: "Без дорог", shortLabel: "Без дорог", bonus: "×1.5 к очкам", multiplier: "×1.5", icon: Mountain },
];

const TRAVEL_MODE_KEY = "morizo_preferred_travel_mode";

function readStoredTravelMode(): TravelMode | null {
  try {
    const stored = localStorage.getItem(TRAVEL_MODE_KEY);
    if (stored && TRAVEL_MODES.some((m) => m.value === stored)) {
      return stored as TravelMode;
    }
  } catch {
  }
  return null;
}

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [travelMode, setTravelMode] = useState<TravelMode | null>(readStoredTravelMode);

  const searchString = useSearch();
  const [, setLocation] = useLocation();

  const currentPage = Math.max(1, parseInt(new URLSearchParams(searchString).get("page") ?? "1", 10) || 1);

  const { data, isLoading } = useListQuests({
    search,
    page: currentPage,
    bestTravelMode: travelMode ?? undefined,
  });

  const activeModeInfo = TRAVEL_MODES.find((m) => m.value === travelMode);

  const filteredItems = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigatePage(page: number) {
    const params = new URLSearchParams(searchString);
    params.set("page", String(page));
    setLocation(`/quests?${params.toString()}`);
  }

  useEffect(() => {
    try {
      if (travelMode) {
        localStorage.setItem(TRAVEL_MODE_KEY, travelMode);
      } else {
        localStorage.removeItem(TRAVEL_MODE_KEY);
      }
    } catch {
    }
  }, [travelMode]);

  const prevSearch = useRef(search);
  useEffect(() => {
    if (search !== prevSearch.current) {
      prevSearch.current = search;
      if (currentPage !== 1) {
        const params = new URLSearchParams(searchString);
        params.set("page", "1");
        setLocation(`/quests?${params.toString()}`);
      }
    }
  }, [search, currentPage, searchString, setLocation]);

  const prevMode = useRef(travelMode);
  useEffect(() => {
    if (travelMode !== prevMode.current) {
      prevMode.current = travelMode;
      if (currentPage !== 1) {
        const params = new URLSearchParams(searchString);
        params.set("page", "1");
        setLocation(`/quests?${params.toString()}`);
      }
    }
  }, [travelMode, currentPage, searchString, setLocation]);

  useEffect(() => {
    if (!isLoading && totalPages > 0 && currentPage > totalPages) {
      const params = new URLSearchParams(searchString);
      params.set("page", String(totalPages));
      setLocation(`/quests?${params.toString()}`);
    }
  }, [isLoading, totalPages, currentPage, searchString, setLocation]);

  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="container max-w-screen-xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-black uppercase">Квесты</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm">Выбери маршрут и начинай игру.</p>
          {!isLoading && (
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Найдено: {total} {pluralQuests(total)}
            </p>
          )}
        </div>

        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Найти квест..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-12 border-2 bg-card rounded-none font-mono focus-visible:ring-primary md:w-80"
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Способ передвижения</p>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = travelMode === mode.value;
            return (
              <motion.button
                key={mode.value}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => setTravelMode(isActive ? null : mode.value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border-2 font-mono text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/60 text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{mode.label}</span>
                <span className="sm:hidden">{mode.shortLabel}</span>
                <span
                  className={cn(
                    "text-xs font-bold px-1.5 py-0.5 border",
                    isActive
                      ? "border-primary-foreground/40 text-primary-foreground bg-primary-foreground/20"
                      : "border-border text-muted-foreground bg-muted",
                  )}
                >
                  {mode.multiplier}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {activeModeInfo && (
          <motion.div
            key="mode-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-2 border-primary bg-primary/5 px-4 py-3 flex items-center gap-3 font-mono text-sm">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <span>
                Показаны квесты с рекомендованным режимом{" "}
                <span className="font-bold text-primary">«{activeModeInfo.label}»</span>.
                Сессии с этим режимом получают{" "}
                <span className="font-bold text-primary">{activeModeInfo.bonus}</span>.
              </span>
              <button
                onClick={() => setTravelMode(null)}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors text-xs uppercase tracking-wider shrink-0"
              >
                Сбросить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <QuestCatalogSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.length ? (
            filteredItems.map((quest, i) => (
              <Reveal key={quest.id} delay={i * 0.06} className="h-full">
                <Link href={`/quests/${quest.id}`} className="h-full block">
                  <motion.div
                    whileHover={{ y: -4, boxShadow: "0 12px 32px -8px hsl(var(--primary)/0.25)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="group border-2 border-border bg-card hover:border-primary transition-colors cursor-pointer flex flex-col h-full overflow-hidden"
                  >
                    <div className="h-48 bg-muted relative overflow-hidden">
                      {quest.coverUrl ? (
                        <img src={quest.coverUrl} alt={quest.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                          <MapPin className="h-12 w-12 text-secondary/40" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-background border-2 border-border px-2 py-1 text-xs font-bold uppercase flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {quest.difficulty}/5
                      </div>

                      {activeModeInfo && (
                        <div className="absolute top-4 left-4 bg-primary text-primary-foreground border-2 border-primary px-2 py-1 text-xs font-black uppercase flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {activeModeInfo.multiplier}
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-xl font-black uppercase mb-2 line-clamp-2">{quest.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-1">{quest.description}</p>

                      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-4 border-t border-border">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{quest.city}, {quest.district}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <Clock className="h-4 w-4" />
                          <span>{quest.durationMin} мин</span>
                        </div>
                        {quest.maxTeamSize != null && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Users className="h-4 w-4" />
                            <span>до {quest.maxTeamSize} игр.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </Reveal>
            ))
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-border bg-card/50">
              <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold uppercase mb-2">Ничего не найдено</h3>
              <p className="text-muted-foreground font-mono text-sm">
                {travelMode
                  ? "Нет квестов для выбранного способа передвижения. Попробуйте другой."
                  : "Попробуйте изменить параметры поиска."}
              </p>
            </div>
          )}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-1">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => navigatePage(currentPage - 1)}
            disabled={currentPage <= 1}
            className={cn(
              "h-10 w-10 flex items-center justify-center border-2 font-mono transition-colors",
              currentPage <= 1
                ? "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                : "border-border bg-card hover:border-primary hover:text-primary",
            )}
            aria-label="Предыдущая страница"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>

          {pageNumbers.map((item, idx) =>
            item === "…" ? (
              <span key={`ellipsis-${idx}`} className="h-10 w-10 flex items-center justify-center font-mono text-muted-foreground text-sm">
                …
              </span>
            ) : (
              <motion.button
                key={item}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => navigatePage(item as number)}
                className={cn(
                  "h-10 w-10 flex items-center justify-center border-2 font-mono text-sm transition-colors",
                  currentPage === item
                    ? "border-primary bg-primary text-primary-foreground font-bold"
                    : "border-border bg-card hover:border-primary hover:text-primary",
                )}
                aria-label={`Страница ${item}`}
                aria-current={currentPage === item ? "page" : undefined}
              >
                {item}
              </motion.button>
            )
          )}

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => navigatePage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={cn(
              "h-10 w-10 flex items-center justify-center border-2 font-mono transition-colors",
              currentPage >= totalPages
                ? "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                : "border-border bg-card hover:border-primary hover:text-primary",
            )}
            aria-label="Следующая страница"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      )}
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [];
  const addPage = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };
  addPage(1);
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    addPage(i);
  }
  if (current < total - 2) pages.push("…");
  addPage(total);
  return pages;
}

function pluralQuests(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "квест";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "квеста";
  return "квестов";
}
