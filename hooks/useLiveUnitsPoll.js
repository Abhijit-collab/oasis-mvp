"use client";

import { useEffect, useState } from "react";

const POLL_MS = 15000;

/**
 * Hydrate from server-fetched `initialLiveUnits`, then poll /api/units every 15s.
 * Failed fetches keep the last good data on screen.
 */
export default function useLiveUnitsPoll(initialLiveUnits = null) {
  const [liveUnits, setLiveUnits] = useState(initialLiveUnits);

  useEffect(() => {
    setLiveUnits(initialLiveUnits);
  }, [initialLiveUnits]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch("/api/units", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data)) setLiveUnits(data);
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
