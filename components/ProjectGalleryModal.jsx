"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

function getFsEl() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

async function enterFs(el) {
  if (el.requestFullscreen) await el.requestFullscreen();
  else el.webkitRequestFullscreen?.();
}

async function exitFs() {
  if (!getFsEl()) return;
  if (document.exitFullscreen) await document.exitFullscreen();
  else document.webkitExitFullscreen?.();
}

/** Four-corner expand icon (fit-to-screen style). */
function ExpandCornersIcon() {
  return (
    <span className="pg-fs-icon" aria-hidden>
      <i className="pg-fs-c pg-fs-c--tl" />
      <i className="pg-fs-c pg-fs-c--tr" />
      <i className="pg-fs-c pg-fs-c--bl" />
      <i className="pg-fs-c pg-fs-c--br" />
    </span>
  );
}

function blockImageSave(e) {
  e.preventDefault();
  e.stopPropagation();
  return false;
}

/**
 * Minimal gallery popup: grid + expanded viewer + fullscreen image.
 */
export default function ProjectGalleryModal({ images = [], onClose, title = "Gallery" }) {
  const titleId = useId();
  const viewerRef = useRef(null);
  const fsExitAtRef = useRef(0);
  const cssFsRef = useRef(false);
  const pendingFsRef = useRef(false);
  const clickTimerRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(null);
  const [immersive, setImmersive] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const sync = () => {
      const phone =
        document.documentElement.classList.contains("be-phone") ||
        window.matchMedia("(max-width: 820px)").matches ||
        (window.matchMedia("(pointer: coarse)").matches &&
          window.matchMedia("(max-width: 1200px)").matches);
      setIsPhone(phone);
      setIsLandscape(window.matchMedia("(orientation: landscape)").matches);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      exitFs().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const el = viewerRef.current;
      if (!el) return;
      if (getFsEl() === el) {
        cssFsRef.current = false;
        setImmersive(true);
        return;
      }
      if (getFsEl()) {
        setImmersive(false);
        return;
      }
      if (!cssFsRef.current) {
        fsExitAtRef.current = Date.now();
        setImmersive(false);
      }
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const leaveImmersive = useCallback(async () => {
    cssFsRef.current = false;
    try {
      await exitFs();
    } catch {
      /* ignore */
    }
    setImmersive(false);
  }, []);

  const enterImmersive = useCallback(async () => {
    const el = viewerRef.current;
    if (!el) return;
    try {
      await enterFs(el);
      cssFsRef.current = false;
      setImmersive(true);
    } catch {
      cssFsRef.current = true;
      setImmersive(true);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (immersive) {
      await leaveImmersive();
      return;
    }
    await enterImmersive();
  }, [immersive, leaveImmersive, enterImmersive]);

  const openFullscreenAt = useCallback((index) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    pendingFsRef.current = true;
    setActive(index);
  }, []);

  const openViewerAt = useCallback((index) => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      setActive(index);
    }, 260);
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (active === null || !pendingFsRef.current) return undefined;
    pendingFsRef.current = false;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) enterImmersive();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [active, enterImmersive]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (immersive || getFsEl() === viewerRef.current) {
          leaveImmersive();
          return;
        }
        if (Date.now() - fsExitAtRef.current < 450) return;
        if (active !== null) setActive(null);
        else onClose?.();
        return;
      }
      if (active === null || !images.length) return;
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, images.length, immersive, leaveImmersive, onClose]);

  useEffect(() => {
    if (active === null) leaveImmersive();
  }, [active, leaveImmersive]);

  if (!mounted || typeof document === "undefined") return null;

  const activeImage = active !== null ? images[active] : null;

  return createPortal(
    <div
      className={
        "pg-overlay" +
        (immersive ? " pg-overlay--immersive" : "") +
        (isPhone ? " pg-overlay--phone" : "") +
        (isPhone && isLandscape ? " pg-overlay--landscape" : "")
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (immersive) return;
        if (active !== null) setActive(null);
        else onClose?.();
      }}
      onContextMenu={blockImageSave}
    >
      <div
        className={
          "pg-panel" +
          (activeImage ? " pg-panel--viewer" : "") +
          (immersive ? " pg-panel--immersive" : "")
        }
        onClick={(e) => e.stopPropagation()}
        onContextMenu={blockImageSave}
      >
        {!immersive && (
          <header className="pg-head">
            <div className="pg-head-text">
              <p className="pg-kicker">House of Krishna</p>
              <h2 id={titleId} className="pg-title">
                {title}
              </h2>
            </div>
            <button
              type="button"
              className="pg-close"
              aria-label={activeImage ? "Back to gallery" : "Close gallery"}
              onClick={() => {
                if (activeImage) setActive(null);
                else onClose?.();
              }}
            >
              ×
            </button>
          </header>
        )}

        {activeImage ? (
          <div ref={viewerRef} className={"pg-viewer" + (immersive ? " pg-viewer--fs" : "")}>
            <button
              type="button"
              className="pg-nav pg-nav--prev"
              aria-label="Previous image"
              onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
            >
              ‹
            </button>
            <div className="pg-viewer-frame">
              <div className="pg-viewer-shot">
                <img
                  src={activeImage.src}
                  alt=""
                  className="pg-viewer-img"
                  draggable={false}
                  onContextMenu={blockImageSave}
                  onDragStart={blockImageSave}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    if (!immersive) enterImmersive();
                  }}
                />
                {immersive ? (
                  <button
                    type="button"
                    className="pg-fs-close"
                    onClick={leaveImmersive}
                    aria-label="Close full screen"
                    title="Close"
                  >
                    ×
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pg-fs-btn pg-fs-btn--on-image"
                    onClick={toggleFullscreen}
                    aria-pressed={false}
                    aria-label="Enter full screen"
                    title="Full screen"
                  >
                    <ExpandCornersIcon />
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              className="pg-nav pg-nav--next"
              aria-label="Next image"
              onClick={() => setActive((i) => (i + 1) % images.length)}
            >
              ›
            </button>
            <p className={"pg-count" + (immersive ? " pg-count--fs" : "")}>
              {active + 1} / {images.length}
            </p>
          </div>
        ) : (
          <div className="pg-grid" role="list">
            {images.map((img, i) => (
              <div key={img.src} className="pg-cell" role="listitem">
                <button
                  type="button"
                  className="pg-cell-hit"
                  onClick={() => openViewerAt(i)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    openFullscreenAt(i);
                  }}
                  aria-label={`View image ${i + 1}`}
                >
                  <img
                    src={img.src}
                    alt=""
                    loading={i < 6 ? "eager" : "lazy"}
                    className="pg-thumb"
                    draggable={false}
                    onContextMenu={blockImageSave}
                    onDragStart={blockImageSave}
                  />
                  <span className="pg-cell-veil" aria-hidden />
                </button>
                <button
                  type="button"
                  className="pg-fs-btn pg-fs-btn--thumb"
                  onClick={() => openFullscreenAt(i)}
                  aria-label={`Full screen image ${i + 1}`}
                  title="Full screen"
                >
                  <ExpandCornersIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
