"use client";

import { useCallback, useState } from "react";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumPerks from "@/components/PremiumPerks";

export default function LoginPage({
  onSubmit,
  error,
  eyebrow = "Metro Group",
  title = "THE",
  accent = "OASIS",
  codePlaceholder = "e.g. OASIS-VIP",
  backgroundVideo = null,
  /** HOK: strip brand, badge, copy, perks, and name field */
  minimal = false,
}) {
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");
  /** Minimal mode: form hidden until user taps "Log in" in header */
  const [showForm, setShowForm] = useState(!minimal);

  const submitLogin = useCallback(() => {
    onSubmit({ name: name.trim(), coupon: coupon.trim() });
  }, [name, coupon, onSubmit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitLogin();
  };

  // Prevent focused inputs from stealing the first tap (iOS / mobile keyboard blur).
  const keepTapOnButton = (e) => e.preventDefault();

  const showBrand = !minimal && (eyebrow || title || accent);

  return (
    <div
      className={
        "login-page"
        + (minimal ? " login-page--minimal" : "")
        + (minimal && !showForm ? " login-page--teaser" : "")
      }
    >
      <div className={"login-bg" + (backgroundVideo ? " login-bg--video" : "")} aria-hidden>
        {backgroundVideo ? (
          <video
            className="login-bg-video"
            src={backgroundVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : null}
      </div>

      {minimal && (
        <header className="login-teaser-header">
          <button
            className="login-teaser-btn"
            onClick={() => setShowForm(true)}
            style={{ visibility: showForm ? "hidden" : "visible" }}
          >
            Log in
          </button>
        </header>
      )}

      <div className="login-premium-ribbon" aria-hidden>
        <span>By invitation only</span>
      </div>

      {minimal && showForm && (
        <div className="login-overlay-dismiss" onClick={() => setShowForm(false)} />
      )}

      <div className={"login-shell" + (minimal && !showForm ? " login-shell--hidden" : "")}>
        {showBrand ? (
          <header className="login-header">
            <span className="login-crown">&#10022;</span>
            <div>
              {eyebrow ? <p className="login-eyebrow">{eyebrow}</p> : null}
              <h1 className="login-brand">
                {title} {accent ? <span>{accent}</span> : null}
              </h1>
            </div>
          </header>
        ) : null}

        <div className="login-card">
          {minimal && (
            <button className="login-card-close" onClick={() => setShowForm(false)} aria-label="Close">
              ✕
            </button>
          )}
          {!minimal ? (
            <>
              <div className="login-card-premium">
                <PremiumBadge label="Premium Preview" />
              </div>
              <h2 className="login-title">Enter your invitation</h2>
              <p className="login-copy">
                This immersive experience is reserved exclusively for our premium customers. Enter your
                personal invitation code to unlock your private tour.
              </p>
              <PremiumPerks compact />
            </>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {!minimal ? (
              <div className="login-field">
                <label htmlFor="login-name">Your name</label>
                <input
                  id="login-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should we welcome you?"
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="login-field">
              <label htmlFor="login-coupon">
                Invitation code <span className="login-req">*</span>
              </label>
              <input
                id="login-coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder={codePlaceholder}
                autoComplete="off"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="button" className="login-btn" onClick={submitLogin} onMouseDown={keepTapOnButton}>
              Unlock premium access
            </button>
          </form>

          <p className="login-foot">Your access is personal and non-transferable · For premium members only</p>
        </div>
      </div>
    </div>
  );
}
