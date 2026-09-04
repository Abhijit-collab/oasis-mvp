"use client";

import { useEffect, useState } from "react";

const CLIP_TIMEOUT_MS = 90000;
const MOBILE_CLIP_TIMEOUT_MS = 150000;
const SLOW_CLIP_TIMEOUT_MS = 180000;
/** Cap parallel full-buffer downloads so Slow/Fast 4G isn't saturated by 9 MP4s. */
const FULL_CONCURRENCY = 3;
const MOBILE_CONCURRENCY = 2;
const SLOW_CONCURRENCY = 1;

function connectionInfo() {
  if (typeof navigator === "undefined") return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

/** Slow 4G / 3G / save-data — open earlier, download fewer clips at once. */
export function isSlowNetwork() {
  const c = connectionInfo();
  if (!c) return false;
  if (c.saveData) return true;
  const type = String(c.effectiveType || "").toLowerCase();
  if (type === "slow-2g" || type === "2g" || type === "3g") return true;
  // Chrome "Slow 4G" ~1.6 Mbps; treat weak 4G the same.
  if (typeof c.downlink === "number" && c.downlink > 0 && c.downlink <= 2.2) return true;
  if (typeof c.rtt === "number" && c.rtt >= 300) return true;
  return false;
}

function isMobileClient() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.matchMedia("(max-width: 900px)").matches
  );
}

function bufferReadyThreshold() {
  // Slow 4G: unlock with a smaller head of each gated clip.
  if (isSlowNetwork()) return 0.35;
  return 0.55;
}

function clipTimeoutMs() {
  if (isSlowNetwork()) return SLOW_CLIP_TIMEOUT_MS;
  return isMobileClient() ? MOBILE_CLIP_TIMEOUT_MS : CLIP_TIMEOUT_MS;
}

/** Survive duplicate module instances (dev / split chunks) so clips aren't fetched twice. */
function store() {
  const g = globalThis;
  if (!g.__oasisVideoPrefetch) {
    g.__oasisVideoPrefetch = {
      /** url -> { depth: 'metadata' | 'full', promise } */
      cache: new Map(),
      /** url -> HTMLVideoElement kept alive after full preload */
      retained: new Map(),
    };
  }
  return g.__oasisVideoPrefetch;
}

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

/** Timeout: accept a playable head of the clip so slower networks still unlock. */
function timeoutLooksPlayable(video, need, depth) {
  if (depth !== "full") return video.readyState >= HTMLMediaElement.HAVE_METADATA;
  const cover = bufferCoverage(video);
  if (cover >= need) return true;
  if (cover >= Math.min(0.4, need)) return true;
  if (isSlowNetwork() && cover >= 0.2) return true;
  if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) return true;
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && cover >= 0.12) return true;
  return false;
}

/** Watch an existing <video> until it hits the buffer threshold (no second download). */
function waitForBuffer(video, url, need) {
  return new Promise((resolve) => {
    if (!video) {
      resolve({ url, ok: false });
      return;
    }
    if (bufferCoverage(video) >= need) {
      resolve({ url, ok: true });
      return;
    }

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      video.removeEventListener("progress", onProg);
      video.removeEventListener("loadeddata", onProg);
      video.removeEventListener("canplaythrough", onProg);
      video.removeEventListener("error", onErr);
      resolve({ url, ok });
    };

    const onProg = () => {
      if (bufferCoverage(video) >= need) finish(true);
    };
    const onErr = () => finish(false);

    const poll = setInterval(onProg, 400);
    const timer = setTimeout(() => finish(timeoutLooksPlayable(video, need, "full")), clipTimeoutMs());

    video.addEventListener("progress", onProg);
    video.addEventListener("loadeddata", onProg);
    video.addEventListener("canplaythrough", onProg);
    video.addEventListener("error", onErr, { once: true });
  });
}

function preloadOne(url, depth = "metadata") {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ url, ok: false });
      return;
    }

    const { retained } = store();
    const need = bufferReadyThreshold();

    // Reuse in-flight / retained element — never open a second network load for the same URL.
    if (depth === "full" && retained.has(url)) {
      waitForBuffer(retained.get(url), url, need).then(resolve);
      return;
    }

    const video = document.createElement("video");
    video.preload = depth === "full" ? "auto" : "metadata";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
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
        retained.delete(url);
        video.removeAttribute("src");
        video.load();
        video.remove();
      } else if (ok) {
        if (isMobileClient()) {
          // Phones: HTTP cache is warm; free decoder slots for OrbitClipStage.
          retained.delete(url);
          try {
            video.pause();
          } catch {
            /* ignore */
          }
          video.removeAttribute("src");
          video.load();
          video.remove();
        } else {
          const host = ensureRetainedHost();
          if (host && video.parentNode !== host) host.appendChild(video);
          retained.set(url, video);
        }
      } else {
        retained.delete(url);
        video.removeAttribute("src");
        video.load();
        video.remove();
      }

      resolve({ url, ok });
    };

    const onFullReady = () => {
      if (bufferCoverage(video) >= need) settle(true);
    };
    const onMetaReady = () => settle(true);
    const onPartial = () => {
      if (depth === "full" && bufferCoverage(video) >= need) settle(true);
      else if (depth !== "full" && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        settle(true);
      }
    };
    const onProgress = () => {
      if (depth === "full" && bufferCoverage(video) >= need) settle(true);
    };
    const onError = () => settle(false);

    const poll =
      depth === "full"
        ? setInterval(() => {
            if (bufferCoverage(video) >= need) settle(true);
          }, 400)
        : null;

    const timer = setTimeout(
      () => settle(timeoutLooksPlayable(video, need, depth)),
      clipTimeoutMs()
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
      // Claim immediately so a parallel prefetch (login + 360 gate) cannot spawn a twin.
      retained.set(url, video);
    }

    // Setting src starts the fetch — do NOT also call load() (duplicates every clip).
    video.src = url;

  // Kick buffering on desktop too (helps under throttled networks).
    if (depth === "full") {
      const kick = video.play();
      if (kick?.then) {
        kick
          .then(() => {
            try {
              video.pause();
              if (video.currentTime > 0) video.currentTime = 0;
            } catch {
              /* ignore */
            }
          })
          .catch(() => {
            /* autoplay blocked — progress/timeout still apply */
          });
      }
    }
  });
}

/** Run async work with a concurrency cap (phones choke on many parallel MP4s). */
async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  const run = async () => {
    while (next < items.length) {
      const idx = next;
      next += 1;
      results[idx] = await worker(items[idx], idx);
    }
  };

  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => run()));
  return results;
}

/** Shared full-buffer queue so login + gate don't start every MP4 at once. */
const fullWaiters = [];
let fullActive = 0;

function fullConcurrency() {
  if (isSlowNetwork()) return SLOW_CONCURRENCY;
  return isMobileClient() ? MOBILE_CONCURRENCY : FULL_CONCURRENCY;
}

function enqueueFull(start) {
  return new Promise((resolve) => {
    fullWaiters.push({ start, resolve });
    pumpFull();
  });
}

function pumpFull() {
  const limit = fullConcurrency();
  while (fullActive < limit && fullWaiters.length) {
    const { start, resolve } = fullWaiters.shift();
    fullActive += 1;
    Promise.resolve()
      .then(start)
      .then((result) => {
        fullActive -= 1;
        resolve(result);
        pumpFull();
      })
      .catch(() => {
        fullActive -= 1;
        resolve({ url: null, ok: false });
        pumpFull();
      });
  }
}

/** Warm the browser cache for a clip (deduped per URL; upgrades metadata → full). */
export const prefetchVideo = (url, { depth = "metadata" } = {}) => {
  if (!url) return Promise.resolve({ url, ok: false });

  const { cache } = store();
  const existing = cache.get(url);
  if (existing) {
    if (depth === "full" && existing.depth === "metadata") {
      const upgraded = {
        depth: "full",
        promise: enqueueFull(() => preloadOne(url, "full")),
      };
      cache.set(url, upgraded);
      return upgraded.promise;
    }
    return existing.promise;
  }

  const promise =
    depth === "full" ? enqueueFull(() => preloadOne(url, "full")) : preloadOne(url, depth);
  const entry = { depth, promise };
  cache.set(url, entry);
  return entry.promise;
};

/** Free hidden preload <video>s so the tour stage can decode/play on iOS. */
export function releaseRetainedPreloadVideos() {
  if (typeof document === "undefined") return;
  const { retained } = store();
  for (const video of retained.values()) {
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    } catch {
      /* ignore */
    }
  }
  retained.clear();
  const host = document.getElementById("oasis-video-preload-host");
  host?.replaceChildren();
}

/**
 * Preload video URLs. Reuses post-login prefetch work.
 * Full-depth lists only become ready when every clip hits the buffer threshold.
 * @param {string[]} urls
 * @param {{ depth?: 'metadata' | 'full' }} [options]
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
      setFailedCount(0);
      return undefined;
    }

    let cancelled = false;
    let done = 0;

    (async () => {
      // Prefetch already queues; mapPool can await all promises without re-parallelizing downloads.
      const results = await mapPool(list, list.length, async (url) => {
        const result = await prefetchVideo(url, { depth });
        if (!cancelled) {
          done += 1;
          setProgress(Math.round((done / list.length) * 100));
        }
        return result;
      });

      if (cancelled) return;
      const failed = results.filter((r) => !r.ok).length;
      setFailedCount(failed);
      setReady(true);
      if (failed === 0) setProgress(100);
    })();

    return () => {
      cancelled = true;
    };
  }, [listKey, depth]);

  return { ready, progress, failedCount, total: urls?.length ?? 0 };
}
