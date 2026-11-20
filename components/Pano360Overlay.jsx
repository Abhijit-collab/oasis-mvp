"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * One shared 360 viewer in a mid-size popup. Pass a scene URL to open it; pass null to close.
 * Closing blanks the iframe so the tour does not keep running.
 * Upright phones get a small popup. Landscape phones and desktop keep the wider window.
 */
export default function Pano360Overlay({ url, onClose }) {
  const open = Boolean(url);

  useEffect(() => {
    if (!open) return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={"pano360" + (open ? " pano360--open" : "")}
      role="dialog"
      aria-modal="true"
      aria-label="360 tour"
      aria-hidden={open ? "false" : "true"}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="pano360-panel"
        data-tour="pano-stage"
        onClick={(event) => event.stopPropagation()}
      >
        <iframe
          className="pano360-frame"
          src={open ? url : "about:blank"}
          title="360 tour"
          allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
          allowFullScreen
        />
        <button type="button" className="pano360-close" aria-label="Close 360 tour" onClick={onClose}>
          ×
        </button>
      </div>
    </div>,
    document.body
  );
}
