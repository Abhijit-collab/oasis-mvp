"use client";

import { Suspense } from "react";
import BookingPayment from "@/components/booking/BookingPayment";

function BookingLoading() {
  return (
    <div className="bk-page">
      <main className="bk-main bk-main--center">
        <p className="bk-hero-copy" style={{ textAlign: "center" }}>
          Loading…
        </p>
      </main>
    </div>
  );
}

/** Test booking — no AuthGate; user is already in the /test flow. */
export default function TestBooking({ liveUnits = null }) {
  return (
    <Suspense fallback={<BookingLoading />}>
      <BookingPayment liveUnits={liveUnits} />
    </Suspense>
  );
}
