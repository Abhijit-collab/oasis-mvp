"use client";

import { useLayoutEffect, useRef, useState } from "react";
import localFont from "next/font/local";

const sanskrit = localFont({
  src: "../fonts/Samarkan.ttf",
  weight: "400",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: false,
});

const GAP = 16;

function visibleBox(el) {
  if (!el) return null;
  const box = el.getBoundingClientRect();
  if (box.width < 8 || box.height < 8) return null;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return null;
  return box;
}

/**
 * Left-side inscription. Stays in the band under the header logo and above AdoptXR,
 * scaling down on short screens so it never covers either mark.
 */
export default function TourAside({ title, lead, place, facts = [], amenities = [] }) {
  const boxRef = useRef(null);
  const fitRef = useRef(null);
  const [frame, setFrame] = useState(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const aside = boxRef.current;
    const fit = fitRef.current;
    if (!aside || !fit) return undefined;
    const root = aside.closest(".be-root") || aside.offsetParent;
    if (!root) return undefined;

    const measure = () => {
      const rootBox = root.getBoundingClientRect();
      const brand = visibleBox(
        root.querySelector(".project-brand-logo--explorer, .be-brand--logo, .be-brand")
      );
      const mark = visibleBox(root.querySelector(".adoptxr-mark--explorer"));
      const top = brand ? brand.bottom - rootBox.top + GAP : 12;
      const limit = mark ? mark.top - rootBox.top - GAP : rootBox.height - 100;
      const available = Math.max(72, limit - top);

      fit.style.transform = "none";
      const natural = fit.scrollHeight || 1;
      const nextScale = Math.min(1, Math.max(0.42, (available - 2) / natural));
      fit.style.transform = nextScale < 0.995 ? `scale(${nextScale})` : "";

      setFrame((prev) =>
        prev && Math.abs(prev.top - top) < 1 && Math.abs(prev.height - available) < 1
          ? prev
          : { top, height: available }
      );
      setScale((prev) => (Math.abs(prev - nextScale) < 0.01 ? prev : nextScale));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    root.querySelectorAll(".project-brand-logo--explorer, .be-brand, .adoptxr-mark--explorer, .adoptxr-mark--explorer img")
      .forEach((el) => ro.observe(el));
    window.addEventListener("resize", measure);
    const details = aside.querySelector("details");
    details?.addEventListener("toggle", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      details?.removeEventListener("toggle", measure);
    };
  }, [title, lead, place, facts, amenities]);

  if (!title) return null;

  return (
    <aside
      ref={boxRef}
      className={`tour-aside ${sanskrit.className}`}
      aria-label={title}
      style={
        frame
          ? { top: frame.top, bottom: "auto", height: frame.height, maxHeight: frame.height }
          : undefined
      }
    >
      <div
        ref={fitRef}
        className="tour-aside-fit"
        style={{ transform: scale < 0.995 ? `scale(${scale})` : undefined }}
      >
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
      </div>
    </aside>
  );
}
