"use client";

import { useCallback, useState } from "react";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumPerks from "@/components/PremiumPerks";

export default function LoginPage({ onSubmit, error }) {
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");

  const submitLogin = useCallback(() => {
    onSubmit({ name: name.trim(), coupon: coupon.trim() });
  }, [name, coupon, onSubmit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitLogin();
  };

  // Prevent focused inputs from stealing the first tap (iOS / mobile keyboard blur).
  const keepTapOnButton = (e) => e.preventDefault();

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden />
      <div className="login-premium-ribbon">
        <span>By invitation only</span>
      </div>

      <div className="login-shell">
        <header className="login-header">
          <span className="login-crown">&#10022;</span>
          <div>
            <p className="login-eyebrow">Metro Group</p>
            <h1 className="login-brand">
              THE <span>OASIS</span>
            </h1>
          </div>
        </header>

        <div className="login-card">
          <div className="login-card-premium">
            <PremiumBadge label="Premium Preview" />
          </div>
          <h2 className="login-title">Enter your invitation</h2>
          <p className="login-copy">
            This immersive experience is reserved exclusively for our premium customers. Enter your
            personal invitation code to unlock your private tour.
          </p>

          <PremiumPerks compact />

          <form className="login-form" onSubmit={handleSubmit} noValidate>
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
            <div className="login-field">
              <label htmlFor="login-coupon">
                Invitation code <span className="login-req">*</span>
              </label>
              <input
                id="login-coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="e.g. OASIS-VIP"
                autoComplete="off"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" onMouseDown={keepTapOnButton}>
              Unlock premium access
            </button>
          </form>

          <p className="login-foot">Your access is personal and non-transferable · For premium members only</p>
        </div>
      </div>
    </div>
  );
}
