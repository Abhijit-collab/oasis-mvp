"use client";

export default function PremiumBadge({ label = "Premium Access", size = "md" }) {
  return (
    <span className={"premium-badge premium-badge--" + size}>
      <span className="premium-badge-star" aria-hidden="true">
        &#9733;
      </span>
      {label}
    </span>
  );
}
