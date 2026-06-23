import { UNITS } from "@/data/building";
import { normalizeLiveUnit } from "@/lib/normalizeLiveUnit";

function layoutFromStatic(geo, id) {
  return {
    id,
    floor: geo.floor,
    block: geo.block,
    points: geo.points,
    centroid: geo.centroid,
    label: `Flat ${id}`,
  };
}

/**
 * Build display units: static block/floor/geometry + DynamoDB details (by Flat).
 * Layout fields always come from building.js; price, status, facing, etc. from DynamoDB.
 */
export function mergeLiveUnits(liveUnits) {
  const merged = {};
  for (const id of Object.keys(UNITS)) {
    merged[id] = layoutFromStatic(UNITS[id], id);
  }

  if (!Array.isArray(liveUnits) || liveUnits.length === 0) {
    return merged;
  }

  for (const raw of liveUnits) {
    const row = normalizeLiveUnit(raw);
    if (!row?.unitId || !merged[row.unitId]) continue;

    const layout = merged[row.unitId];
    merged[row.unitId] = {
      ...layout,
      ...row,
      id: row.unitId,
      floor: layout.floor,
      block: layout.block,
      points: layout.points,
      centroid: layout.centroid,
    };
  }

  return merged;
}
