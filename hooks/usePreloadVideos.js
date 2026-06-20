"use client";

import { useEffect, useState } from "react";

const CLIP_TIMEOUT_MS = 30000;
const prefetchCache = new Map();

/** Wait until a clip is buffered enough to play without stalling. */
export const preloadOne = (url) =>
  new Promise((resolve) => {
    if (!url) {
      resolve({ url, ok: false });
      return;
    }

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener("canplaythrough", onReady);
      video.removeEventListener("loadeddata", onPartial);
      video.removeEventListener("error", onError);
      resolve({ url, ok });
    };

    const onReady = () => settle(true);
    const onPartial = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) settle(true);
    };
    const onError = () => settle(false);

    const timer = setTimeout(
      () => settle(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
      CLIP_TIMEOUT_MS
    );

    video.addEventListener("canplaythrough", onReady, { once: true });
    video.addEventListener("loadeddata", onPartial);
    video.addEventListener("error", onError, { once: true });

    video.src = url;
    video.load();
  });

/** Warm the browser cache for a clip (deduped per URL). */
export const prefetchVideo = (url) => {
  if (!url) return Promise.resolve({ url, ok: false });
  if (!prefetchCache.has(url)) {
    prefetchCache.set(url, preloadOne(url));
  }
  return prefetchCache.get(url);
};

/**
 * Preload video URLs in parallel. Returns ready=true once all clips resolve
 * (canplaythrough, or loadeddata before timeout).
 */
export default function usePreloadVideos(urls) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const list = [...new Set((urls || []).filter(Boolean))];
    if (!list.length) {
      setReady(true);
      setProgress(100);
      return undefined;
    }

    let cancelled = false;
    let done = 0;

    (async () => {
      const results = await Promise.all(
        list.map(async (url) => {
          const result = await prefetchVideo(url);
          if (!cancelled) {
            done += 1;
            setProgress(Math.round((done / list.length) * 100));
          }
          return result;
        })
      );

      if (cancelled) return;
      setFailedCount(results.filter((r) => !r.ok).length);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [urls]);

  return { ready, progress, failedCount, total: urls?.length ?? 0 };
}
