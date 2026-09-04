/**
 * HOK media — edit this file when swapping clips or photos.
 * For a standalone HOK site: copy this entire `components/hok/` folder.
 */

const CDN_BASE =
  process.env.NEXT_PUBLIC_HOK_CDN_URL?.replace(/\/$/, "") ||
  "https://d3deuzgnmq8y32.cloudfront.net";

const cdnUrl = (key) => `${CDN_BASE}/${String(key).replace(/^\//, "")}`;

const TV = "video-24fps";
const IMG = "image";

/** Static images on HOK CDN */
export const CDN_IMAGES = {
  /** Sharp still = Sequence1 first frame (better than video hold) */
  mainGate: cdnUrl(`${IMG}/Seq1_StartImage.png`),
  elevation: cdnUrl(`${IMG}/Seq1_StartImage.png`),
};

export const ENTRANCE_IMAGE = CDN_IMAGES.mainGate;
export const ELEVATION_IMAGE = CDN_IMAGES.elevation;
/** Shown on Main Gate hold instead of the softer video first frame */
export const START_IMAGE = CDN_IMAGES.mainGate;
/** Login page full-bleed background loop */
export const LOGIN_BG_VIDEO = cdnUrl("teaser/Websiteteaser.mp4");

/** 9 forward clips (Sequence1 → Sequence9) */
export const ORBIT_STEP_CLIPS = [
  cdnUrl(`${TV}/Sequence1_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence2_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence3_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence4_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence5_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence6_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence7_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence8_nyx3.mp4`),
  cdnUrl(`${TV}/Sequence9_nyx3.mp4`),
];

/**
 * Reverse clips for ← / back drag.
 * Leave empty until *-rev.mp4 files are uploaded (back nav stays disabled).
 */
export const ORBIT_STEP_CLIPS_REVERSE = [];

export const ORBIT_STEP_COUNT = ORBIT_STEP_CLIPS.length;

export const BRAND = {
  prefix: "House of",
  name: "Krishna",
  badge: "Premium Experience",
  /** Full name for copy / booking / welcome */
  fullName: "House of Krishna",
  /** Top-left wordmark on login / 360 / welcome */
  logoUrl: "https://d3deuzgnmq8y32.cloudfront.net/hok-logo/House+of+Krishna+Logo.png",
  /** Login screen */
  loginEyebrow: "",
  loginTitle: "House of",
  loginAccent: "Krishna",
  welcomeProduct: "House of Krishna",
};

export const BOOKING = {
  returnTo: "/HOK",
  path: "/HOK/booking",
};

/** Hide side filter / unit panel on HOK for now */
export const SHOW_FILTERS = false;
