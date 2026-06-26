"use client";

import AuthGate from "@/components/auth/AuthGate";

export default function TestLayout({ children }) {
  return <AuthGate preloadTourAfterLogin>{children}</AuthGate>;
}
