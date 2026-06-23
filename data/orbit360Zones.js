/** SVG overlay viewBox for post-transition still frames (1920×1080). */
export const ORBIT_OVERLAY_SIZE = { width: 1920, height: 1080 };

/**
 * Interactive zones per orbit stop (shown on hold after that transition ends).
 * Coordinates are in 1920×1080 space; SVG uses preserveAspectRatio="none" to match object-fit:fill video.
 */
export const ORBIT_STEP_ZONES = {
  /** T1 first frame (Main Gate) — Block A + floors + left-column flats. */
  0: {
    blocks: [
      {
        name: "Block A",
        points: [
          [705.8, 192.8],
          [727.7, 152.9],
          [1016.6, 152.9],
          [1044.3, 136],
          [1072.7, 153.6],
          [1113.2, 152.8],
          [1131.6, 185.4],
          [1138.6, 189.4],
          [1116.1, 225.2],
          [1114.8, 662.8],
          [857.1, 676.5],
          [876.7, 692.1],
          [877.8, 726.3],
          [719.2, 725.7],
          [720.4, 208.2],
        ],
      },
    ],
    floors: [
      {
        name: "Floor 1",
        block: "Block A",
        points: [
          [721.9, 600.8],
          [1114.4, 600.8],
          [1114.4, 661.5],
          [858.4, 676.5],
          [875.9, 698.4],
          [875.9, 725.8],
          [723.8, 726.1],
        ],
      },
      {
        name: "Floor 2",
        block: "Block A",
        points: [
          [721.9, 468.5],
          [1114.4, 468.5],
          [1113.6, 601.3],
          [722.9, 600.5],
        ],
      },
      {
        name: "Floor 3",
        block: "Block A",
        points: [
          [1113.6, 464.8],
          [1113.2, 468.5],
          [723.3, 469.2],
          [721.9, 335.3],
          [1113.8, 338.4],
        ],
      },
      {
        name: "Floor 4",
        block: "Block A",
        points: [
          [721.3, 195.9],
          [1112.8, 196.7],
          [1113, 337.9],
          [722.7, 336.3],
        ],
      },
    ],
    flats: [
      {
        id: "101",
        floor: "Floor 1",
        block: "Block A",
        points: [
          [721.7, 597.1],
          [1115.3, 598.2],
          [1115.3, 660.4],
          [855.7, 676.6],
          [877.4, 696.6],
          [877.4, 725.2],
          [721.7, 724.7],
        ],
      },
      {
        id: "201",
        floor: "Floor 2",
        block: "Block A",
        points: [
          [722.1, 470.4],
          [1114.8, 473.1],
          [1113.6, 596.4],
          [721.7, 594.8],
        ],
      },
      {
        id: "301",
        floor: "Floor 3",
        block: "Block A",
        points: [
          [721.2, 336.5],
          [1115.3, 339.8],
          [1113, 468.9],
          [722.1, 464.1],
        ],
      },
      {
        id: "401",
        floor: "Floor 4",
        block: "Block A",
        points: [
          [719.4, 201.3],
          [1115.3, 200.2],
          [1115.7, 337.6],
          [721.2, 334.4],
        ],
      },
    ],
  },

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

/** Resolve overlay zones for an orbit stop (step 1 = end of T1, reuses gate mapping). */
export function getOrbitStepZones(step) {
  if (ORBIT_STEP_ZONES[step]) return ORBIT_STEP_ZONES[step];
  if (step === 1 && ORBIT_STEP_ZONES[0]) return ORBIT_STEP_ZONES[0];
  return null;
}

/** Steps that show a block/floor overlay (extend as you add more zone sets). */
export const ORBIT_OVERLAY_STEPS = Object.keys(ORBIT_STEP_ZONES).map(Number);
