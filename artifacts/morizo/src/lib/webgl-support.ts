let cached: boolean | null = null;

/**
 * Detects whether WebGL is actually usable in the current environment.
 * The preview iframe in some sandboxes blocks WebGL — we fall back to
 * a CSS scene in that case.
 */
export function isWebGLSupported(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    cached = !!ctx;
  } catch {
    cached = false;
  }
  return cached;
}
