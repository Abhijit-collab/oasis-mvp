"use client";

import AuthGate from "@/components/auth/AuthGate";
import BuildingExplorer360 from "@/components/BuildingExplorer360";

export default function TestExplorer() {
  return (
    <AuthGate>
      <BuildingExplorer360 />
    </AuthGate>
  );
}
