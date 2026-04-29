export type AvatarSlot = { style: string; seed: string };

export const AVATAR_STYLES: Array<{ id: string; label: string }> = [
  { id: "pixel-art", label: "Пиксели" },
  { id: "bottts-neutral", label: "Боты" },
  { id: "lorelei", label: "Иллюстрации" },
  { id: "adventurer", label: "Путешественник" },
  { id: "fun-emoji", label: "Эмодзи" },
  { id: "thumbs", label: "Большой палец" },
];

export function avatarUrl(slot: AvatarSlot | null | undefined, size = 96): string {
  const style = slot?.style && AVATAR_STYLES.find((s) => s.id === slot.style)
    ? slot.style
    : "pixel-art";
  const seed = slot?.seed || "morizo";
  const enc = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${enc}&size=${size}`;
}

export function defaultAvatarSlots(nickname: string): AvatarSlot[] {
  const base = nickname.toLowerCase().replace(/\s+/g, "-") || "morizo";
  return [
    { style: "pixel-art", seed: `${base}-1` },
    { style: "bottts-neutral", seed: `${base}-2` },
    { style: "lorelei", seed: `${base}-3` },
  ];
}

export function ensureSlots(
  slots: AvatarSlot[] | undefined | null,
  nickname: string,
): AvatarSlot[] {
  const defaults = defaultAvatarSlots(nickname);
  if (!slots || slots.length === 0) return defaults;
  return [0, 1, 2].map((i) => slots[i] ?? defaults[i]);
}
