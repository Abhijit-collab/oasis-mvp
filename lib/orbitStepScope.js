import { FLOORS, UNITS } from "@/data/building";
import { ORBIT_STEP_ZONES, getOrbitStepZones } from "@/data/orbit360Zones";

/**
 * Units / floors / blocks visible on a given transition hold frame (from overlay mapping).
 */
export function getOrbitStepScope(step) {
  const zones = getOrbitStepZones(step);
  if (!zones) {
    return { blocks: [], floors: [], unitIds: [], flatIds: [] };
  }

  const blocks = (zones.blocks ?? []).map((b) => b.name);
  const floors = (zones.floors ?? []).map((f) => f.name);
  const flatIds = (zones.flats ?? []).map((f) => f.id).filter((id) => UNITS[id]);

  let unitIds;
  if (flatIds.length) {
    unitIds = flatIds;
  } else if (floors.length) {
    const floorSet = new Set(floors);
    unitIds = FLOORS.filter((f) => floorSet.has(f.name))
      .flatMap((f) => f.units)
      .filter((id) => UNITS[id]);
  } else {
    unitIds = [];
  }

  return { blocks, floors, unitIds, flatIds };
}

/** Flat polygons to render for the current selection + filter state. */
export function getVisibleOrbitFlats({
  zones,
  block,
  floor,
  filtersActive,
  matchingIds,
  scopeUnitIds,
}) {
  if (!zones || !block) return [];

  const flats = zones.flats ?? [];
  const match = matchingIds instanceof Set ? matchingIds : new Set(matchingIds ?? []);
  const scoped = new Set(scopeUnitIds ?? []);

  if (!match.size) return [];

  if (floor) {
    return flats.filter(
      (f) => f.block === block && f.floor === floor && scoped.has(f.id) && match.has(f.id)
    );
  }

  if (!filtersActive) return [];

  return flats.filter((f) => f.block === block && scoped.has(f.id) && match.has(f.id));
}

/** Floor names from the overlay for the selected block on this step. */
export function getOrbitBlockFloors(zones, block) {
  if (!zones || !block) return [];
  return (zones.floors ?? []).filter((f) => f.block === block).map((f) => f.name);
}
