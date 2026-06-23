"use client";

import { useEffect, useState } from "react";

const CLIP_TIMEOUT_MS = 30000;
/** url -> { depth: 'metadata' | 'full', promise } */
const prefetchCache = new Map();

function preloadOne(url, depth = "metadata") {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ url, ok: false });
      return;
    }

    const video = document.createElement("video");
    video.preload = depth === "full" ? "auto" : "metadata";
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener("canplaythrough", onFullReady);
      video.removeEventListener("loadeddata", onPartial);
      video.removeEventListener("loadedmetadata", onMetaReady);
      video.removeEventListener("error", onError);
      if (depth === "metadata") {
        video.removeAttribute("src");
        video.load();
      }
      resolve({ url, ok });
    };

    const onFullReady = () => settle(true);
    const onMetaReady = () => settle(true);
    const onPartial = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) settle(true);
    };
    const onError = () => settle(false);

    const timer = setTimeout(
      () =>
        settle(
          depth === "full"
            ? video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
            : video.readyState >= HTMLMediaElement.HAVE_METADATA
        ),
      CLIP_TIMEOUT_MS
    );

    if (depth === "full") {
      video.addEventListener("canplaythrough", onFullReady, { once: true });
      video.addEventListener("loadeddata", onPartial);
    } else {
      video.addEventListener("loadedmetadata", onMetaReady, { once: true });
    }
    video.addEventListener("error", onError, { once: true });

    video.src = url;
    video.load();
  });
}

/** Warm the browser cache for a clip (deduped per URL; upgrades metadata → full). */
export const prefetchVideo = (url, { depth = "metadata" } = {}) => {
  if (!url) return Promise.resolve({ url, ok: false });

  const existing = prefetchCache.get(url);
  if (existing) {
    if (depth === "full" && existing.depth === "metadata") {
      const upgraded = { depth: "full", promise: preloadOne(url, "full") };
      prefetchCache.set(url, upgraded);
      return upgraded.promise;
    }
    return existing.promise;
  }

  const entry = { depth, promise: preloadOne(url, depth) };
  prefetchCache.set(url, entry);
  return entry.promise;
};

/**
 * Preload video URLs in parallel. Reuses any in-flight work from early login prefetch.
 */
export default function usePreloadVideos(urls) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const listKey = [...new Set((urls || []).filter(Boolean))].join("\0");

  useEffect(() => {
    const list = listKey ? listKey.split("\0") : [];
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
  }, [listKey]);

  return { ready, progress, failedCount, total: urls?.length ?? 0 };
}
