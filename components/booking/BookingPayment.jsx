"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { mergeLiveUnits } from "@/lib/mergeLiveUnits";

const BOOKING_ADVANCE = 250000;

const formatInr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const formatCard = (v) =>
  v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();

const formatExpiry = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

const makeRef = () => {
  const year = new Date().getFullYear();
  const n = Math.floor(100000 + Math.random() * 900000);
  return `OAS-${year}-${n}`;
};

const floorNum = (floor) => floor?.replace(/\D/g, "") || "—";

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvv: "",
});

const STEPS = ["Your details", "Payment", "Confirmation"];

function CardPreview({ form }) {
  const digits = form.cardNumber.replace(/\s/g, "");
  const displayNum = [0, 1, 2, 3]
    .map((i) => digits.slice(i * 4, i * 4 + 4).padEnd(4, "•"))
    .join(" ");
  return (
    <div className="bk-card-preview">
      <div className="bk-card-preview-chip" />
      <div className="bk-card-preview-num">{displayNum}</div>
      <div className="bk-card-preview-foot">
        <div>
          <span className="bk-card-preview-lbl">Card holder</span>
          <span className="bk-card-preview-val">{form.cardName || "YOUR NAME"}</span>
        </div>
        <div>
          <span className="bk-card-preview-lbl">Expires</span>
          <span className="bk-card-preview-val">{form.expiry || "MM/YY"}</span>
        </div>
      </div>
    </div>
  );
}

export default function BookingPayment({ liveUnits = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const unitId = params.get("unit") || "";
  const block = params.get("block") || "Block A";
  const returnTo = params.get("returnTo") || (pathname?.startsWith("/test") ? "/test" : "/");
  const units = useMemo(() => mergeLiveUnits(liveUnits), [liveUnits]);
  const unit = units[unitId];

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [paying, setPaying] = useState(false);
  const [ref, setRef] = useState(null);
  const [exitConfirm, setExitConfirm] = useState(false);

  const leaveExplorer = () => {
    if (step === 3) {
      router.push(returnTo);
      return;
    }
    setExitConfirm(true);
  };

  const set = (key) => (e) => {
    let val = e.target.value;
    if (key === "cardNumber") val = formatCard(val);
    if (key === "expiry") val = formatExpiry(val);
    if (key === "cvv") val = val.replace(/\D/g, "").slice(0, 3);
    if (key === "phone") val = val.replace(/[^\d+\s-]/g, "").slice(0, 16);
    setForm((f) => ({ ...f, [key]: val }));
  };

  const detailsValid = form.name.trim() && form.email.includes("@") && form.phone.replace(/\D/g, "").length >= 10;
  const cardDigits = form.cardNumber.replace(/\s/g, "");
  const paymentValid =
    form.cardName.trim() &&
    cardDigits.length === 16 &&
    /^\d{2}\/\d{2}$/.test(form.expiry) &&
    form.cvv.length === 3;

  const summary = useMemo(() => {
    if (!unit) return null;
    const tower = block.replace(/^Block\s/i, "Tower ");
    const areaLabel =
      unit.area != null ? `${Number(unit.area).toLocaleString("en-IN")} sq.ft` : "—";
    const typeLabel = unit.type || "—";
    return {
      unitLabel: unit.label?.replace(/^Flat\s/i, "Unit ") || `Unit ${unitId}`,
      meta: `${typeLabel} · ${areaLabel} · ${tower}, Floor ${floorNum(unit.floor)}`,
      price: unit.price || "—",
      advance: formatInr(BOOKING_ADVANCE),
      available: unit.status !== "sold",
    };
  }, [unit, unitId, block]);

  const pay = () => {
    if (!paymentValid || paying) return;
    setPaying(true);
    setTimeout(() => {
      setRef(makeRef());
      setStep(3);
      setPaying(false);
    }, 1600);
  };

  if (!unitId || !unit || !summary) {
    return (
      <div className="bk-page">
        <header className="bk-top">
          <Link href={returnTo} className="bk-logo">
            The Oasis
          </Link>
          <span className="bk-badge">Reserve · Test mode</span>
        </header>
        <main className="bk-main bk-main--center">
          <div className="bk-panel bk-panel--narrow">
            <h1 className="bk-hero-title">Unit not found</h1>
            <p className="bk-hero-copy">Select a residence from the explorer to reserve.</p>
            <Link href={returnTo} className="bk-pay-btn">
              Go to explorer
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isUnitSold(unit)) {
    return (
      <div className="bk-page">
        <header className="bk-top">
          <Link href={returnTo} className="bk-logo">
            The Oasis
          </Link>
          <span className="bk-badge">Reserve · Test mode</span>
        </header>
        <main className="bk-main bk-main--center">
          <div className="bk-panel bk-panel--narrow">
            <h1 className="bk-hero-title">Not available</h1>
            <p className="bk-hero-copy">{unit.label} is sold. Please choose another residence.</p>
            <Link href={returnTo} className="bk-pay-btn">
              Go to explorer
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bk-page">
      <header className="bk-top">
        <button type="button" className="bk-logo" onClick={leaveExplorer}>
          The Oasis
        </button>
        <span className="bk-badge">Reserve · Test mode</span>
      </header>

      <nav className="bk-stepper" aria-label="Booking progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="bk-stepper-item">
              {i > 0 && <span className={`bk-stepper-line ${step >= n ? "on" : ""}`} aria-hidden />}
              <div className={`bk-stepper-dot ${active ? "on" : ""} ${done ? "done" : ""}`}>
                {done ? "✓" : n}
              </div>
              <span className={`bk-stepper-label ${active || done ? "on" : ""}`}>{label}</span>
            </div>
          );
        })}
      </nav>

      <main className="bk-main">
        <div className="bk-stack">
          {step === 1 && (
            <section className="bk-panel bk-panel--hero">
              <p className="bk-kicker">Reserve this residence</p>
              <h1 className="bk-hero-title">
                Pay the booking advance to reserve {summary.unitLabel}
              </h1>
              <p className="bk-hero-copy">
                This advance is refundable and holds your home while we process paperwork. Enter your details below to
                continue.
              </p>
              <div className="bk-form">
                <div className="bk-field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" value={form.name} onChange={set("name")} placeholder="Your name" autoComplete="name" />
                </div>
                <div className="bk-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
                <div className="bk-field">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                </div>
              </div>
              <button
                type="button"
                className="bk-pay-btn"
                disabled={!detailsValid}
                onClick={() => setStep(2)}
              >
                Pay for reservation · {summary.advance}
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="bk-panel bk-panel--hero">
              <p className="bk-kicker">Secure payment</p>
              <h1 className="bk-hero-title">Complete your reservation</h1>
              <p className="bk-hero-copy">
                Enter dummy card details below. Your card preview updates as you type — no real charge is made.
              </p>
              <CardPreview form={form} />
              <div className="bk-form">
                <div className="bk-field">
                  <label htmlFor="cardName">Name on card</label>
                  <input id="cardName" value={form.cardName} onChange={set("cardName")} placeholder="As on card" />
                </div>
                <div className="bk-field">
                  <label htmlFor="cardNumber">Card number</label>
                  <input
                    id="cardNumber"
                    inputMode="numeric"
                    value={form.cardNumber}
                    onChange={set("cardNumber")}
                    placeholder="4242 4242 4242 4242"
                  />
                </div>
                <div className="bk-field-row">
                  <div className="bk-field">
                    <label htmlFor="expiry">Expiry</label>
                    <input id="expiry" inputMode="numeric" value={form.expiry} onChange={set("expiry")} placeholder="MM/YY" />
                  </div>
                  <div className="bk-field">
                    <label htmlFor="cvv">CVV</label>
                    <input
                      id="cvv"
                      inputMode="numeric"
                      type="password"
                      value={form.cvv}
                      onChange={set("cvv")}
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>
              <div className="bk-pay-row">
                <button type="button" className="bk-ghost-btn" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="bk-pay-btn" disabled={!paymentValid || paying} onClick={pay}>
                  {paying ? "Processing…" : `Pay ${summary.advance}`}
                </button>
              </div>
            </section>
          )}

          {step === 3 && ref && (
            <section className="bk-panel bk-panel--hero bk-panel--success">
              <div className="bk-success-icon">&#10003;</div>
              <p className="bk-kicker">Reservation confirmed</p>
              <h1 className="bk-hero-title">Payment successful</h1>
              <p className="bk-hero-copy">
                Your reservation for <strong>{summary.unitLabel}</strong> is confirmed. A confirmation has been sent to{" "}
                <strong>{form.email}</strong>.
              </p>
              <div className="bk-ref">
                <span>Booking reference</span>
                <strong>{ref}</strong>
              </div>
              <button type="button" className="bk-pay-btn" onClick={leaveExplorer}>
                Back to explorer
              </button>
            </section>
          )}

          {step < 3 && (
            <section className="bk-panel bk-panel--unit">
              <h2 className="bk-unit-title">{summary.unitLabel}</h2>
              <p className="bk-unit-meta">{summary.meta}</p>
              <div className="bk-unit-rows">
                <div className="bk-unit-row">
                  <span>Unit price</span>
                  <strong>{summary.price}</strong>
                </div>
                <div className="bk-unit-row">
                  <span>Booking advance</span>
                  <strong>{summary.advance}</strong>
                </div>
                <div className="bk-unit-row">
                  <span>Status</span>
                  <strong className="bk-status-avail">Available</strong>
                </div>
              </div>
              <div className="bk-payable">
                <span>Payable now</span>
                <strong>{summary.advance}</strong>
              </div>
              <p className="bk-secure">
                <span className="bk-lock" aria-hidden>
                  &#128274;
                </span>
                Secure demo checkout
              </p>
            </section>
          )}

          {step < 3 && (
            <button type="button" className="bk-back-link" onClick={leaveExplorer}>
              &larr; Back to explorer
            </button>
          )}
        </div>
      </main>

      {exitConfirm && (
        <div className="bk-exit-bg" onClick={() => setExitConfirm(false)}>
          <div className="bk-exit-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="bk-exit-title">Leave reservation?</h2>
            <p className="bk-exit-text">
              Your booking is not complete. If you go back now, your entered details will be lost.
            </p>
            <div className="bk-exit-actions">
              <button type="button" className="bk-ghost-btn" onClick={() => setExitConfirm(false)}>
                Stay on page
              </button>
              <button type="button" className="bk-pay-btn" onClick={() => router.push(returnTo)}>
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isUnitSold(u) {
  return u?.status === "sold";
}
