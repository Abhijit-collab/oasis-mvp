/** SVG overlay viewBox for post-transition still frames (1920×1080). */
export const ORBIT_OVERLAY_SIZE = { width: 1920, height: 1080 };

/**
 * Interactive zones per orbit stop (shown on hold after that transition ends).
 * Coordinates are in 1920×1080 space; SVG uses preserveAspectRatio="none" to match object-fit:fill video.
 */
export const ORBIT_STEP_ZONES = {
  /** After T2 (Block A) — block + floor picker on Block A. */
  2: {
    blocks: [
      {
        name: "Block A",
        points: [
          [125.8, 324.6],
          [814.7, 328.6],
          [850.8, 289.9],
          [931, 318],
          [1815.2, 335.3],
          [1875.5, 372.8],
          [1855.3, 660.4],
          [64.1, 633.6],
          [34.8, 364.7],
        ],
      },
    ],
    floors: [
      {
        name: "Floor 1",
        block: "Block A",
        points: [
          [40.1, 375.5],
          [1875.5, 387.5],
          [1871.4, 454.4],
          [50.9, 443.7],
        ],
      },
    ],
  },
};

/** Steps that show a block/floor overlay (extend as you add more zone sets). */
export const ORBIT_OVERLAY_STEPS = Object.keys(ORBIT_STEP_ZONES).map(Number);
