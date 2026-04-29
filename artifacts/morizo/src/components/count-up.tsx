import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (n: number) => string;
}

const defaultFormatter = (n: number) => Math.round(n).toLocaleString("ru-RU");

export function CountUp({
  value,
  duration = 1.2,
  className,
  formatter,
}: CountUpProps) {
  const fmt = formatter ?? defaultFormatter;
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(fmt(0));

  const isInView = useRef(false);
  const firstRevealDone = useRef(false);
  const currentDisplayValue = useRef(0);
  const pendingValue = useRef(value);
  const animationRef = useRef<{ stop: () => void } | null>(null);

  const runAnimation = (from: number, to: number, dur: number) => {
    animationRef.current?.stop();
    const controls = animate(from, to, {
      duration: dur,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate(v) {
        setDisplay(fmt(v));
      },
      onComplete() {
        currentDisplayValue.current = to;
        setDisplay(fmt(to));
      },
    });
    animationRef.current = controls;
  };

  useEffect(() => {
    pendingValue.current = value;

    if (!firstRevealDone.current) {
      return;
    }

    const from = currentDisplayValue.current;
    if (from === value) return;
    runAnimation(from, value, duration * 0.6);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firstRevealDone.current) {
          isInView.current = true;
          firstRevealDone.current = true;
          runAnimation(0, pendingValue.current, duration);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
