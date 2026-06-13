"use client";

import { useEffect, useRef, useState } from "react";

const ITEMS = [
  { label: "Rera Certificate", href: "#" },
  { label: "Project Brochure", href: "#" },
  { label: "Architectural Plan", href: "#" },
];

export default function DownloadMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={"be-download" + (open ? " open" : "")} ref={rootRef}>
      <button
        type="button"
        className="be-download-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Download
        <span className="be-download-chevron" aria-hidden>
          &#9662;
        </span>
      </button>
      {open && (
        <div className="be-download-menu" role="menu">
          {ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="be-download-item"
              role="menuitem"
              download
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
