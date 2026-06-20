"use client";

import { ORBIT_OVERLAY_SIZE } from "@/data/orbit360Zones";

const pts = (points) => points.map((p) => p.join(",")).join(" ");

/**
 * Block / floor polygon overlay aligned to 1920×1080 transition stills (object-fit:fill).
 */
export default function OrbitZoneOverlay({
  zones,
  block = null,
  floor = null,
  hoverBlock = null,
  hoverFloor = null,
  onPickBlock,
  onPickFloor,
  onHoverBlock,
  onHoverFloor,
}) {
  if (!zones) return null;

  const { blocks = [], floors = [] } = zones;
  const blockFloors = block ? floors.filter((f) => f.block === block) : [];

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
        />
      )}

      {block &&
        blockFloors.map((f) => {
          const isHover = hoverFloor === f.name;
          let floorCls = "poly floor";
          if (!floor) {
            if (isHover) floorCls += " on";
          } else if (isHover && f.name !== floor) {
            floorCls += " on-switch";
          } else if (f.name === floor) {
            floorCls += " sel";
          } else {
            floorCls += " silent";
          }
          return (
            <polygon
              key={f.name}
              points={pts(f.points)}
              className={floorCls}
              onMouseEnter={() => onHoverFloor?.(f.name)}
              onMouseLeave={() => onHoverFloor?.(null)}
              onClick={() => onPickFloor?.(f.name)}
            />
          );
        })}
    </svg>
  );
}
