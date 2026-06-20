"use client";

import { useEffect, useRef, useState } from "react";

/** Minimum time the buffering screen stays visible (even when assets are cached). */
const MIN_PRELOAD_MS = 3000;

/**
 * Gates the tour until assets are ready AND the minimum preload animation completes.
 * Progress animates on a time curve so cached assets still show a full loading screen.
 */
export default function useTourPreloadGate(assetsReady, loadProgress) {
  const [gateOpen, setGateOpen] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const assetsReadyRef = useRef(assetsReady);
  const loadProgressRef = useRef(loadProgress);

  assetsReadyRef.current = assetsReady;
  loadProgressRef.current = loadProgress;

  useEffect(() => {
    setGateOpen(false);
    setDisplayProgress(0);

    const t0 = performance.now();
    let frame;

    const tick = () => {
      const elapsed = performance.now() - t0;
      const timePct = Math.min(100, (elapsed / MIN_PRELOAD_MS) * 100);
      const ready = assetsReadyRef.current;
      const loaded = loadProgressRef.current;

      if (elapsed >= MIN_PRELOAD_MS && ready) {
        setDisplayProgress(100);
        setGateOpen(true);
        return;
      }

      if (elapsed < MIN_PRELOAD_MS) {
        setDisplayProgress(Math.round(timePct));
      } else {
        setDisplayProgress(Math.round(Math.max(97, loaded)));
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return { gateOpen, displayProgress };
}
