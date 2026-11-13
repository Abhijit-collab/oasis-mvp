"use client";

import { useEffect, useState } from "react";

const CLIP_TIMEOUT_MS = 90000;
const MOBILE_CLIP_TIMEOUT_MS = 150000;
const SLOW_CLIP_TIMEOUT_MS = 180000;
/** Cap parallel full-buffer downloads so Slow/Fast 4G isn't saturated by 9 MP4s. */
const FULL_CONCURRENCY = 3;
const MOBILE_CONCURRENCY = 1;
const SLOW_CONCURRENCY = 1;
/** Flip to true once the 720p clip folders are uploaded. */
const USE_MOBILE_SET = false;
const MOBILE_FOLDERS = [
  ["/24fps-video-comp/", "/24fps-video-comp-m/"],
  ["/24fps-comp-rev/", "/24fps-comp-rev-m/"],
];
const BYTE_PROGRESS_MS = 250;
const FALLBACK_CLIP_BYTES = 2_000_000;

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

// ===== MEASURED SPEED =====
const SLOW_MBPS = 2;
const MIN_SAMPLE_BYTES = 200_000;
let lastMbps = null;

function recordSpeed(bytes, ms) {
  if (bytes < MIN_SAMPLE_BYTES || ms <= 0) return;
  lastMbps = (bytes * 8) / (ms / 1000) / 1_000_000;
  if (typeof window !== "undefined") window.dispatchEvent(new Event("oasis-speed"));
}

export const measuredMbps = () => lastMbps;

/** Slow = browser reports slow OR measured clip download speed is low. */
export function isConnectionSlow() {
  return isSlowNetwork() || (lastMbps !== null && lastMbps < SLOW_MBPS);
}

function isMobileClient() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.matchMedia("(max-width: 900px)").matches
  );
}

/** Swap in a 720p folder on phones and slow networks once those files exist. */
function variantUrl(url) {
  if (!url || !USE_MOBILE_SET || !(isMobileClient() || isSlowNetwork())) return url;
  for (const [from, to] of MOBILE_FOLDERS) {
    if (url.includes(from)) return url.replace(from, to);
  }
  return url;
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
      /** url -> HTMLVideoElement kept alive after a metadata preload */
      retained: new Map(),
      /** original desktop url -> object URL. Never revoked. */
      blobs: new Map(),
      /** original desktop url -> in-flight blob download */
      blobJobs: new Map(),
      /** original desktop url -> { loaded, total } */
      bytes: new Map(),
    };
  } else {
    const slot = g.__oasisVideoPrefetch;
    if (!slot.blobs) slot.blobs = new Map();
    if (!slot.blobJobs) slot.blobJobs = new Map();
    if (!slot.bytes) slot.bytes = new Map();
  }
  return g.__oasisVideoPrefetch;
}

/** True once the original URL has a blob URL in memory. */
export function isClipReady(url) {
  return Boolean(url) && store().blobs.has(url);
}

/** Blob URL when the clip is downloaded, otherwise the original URL. */
export function resolveClipUrl(url) {
  return store().blobs.get(url) || url;
}

/** Bytes received for the original URL. */
export function clipBytes(url) {
  return store().bytes.get(url) || { loaded: 0, total: 0 };
}

/**
 * Download a clip fully into a blob URL. Deduped per original URL.
 * Resolves { url, ok } and never throws. A failure can be retried.
 */
export function loadClipBlob(url) {
  if (!url) return Promise.resolve({ url, ok: false });
  const bucket = store();
  if (bucket.blobs.has(url)) return Promise.resolve({ url, ok: true });
  const inflight = bucket.blobJobs.get(url);
  if (inflight) return inflight;

  const job = (async () => {
    try {
      const t0 = performance.now();
      const res = await fetch(variantUrl(url), { mode: "cors" });
      if (!res.ok || !res.body) {
        const error = new Error("clip fetch failed");
        error.status = res.status || 0;
        throw error;
      }
      const totalHeader = Number(res.headers.get("Content-Length"));
      const total = Number.isFinite(totalHeader) && totalHeader > 0 ? totalHeader : 0;
      bucket.bytes.set(url, { loaded: 0, total });

      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        store().bytes.set(url, { loaded, total });
      }
      recordSpeed(loaded, performance.now() - t0);

      const objectUrl = URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
      store().blobs.set(url, objectUrl);
      return { url, ok: true };
    } catch (error) {
      store().blobJobs.delete(url);
      return { url, ok: false, status: Number(error?.status) || 0 };
    }
  })();

  bucket.blobJobs.set(url, job);
  return job;
}

function preloadOne(url, depth = "metadata") {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ url, ok: false });
      return;
    }

    if (depth === "full") {
      loadClipBlob(url).then(resolve);
      return;
    }

    const { retained } = store();
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("data-oasis-preload", "metadata");

    let settled = false;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onMetaReady);
      video.removeEventListener("error", onError);
      retained.delete(url);
      video.removeAttribute("src");
      video.load();
      video.remove();
      resolve({ url, ok });
    };

    const onMetaReady = () => settle(true);
    const onError = () => settle(false);
    const timer = setTimeout(
      () => settle(video.readyState >= HTMLMediaElement.HAVE_METADATA),
      clipTimeoutMs()
    );

    video.addEventListener("loadedmetadata", onMetaReady, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = url;
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

/**
 * Warm the browser cache for a clip (deduped per URL; upgrades metadata → full).
 * @param {{ depth?: 'metadata' | 'full', force?: boolean }} [options]
 *   force — re-warm when retained was discarded (mobile / Slow 4G look-ahead).
 */
export const prefetchVideo = (url, { depth = "metadata", force = false } = {}) => {
  if (!url) return Promise.resolve({ url, ok: false });
  const { cache, retained } = store();
  const existing = cache.get(url);

  if (existing && !(force && depth === "full" && !retained.has(url) && !isClipReady(url))) {
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

  const entry = {
    depth,
    promise:
      depth === "full" ? enqueueFull(() => preloadOne(url, "full")) : preloadOne(url, depth),
  };
  cache.set(url, entry);
  return entry.promise;
};

/**
 * True when every URL is fully downloaded into a blob URL.
 */
export function areUrlsBufferedEnough(urls) {
  const list = [...new Set((urls || []).filter(Boolean))];
  if (!list.length) return true;
  return list.every((url) => isClipReady(url));
}

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
 * Full-depth lists only become ready when every clip is a blob URL.
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
    let settled = false;
    let done = 0;
    let timer = null;

    const tickBytes = () => {
      if (cancelled || settled) return;
      let loaded = 0;
      let total = 0;
      for (const url of list) {
        const sample = clipBytes(url);
        loaded += sample.loaded;
        total += sample.total > 0 ? sample.total : FALLBACK_CLIP_BYTES;
      }
      const ratio = total > 0 ? (loaded / total) * 100 : 0;
      const allReady = list.every((url) => isClipReady(url));
      setProgress(allReady ? 100 : Math.min(99, Math.round(ratio)));
    };

    if (depth === "full") {
      tickBytes();
      timer = setInterval(tickBytes, BYTE_PROGRESS_MS);
    }

    (async () => {
      // Prefetch already queues; mapPool can await all promises without re-parallelizing downloads.
      const results = await mapPool(list, list.length, async (url) => {
        const result = await prefetchVideo(url, { depth });
        if (!cancelled && depth !== "full") {
          done += 1;
          setProgress(Math.round((done / list.length) * 100));
        }
        return result;
      });

      if (cancelled) return;
      settled = true;
      if (timer) clearInterval(timer);
      const failed = results.filter((r) => r && !r.ok && r.status >= 400).length;
      setFailedCount(failed);
      setReady(true);
      setProgress(100);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [listKey, depth]);

  return { ready, progress, failedCount, total: urls?.length ?? 0 };
}
