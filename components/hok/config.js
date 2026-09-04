import {
  ORBIT_STEP_COUNT,
  ORBIT_STEP_CLIPS,
  ORBIT_STEP_CLIPS_REVERSE,
  BRAND,
  BOOKING,
  SHOW_FILTERS,
  START_IMAGE,
  GALLERY_IMAGES,
} from "./assets";
import { ORBIT_STEP_PRELOAD_URLS, ORBIT_PRIORITY_PRELOAD_URLS, orbitBackgroundPreloadUrls } from "./tourAssetPreload";
import { getHOKOrbitStepZones } from "./orbitZones";

/** Tour config passed to BuildingExplorer360 — keeps HOK self-contained. */
export const HOK_TOUR_CONFIG = {
  stepCount: ORBIT_STEP_COUNT,
  stepClips: ORBIT_STEP_CLIPS,
  stepClipsReverse: ORBIT_STEP_CLIPS_REVERSE,
  preloadUrls: ORBIT_STEP_PRELOAD_URLS,
  /** Open after Seq1–3 + Rev9–7 — rest keep loading (forwards before remaining reverses). */
  preloadGateUrls: ORBIT_PRIORITY_PRELOAD_URLS,
  /** Ordered background warm list (optional; explorer falls back to set-diff if omitted). */
  preloadBackgroundUrls: orbitBackgroundPreloadUrls(),
  mainGateClip: ORBIT_STEP_CLIPS[0],
  getOrbitStepZones: getHOKOrbitStepZones,
  brand: BRAND,
  booking: BOOKING,
  showFilters: SHOW_FILTERS,
  startImage: START_IMAGE,
  showBrand: true,
  /** Desktop: cover (original). Phones: keep aspect, contain if the screen is far from 16:9. */
  mediaFit: "adapt",
  mediaPosition: "center top",
  preloadDepth: "full",
  preloadVariant: "feather",
  galleryImages: GALLERY_IMAGES,
};
