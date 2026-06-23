/** SVG polygon + badge helpers for live unit status. */

export function isUnitSold(u) {
  return u?.status === "sold";
}

export function isUnitReserved(u) {
  return u?.status === "reserved";
}

export function unitPolyClass(status) {
  if (status === "sold") return "sold";
  if (status === "reserved") return "reserved";
  return "avail";
}

export function unitBadgeClass(status) {
  if (status === "sold") return "b-sold";
  if (status === "reserved") return "b-reserved";
  return "b-avail";
}

export function unitBadgeLabel(status) {
  if (status === "sold") return "Sold";
  if (status === "reserved") return "Reserved";
  return "Available";
}

export function unitTipBadgeClass(status) {
  if (status === "sold") return "b-sold";
  if (status === "reserved") return "b-reserved";
  return "b-avail";
}
