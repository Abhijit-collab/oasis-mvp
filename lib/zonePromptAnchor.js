import { ORBIT_OVERLAY_SIZE } from "@/data/orbit360Zones";

/** Anchor a callout above the top-center of polygon point sets (1920×1080 space). */
export function anchorAbovePoints(points) {
  if (!points?.length) return null;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    leftPct: ((Math.min(...xs) + Math.max(...xs)) / 2 / ORBIT_OVERLAY_SIZE.width) * 100,
    topPct: (Math.min(...ys) / ORBIT_OVERLAY_SIZE.height) * 100,
  };
}

/** Anchor above the combined bounds of one or more zone polygons (`{ points }`). */
export function anchorAbovePolygons(polygons) {
  if (!polygons?.length) return null;
  const points = polygons.flatMap((poly) => poly.points ?? []);
  return anchorAbovePoints(points);
}
