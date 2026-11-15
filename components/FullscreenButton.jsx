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

function visibleTourVideo() {
  const videos = [...document.querySelectorAll("video.be-stage-video")];
  return (
    videos.find((video) => video.classList.contains("on") && video.videoWidth > 0) ||
    videos.find((video) => video.videoWidth > 0) ||
    videos[0] ||
    null
  );
}

export default function FullscreenButton() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(Boolean(getFullscreenElement()));
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    const onIosEnd = () => setActive(false);
    document.addEventListener("webkitendfullscreen", onIosEnd, true);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      document.removeEventListener("webkitendfullscreen", onIosEnd, true);
    };
  }, []);

  const toggle = useCallback(async () => {
    const root = document.documentElement;
    const video = visibleTourVideo();
    try {
      if (isIOSDevice() && video && typeof video.webkitEnterFullscreen === "function") {
        if (video.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
          video.webkitExitFullscreen();
          setActive(false);
        } else {
          video.webkitEnterFullscreen();
          setActive(true);
        }
        return;
      }
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
