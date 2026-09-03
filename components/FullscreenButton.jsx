"use client";

import { useCallback, useEffect, useState } from "react";

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function getTourVideo() {
  return (
    document.querySelector(".be-stage-video.on") ||
    document.querySelector(".be-stage-video") ||
    document.querySelector("video")
  );
}

function isVideoFullscreen(video) {
  return Boolean(
    video && (video.webkitDisplayingFullscreen || document.webkitFullscreenElement === video)
  );
}

export default function FullscreenButton() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => {
      const video = getTourVideo();
      setActive(Boolean(getFullscreenElement()) || isVideoFullscreen(video) || document.documentElement.classList.contains("be-immersive"));
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    const video = getTourVideo();
    video?.addEventListener("webkitbeginfullscreen", sync);
    video?.addEventListener("webkitendfullscreen", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      video?.removeEventListener("webkitbeginfullscreen", sync);
      video?.removeEventListener("webkitendfullscreen", sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    const root = document.documentElement;
    const video = getTourVideo();

    try {
      if (getFullscreenElement() || isVideoFullscreen(video) || root.classList.contains("be-immersive")) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else document.webkitExitFullscreen?.();
        video?.webkitExitFullscreen?.();
        root.classList.remove("be-immersive");
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
        return;
      }
      if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
        setActive(true);
        return;
      }

      root.classList.add("be-immersive");
      setActive(true);
    } catch {
      const v = getTourVideo();
      if (v?.webkitEnterFullscreen) {
        try {
          v.webkitEnterFullscreen();
          setActive(true);
          return;
        } catch {
          /* ignore */
        }
      }
      root.classList.add("be-immersive");
      setActive(true);
    }
  }, []);

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
