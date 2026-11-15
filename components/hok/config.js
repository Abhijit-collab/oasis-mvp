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
  aside: {
    title: "Live a divine life",
    lead: "Mumbai's first luxury Krishna theme residences",
    place: "Dombivli, Mumbai",
    facts: [
      { value: "G+26", label: "Floor" },
      { value: "15+", label: "Amenities" },
      { value: "2029", label: "Completion" },
      { value: "1100", label: "Curated 1 & 2 BHK flats" },
    ],
    amenities: [
      "Krishna Prayer Hall",
      "Double-height entrance lobby",
      "Jogging track",
      "Yoga & meditation deck",
      "Landscaped gardens",
      "Children's play area",
      "Indoor & outdoor sports",
      "Senior citizens' sit-out",
      "3-level parking",
      "24/7 CCTV surveillance",
    ],
  },
};
