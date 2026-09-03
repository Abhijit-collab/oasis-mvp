"use client";

import { useCallback, useEffect, useState } from "react";

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function canFullscreen() {
  return Boolean(
    document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen
  );
}

export default function FullscreenButton() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(canFullscreen());
    const sync = () => setActive(Boolean(getFullscreenElement()));
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    const root = document.documentElement;
    try {
      if (getFullscreenElement()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else document.webkitExitFullscreen?.();
        return;
      }
      if (root.requestFullscreen) await root.requestFullscreen();
      else root.webkitRequestFullscreen?.();
    } catch {
      /* browser blocked fullscreen */
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={"be-fs-btn" + (active ? " on" : "")}
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? "Exit full screen" : "Enter full screen"}
      title={active ? "Exit full screen" : "Full screen"}
    >
      {active ? (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M9 4H4v5" />
          <path d="M15 4h5v5" />
          <path d="M9 20H4v-5" />
          <path d="M20 15v5h-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M9 4H4v5" />
          <path d="M15 4h5v5" />
          <path d="M4 15v5h5" />
          <path d="M20 15v5h-5" />
        </svg>
      )}
    </button>
  );
}
