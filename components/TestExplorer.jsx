"use client";

import AuthGate from "@/components/auth/AuthGate";
import BuildingExplorer360 from "@/components/BuildingExplorer360";

export default function TestExplorer({ liveUnits = null }) {
  return (
    <AuthGate preloadTourAfterLogin>
      <BuildingExplorer360 liveUnits={liveUnits} />
    </AuthGate>
  );
}
