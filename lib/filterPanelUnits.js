import { BLOCKS, FLOORS, UNITS } from "@/data/building";

const floorLevel = (name) => parseInt(String(name).replace(/\D/g, ""), 10) || 0;

const facingCode = (facing) => {
  const map = {
    North: "N",
    East: "E",
    South: "S",
    West: "W",
    "North-East": "NE",
    "North-West": "NW",
    "South-East": "SE",
    "South-West": "SW",
  };
  return map[facing] || facing;
};

/** Map explorer inventory to FilterPanel unit rows. */
export function buildFilterPanelUnits(units = UNITS) {
  const blockByUnit = {};
  for (const block of BLOCKS) {
    for (const floorName of block.floors) {
      const floor = FLOORS.find((f) => f.name === floorName);
      if (!floor) continue;
      for (const id of floor.units) {
        blockByUnit[id] = block.name.replace(/^Block\s+/i, "");
      }
    }
  }

  return Object.values(units).map((u) => ({
    id: u.id,
    bhk: u.beds,
    status: u.status === "sold" ? "sold" : u.status === "reserved" ? "reserved" : "available",
    block: blockByUnit[u.id] || "A",
    facing: facingCode(u.facing),
    floor: floorLevel(u.floor),
    sqft: u.area,
  }));
}
