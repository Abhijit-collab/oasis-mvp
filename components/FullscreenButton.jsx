"use client";

import { useCallback, useEffect, useState } from "react";

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as Mac
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export default function FullscreenButton() {
  const [active, setActive] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // iOS Safari/Chrome cannot fullscreen a webpage — hide the control.
    if (isIOSDevice()) {
      setHidden(true);
      return undefined;
    }

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
        setActive(false);
        return;
      }
      if (root.requestFullscreen) {
        await root.requestFullscreen();
        setActive(true);
        return;
      }
      if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
        setActive(true);
      }
    } catch {
      /* browser blocked fullscreen */
    }
  }, []);

  if (hidden) return null;

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
