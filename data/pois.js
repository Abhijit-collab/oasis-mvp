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
const gallery = (file) => `${CDN}/hok-gallery/${file}`;

const PANO_VIEWER = "/360/viewer.html";
const PANO_BASE = "https://d38jpb447hexfu.cloudfront.net/360-view/";

/** A filename loads in the self-hosted viewer. A full tour URL opens as-is. */
export function panoSrc(pano) {
  if (!pano) return null;
  if (/^https?:\/\//.test(pano) && !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(pano)) return pano;
  const imgUrl = /^https?:\/\//.test(pano) ? pano : PANO_BASE + pano;
  return `${PANO_VIEWER}?v=8&img=${encodeURIComponent(imgUrl)}`;
}

/** Panoee scenes. Paste a scene id here to turn on "View 360°" for that title. */
const PANO_TOUR = "https://tour.panoee.net/6afc2622e76bc567ba2aac1f";
const POOL_SCENE_ID = "swimming-pool-deck";
const PANO_SCENES = {
  "swimming pool": `${PANO_TOUR}/${POOL_SCENE_ID}`,
  // "tennis court": `${PANO_TOUR}/TENNIS_SCENE_ID`,
  // "kids playzone": `${PANO_TOUR}/KIDS_SCENE_ID`,
  // "kids zone": `${PANO_TOUR}/KIDS_SCENE_ID`,
  // "lawn & jogging track": `${PANO_TOUR}/LAWN_SCENE_ID`,
  // "community hall": `${PANO_TOUR}/HALL_SCENE_ID`,
};

/** Same title uses the same gallery photo and description on every sequence. */
const POI_COPY = {
  "commercial complex": {
    img: gallery("5_Podium1.png"),
    desc: "Street-level shops and cafes along the podium, opening onto a double-height lobby.",
  },
  "office space": {
    img: gallery("4_BuildingMorning.png"),
    desc: "Workspaces set into the podium, with morning light across the tower above.",
  },
  "multi storeyed parking with podium": {
    img: gallery("10_Podium3.png"),
    desc: "Stacked resident parking under a landscaped podium that lifts daily life off the street.",
  },
  "grand chakra": {
    img: gallery("7_EntranceTemple.png"),
    desc: "The chakra crowns the arrival, marking the temple court at the heart of the residence.",
  },
  "cornices with chakra elements": {
    img: gallery("1_BuildingNight.png"),
    desc: "Chakra motifs run along the cornices, catching the light from the street up to the crown.",
  },
  "block 1 entrance": {
    img: gallery("7_EntranceTemple.png"),
    desc: "The Block 1 lobby, reached from the podium through a shaded arrival court.",
  },
  "block 2 entrance": {
    img: gallery("3_BuildingSide.png"),
    desc: "Block 2 opens off the podium garden, with a covered drop-off at the tower base.",
  },
  "tennis court": {
    img: gallery("12_Podium5.png"),
    desc: "An outdoor court on the podium, set beside the lawn and the evening walk.",
  },
  "kids playzone": {
    img: gallery("11_Podium4.png"),
    desc: "A soft play lawn on the podium, kept in sight of the garden paths.",
  },
  "kids zone": {
    img: gallery("11_Podium4.png"),
    desc: "A soft play lawn on the podium, kept in sight of the garden paths.",
  },
  "main entrance": {
    img: gallery("7_EntranceTemple.png"),
    desc: "The main gate leads to the temple court and on into the residential podium.",
  },
  "lawn & jogging track": {
    img: gallery("11_Podium4.png"),
    desc: "A looping jogging path around the podium lawn, open to the sky above the parking.",
  },
  "swimming pool": {
    img: gallery("8_Pool1.png"),
    desc: "A deck-level pool with a shallow edge for families and a longer lap stretch beyond.",
  },
  "community hall": {
    img: gallery("2_BuildingNight.png"),
    desc: "An indoor hall for festivals and gatherings, opening toward the podium garden.",
  },
};

function withCopy(poi) {
  const key = String(poi.title || "").trim().toLowerCase();
  const extra = POI_COPY[key];
  const pano = PANO_SCENES[key] || null;
  if (!extra && !pano) return poi;
  return { ...poi, ...(extra || {}), ...(pano ? { pano } : {}) };
}

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
      {
        n: 3,
        x: 0.2536,
        y: 0.6166,
        angle: -90,
        title: "Multi Storeyed Parking with Podium",
        desc: "",
        img: "",
      },
    ],
  },
  Sequence1: {
    id: "Sequence1",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence1+Nyx3.mp4`,
    pois: [
      { n: 2, x: 0.6057, y: 0.8534, angle: -90, title: "Office Space", desc: "", img: "" },
      { n: 4, x: 0.4471, y: 0.2218, angle: -90, title: "Grand Chakra", desc: "", img: "" },
      { n: 5, x: 0.5571, y: 0.391, angle: -90, title: "Cornices With Chakra Elements", desc: "", img: "" },
    ],
  },
  Sequence2: {
    id: "Sequence2",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence2+Nyx3.mp4`,
    pois: [
      { n: 6, x: 0.445, y: 0.7218, angle: -90, title: "Block 1 entrance", desc: "", img: "", pano: "Mono_360_2.0007_WEB.png" },
      { n: 7, x: 0.5275, y: 0.5752, angle: -90, title: "Block 2 Entrance", desc: "", img: "" },
      { n: 8, x: 0.574, y: 0.6128, angle: -90, title: "Tennis Court", desc: "", img: "" },
      { n: 9, x: 0.4926, y: 0.6166, angle: -90, title: "Kids Playzone", desc: "", img: "" },
    ],
  },
  Sequence3: {
    id: "Sequence3",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence3+Nyx3.mp4`,
    pois: [
      { n: 6, x: 0.4133, y: 0.6635, angle: -90, title: "Block 1 Entrance", desc: "", img: "", pano: "Mono_360_2.0007_WEB.png" },
      { n: 7, x: 0.555, y: 0.6391, angle: -90, title: "Block 2 Entrance", desc: "", img: "" },
      { n: 8, x: 0.5856, y: 0.7181, angle: -90, title: "Tennis Court", desc: "", img: "" },
      { n: 9, x: 0.5148, y: 0.6466, angle: -90, title: "Kids Playzone", desc: "", img: "" },
      { n: 10, x: 0.3287, y: 0.6654, angle: -90, title: "Main Entrance", desc: "", img: "" },
    ],
  },
  Sequence4: {
    id: "Sequence4",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence4+Nyx3.mp4`,
    pois: [
      { n: 10, x: 0.3911, y: 0.5451, angle: -90, title: "Main Entrance", desc: "", img: "" },
      { n: 9, x: 0.5317, y: 0.6993, angle: -90, title: "Kids Zone", desc: "", img: "" },
      { n: 8, x: 0.555, y: 0.8421, angle: -90, title: "Tennis Court", desc: "", img: "" },
      { n: 11, x: 0.7717, y: 0.6767, angle: -90, title: "Lawn & Jogging Track", desc: "", img: "" },
      { n: 12, x: 0.8648, y: 0.7594, angle: -90, title: "Swimming Pool", desc: "", img: "" },
    ],
  },
  Sequence5: {
    id: "Sequence5",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence5+Nyx3.mp4`,
    pois: [
      { n: 11, x: 0.4852, y: 0.4154, angle: -90, title: "Lawn & Jogging Track", desc: "", img: "" },
      { n: 12, x: 0.6121, y: 0.5094, angle: -90, title: "Swimming Pool", desc: "", img: "" },
      { n: 13, x: 0.7083, y: 0.5057, angle: -90, title: "Community Hall", desc: "", img: "" },
    ],
  },
  Sequence6: {
    id: "Sequence6",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence6+Nyx3.mp4`,
    pois: [
      { n: 11, x: 0.4535, y: 0.2199, angle: -90, title: "Lawn & Jogging Track", desc: "", img: "" },
      { n: 12, x: 0.3625, y: 0.2744, angle: -90, title: "Swimming Pool", desc: "", img: "" },
      { n: 13, x: 0.4048, y: 0.3496, angle: -90, title: "Community Hall", desc: "", img: "" },
    ],
  },
  Sequence7: {
    id: "Sequence7",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence7+Nyx3.mp4`,
    pois: [
      { n: 11, x: 0.5243, y: 0.265, angle: -90, title: "Lawn & Jogging Track", desc: "", img: "" },
      { n: 12, x: 0.39, y: 0.2707, angle: -90, title: "Swimming Pool", desc: "", img: "" },
      { n: 13, x: 0.2906, y: 0.3102, angle: -90, title: "Community Hall", desc: "", img: "" },
    ],
  },
};

export function getPoiView(id) {
  const view = (id && POI_VIEWS[id]) || null;
  if (!view) return null;
  return { ...view, pois: view.pois.map(withCopy) };
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
