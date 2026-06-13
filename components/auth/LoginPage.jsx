"use client";

import { useState } from "react";

export default function LoginPage({ onSubmit, error }) {
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), coupon: coupon.trim() });
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden />
      <div className="login-shell">
        <header className="login-header">
          <span className="login-crown">&#10022;</span>
          <div>
            <p className="login-eyebrow">Navanaami Residences</p>
            <h1 className="login-brand">
              THE <span>OASIS</span>
            </h1>
          </div>
        </header>

        <div className="login-card">
          <p className="login-kicker">Private preview</p>
          <h2 className="login-title">Enter your invitation</h2>
          <p className="login-copy">
            This experience is reserved for invited guests. Enter your coupon code to explore the residences.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
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
                Coupon code <span className="login-req">*</span>
              </label>
              <input
                id="login-coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="e.g. OASIS-VIP"
                required
                autoComplete="off"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn">
              Unlock the experience
            </button>
          </form>

          <p className="login-foot">Demo access · any coupon code works for this preview</p>
        </div>
      </div>
    </div>
  );
}
