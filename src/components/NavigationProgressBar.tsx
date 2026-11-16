import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const SAFETY_TIMEOUT_MS = 10000;

/** Thin top progress bar driven by TanStack Router loading state. Never blocks rendering. */
export function NavigationProgressBar() {
  const isLoading = useRouterState({ select: (s) => s.isLoading || s.status === "pending" });
  const hasError = useRouterState({
    select: (s) => s.matches.some((m) => m.status === "error" || m.status === "notFound"),
  });
  const targetHref = useRouterState({ select: (s) => s.location.href });
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const clearAll = () => {
    if (trickle.current) window.clearInterval(trickle.current);
    trickle.current = null;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  // Immediately hide and reset without completing to 100%.
  const abort = () => {
    clearAll();
    setVisible(false);
    later(() => setProgress(0), 250);
  };

  useEffect(() => {
    if (isLoading && !hasError) {
      clearAll();
      setVisible(true);
      setProgress((p) => (p > 0 && p < 100 ? p : 20));
      trickle.current = window.setInterval(() => {
        setProgress((p) => (p >= 85 ? p : p + (85 - p) * 0.1));
      }, 200);
      // Safety net: never leave the bar hanging between 20–85%.
      later(abort, SAFETY_TIMEOUT_MS);
    } else if (hasError) {
      abort();
    } else {
      clearAll();
      setProgress((p) => {
        if (p === 0) return 0;
        later(() => {
          setVisible(false);
          later(() => setProgress(0), 250);
        }, 200);
        return 100;
      });
    }
    // targetHref: a replaced/cancelled navigation restarts cleanly from current state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasError, targetHref]);

  useEffect(() => clearAll, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease" }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 200ms ease-out",
        }}
      />
    </div>
  );
}
