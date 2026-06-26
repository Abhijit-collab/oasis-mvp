"use client";

import { ORBIT_OVERLAY_SIZE } from "@/data/orbit360Zones";
import { floorLevelFromName } from "@/lib/floorLevel";
import { isUnitSold, unitPolyClass } from "@/lib/unitStatus";

const pts = (points) => points.map((p) => p.join(",")).join(" ");

/**
 * Block / floor / flat polygon overlay aligned to 1920×1080 transition stills (object-fit:fill).
 */
export default function OrbitZoneOverlay({
  zones,
  block = null,
  floor = null,
  unit = null,
  visibleFlats = [],
  filtersActive = false,
  maxVisibleFloor = null,
  hoverBlock = null,
  hoverFloor = null,
  hoverUnit = null,
  unitStatus = () => "available",
  onPickBlock,
  onPickFloor,
  onPickUnit,
  onHoverBlock,
  onHoverFloor,
  onHoverUnit,
  onDismiss,
}) {
  if (!zones) return null;

  const { blocks = [], floors = [] } = zones;
  const blockFloors = block
    ? floors
        .filter((f) => f.block === block)
        .sort((a, b) => floorLevelFromName(a.name) - floorLevelFromName(b.name))
    : [];

  return (
    <svg
      className="be-ovl be-ovl--360"
      viewBox={`0 0 ${ORBIT_OVERLAY_SIZE.width} ${ORBIT_OVERLAY_SIZE.height}`}
      preserveAspectRatio="none"
    >
      {!block &&
        blocks.map((b) => (
          <polygon
            key={b.name}
            points={pts(b.points)}
            className={"poly block" + (hoverBlock === b.name ? " on" : "")}
            onMouseEnter={() => onHoverBlock?.(b.name)}
            onMouseLeave={() => onHoverBlock?.(null)}
            onClick={() => onPickBlock?.(b.name)}
          />
        ))}

      {block && (
        <rect
          x="0"
          y="0"
          width={ORBIT_OVERLAY_SIZE.width}
          height={ORBIT_OVERLAY_SIZE.height}
          className="be-scrim-r"
          onClick={() => onDismiss?.()}
        />
      )}

      {block &&
        blockFloors.map((f) => {
          const level = floorLevelFromName(f.name);
          if (maxVisibleFloor != null && level > maxVisibleFloor) return null;

          const isHover = hoverFloor === f.name;
          let floorCls = "poly floor";
          if (unit) {
            floorCls += " silent";
          } else if (maxVisibleFloor != null && !floor) {
            floorCls += " filter-on floor-reveal";
            if (isHover) floorCls += " on";
          } else if (!floor) {
            if (isHover) floorCls += " on";
          } else if (isHover && f.name !== floor) {
            floorCls += " on-switch";
          } else if (f.name === floor) {
            floorCls += " sel";
            if (visibleFlats.length) floorCls += " floor-pick-done";
          } else {
            floorCls += " silent";
          }
          return (
            <polygon
              key={f.name}
              points={pts(f.points)}
              className={floorCls}
              style={
                maxVisibleFloor != null && !floor
                  ? { animationDelay: `${(level - 1) * 0.08}s` }
                  : undefined
              }
              onMouseEnter={() => onHoverFloor?.(f.name)}
              onMouseLeave={() => onHoverFloor?.(null)}
              onClick={() => onPickFloor?.(f.name)}
            />
          );
        })}

      {block &&
        visibleFlats.map((flat) => {
          const status = unitStatus(flat.id);
          const sold = isUnitSold({ status });
          const isHover = hoverUnit === flat.id;
          let cls = "poly unit " + unitPolyClass(status);
          if (!sold) {
            if (unit === flat.id) cls += " sel";
            else if (unit) {
              cls += " muted";
              if (isHover) cls += " hov";
            } else if (isHover) cls += " hov";
            else if (filtersActive || floor) cls += " all-on";
          } else if (unit) {
            cls += " muted";
          } else if (filtersActive || floor) {
            cls += " all-on";
          }
          return (
            <polygon
              key={flat.id}
              points={pts(flat.points)}
              className={cls}
              onMouseEnter={() => !sold && onHoverUnit?.(flat.id)}
              onMouseLeave={() => onHoverUnit?.(null)}
              onClick={() => !sold && onPickUnit?.(flat.id)}
            />
          );
        })}
    </svg>
  );
}
