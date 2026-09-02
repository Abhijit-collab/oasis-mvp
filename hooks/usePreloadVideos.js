"use client";

import { useEffect, useState } from "react";

const CLIP_TIMEOUT_MS = 45000;
/** url -> { depth: 'metadata' | 'full', promise } */
const prefetchCache = new Map();
/** Keep full-preload <video> nodes alive so media data isn't discarded. */
const retainedVideos = new Map();

function ensureRetainedHost() {
  if (typeof document === "undefined") return null;
  let host = document.getElementById("oasis-video-preload-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "oasis-video-preload-host";
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    document.body.appendChild(host);
  }
  return host;
}

function bufferCoverage(video) {
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return 0;
  if (!video.buffered?.length) return 0;
  let maxEnd = 0;
  for (let i = 0; i < video.buffered.length; i += 1) {
    maxEnd = Math.max(maxEnd, video.buffered.end(i));
  }
  return Math.min(1, maxEnd / video.duration);
}

function preloadOne(url, depth = "metadata") {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ url, ok: false });
      return;
    }

    if (depth === "full" && retainedVideos.has(url)) {
      const existing = retainedVideos.get(url);
      if (existing && bufferCoverage(existing) >= 0.85) {
        resolve({ url, ok: true });
        return;
      }
    }

    const video = document.createElement("video");
    video.preload = depth === "full" ? "auto" : "metadata";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("data-oasis-preload", depth);

    let settled = false;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      video.removeEventListener("canplaythrough", onFullReady);
      video.removeEventListener("loadeddata", onPartial);
      video.removeEventListener("loadedmetadata", onMetaReady);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("error", onError);

      if (depth === "metadata") {
        video.removeAttribute("src");
        video.load();
        video.remove();
      } else if (ok) {
        const host = ensureRetainedHost();
        if (host && !retainedVideos.has(url)) {
          host.appendChild(video);
          retainedVideos.set(url, video);
        }
      } else {
        video.removeAttribute("src");
        video.load();
        video.remove();
      }

      resolve({ url, ok });
    };

    const onFullReady = () => {
      // canplaythrough can fire early on large files — require most of the file buffered.
      if (bufferCoverage(video) >= 0.85) settle(true);
    };
    const onMetaReady = () => settle(true);
    const onPartial = () => {
      if (depth === "full" && bufferCoverage(video) >= 0.85) settle(true);
      else if (depth !== "full" && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        settle(true);
      }
    };
    const onProgress = () => {
      if (depth === "full" && bufferCoverage(video) >= 0.85) settle(true);
    };
    const onError = () => settle(false);

    const poll =
      depth === "full"
        ? setInterval(() => {
            if (bufferCoverage(video) >= 0.85) settle(true);
          }, 400)
        : null;

    const timer = setTimeout(
      () =>
        settle(
          depth === "full"
            ? bufferCoverage(video) >= 0.35 || video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
            : video.readyState >= HTMLMediaElement.HAVE_METADATA
        ),
      CLIP_TIMEOUT_MS
    );

    if (depth === "full") {
      video.addEventListener("canplaythrough", onFullReady);
      video.addEventListener("loadeddata", onPartial);
      video.addEventListener("progress", onProgress);
    } else {
      video.addEventListener("loadedmetadata", onMetaReady, { once: true });
    }
    video.addEventListener("error", onError, { once: true });

    if (depth === "full") {
      const host = ensureRetainedHost();
      host?.appendChild(video);
    }

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
 * @param {string[]} urls
 * @param {{ depth?: 'metadata' | 'full' }} [options] — use `full` so clicks don't wait on download
 */
export default function usePreloadVideos(urls, { depth = "metadata" } = {}) {
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
          const result = await prefetchVideo(url, { depth });
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
  }, [listKey, depth]);

  return { ready, progress, failedCount, total: urls?.length ?? 0 };
}
