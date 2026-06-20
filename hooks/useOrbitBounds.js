"use client";

import { useEffect, useState } from "react";
import { TRANSITION_VIDEOS, buildOrbitBounds, ORBIT_STEP_COUNT } from "@/data/assets";

const CLIP_URLS = [
  TRANSITION_VIDEOS.entrance,
  TRANSITION_VIDEOS.blockAIn,
  TRANSITION_VIDEOS.blockBIn,
  TRANSITION_VIDEOS.blockCIn,
  TRANSITION_VIDEOS.blockCOut,
  TRANSITION_VIDEOS.blockBOut,
  TRANSITION_VIDEOS.blockAOut,
];

const loadClipDuration = (url) =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("error", onErr);
      video.src = "";
    };
    const onMeta = () => {
      const d = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve(d);
    };
    const onErr = () => {
      cleanup();
      resolve(0);
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("error", onErr);
    video.src = url;
  });

/** Real segment boundaries from each T1–T7 clip duration (not equal 1/7 splits). */
export function useOrbitBounds() {
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const durations = await Promise.all(CLIP_URLS.map(loadClipDuration));
      if (cancelled) return;
      if (durations.every((d) => d > 0)) {
        setBounds(buildOrbitBounds(durations));
      } else {
        const equal = Array.from({ length: ORBIT_STEP_COUNT + 1 }, (_, i) => i / ORBIT_STEP_COUNT);
        setBounds(equal);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stepFraction = (step) => {
    if (!bounds) return 0;
    const i = Math.min(Math.max(step, 0), ORBIT_STEP_COUNT);
    return bounds[i];
  };

  return { bounds, ready: bounds !== null, stepFraction };
}
