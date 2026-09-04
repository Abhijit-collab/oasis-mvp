import { ENTRANCE_IMAGE, ORBIT_STEP_CLIPS, ORBIT_STEP_CLIPS_REVERSE } from "./assets";
import { prefetchVideo } from "@/hooks/usePreloadVideos";

/** Only preload clips that exist — reverse is optional until uploaded. */
export const ORBIT_STEP_PRELOAD_URLS = [
  ...ORBIT_STEP_CLIPS,
  ...ORBIT_STEP_CLIPS_REVERSE.filter(Boolean),
];

/**
 * Gate / first wave (phones + Slow 4G):
 * - Seq1–3: enough forward runway so opening after Seq2 doesn’t stall
 * - Rev9–7: wrap / late-orbit back nav
 * Remaining forwards then remaining reverses warm in background.
 */
export const ORBIT_PRIORITY_PRELOAD_URLS = [
  ORBIT_STEP_CLIPS[0],
  ORBIT_STEP_CLIPS[1],
  ORBIT_STEP_CLIPS[2],
  ORBIT_STEP_CLIPS_REVERSE[8],
  ORBIT_STEP_CLIPS_REVERSE[7],
  ORBIT_STEP_CLIPS_REVERSE[6],
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
  // Slight delay so Seq1–3 + Rev9–7 claim the bandwidth first on Slow 4G.
  const warmRest = () => {
    rest.forEach((url) => prefetchVideo(url, { depth: "full" }));
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warmRest, { timeout: 1800 });
  } else {
    setTimeout(warmRest, 600);
  }
}
