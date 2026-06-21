import {
  ENTRANCE_IMAGE,
  ORBIT_360_URL,
  ORBIT_STEP_CLIPS,
  ORBIT_STEP_CLIPS_REVERSE,
} from "@/data/assets";
import { prefetchVideo } from "@/hooks/usePreloadVideos";

const TOUR_VIDEO_URLS = [...ORBIT_STEP_CLIPS, ...ORBIT_STEP_CLIPS_REVERSE, ORBIT_360_URL];

let entranceImagePromise = null;
let tourVideosPrefetchStarted = false;

/** Warm Main Gate still — used on login + welcome screens. */
export function preloadEntranceImage() {
  if (typeof window === "undefined") return Promise.resolve();
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

/** Background prefetch while the welcome modal is up (gate still runs after Enter). */
export function prefetchTourVideos() {
  if (typeof window === "undefined") return;
  if (tourVideosPrefetchStarted) return;
  tourVideosPrefetchStarted = true;
  TOUR_VIDEO_URLS.forEach((url) => prefetchVideo(url));
}
