"use client";

import { Suspense } from "react";
import BookingPayment from "@/components/booking/BookingPayment";
import { BRAND } from "./assets";

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

/** HOK booking — mirrors /test/booking; self-contained for prod extraction. */
export default function HOKBooking({ liveUnits = null }) {
  return (
    <Suspense fallback={<BookingLoading />}>
      <BookingPayment
        liveUnits={liveUnits}
        productName={BRAND.fullName}
        brandLogo={BRAND.logoUrl}
      />
    </Suspense>
  );
}
