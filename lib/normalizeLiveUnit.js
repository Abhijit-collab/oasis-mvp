/**
 * Map DynamoDB rows → app unit details (keyed by Flat).
 * Static building.js only supplies block / floor / polygon geometry.
 */

/** "Flat 101", "101" → "101" — exact 3-digit ids only; never 1201 → 201. */
export function flatToUnitId(flat) {
  if (flat == null || flat === "") return "";
  const s = String(flat).trim();

  if (/^\d{3}$/.test(s)) return s;

  const labeled = s.match(/flat\s*(\d{3})\s*$/i);
  if (labeled) return labeled[1];

  const digits = s.replace(/\D/g, "");
  if (/^\d{3}$/.test(digits)) return digits;

  return digits || s;
}

export function availabilityToStatus(availability) {
  if (availability == null || availability === "") return undefined;
  const key = String(availability).toLowerCase().trim();
  if (key.includes("sold")) return "sold";
  if (key.includes("reserved")) return "reserved";
  if (key.includes("avail")) return "available";
  return "available";
}

function pickString(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function pickNumber(...vals) {
  for (const v of vals) {
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

/** DynamoDB detail fields merged onto geometry by Flat number. */
export function normalizeLiveUnit(row) {
  if (!row || typeof row !== "object") return null;

  const unitId = flatToUnitId(row.Flat ?? row.flat ?? row.unitId ?? row.id);
  if (!unitId) return null;

  const availability = row.Availability ?? row.availability ?? row.status;
  const status = availabilityToStatus(availability);

  const beds = pickNumber(
    row.bedroomscount,
    row.Bedroomscount,
    row.BedroomsCount,
    row.bedroomsCount,
    row.beds,
    row.Beds,
    row.bhk,
    row.BHK
  );
  const baths = pickNumber(row.baths, row.Baths);
  const area = pickNumber(row.area, row.Area, row.sqft, row.Sqft, row.SQFT);

  const type =
    pickString(row.type, row.Type, row.configuration, row.Configuration) ||
    (beds ? `${beds} BHK` : undefined);

  return {
    unitId,
    id: unitId,
    Flat: row.Flat ?? unitId,
    label: pickString(row.label, row.Label, row.name, row.Name) || `Flat ${unitId}`,
    type,
    beds,
    baths,
    area,
    facing: pickString(row.facing, row.Facing, row.orientation, row.Orientation),
    price: pickString(row.price, row.Price),
    ...(status ? { status } : {}),
  };
}

export function normalizeLiveUnits(rows) {
  if (!Array.isArray(rows)) return null;
  const normalized = rows.map(normalizeLiveUnit).filter(Boolean);
  return normalized.length ? normalized : null;
}
