"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 15000;

function unitsFingerprint(data) {
  if (!Array.isArray(data)) return "";
  // Status/price changes are what matter for the overlay — ignore poll noise.
  return data
    .map((row) => `${row?.Flat ?? row?.unitId ?? ""}:${row?.Status ?? row?.status ?? ""}:${row?.Price ?? row?.price ?? ""}`)
    .join("|");
}

/**
 * Hydrate from server-fetched `initialLiveUnits`, then poll /api/units every 15s.
 * Failed fetches keep the last good data on screen.
 * Identical payloads do not re-render the tour (avoids interrupting orbit play).
 */
export default function useLiveUnitsPoll(initialLiveUnits = null) {
  const [liveUnits, setLiveUnits] = useState(initialLiveUnits);
  const fingerprintRef = useRef(unitsFingerprint(initialLiveUnits));

  useEffect(() => {
    fingerprintRef.current = unitsFingerprint(initialLiveUnits);
    setLiveUnits(initialLiveUnits);
  }, [initialLiveUnits]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch("/api/units", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !Array.isArray(data)) return;
        const nextFp = unitsFingerprint(data);
        if (nextFp === fingerprintRef.current) return;
        fingerprintRef.current = nextFp;
        setLiveUnits(data);
      } catch {
        /* keep last good data on network error */
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return liveUnits;
}
