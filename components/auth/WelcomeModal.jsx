"use client";

import { useEffect, useState } from "react";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumPerks from "@/components/PremiumPerks";
import ProjectBrandLogo from "@/components/ProjectBrandLogo";
import { ENTRANCE_IMAGE as DEFAULT_ENTRANCE_IMAGE } from "@/data/assets";
import { preloadEntranceImage as defaultPreloadEntranceImage } from "@/lib/tourAssetPreload";

export default function WelcomeModal({
  name,
  onContinue,
  entranceImage = DEFAULT_ENTRANCE_IMAGE,
  preloadEntranceImage = defaultPreloadEntranceImage,
  productName = "The Oasis",
  projectLogo = null,
  projectLogoAlt = "Brand",
}) {
  const guest = name || "Premium Member";
  const [bgReady, setBgReady] = useState(false);
  const [isPhone, setIsPhone] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px), (pointer: coarse)");
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const probe = new Image();
    probe.src = entranceImage;
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
  }, [entranceImage, preloadEntranceImage]);

  return (
    <div className="login-welcome-bg">
      <img
        src={entranceImage}
        alt=""
        className={"login-welcome-bg-image" + (bgReady ? " login-welcome-bg-image--in" : "")}
        aria-hidden
        decoding="async"
        fetchPriority="high"
        loading="eager"
        onLoad={() => setBgReady(true)}
      />
      <div className="login-welcome-bg-scrim" aria-hidden />
      {projectLogo ? (
        <div className="login-welcome-brand">
          <ProjectBrandLogo
            src={projectLogo}
            alt={projectLogoAlt}
            className="project-brand-logo--welcome"
          />
        </div>
      ) : null}
      <div className="login-welcome-modal">
        <div className="login-welcome-glow" aria-hidden />
        {!isPhone && (
          <>
            <div className="login-welcome-badge-row">
              <PremiumBadge label="Premium Member" />
            </div>
            <span className="login-welcome-spark">&#10022;</span>
          </>
        )}
        <p className="login-welcome-kicker">Welcome, {guest}</p>
        <h2 className="login-welcome-title">Your private tour awaits</h2>
        <p className="login-welcome-copy">
          Exclusive access to <strong>{productName}</strong> is now unlocked.
        </p>
        {!isPhone && (
          <>
            <PremiumPerks
              compact
              items={[
                "Full building explorer unlocked",
                "Priority reservation pathway",
                "Personal concierge on WhatsApp",
              ]}
            />
            <p className="login-welcome-tagline">Crafted for those who expect more.</p>
          </>
        )}
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
