import { motion } from "framer-motion";

/**
 * Animated full-screen background:
 * three slowly drifting blurred gradient blobs + a faint grid + noise.
 * Uses theme tokens so it adapts to neon / sunset / mono.
 */
export function AnimatedBackground({
  intensity = "normal",
}: {
  intensity?: "subtle" | "normal" | "strong";
}) {
  const opacity =
    intensity === "subtle" ? 0.18 : intensity === "strong" ? 0.55 : 0.32;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ contain: "strict" }}
    >
      {/* Soft grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Blob 1 — primary */}
      <motion.div
        className="absolute -top-40 -left-40 h-[55vmax] w-[55vmax] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 60%)",
          opacity,
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, 40, -30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Blob 2 — secondary */}
      <motion.div
        className="absolute -bottom-40 -right-40 h-[55vmax] w-[55vmax] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--secondary) / 0.45), transparent 60%)",
          opacity,
        }}
        animate={{
          x: [0, -50, 40, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.05, 1.1, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Blob 3 — accent */}
      <motion.div
        className="absolute top-1/3 left-1/2 h-[40vmax] w-[40vmax] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--accent) / 0.35), transparent 60%)",
          opacity: opacity * 0.85,
        }}
        animate={{
          x: ["-50%", "-30%", "-60%", "-50%"],
          y: [0, -30, 30, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.7'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
