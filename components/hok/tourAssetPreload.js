import { ENTRANCE_IMAGE, ORBIT_STEP_CLIPS, ORBIT_STEP_CLIPS_REVERSE } from "./assets";
import { prefetchVideo } from "@/hooks/usePreloadVideos";

/** Only preload clips that exist — reverse is optional until uploaded. */
export const ORBIT_STEP_PRELOAD_URLS = [
  ...ORBIT_STEP_CLIPS,
  ...ORBIT_STEP_CLIPS_REVERSE.filter(Boolean),
];

/** First steps needed to enter the 360 — rest warm in background (critical on Slow 4G). */
export const ORBIT_PRIORITY_PRELOAD_URLS = [
  ORBIT_STEP_CLIPS[0],
  ORBIT_STEP_CLIPS[1],
  ORBIT_STEP_CLIPS_REVERSE.filter(Boolean).at(-1),
].filter(Boolean);

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
 * After login: priority clips first, then the rest (queued).
 * Do not call on the login teaser screen.
 */
export function preloadTourAssetsAfterLogin() {
  if (typeof window === "undefined") return;
  const g = globalThis;
  if (g.__oasisTourPrefetchStarted) return;
  g.__oasisTourPrefetchStarted = true;

  const priority = new Set(ORBIT_PRIORITY_PRELOAD_URLS);
  ORBIT_PRIORITY_PRELOAD_URLS.forEach((url) => prefetchVideo(url, { depth: "full" }));

  const rest = ORBIT_STEP_PRELOAD_URLS.filter((url) => url && !priority.has(url));
  // Slight delay so Seq1/Seq2 claim the bandwidth first on Slow 4G.
  const warmRest = () => {
    rest.forEach((url) => prefetchVideo(url, { depth: "full" }));
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warmRest, { timeout: 1800 });
  } else {
    setTimeout(warmRest, 600);
  }
}
