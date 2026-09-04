"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  isMobileTourDevice,
  isStableLandscape,
  setRotateOk,
  ROTATE_SETTLE_MS,
} from "@/lib/rotateGate";

/**
 * Shown via CSS on mobile portrait (no JS wait → no login flash).
 * Stays up until landscape is stable for a short settle period, so a slight
 * tilt cannot reveal / start the login video early.
 */
export default function RotatePhonePrompt() {
  const pathname = usePathname();
  const label = pathname?.startsWith("/HOK") ? "House of Krishna" : "The Oasis";
  const settleRef = useRef(null);

  useEffect(() => {
    const clearSettle = () => {
      if (settleRef.current != null) {
        window.clearTimeout(settleRef.current);
        settleRef.current = null;
      }
    };

    const sync = () => {
      if (!isMobileTourDevice()) {
        clearSettle();
        setRotateOk(true);
        return;
      }

      if (isStableLandscape()) {
        if (settleRef.current != null) return;
        settleRef.current = window.setTimeout(() => {
          settleRef.current = null;
          if (isStableLandscape()) setRotateOk(true);
        }, ROTATE_SETTLE_MS);
        return;
      }

      clearSettle();
      setRotateOk(false);
    };

    sync();
    window.addEventListener("orientationchange", sync);
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    const landscapeMq = window.matchMedia("(orientation: landscape)");
    landscapeMq.addEventListener?.("change", sync);

    return () => {
      clearSettle();
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      landscapeMq.removeEventListener?.("change", sync);
      document.body.classList.remove("rotate-prompt-open");
    };
  }, []);

  return (
    <div className="rotate-prompt" role="dialog" aria-modal="true" aria-labelledby="rotate-prompt-title">
      <div className="rotate-prompt-inner">
        <div className="rotate-prompt-anim" aria-hidden="true">
          <svg className="rotate-prompt-orbit" viewBox="0 0 120 120" fill="none">
            <path
              d="M92 28 A44 44 0 1 0 92 92"
              stroke="rgba(216,182,90,.55)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path d="M92 22 L92 34 M86 28 L98 28" stroke="rgba(216,182,90,.85)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="rotate-prompt-phone">
            <span className="rotate-prompt-notch" />
            <span className="rotate-prompt-screen" />
          </div>
        </div>

        <p className="rotate-prompt-eyebrow">Best viewed in landscape</p>
        <h1 id="rotate-prompt-title" className="rotate-prompt-title">
          Rotate your phone
        </h1>
        <p className="rotate-prompt-copy">
          Turn off screen rotation lock, then hold your phone horizontally to explore {label}.
        </p>

        <ol className="rotate-prompt-steps">
          <li>Turn off rotation lock in Control Center or Quick Settings</li>
          <li>Rotate your phone sideways</li>
        </ol>
      </div>
    </div>
  );
}
