import { ENTRANCE_IMAGE, ORBIT_STEP_CLIPS, ORBIT_STEP_CLIPS_REVERSE } from "./assets";
import { prefetchVideo } from "@/hooks/usePreloadVideos";

/** Only preload clips that exist — reverse is optional until uploaded. */
export const ORBIT_STEP_PRELOAD_URLS = [
  ...ORBIT_STEP_CLIPS,
  ...ORBIT_STEP_CLIPS_REVERSE.filter(Boolean),
];

/**
 * Gate / first wave:
 * Seq1–5 first (Seq4 was stalling arrows on Slow 4G when only 1–3 were gated).
 * Rev9 only for wrap-back — other reverses wait so forwards keep the pipe.
 */
export const ORBIT_PRIORITY_PRELOAD_URLS = [
  ORBIT_STEP_CLIPS[0],
  ORBIT_STEP_CLIPS[1],
  ORBIT_STEP_CLIPS[2],
  ORBIT_STEP_CLIPS[3],
  ORBIT_STEP_CLIPS[4],
  ORBIT_STEP_CLIPS_REVERSE[8],
].filter(Boolean);

/** After the gate: prefer leftover forward clips, then leftover reverses. */
export function orbitBackgroundPreloadUrls(priorityUrls = ORBIT_PRIORITY_PRELOAD_URLS) {
  const priority = new Set(priorityUrls.filter(Boolean));
  const forwards = ORBIT_STEP_CLIPS.filter((url) => url && !priority.has(url));
  const reverses = ORBIT_STEP_CLIPS_REVERSE.filter((url) => url && !priority.has(url));
  return [...forwards, ...reverses];
}

let entranceImagePromise = null;

function injectEntrancePreloadLink() {
  if (typeof document === "undefined") return;
  if (document.querySelector("[data-hok-entrance-preload]")) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = ENTRANCE_IMAGE;
  link.setAttribute("data-hok-entrance-preload", "");
  document.head.appendChild(link);
}

export function preloadEntranceImage() {
  if (typeof window === "undefined") return Promise.resolve();
  injectEntrancePreloadLink();
  if (!entranceImagePromise) {
    entranceImagePromise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      const done = () => resolve();
      img.onload = done;
      img.onerror = done;
      img.src = ENTRANCE_IMAGE;
    });
  }
  return entranceImagePromise;
}

export function preloadWelcomeBackgroundIdle() {
  if (typeof window === "undefined") return;
  const start = () => preloadEntranceImage();
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(start, { timeout: 600 });
  } else {
    setTimeout(start, 200);
  }
}

/**
 * Warm tour clips (Seq + Rev): priority first, then the rest.
 * Safe to call after teaser is fully buffered and/or after login (idempotent).
 */
export function preloadTourAssetsAfterLogin() {
  if (typeof window === "undefined") return;
  const g = globalThis;
  if (g.__oasisTourPrefetchStarted) return;
  g.__oasisTourPrefetchStarted = true;

  const priority = new Set(ORBIT_PRIORITY_PRELOAD_URLS);
  ORBIT_PRIORITY_PRELOAD_URLS.forEach((url) => prefetchVideo(url, { depth: "full" }));

  const rest = orbitBackgroundPreloadUrls(ORBIT_PRIORITY_PRELOAD_URLS);
  // Delay leftover clips so Seq1–5 + Rev9 claim bandwidth (longer on Slow 4G / phones).
  const warmRest = () => {
    rest.forEach((url) => prefetchVideo(url, { depth: "full" }));
  };
  const slow =
    typeof navigator !== "undefined" &&
    (() => {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return false;
      if (c.saveData) return true;
      const t = String(c.effectiveType || "").toLowerCase();
      return t === "slow-2g" || t === "2g" || t === "3g" || (typeof c.downlink === "number" && c.downlink > 0 && c.downlink <= 2.2);
    })();
  const delayMs = slow ? 8000 : 1200;
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warmRest, { timeout: Math.max(2500, delayMs) });
  } else {
    setTimeout(warmRest, delayMs);
  }
}
