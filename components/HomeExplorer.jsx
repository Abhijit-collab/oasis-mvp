"use client";

import AuthGate from "@/components/auth/AuthGate";
import BuildingExplorer from "@/components/BuildingExplorer";

export default function HomeExplorer({ liveUnits }) {
  return (
    <AuthGate>
      <BuildingExplorer liveUnits={liveUnits} />
    </AuthGate>
  );
}
