import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Star } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { Confetti } from "@/components/confetti";

interface CheckpointSuccessProps {
  visible: boolean;
  checkpointName: string;
  pointsEarned: number;
  onDismiss: () => void;
}

export function CheckpointSuccess({
  visible,
  checkpointName,
  pointsEarned,
  onDismiss,
}: CheckpointSuccessProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 2800);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  return (
    <>
      <Confetti active={visible} />
      <AnimatePresence>
        {visible && (
          <motion.div
            key="cp-success"
            initial={{ opacity: 0, scale: 0.7, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 22,
            }}
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-card border-4 border-primary shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4 pointer-events-auto">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 18,
                  delay: 0.08,
                }}
              >
                <CheckCircle2 className="h-16 w-16 text-primary" />
              </motion.div>

              <div className="text-center space-y-1">
                <p className="text-xs font-mono uppercase text-muted-foreground tracking-widest">
                  Точка взята!
                </p>
                <p className="font-black uppercase text-lg leading-tight">
                  {checkpointName}
                </p>
              </div>

              {pointsEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.35 }}
                  className="flex items-center gap-2 bg-primary/10 border border-primary px-5 py-2"
                >
                  <Star className="h-4 w-4 text-primary fill-primary" />
                  <span className="font-black font-mono text-2xl text-primary">
                    +<CountUp value={pointsEarned} duration={0.9} />
                  </span>
                </motion.div>
              )}

              <button
                onClick={onDismiss}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                нажми, чтобы закрыть
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
