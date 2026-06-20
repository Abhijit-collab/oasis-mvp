import { cdnUrl } from "@/lib/cdn";

/** CloudFront prefixes (S3: oasis-metro bucket). */
const TV = "Transition+videos";
const REV = "Reverse-Transition+";

/** Static images on CloudFront */
export const CDN_IMAGES = {
  mainGate: cdnUrl("360-images/Main_Gate.png"),
  elevation: cdnUrl("360-images/oasis-elevation.jpg"),
};

/**
 * Forward transition clips T1–T7 on CloudFront.
 * e.g. https://d3oolleolpstzj.cloudfront.net/Transition+videos/AdoptXRWeb_Transistion1.mp4
 */
export const TRANSITION_VIDEOS = {
  entrance: cdnUrl(`${TV}/AdoptXRWeb_Transistion1.mp4`),
  blockAIn: cdnUrl(`${TV}/AdoptXRWeb_Transistion2.mp4`),
  blockBIn: cdnUrl(`${TV}/AdoptXRWeb_Transistion3.mp4`),
  blockCIn: cdnUrl(`${TV}/AdoptXRWeb_Transistion4.mp4`),
  blockCOut: cdnUrl(`${TV}/AdoptXRWeb_Transistion5.mp4`),
  blockBOut: cdnUrl(`${TV}/AdoptXRWeb_Transistion6.mp4`),
  blockAOut: cdnUrl(`${TV}/AdoptXRWeb_Transistion7.mp4`),
};

/**
 * Reversed T1–T7 on CloudFront. Play forward for smooth back nav.
 * e.g. https://d3oolleolpstzj.cloudfront.net/Reverse-Transition+/AdoptXRWeb_Transistion1-rev.mp4
 */
export const TRANSITION_VIDEOS_REVERSE = {
  entrance: cdnUrl(`${REV}/AdoptXRWeb_Transistion1-rev.mp4`),
  blockAIn: cdnUrl(`${REV}/AdoptXRWeb_Transistion2-rev.mp4`),
  blockBIn: cdnUrl(`${REV}/AdoptXRWeb_Transistion3-rev.mp4`),
  blockCIn: cdnUrl(`${REV}/AdoptXRWeb_Transistion4-rev.mp4`),
  blockCOut: cdnUrl(`${REV}/AdoptXRWeb_Transistion5-rev.mp4`),
  blockBOut: cdnUrl(`${REV}/AdoptXRWeb_Transistion6-rev.mp4`),
  blockAOut: cdnUrl(`${REV}/AdoptXRWeb_Transistion7-rev.mp4`),
};

export const ENTRANCE_IMAGE = CDN_IMAGES.mainGate;
export const ELEVATION_IMAGE = CDN_IMAGES.elevation;

/**
 * Stitched 360 orbit (T1→T7) on CloudFront.
 * Override with NEXT_PUBLIC_OASIS_360_URL only for local dev (e.g. /oasis-360.mp4).
 */
export const ORBIT_360_URL =
  process.env.NEXT_PUBLIC_OASIS_360_URL || cdnUrl(`${TV}/oasis-360.mp4`);

/** @deprecated use ORBIT_360_URL */
export const VIDEO_360_URL = ORBIT_360_URL;

/**
 * Timeline waypoints in the stitched orbit (7 equal segments).
 * Gate=0, Block A after T2, Block B after T3, Block C after T4.
 */
export const ORBIT_WAYPOINTS = {
  gate: 0,
  blockA: 2 / 7,
  blockB: 3 / 7,
  blockC: 4 / 7,
};

export const ORBIT_BLOCK_WAYPOINTS = {
  Gate: ORBIT_WAYPOINTS.gate,
  "Block A": ORBIT_WAYPOINTS.blockA,
  "Block B": ORBIT_WAYPOINTS.blockB,
  "Block C": ORBIT_WAYPOINTS.blockC,
};

/** Stitched orbit split into 7 transition segments → 8 stops (0 = gate, 7 = gate again). */
export const ORBIT_STEP_COUNT = 7;

/** Cumulative stop times [0 … 1] from each clip's duration in the stitched file. */
export const buildOrbitBounds = (durations) => {
  const total = durations.reduce((sum, d) => sum + d, 0);
  if (total <= 0) {
    return Array.from({ length: ORBIT_STEP_COUNT + 1 }, (_, i) => i / ORBIT_STEP_COUNT);
  }
  const bounds = [0];
  let acc = 0;
  for (const d of durations) {
    acc += d;
    bounds.push(acc / total);
  }
  bounds[bounds.length - 1] = 1;
  return bounds;
};

/** @deprecated use useOrbitBounds hook for accurate clip boundaries */
export const orbitStepFraction = (step) =>
  Math.min(Math.max(step, 0), ORBIT_STEP_COUNT) / ORBIT_STEP_COUNT;

export const ORBIT_STOP_LABELS = [
  "Main Gate (start)",
  "Approach",
  "Block A",
  "Block B",
  "Block C",
  "Leaving",
  "Return",
  "Main Gate (full orbit)",
];

/** Individual clips played per arrow step (T1→T7). Stops cleanly at each onEnded. */
export const ORBIT_STEP_CLIPS = [
  TRANSITION_VIDEOS.entrance,
  TRANSITION_VIDEOS.blockAIn,
  TRANSITION_VIDEOS.blockBIn,
  TRANSITION_VIDEOS.blockCIn,
  TRANSITION_VIDEOS.blockCOut,
  TRANSITION_VIDEOS.blockBOut,
  TRANSITION_VIDEOS.blockAOut,
];

/** Reversed clips — play forward on ← for smooth rewind. */
export const ORBIT_STEP_CLIPS_REVERSE = [
  TRANSITION_VIDEOS_REVERSE.entrance,
  TRANSITION_VIDEOS_REVERSE.blockAIn,
  TRANSITION_VIDEOS_REVERSE.blockBIn,
  TRANSITION_VIDEOS_REVERSE.blockCIn,
  TRANSITION_VIDEOS_REVERSE.blockCOut,
  TRANSITION_VIDEOS_REVERSE.blockBOut,
  TRANSITION_VIDEOS_REVERSE.blockAOut,
];
