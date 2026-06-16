"use client";

import PremiumBadge from "@/components/PremiumBadge";
import PremiumPerks from "@/components/PremiumPerks";

export default function WelcomeModal({ name, onContinue }) {
  const guest = name || "Premium Member";

  return (
    <div className="login-welcome-bg">
      <div className="login-welcome-modal">
        <div className="login-welcome-glow" aria-hidden />
        <div className="login-welcome-badge-row">
          <PremiumBadge label="Premium Member" />
        </div>
        <span className="login-welcome-spark">&#10022;</span>
        <p className="login-welcome-kicker">Welcome, {guest}</p>
        <h2 className="login-welcome-title">Your private tour awaits</h2>
        <p className="login-welcome-copy">
          Thank you for being part of our <strong>premium circle</strong>. You now have exclusive access to
          explore every floor, residence, and detail of <strong>The Oasis</strong> — before the public
          launch.
        </p>
        <PremiumPerks
          compact
          items={[
            "Full building explorer unlocked",
            "Priority reservation pathway",
            "Personal concierge on WhatsApp",
          ]}
        />
        <p className="login-welcome-tagline">Crafted for those who expect more.</p>
        <button type="button" className="login-btn" onClick={onContinue}>
          Enter your private tour
        </button>
      </div>
    </div>
  );
}
