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
  return `${PANO_VIEWER}?v=10&img=${encodeURIComponent(imgUrl)}`;
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
  const scene = PANO_SCENES[key] || null;
  if (!extra && !scene) return poi;
  return {
    ...poi,
    ...(extra || {}),
    ...(poi.desc ? { desc: poi.desc } : {}),
    ...(poi.img ? { img: poi.img } : {}),
    ...(scene ? { pano: scene } : {}),
    ...(poi.pano ? { pano: poi.pano } : {}),
  };
}

export const POI_VIEWS = {
  Seq1_StartImage: {
    id: "Seq1_StartImage",
    type: "image",
    src: `${CDN}/image/Seq1_StartImage.png`,
    pois: [
      { n: 1, x: 0.5394, y: 0.8402, angle: -90, title: "Shopping Complex", desc: "A curved row of street-level shops and cafes, with a covered walk along the podium and the tower rising above the glass front.", img: "", pano: "POI_1.png" },
      { n: 2, x: 0.7599, y: 0.7049, angle: -90, title: "High End Office Complex", desc: "Glass-fronted offices beside the arrival gate, with a shaded drop-off and the residential tower set just behind the podium.", img: "", pano: "POI_2.png" },
      { n: 3, x: 0.2401, y: 0.6147, angle: -90, title: "Multi Storey Parking with Podium", desc: "Stacked parking tucked under a landscaped podium, with the tower and shops rising above the street.", img: "", pano: "POI_3.png" },
      { n: 4, x: 0.3584, y: 0.8477, angle: -90, title: "Entry Gate 1", desc: "The first arrival gate, with a shaded porch off the street and the tower rising just behind the shops.", img: "", pano: "POI_3.png" },
      { n: 5, x: 0.724, y: 0.8477, angle: -90, title: "Entry Gate 2", desc: "The second arrival gate, with a glass pavilion beside the porch and the tower set along the street.", img: "", pano: "POI_2.png" },
    ],
  },
  Sequence1: {
    id: "Sequence1",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence1+Nyx3.mp4`,
    pois: [
      { n: 7, x: 0.5502, y: 0.3966, angle: -90, title: "Other Terrace Elements", desc: "", img: "" },
      { n: 8, x: 0.4552, y: 0.2256, angle: -90, title: "Neelachakra Headroom", desc: "", img: "" },
    ],
  },
  Sequence2: {
    id: "Sequence2",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence2+Nyx3.mp4`,
    pois: [
      { n: 9, x: 0.5367, y: 0.2049, angle: -90, title: "Tower 2 Dwarka", desc: "The second residential tower, Dwarka, rising beside the arrival court with balconies stacked toward the sky.", img: "" },
      { n: 8, x: 0.3943, y: 0.3233, angle: -90, title: "Tower 1 Vrindavanam", desc: "The first residential tower, Vrindavanam, set along the street with a shaded base and open balconies above.", img: "" },
      { n: 10, x: 0.4543, y: 0.7105, angle: -90, title: "Tower 1 Entrance Portico", desc: "A shaded arrival portico with a Krishna relief between the columns, opening onto palms and the tower court.", img: "", pano: "POI_10.png" },
      { n: 11, x: 0.5242, y: 0.5789, angle: -90, title: "Tower 2 Entrance Portico", desc: "A matching portico with a carved panel under the pergola, set between the glass lobbies and the garden court.", img: "", pano: "POI_11.png" },
    ],
  },
  Sequence3: {
    id: "Sequence3",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence3+Nyx3.mp4`,
    pois: [
      { n: 12, x: 0.4919, y: 0.6485, angle: -90, title: "Reflexology Walk", desc: "", img: "" },
      { n: 13, x: 0.526, y: 0.6767, angle: -90, title: "Pergola Seating", desc: "A shaded pergola beside the play court, with seating under the carved roof and the towers on either side.", img: "", pano: "POI_13.png" },
    ],
  },
  Sequence4: {
    id: "Sequence4",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence4+Nyx3.mp4`,
    pois: [
      { n: 14, x: 0.5152, y: 0.8139, angle: -90, title: "Play Court Area", desc: "An outdoor court on the podium, fenced and floodlit, with the tower rising behind the palms.", img: "", pano: "POI_14.png" },
      { n: 15, x: 0.5394, y: 0.9173, angle: -90, title: "Krishna Temple", desc: "A small temple shrine on the podium walk, set among palms with the tower beyond the garden.", img: "", pano: "POI_15.png" },
    ],
  },
  Sequence5: {
    id: "Sequence5",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence5+Nyx3.mp4`,
    pois: [
      { n: 16, x: 0.4104, y: 0.4248, angle: -90, title: "Ampitheatre", desc: "", img: "" },
      { n: 17, x: 0.4946, y: 0.4173, angle: -90, title: "Grand Lawn", desc: "A broad lawn between the towers, opening onto a sculpture fountain, with gazebos and palms along the brick path.", img: "", pano: "POI_17.png" },
      { n: 18, x: 0.5439, y: 0.3515, angle: -90, title: "Gazebo Sitting Area", desc: "A carved wooden gazebo beside the lawn, with cushioned seating and a view across the garden to the tower.", img: "", pano: "POI_18.png" },
      { n: 19, x: 0.6039, y: 0.3985, angle: -90, title: "Swimming Pool Deck", desc: "A timber deck around the pool, with loungers under a slatted shade and the tower rising beyond the water.", img: "", pano: "POI_19.png" },
      { n: 20, x: 0.4158, y: 0.5301, angle: -90, title: "Mural Walkway", desc: "A brick walk lined with flower beds and a carved mural wall, running between the towers.", img: "", pano: "POI_20.png" },
    ],
  },
  Sequence6: {
    id: "Sequence6",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence6+Nyx3.mp4`,
    pois: [
      { n: 21, x: 0.3262, y: 0.812, angle: -90, title: "Entry Gate 3", desc: "The third arrival gate, opening from the garden side with a shaded porch and the tower set just beyond.", img: "" },
      { n: 22, x: 0.4507, y: 0.3459, angle: -90, title: "Garden Walkway", desc: "A raised brick walk through the garden, lined with flowers and palms, curving toward the tower.", img: "", pano: "POI_22.png" },
    ],
  },
  Sequence7: {
    id: "Sequence7",
    type: "video",
    src: `${CDN}/24fps-video-comp/Sequence7+Nyx3.mp4`,
    pois: [
      { n: 23, x: 0.4238, y: 0.3459, angle: -90, title: "Outdoor Seating Area", desc: "A garden court with a carved mural wall and built-in seating, set among palms and flower beds.", img: "", pano: "POI_23.png" },
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
