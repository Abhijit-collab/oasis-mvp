"use client";

import { useEffect, useState } from "react";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumPerks from "@/components/PremiumPerks";
import { ENTRANCE_IMAGE } from "@/data/assets";
import { preloadEntranceImage } from "@/lib/tourAssetPreload";

export default function WelcomeModal({ name, onContinue }) {
  const guest = name || "Premium Member";
  const [bgReady, setBgReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const probe = new Image();
    probe.src = ENTRANCE_IMAGE;
    if (probe.complete && probe.naturalWidth > 0) {
      setBgReady(true);
      return undefined;
    }
    preloadEntranceImage().then(() => {
      if (!cancelled) setBgReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="login-welcome-bg">
      <img
        src={ENTRANCE_IMAGE}
        alt=""
        className={"login-welcome-bg-image" + (bgReady ? " login-welcome-bg-image--in" : "")}
        aria-hidden
        decoding="async"
        fetchPriority="high"
        loading="eager"
        onLoad={() => setBgReady(true)}
      />
      <div className="login-welcome-bg-scrim" aria-hidden />
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
        <button
          type="button"
          className="login-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onContinue}
        >
          Enter your private tour
        </button>
      </div>
    </div>
  );
}
