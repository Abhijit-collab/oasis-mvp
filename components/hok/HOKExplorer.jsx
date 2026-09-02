"use client";

import BuildingExplorer360 from "@/components/BuildingExplorer360";
import { HOK_TOUR_CONFIG } from "./config";

/** HOK tour — self-contained module; copy `components/hok/` for a standalone site. */
export default function HOKExplorer({ liveUnits = null }) {
  return <BuildingExplorer360 liveUnits={liveUnits} tour={HOK_TOUR_CONFIG} />;
}
