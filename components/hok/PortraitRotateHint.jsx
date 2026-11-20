"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isMobileTourDevice } from "@/lib/rotateGate";

const HINT_MS = 15000;
const EXIT_MS = 560;

function stillPortrait() {
  if (typeof window === "undefined") return false;
  const portrait =
    window.matchMedia("(orientation: portrait)").matches &&
    window.innerHeight > window.innerWidth + 40;
  if (!portrait) return false;
  return isMobileTourDevice() || document.documentElement.classList.contains("be-phone");
}

/** Shown once, in portrait, after the tour has loaded and before the tutorial. */
export default function PortraitRotateHint({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const closing = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDoneRef.current();
      return;
    }
    setLeaving(true);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(close, HINT_MS);
    return () => window.clearTimeout(id);
  }, [close]);

  useEffect(() => {
    if (!leaving) return undefined;
    const id = window.setTimeout(() => onDoneRef.current(), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  useEffect(() => {
    const onTurn = () => {
      if (!stillPortrait()) close();
    };
    window.addEventListener("resize", onTurn);
    window.addEventListener("orientationchange", onTurn);
    return () => {
      window.removeEventListener("resize", onTurn);
      window.removeEventListener("orientationchange", onTurn);
    };
  }, [close]);

  return (
    <div
      className={"land-hint" + (leaving ? " land-hint--out" : "")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="land-hint-title"
    >
      <div className="land-hint-card">
        <button type="button" className="land-hint-close" onClick={close} aria-label="Close">
          ×
        </button>
        <div className="rotate-prompt-anim land-hint-anim" aria-hidden="true">
          <svg className="rotate-prompt-orbit" viewBox="0 0 120 120" fill="none">
            <path
              d="M92 28 A44 44 0 1 0 92 92"
              stroke="rgba(216,182,90,.55)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M92 22 L92 34 M86 28 L98 28"
              stroke="rgba(216,182,90,.85)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <div className="rotate-prompt-phone">
            <span className="rotate-prompt-notch" />
            <span className="rotate-prompt-screen" />
          </div>
        </div>
        <p className="land-hint-kicker">Best view</p>
        <h2 id="land-hint-title" className="land-hint-title">
          Rotate to landscape
        </h2>
        <p className="land-hint-copy">
          Turn off auto-rotate, then hold your phone sideways to see the tour at its best.
        </p>
        <ol className="land-hint-steps">
          <li>Turn off auto-rotate</li>
          <li>Rotate to landscape</li>
        </ol>
      </div>
    </div>
  );
}
