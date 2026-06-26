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

export default function TestBookingClient({ liveUnits = null }) {
  return (
    <Suspense fallback={<BookingLoading />}>
      <BookingPayment liveUnits={liveUnits} />
    </Suspense>
  );
}
