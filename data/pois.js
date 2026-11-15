/**
 * POI hotspots keyed by view id.
 * Add a view here without changing the player.
 *
 * Keys:
 *   Seq1_StartImage — main-gate still
 *   Sequence1 … Sequence9 — forward clip, shown on its last frame
 *   Seq1Rev … Seq9Rev — reverse clip, shown on its last frame
 *
 * x, y are fractions of the native frame. angle is degrees from the point
 * to the number badge (0 = right, -90 = above).
 */

const CDN = "https://d38jpb447hexfu.cloudfront.net";

export const POI_VIEWS = {
  Seq1_StartImage: {
    id: "Seq1_StartImage",
    type: "image",
    src: `${CDN}/image/Seq1_StartImage.png`,
    pois: [
      {
        n: 1,
        x: 0.5609,
        y: 0.844,
        angle: -90,
        title: "Commercial Complex",
        img: `${CDN}/hok-gallery/5_Podium1.png`,
        desc: "Street-level shops and cafes along the podium, with a double-height lobby behind. Sample copy — about 18,000 sq.ft of retail, open from 8am to 10pm.",
      },
      { n: 2, x: 0.7706, y: 0.7124, angle: -89, title: "Office Space", desc: "", img: "" },
    ],
  },
  Sequence1: {
    id: "Sequence1",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence1+Nyx3.mp4`,
    pois: [
      { n: 2, x: 0.6089, y: 0.8496, angle: -90, title: "Commercial Space", desc: "", img: "" },
      { n: 3, x: 0.4471, y: 0.2237, angle: -90, title: "Neela Chakra", desc: "", img: "" },
    ],
  },
  Sequence2: {
    id: "Sequence2",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence2+Nyx3.mp4`,
    pois: [
      { n: 2, x: 0.3952, y: 0.765, angle: -90, title: "Commercial Space", desc: "", img: "" },
      { n: 3, x: 0.4597, y: 0.7199, angle: -90, title: "Block 1 Entrance", desc: "", img: "" },
      { n: 4, x: 0.5251, y: 0.5865, angle: -90, title: "Block 2 Entrance", desc: "", img: "" },
      { n: 5, x: 0.5654, y: 0.6241, angle: -90, title: "Swimming Pool", desc: "", img: "" },
    ],
  },
  Sequence3: {
    id: "Sequence3",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence3+Nyx3.mp4`,
    pois: [
      { n: 3, x: 0.4247, y: 0.6673, angle: -90, title: "Block 1 Entrance", desc: "", img: "" },
      { n: 4, x: 0.543, y: 0.6335, angle: -90, title: "Block 2 Entrance", desc: "", img: "" },
      { n: 5, x: 0.5009, y: 0.6523, angle: -90, title: "Swimming Pool", desc: "", img: "" },
      { n: 6, x: 0.569, y: 0.7274, angle: -90, title: "Tennis Court", desc: "", img: "" },
    ],
  },
};

export function getPoiView(id) {
  return (id && POI_VIEWS[id]) || null;
}

/** Map a clip or still URL to a POI_VIEWS key. */
export function viewIdFromSrc(src) {
  if (!src) return null;
  let file = String(src).split("?")[0].split("/").pop() || "";
  try {
    file = decodeURIComponent(file);
  } catch {
    /* keep the raw name */
  }
  if (/Seq1_StartImage/i.test(file)) return "Seq1_StartImage";
  const forward = file.match(/Sequence(\d+)/i);
  if (forward) return `Sequence${forward[1]}`;
  const reverse = file.match(/Seq(\d+)\+Rev/i);
  if (reverse) return `Seq${reverse[1]}Rev`;
  return null;
}
