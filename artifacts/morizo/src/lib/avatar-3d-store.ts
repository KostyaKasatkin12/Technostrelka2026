import { DEFAULT_AVATAR3D, type Avatar3DConfig } from "@/components/avatar-3d";

const KEY = "morizo-avatar3d";

export function loadAvatar3D(userId: number | string): Avatar3DConfig {
  if (typeof window === "undefined") return DEFAULT_AVATAR3D;
  try {
    const raw = localStorage.getItem(`${KEY}:${userId}`);
    if (!raw) return DEFAULT_AVATAR3D;
    const parsed = JSON.parse(raw) as Partial<Avatar3DConfig>;
    return { ...DEFAULT_AVATAR3D, ...parsed };
  } catch {
    return DEFAULT_AVATAR3D;
  }
}

export function saveAvatar3D(
  userId: number | string,
  cfg: Avatar3DConfig,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEY}:${userId}`, JSON.stringify(cfg));
  } catch {
    /* ignore quota */
  }
}
