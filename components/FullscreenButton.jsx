"use client";

import { useCallback, useEffect, useState } from "react";

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function pageCanFullscreen() {
  if (typeof document === "undefined" || isIOSDevice()) return false;
  const root = document.documentElement;
  return (
    typeof root.requestFullscreen === "function" ||
    typeof root.webkitRequestFullscreen === "function"
  );
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export default function FullscreenButton() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("be-fs-unsupported", !pageCanFullscreen());
    const sync = () => setActive(Boolean(getFullscreenElement()));
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      root.classList.remove("be-fs-unsupported");
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!pageCanFullscreen()) return;
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

  return (
    <button
      type="button"
      className={"be-fs-btn" + (active ? " on" : "")}
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? "Exit full screen" : "Enter full screen"}
      data-hover={active ? "Exit full screen" : "Full screen"}
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
