import {
  ORBIT_STEP_COUNT,
  ORBIT_STEP_CLIPS,
  ORBIT_STEP_CLIPS_REVERSE,
  BRAND,
  BOOKING,
  SHOW_FILTERS,
  START_IMAGE,
} from "./assets";
import { ORBIT_STEP_PRELOAD_URLS } from "./tourAssetPreload";
import { getHOKOrbitStepZones } from "./orbitZones";

/** Tour config passed to BuildingExplorer360 — keeps HOK self-contained. */
export const HOK_TOUR_CONFIG = {
  stepCount: ORBIT_STEP_COUNT,
  stepClips: ORBIT_STEP_CLIPS,
  stepClipsReverse: ORBIT_STEP_CLIPS_REVERSE,
  preloadUrls: ORBIT_STEP_PRELOAD_URLS,
  /** Every Sequence must be buffered before the 360 opens. */
  preloadGateUrls: ORBIT_STEP_PRELOAD_URLS,
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
};
