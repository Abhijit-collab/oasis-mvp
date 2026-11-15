"use client";

import localFont from "next/font/local";

const samarkan = localFont({
  src: "../fonts/Samarkan.ttf",
  weight: "400",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: false,
});

/**
 * Left-side inscription for the 360 tour.
 * English copy, set in Samarkan so the letters hang from a Sanskrit headline.
 */
export default function TourAside({ title, lead, place, facts = [], amenities = [] }) {
  if (!title) return null;

  return (
    <aside className={`tour-aside ${samarkan.className}`} aria-label={title}>
      <h2 className="tour-aside-title">{title}</h2>
      <div className="tour-aside-rule" aria-hidden="true">
        <span />
        <i />
        <span />
      </div>
      {lead ? <p className="tour-aside-lead">{lead}</p> : null}
      {place ? <p className="tour-aside-place">{place}</p> : null}
      {facts.length > 0 ? (
        <div className="tour-aside-facts">
          {facts.map((fact) => (
            <p key={`${fact.value}-${fact.label}`}>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
            </p>
          ))}
        </div>
      ) : null}
      {amenities.length > 0 ? (
        <details className="tour-aside-amenities">
          <summary>Amenities</summary>
          <div className="tour-aside-amenity-list">
            {amenities.map((item) => (
              <p key={item} className="tour-aside-amenity">{item}</p>
            ))}
          </div>
        </details>
      ) : null}
    </aside>
  );
}
