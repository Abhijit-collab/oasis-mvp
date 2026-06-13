"use client";

import { useEffect, useState } from "react";

function shouldShowRotatePrompt() {
  if (typeof window === "undefined") return false;

  const mobile =
    window.matchMedia("(max-width: 900px) and (pointer: coarse)").matches ||
    (window.matchMedia("(max-width: 820px)").matches && navigator.maxTouchPoints > 0);

  const portrait = window.matchMedia("(orientation: portrait)").matches;

  return mobile && portrait;
}

export default function RotatePhonePrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(shouldShowRotatePrompt());
    update();

    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);

    const portraitMq = window.matchMedia("(orientation: portrait)");
    portraitMq.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
      portraitMq.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("rotate-prompt-open", visible);
    return () => document.body.classList.remove("rotate-prompt-open");
  }, [visible]);

  if (!visible) return null;

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
          Turn off screen rotation lock, then hold your phone horizontally to explore The Oasis.
        </p>

        <ol className="rotate-prompt-steps">
          <li>Turn off rotation lock in Control Center or Quick Settings</li>
          <li>Rotate your phone sideways</li>
        </ol>
      </div>
    </div>
  );
}
