import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * First-mount splash that runs for ~1.1s while React/3D assets warm up.
 * Shows once per page load (gated on session-storage).
 */
export function SplashScreen() {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem("morizo-splash-seen")) return false;
    // Allow ?nosplash=1 or headless browsers to skip the splash
    const params = new URLSearchParams(window.location.search);
    if (params.get("nosplash") === "1") return false;
    if (/HeadlessChrome|Puppeteer|Playwright/i.test(navigator.userAgent)) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => {
      sessionStorage.setItem("morizo-splash-seen", "1");
      setShow(false);
    }, 1100);
    return () => window.clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
        >
          {/* Concentric pulse rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute h-40 w-40 rounded-full border-2 border-primary"
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{
                duration: 1.5,
                delay: i * 0.25,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative flex flex-col items-center"
          >
            <div className="font-mono text-5xl md:text-6xl font-black tracking-tighter text-primary uppercase">
              MORIZO
            </div>
            <div className="mt-3 h-[3px] w-44 overflow-hidden bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-secondary to-accent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
              загружаем город
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline animated loader — for any blocking section.
 */
export function InlineLoader({ label = "Загрузка" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="relative h-10 w-10">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-1 rounded-full border-2 border-secondary border-b-transparent"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
