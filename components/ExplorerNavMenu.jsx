"use client";

import { useEffect, useRef, useState } from "react";
import DownloadMenu from "@/components/DownloadMenu";

const DOWNLOAD_ITEMS = [
  { label: "Rera Certificate", href: "#" },
  { label: "Project Brochure", href: "#" },
  { label: "Architectural Plan", href: "#" },
];

/**
 * Desktop: horizontal nav links.
 * Mobile: top-right hamburger that opens a dropdown.
 */
export default function ExplorerNavMenu({ onHome, onLogout, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setDownloadsOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const closeThen = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <>
      <div className="be-links be-links--desktop">
        <span className="be-link" onClick={onHome} role="button" style={{ cursor: "pointer" }}>
          Home
        </span>
        <DownloadMenu />
        {["Location Map", "Gallery"].map((l) => (
          <span key={l} className="be-link">
            {l}
          </span>
        ))}
        <span className="be-link" onClick={onLogout} role="button" style={{ cursor: "pointer" }}>
          Log out
        </span>
      </div>

      <div className={"be-nav-mobile" + (open ? " open" : "")} ref={rootRef}>
        <button
          type="button"
          className="be-nav-burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
        {open && (
          <div className="be-nav-dropdown" role="menu">
            <div className="be-nav-group">
              <button type="button" className="be-nav-item" role="menuitem" onClick={closeThen(onHome)}>
                Home
              </button>
              <button type="button" className="be-nav-item" role="menuitem">
                Location Map
              </button>
              <button type="button" className="be-nav-item" role="menuitem">
                Gallery
              </button>
            </div>

            <div className={"be-nav-group" + (downloadsOpen ? " be-nav-group--open" : "")}>
              <button
                type="button"
                className="be-nav-item be-nav-item--toggle"
                aria-expanded={downloadsOpen}
                onClick={() => setDownloadsOpen((o) => !o)}
              >
                Downloads
                <span className={"be-nav-caret" + (downloadsOpen ? " open" : "")} aria-hidden>
                  ▾
                </span>
              </button>
              {downloadsOpen &&
                DOWNLOAD_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="be-nav-item be-nav-item--sub"
                    role="menuitem"
                    download
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
            </div>

            <div className="be-nav-group be-nav-group--end">
              <button
                type="button"
                className="be-nav-item"
                role="menuitem"
                onClick={closeThen(onLogout)}
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
