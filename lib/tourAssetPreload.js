import {
  ENTRANCE_IMAGE,
  ORBIT_STEP_CLIPS,
  ORBIT_STEP_CLIPS_REVERSE,
} from "@/data/assets";
import { prefetchVideo } from "@/hooks/usePreloadVideos";

/** Step clips used by /test (individual T1–T7 + reverse). Excludes stitched orbit file. */
export const ORBIT_STEP_PRELOAD_URLS = [...ORBIT_STEP_CLIPS, ...ORBIT_STEP_CLIPS_REVERSE];

/** @deprecated Prefer full ORBIT_STEP_PRELOAD_URLS for the gate. */
export const ORBIT_PRIORITY_PRELOAD_URLS = ORBIT_STEP_PRELOAD_URLS;

let entranceImagePromise = null;

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
 * After login: full-buffer every tour clip (deduped).
 * Do not call on the login teaser screen.
 */
export function preloadTourAssetsAfterLogin() {
  if (typeof window === "undefined") return;
  const g = globalThis;
  if (g.__oasisTourPrefetchStarted) return;
  g.__oasisTourPrefetchStarted = true;

  ORBIT_STEP_PRELOAD_URLS.filter(Boolean).forEach((url) =>
    prefetchVideo(url, { depth: "full" })
  );
}
