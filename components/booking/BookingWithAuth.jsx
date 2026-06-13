"use client";

import { Suspense } from "react";
import AuthGate from "@/components/auth/AuthGate";
import BookingPayment from "@/components/booking/BookingPayment";

export default function BookingWithAuth() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div className="bk-page">
            <main className="bk-main bk-main--center">
              <p className="bk-muted">Loading…</p>
            </main>
          </div>
        }
      >
        <BookingPayment />
      </Suspense>
    </AuthGate>
  );
}
