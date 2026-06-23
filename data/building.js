// Building data for The Oasis explorer.
// Unit polygons sourced from 6000×4421px picker output (see flat zones below).

import { TRANSITION_VIDEOS } from "@/data/assets";

export { ENTRANCE_IMAGE, ELEVATION_IMAGE, TRANSITION_VIDEOS } from "@/data/assets";

export const IMAGE_SIZE = { width: 6000, height: 4421 };

/** Convert picker coordinates (px) to image-percentage for the SVG overlay. */
export const toPctPoints = (points) =>
  points.map(([x, y]) => [
    +((x / IMAGE_SIZE.width) * 100).toFixed(2),
    +((y / IMAGE_SIZE.height) * 100).toFixed(2),
  ]);

export const PROJECT = {
  "name": "The Oasis",
  "developer": "Navanaami Residences",
  "configs": "3 & 4 BHK",
  "totalUnits": 8,
  "floors": 4,
  "carpetRange": "1,820–2,300 Sqft",
  "status": "Now Selling"
};

export const BLOCKS = [
  {
    "name": "Block A",
    "available": true,
    "points": [
      [29.72, 67.91],
      [29.72, 37.8],
      [28.67, 37.21],
      [30.29, 33.59],
      [37.64, 29.84],
      [39.91, 26.04],
      [42.71, 27.29],
      [45.29, 26.12],
      [69.8, 37.44],
      [72.18, 36.6],
      [73.76, 39.27],
      [76.6, 40.59],
      [77.08, 40.36],
      [78.94, 39.87],
      [80.42, 42.34],
      [87.54, 45.65],
      [88.6, 45.42],
      [90.98, 46.99],
      [90.62, 47.1],
      [91.97, 47.7],
      [93.1, 50.14],
      [91.97, 50.36],
      [91.99, 54.02],
      [91.99, 78.41],
      [43.72, 79.34],
      [43.72, 71.9],
      [44.62, 71.91],
      [44.64, 71.11],
      [44.62, 69.7],
      [46.28, 68.1],
      [44.32, 67.56]
    ],
    "centroid": [62.69, 49.28],
    "floors": ["Floor 4", "Floor 3", "Floor 2", "Floor 1"],
    "transitionLeadIn": TRANSITION_VIDEOS.entrance,
    "transitionOut": TRANSITION_VIDEOS.blockAOut
  },
  {
    "name": "Block B",
    "available": true,
    "points": [],
    "centroid": [0, 0],
    "floors": [],
    "transitionIn": TRANSITION_VIDEOS.blockBIn,
    "transitionOut": TRANSITION_VIDEOS.blockBOut
  },
  {
    "name": "Block C",
    "available": true,
    "points": [],
    "centroid": [0, 0],
    "floors": [],
    "transitionIn": TRANSITION_VIDEOS.blockCIn,
    "transitionOut": TRANSITION_VIDEOS.blockCOut
  },
  {
    "name": "Block D",
    "available": false,
    "points": [],
    "centroid": [0, 0],
    "floors": []
  }
];

export const FLOORS = [
  {
    "name": "Floor 4",
    "points": [
      [37.68, 32.7],
      [44.07, 29.7],
      [67.67, 39.96],
      [91.96, 50.28],
      [91.96, 56.42],
      [79.99, 52.57],
      [68.71, 49.1],
      [47.79, 42.79],
      [44.06, 41.68],
      [37.72, 43.88]
    ],
    "centroid": [61.16, 43.91],
    "units": ["401", "402"]
  },
  {
    "name": "Floor 3",
    "points": [
      [37.72, 43.94],
      [44.04, 41.67],
      [47.79, 42.79],
      [91.96, 56.42],
      [91.99, 63.83],
      [80.89, 61.35],
      [74.1, 59.99],
      [68.59, 58.92],
      [47.86, 54.75],
      [43.93, 54.17],
      [37.71, 55.33]
    ],
    "centroid": [60.6, 53.92],
    "units": ["301", "302"]
  },
  {
    "name": "Floor 2",
    "points": [
      [37.71, 55.33],
      [43.93, 54.17],
      [47.86, 54.75],
      [68.59, 58.92],
      [74.1, 59.99],
      [80.89, 61.35],
      [91.99, 63.83],
      [91.94, 71.28],
      [80.67, 69.69],
      [74.1, 68.92],
      [68.81, 68.33],
      [47.79, 66.49],
      [44.0, 66.2],
      [37.78, 66.78]
    ],
    "centroid": [63.58, 63.29],
    "units": ["201", "202"]
  },
  {
    "name": "Floor 1",
    "points": [
      [37.78, 66.78],
      [44.0, 66.2],
      [47.79, 66.49],
      [68.81, 68.33],
      [74.1, 68.92],
      [80.67, 69.69],
      [91.94, 71.28],
      [91.94, 78.42],
      [80.89, 78.33],
      [74.1, 78.33],
      [68.02, 78.52],
      [44.69, 78.69],
      [44.64, 72.18],
      [44.72, 69.77],
      [46.29, 68.14],
      [44.03, 67.52],
      [41.63, 67.55],
      [37.87, 67.76]
    ],
    "centroid": [59.11, 71.27],
    "units": ["101", "102"]
  }
];

/**
 * Unit map geometry + block/floor layout only (polygons for the explorer).
 * Live fields (price, status, facing, beds, baths, area, type) come from DynamoDB
 * via Flat — see lib/normalizeLiveUnit.js and lib/mergeLiveUnits.js.
 */
export const UNITS = {
  "401": {
    "id": "401",
    "floor": "Floor 4",
    "block": "Block A",
    "points": [
      [37.69, 32.72],
      [44.03, 29.69],
      [47.65, 31.11],
      [74.4, 42.16],
      [74.27, 50.78],
      [68.97, 49.45],
      [47.65, 42.84],
      [44.1, 41.61],
      [37.76, 43.69]
    ],
    "centroid": [52.95, 40.45]
  },
  "402": {
    "id": "402",
    "floor": "Floor 4",
    "block": "Block A",
    "points": [
      [75.39, 42.41],
      [91.9, 50.02],
      [91.83, 56.83],
      [75.35, 51.46]
    ],
    "centroid": [83.62, 50.18]
  },
  "301": {
    "id": "301",
    "floor": "Floor 3",
    "block": "Block A",
    "points": [
      [37.76, 43.69],
      [44.1, 41.61],
      [47.65, 42.84],
      [68.97, 49.45],
      [74.27, 50.78],
      [74.13, 59.92],
      [68.83, 58.88],
      [47.79, 54.81],
      [44.03, 54.15],
      [37.9, 55.28]
    ],
    "centroid": [54.54, 51.14]
  },
  "302": {
    "id": "302",
    "floor": "Floor 3",
    "block": "Block A",
    "points": [
      [75.35, 51.46],
      [91.83, 56.83],
      [91.81, 64.08],
      [75.52, 60.01]
    ],
    "centroid": [83.63, 58.09]
  },
  "201": {
    "id": "201",
    "floor": "Floor 2",
    "block": "Block A",
    "points": [
      [37.9, 55.28],
      [44.03, 54.15],
      [47.79, 54.81],
      [68.83, 58.88],
      [74.13, 59.92],
      [74.03, 68.78],
      [68.86, 68.35],
      [47.68, 66.49],
      [43.99, 66.07],
      [38.01, 66.45]
    ],
    "centroid": [54.53, 61.92]
  },
  "202": {
    "id": "202",
    "floor": "Floor 2",
    "block": "Block A",
    "points": [
      [75.52, 60.01],
      [91.81, 64.08],
      [91.84, 70.5],
      [75.56, 69.07]
    ],
    "centroid": [83.68, 65.91]
  },
  "101": {
    "id": "101",
    "floor": "Floor 1",
    "block": "Block A",
    "points": [
      [38.01, 66.45],
      [43.99, 66.07],
      [47.68, 66.49],
      [68.86, 68.35],
      [74.03, 68.78],
      [73.97, 78.63],
      [43.78, 78.7],
      [43.82, 72.06],
      [44.32, 71.59],
      [44.3, 70.28],
      [44.77, 69.75],
      [45.46, 68.88],
      [46.37, 68.1],
      [44.23, 67.53],
      [42.04, 67.57],
      [39.99, 67.63],
      [38.01, 67.72]
    ],
    "centroid": [48.45, 69.68]
  },
  "102": {
    "id": "102",
    "floor": "Floor 1",
    "block": "Block A",
    "points": [
      [75.56, 69.07],
      [91.84, 70.5],
      [91.89, 78.24],
      [75.61, 78.37]
    ],
    "centroid": [83.73, 74.05]
  }
};

export const UNIT_GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop",
];

export function getUnitImages(unitId) {
  const n = parseInt(unitId, 10) || 0;
  return Array.from({ length: 4 }, (_, i) => UNIT_GALLERY_IMAGES[(n + i) % UNIT_GALLERY_IMAGES.length]);
}

export function getUnitBrochureUrl(unitId) {
  return `/downloads/units/${unitId}-brochure.pdf`;
}
