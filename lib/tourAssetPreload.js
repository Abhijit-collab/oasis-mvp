import {
  ENTRANCE_IMAGE,
  ORBIT_STEP_CLIPS,
  ORBIT_STEP_CLIPS_REVERSE,
} from "@/data/assets";
import { prefetchVideo } from "@/hooks/usePreloadVideos";

/** Step clips used by /test (individual T1–T7 + reverse). Excludes stitched orbit file. */
export const ORBIT_STEP_PRELOAD_URLS = [...ORBIT_STEP_CLIPS, ...ORBIT_STEP_CLIPS_REVERSE];

/** First-stop clips — fully buffered after login for instant tour start. */
export const ORBIT_PRIORITY_PRELOAD_URLS = [
  ORBIT_STEP_CLIPS[0],
  ORBIT_STEP_CLIPS[1],
  ORBIT_STEP_CLIPS_REVERSE[ORBIT_STEP_CLIPS_REVERSE.length - 1],
];

let entranceImagePromise = null;
let tourPrefetchStarted = false;

function injectEntrancePreloadLink() {
  if (typeof document === "undefined") return;
  if (document.querySelector("[data-oasis-entrance-preload]")) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = ENTRANCE_IMAGE;
  link.setAttribute("data-oasis-entrance-preload", "");
  document.head.appendChild(link);
}

/** Warm Main Gate still — used on the welcome screen. */
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

/** Start entrance image during login idle time (welcome bg only — no videos). */
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
 * Start tour video preload after login (deduped).
 * Priority clips buffer fully; the rest warm metadata in the background.
 */
export function preloadTourAssetsAfterLogin() {
  if (typeof window === "undefined") return;
  if (tourPrefetchStarted) return;
  tourPrefetchStarted = true;

  ORBIT_PRIORITY_PRELOAD_URLS.forEach((url) => prefetchVideo(url, { depth: "full" }));

  const rest = ORBIT_STEP_PRELOAD_URLS.filter((url) => !ORBIT_PRIORITY_PRELOAD_URLS.includes(url));
  const prefetchRest = () => rest.forEach((url) => prefetchVideo(url, { depth: "metadata" }));

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(prefetchRest, { timeout: 2500 });
  } else {
    setTimeout(prefetchRest, 400);
  }
}
