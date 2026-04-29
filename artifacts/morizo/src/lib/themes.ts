export type ThemeId = "neon" | "sunset" | "mono";

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  tagline: string;
  preview: { primary: string; secondary: string; bg: string };
};

export const THEMES: ThemeMeta[] = [
  {
    id: "neon",
    label: "Neon Underground",
    tagline: "Кислотный жёлтый, фуксия и ночной графит",
    preview: { primary: "#d2ff00", secondary: "#ff00a8", bg: "#0a0a0c" },
  },
  {
    id: "sunset",
    label: "Sunset Brutalist",
    tagline: "Закатные оттенки и тёплые бежевые тона",
    preview: { primary: "#ff5722", secondary: "#ffb300", bg: "#1c130d" },
  },
  {
    id: "mono",
    label: "Mono Terminal",
    tagline: "Минимализм терминала: белое на чёрном",
    preview: { primary: "#ffffff", secondary: "#888888", bg: "#000000" },
  },
];

export function applyTheme(id: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = id;
}

export function loadStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "neon";
  const saved = window.localStorage.getItem("morizo:theme");
  if (saved === "neon" || saved === "sunset" || saved === "mono") return saved;
  return "neon";
}

export function storeTheme(id: ThemeId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("morizo:theme", id);
}
