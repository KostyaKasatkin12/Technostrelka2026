import { useEffect, useRef, useState } from "react";
import { loadYandexMaps } from "@/lib/yandex-maps";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";

type Suggestion = {
  displayName: string;
  value: string;
};

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Москва, Нижний Новгород...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const ymapsRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadYandexMaps()
      .then((y) => {
        if (!cancelled) ymapsRef.current = y;
      })
      .catch(() => {
        // silent — fall back to plain input
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function fetchSuggest(query: string) {
    if (!ymapsRef.current?.suggest) return;
    setLoading(true);
    ymapsRef.current
      .suggest(query, { results: 6 })
      .then((items: Array<{ displayName: string; value: string }>) => {
        setSuggestions(items ?? []);
        setOpen(true);
        setLoading(false);
      })
      .catch(() => {
        setSuggestions([]);
        setLoading(false);
      });
  }

  function handleChange(v: string) {
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!v.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => fetchSuggest(v), 250);
  }

  function pick(s: Suggestion) {
    const cityOnly = s.value.split(",")[0]?.trim() ?? s.value;
    onChange(cityOnly);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className="rounded-none border-2 h-11"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border-2 border-border bg-popover shadow-[4px_4px_0px_0px_hsl(var(--primary))] max-h-64 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-start gap-2 border-b border-border/50 last:border-b-0"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span
                dangerouslySetInnerHTML={{ __html: s.displayName }}
                className="font-mono text-xs"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
