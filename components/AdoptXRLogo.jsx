"use client";

const LOGOS = {
  white: "https://d3deuzgnmq8y32.cloudfront.net/adoptXR-logo/AdoptXR+Logo_white.png",
  dark: "https://d3deuzgnmq8y32.cloudfront.net/adoptXR-logo/AdoptXR+Logo_dark.png",
};

/**
 * Discreet AdoptXR mark — corner watermark that stays clear of tour controls.
 * @param {"white"|"dark"} variant — white on dark video/360, dark on light UI
 * @param {"login"|"explorer"} placement — tunes corner/safe-area per screen
 */
export default function AdoptXRLogo({ variant = "white", placement = "login" }) {
  const src = LOGOS[variant] || LOGOS.white;

  return (
    <div
      className={"adoptxr-mark adoptxr-mark--" + placement}
      aria-label="AdoptXR"
    >
      <img src={src} alt="AdoptXR" draggable={false} />
    </div>
  );
}
