"use client";

import { useEffect, useRef, useState } from "react";
import ProjectGalleryModal from "@/components/ProjectGalleryModal";
import { DOWNLOADS } from "@/data/downloads";

const PHONE_CLASS = "be-phone";

/** True for phones/tablets — including Android “Desktop site” where CSS media alone fails. */
function isPhoneLikeDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPod|iPad|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  const touch = navigator.maxTouchPoints > 0;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const narrow = window.matchMedia("(max-width: 1200px)").matches;
  // iPadOS 13+ can report as Mac with touch
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return touch && (coarse || noHover || narrow);
}

/**
 * Header menu is a burger on every screen. The dropdown holds Home, Downloads, and Log out.
 */
export default function ExplorerNavMenu({ onHome, onLogout, onOpenChange, galleryImages = [] }) {
  const [open, setOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const hasGallery = Array.isArray(galleryImages) && galleryImages.length > 0;

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      root.classList.toggle(PHONE_CLASS, isPhoneLikeDevice());
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      root.classList.remove(PHONE_CLASS);
    };
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
    document.documentElement.classList.toggle("be-nav-open", open);
    return () => document.documentElement.classList.remove("be-nav-open");
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || !downloadsOpen) return undefined;
    const menu = menuRef.current;
    if (!menu) return undefined;
    const frame = requestAnimationFrame(() => {
      menu.scrollTop = menu.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, downloadsOpen]);

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

  const openGallery = () => {
    if (!hasGallery) return;
    setOpen(false);
    setGalleryOpen(true);
  };

  // Close after the tap so iOS still follows the link. Unmounting the <a> during
  // click cancels the download on phones.
  const closeAfterDownload = () => {
    window.setTimeout(() => setOpen(false), 0);
  };

  return (
    <>
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
          <div className="be-nav-dropdown" role="menu" ref={menuRef}>
            <div className="be-nav-group">
              <button type="button" className="be-nav-item" role="menuitem" onClick={closeThen(onHome)}>
                Home
              </button>
              <button type="button" className="be-nav-item" role="menuitem">
                Location Map
              </button>
              <button type="button" className="be-nav-item" role="menuitem" onClick={openGallery}>
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
                DOWNLOADS.map((entry) =>
                  entry.items ? (
                    <div key={entry.label}>
                      <div className="be-nav-label">{entry.label}</div>
                      {entry.items.map((item) => (
                        <a
                          key={item.label}
                          href={item.url}
                          download
                          className="be-nav-item be-nav-item--sub"
                          role="menuitem"
                          onClick={closeAfterDownload}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <a
                      key={entry.label}
                      href={entry.url}
                      download
                      className="be-nav-item be-nav-item--sub"
                      role="menuitem"
                      onClick={closeAfterDownload}
                    >
                      {entry.label}
                    </a>
                  )
                )}
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

      {galleryOpen && hasGallery && (
        <ProjectGalleryModal images={galleryImages} onClose={() => setGalleryOpen(false)} />
      )}
    </>
  );
}
