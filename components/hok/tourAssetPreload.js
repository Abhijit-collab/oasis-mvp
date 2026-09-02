import { ENTRANCE_IMAGE, ORBIT_STEP_CLIPS, ORBIT_STEP_CLIPS_REVERSE } from "./assets";
import { prefetchVideo } from "@/hooks/usePreloadVideos";

/** Only preload clips that exist — reverse is optional until uploaded. */
export const ORBIT_STEP_PRELOAD_URLS = [
  ...ORBIT_STEP_CLIPS,
  ...ORBIT_STEP_CLIPS_REVERSE.filter(Boolean),
];

export const ORBIT_PRIORITY_PRELOAD_URLS = [
  ORBIT_STEP_CLIPS[0],
  ORBIT_STEP_CLIPS[1],
  ORBIT_STEP_CLIPS_REVERSE[ORBIT_STEP_CLIPS_REVERSE.length - 1],
].filter(Boolean);

let entranceImagePromise = null;
let tourPrefetchStarted = false;

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

export function preloadTourAssetsAfterLogin() {
  if (typeof window === "undefined") return;
  if (tourPrefetchStarted) return;
  tourPrefetchStarted = true;

  ORBIT_PRIORITY_PRELOAD_URLS.forEach((url) => prefetchVideo(url, { depth: "full" }));

  // HOK Sequence clips are large — full-buffer the rest so arrow clicks start instantly.
  const rest = ORBIT_STEP_PRELOAD_URLS.filter((url) => !ORBIT_PRIORITY_PRELOAD_URLS.includes(url));
  const prefetchRest = () => rest.forEach((url) => prefetchVideo(url, { depth: "full" }));

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(prefetchRest, { timeout: 2500 });
  } else {
    setTimeout(prefetchRest, 400);
  }
}
