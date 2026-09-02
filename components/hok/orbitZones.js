/** SVG overlay viewBox for post-transition still frames (1920×1080). */
export const ORBIT_OVERLAY_SIZE = { width: 1920, height: 1080 };

/**
 * Interactive zones per HOK orbit stop.
 * Add step keys (0–8) when you map block/floor/unit polygons to each hold frame.
 */
export const ORBIT_STEP_ZONES = {};

export function getHOKOrbitStepZones(step) {
  return ORBIT_STEP_ZONES[step] ?? null;
}
