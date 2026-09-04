"use client";

import { useEffect, useRef, useState } from "react";

/** Slow crawl 0 → 90% on all devices. Hold at 90 until assets ready, then ease to 100%. */
const RAMP_MS = 9000;
const FINISH_MS = 650;
const HOLD_CAP = 90;

function easeOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

function easeInOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * Gates the tour until assets are ready AND the progress animation has reached 90%.
 * Progress is time-smoothed (not tied to bursty network %), so desktop and mobile feel the same.
 */
export default function useTourPreloadGate(assetsReady, _loadProgress) {
  const [gateOpen, setGateOpen] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const assetsReadyRef = useRef(assetsReady);

  assetsReadyRef.current = assetsReady;

  useEffect(() => {
    setGateOpen(false);
    setDisplayProgress(0);

    const t0 = performance.now();
    let frame;
    let shown = 0;
    let finishStartedAt = null;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - t0;
      const ready = assetsReadyRef.current;

      // Time-based ease only — ignores spiky clip-count % so desktop stays smooth.
      let target = easeOutCubic(elapsed / RAMP_MS) * HOLD_CAP;
      if (elapsed >= RAMP_MS) target = HOLD_CAP;

      // Soft follow (slower lerp = smoother on fast machines / cached assets).
      shown += (target - shown) * 0.045;
      if (Math.abs(target - shown) < 0.08) shown = target;

      const atHold = shown >= HOLD_CAP - 0.05;

      if (ready && atHold) {
        if (finishStartedAt == null) finishStartedAt = now;
        const finishT = easeInOutCubic((now - finishStartedAt) / FINISH_MS);
        const fin = HOLD_CAP + (100 - HOLD_CAP) * finishT;
        setDisplayProgress(Math.min(100, Math.round(fin)));
        if (finishT >= 1) {
          setDisplayProgress(100);
          setGateOpen(true);
          return;
        }
        frame = requestAnimationFrame(tick);
        return;
      }

      setDisplayProgress(Math.min(HOLD_CAP, Math.round(shown)));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return { gateOpen, displayProgress };
}
