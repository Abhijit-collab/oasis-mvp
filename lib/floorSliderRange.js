import { BLOCKS, FLOORS } from "@/data/building";
import { getOrbitStepZones } from "@/data/orbit360Zones";
import { floorLevelFromName } from "@/lib/floorLevel";

/** Floor slider bounds from overlay zones or static block layout (not unit inventory). */
export function getFloorSliderRange({ orbitStep = null, block = null } = {}) {
  if (orbitStep != null) {
    const zoneFloors = getOrbitStepZones(orbitStep)?.floors ?? [];
    const scoped = block ? zoneFloors.filter((f) => f.block === block) : zoneFloors;
    const levels = scoped.map((f) => floorLevelFromName(f.name)).filter((n) => n > 0);
    if (levels.length) {
      return { min: Math.min(...levels), max: Math.max(...levels) };
    }
  }

  const blockName = block?.startsWith("Block ") ? block : block ? `Block ${block}` : null;
  const curBlock = blockName ? BLOCKS.find((b) => b.name === blockName) : null;
  if (curBlock?.floors?.length) {
    const levels = curBlock.floors.map((name) => floorLevelFromName(name)).filter((n) => n > 0);
    if (levels.length) {
      return { min: Math.min(...levels), max: Math.max(...levels) };
    }
  }

  const levels = FLOORS.map((f) => floorLevelFromName(f.name)).filter((n) => n > 0);
  if (levels.length) {
    return { min: Math.min(...levels), max: Math.max(...levels) };
  }

  return { min: 1, max: 4 };
}
