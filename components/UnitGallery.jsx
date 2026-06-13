"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUTOPLAY_MS = 3500;

export default function UnitGallery({ images, unitLabel, compact = false }) {
  const [expanded, setExpanded] = useState(null);
  const [active, setActive] = useState(0);
  const scrollRef = useRef(null);
  const pausedRef = useRef(false);
  const activeRef = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const getStep = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !el.children.length) return null;
    const first = el.children[0];
    const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 12;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const scrollTo = useCallback(
    (idx, smooth = true) => {
      const el = scrollRef.current;
      const step = getStep();
      if (!el || step === null) return;
      const next = Math.max(0, Math.min(idx, images.length - 1));
      el.scrollTo({ left: next * step, behavior: smooth ? "smooth" : "auto" });
      setActive(next);
    },
    [getStep, images.length]
  );

  const updateActive = useCallback(() => {
    const el = scrollRef.current;
    const step = getStep();
    if (!el || step === null) return;
    const idx = Math.round(el.scrollLeft / step);
    setActive(Math.max(0, Math.min(idx, images.length - 1)));
  }, [getStep, images.length]);

  useEffect(() => {
    setActive(0);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [images]);

  useEffect(() => {
    if (images.length <= 1 || expanded !== null) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const next = (activeRef.current + 1) % images.length;
      scrollTo(next);
    }, AUTOPLAY_MS);

    return () => clearInterval(id);
  }, [images.length, expanded, scrollTo]);

  if (!images?.length) return null;

  return (
    <>
      <div
        className={"be-unit-gallery" + (compact ? " be-unit-gallery--compact" : "")}
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
        onPointerDown={() => {
          pausedRef.current = true;
        }}
        onPointerUp={() => {
          pausedRef.current = false;
        }}
      >
        <div className="be-unit-gallery-head">
          <span className="be-unit-gallery-label">Unit gallery</span>
          <span className="be-unit-gallery-count">
            {active + 1} / {images.length}
          </span>
        </div>
        <div className="be-unit-gallery-frame">
          <div ref={scrollRef} className="be-unit-gallery-scroll" onScroll={updateActive}>
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                className={"be-unit-gallery-item" + (active === i ? " on" : "")}
                onClick={() => setExpanded(i)}
                aria-label={`View ${unitLabel} photo ${i + 1}`}
              >
                <img src={src} alt={`${unitLabel} — view ${i + 1}`} loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        </div>
        <div className="be-unit-gallery-dots" role="tablist" aria-label="Gallery slides">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Slide ${i + 1}`}
              className={"be-unit-gallery-dot" + (active === i ? " on" : "")}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      </div>

      {expanded !== null && (
        <div className="be-lightbox" onClick={() => setExpanded(null)}>
          <div className="be-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="be-lightbox-x" onClick={() => setExpanded(null)} aria-label="Close">
              &times;
            </button>
            <img src={images[expanded]} alt={`${unitLabel} — expanded view`} className="be-lightbox-img" />
            <div className="be-lightbox-nav">
              <button
                type="button"
                className="be-lightbox-arrow"
                disabled={expanded === 0}
                onClick={() => setExpanded((i) => Math.max(0, i - 1))}
                aria-label="Previous image"
              >
                &#8592;
              </button>
              <span className="be-lightbox-count">
                {expanded + 1} / {images.length}
              </span>
              <button
                type="button"
                className="be-lightbox-arrow"
                disabled={expanded === images.length - 1}
                onClick={() => setExpanded((i) => Math.min(images.length - 1, i + 1))}
                aria-label="Next image"
              >
                &#8594;
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
