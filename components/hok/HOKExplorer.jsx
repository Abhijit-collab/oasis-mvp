"use client";

import BuildingExplorer360 from "@/components/BuildingExplorer360";
import { HOK_TOUR_CONFIG } from "./config";

/** HOK tour — self-contained module; copy `components/hok/` for a standalone site. */
export default function HOKExplorer({ liveUnits = null, galleryImages = null }) {
  const tour =
    Array.isArray(galleryImages) && galleryImages.length > 0
      ? { ...HOK_TOUR_CONFIG, galleryImages }
      : HOK_TOUR_CONFIG;
  return <BuildingExplorer360 liveUnits={liveUnits} tour={tour} />;
}
