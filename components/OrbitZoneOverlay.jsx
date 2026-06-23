"use client";

import { ORBIT_OVERLAY_SIZE } from "@/data/orbit360Zones";

const pts = (points) => points.map((p) => p.join(",")).join(" ");

/**
 * Block / floor / flat polygon overlay aligned to 1920×1080 transition stills (object-fit:fill).
 */
export default function OrbitZoneOverlay({
  zones,
  block = null,
  floor = null,
  unit = null,
  hoverBlock = null,
  hoverFloor = null,
  hoverUnit = null,
  unitSold = () => false,
  onPickBlock,
  onPickFloor,
  onPickUnit,
  onHoverBlock,
  onHoverFloor,
  onHoverUnit,
  onDismiss,
}) {
  if (!zones) return null;

  const { blocks = [], floors = [], flats = [] } = zones;
  const blockFloors = block ? floors.filter((f) => f.block === block) : [];
  const floorFlats =
    block && floor ? flats.filter((f) => f.block === block && f.floor === floor) : [];

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

      {block &&
        floor &&
        floorFlats.map((flat) => {
          const sold = unitSold(flat.id);
          const isHover = hoverUnit === flat.id;
          let cls = "poly unit " + (sold ? "sold" : "avail");
          if (!sold) {
            if (unit === flat.id) cls += " sel";
            else if (isHover) cls += " hov";
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
