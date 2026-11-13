"use client";
import { useEffect, useState } from "react";
import { isConnectionSlow } from "@/hooks/usePreloadVideos";

const DISMISS_KEY = "oasis-slow-notice-dismissed";
const MESSAGE =
  "Your connection seems slow. For the smoothest experience, switch to a stronger Wi-Fi or mobile network.";

/** force=true shows it regardless of detection (used for long clip waits). */
export default function SlowNetworkNotice({ force = false }) {
  const [slow, setSlow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch { /* ignore */ }
    const check = () => setSlow(isConnectionSlow());
    check();
    window.addEventListener("oasis-speed", check);
    const c = navigator.connection;
    c?.addEventListener?.("change", check);
    return () => {
      window.removeEventListener("oasis-speed", check);
      c?.removeEventListener?.("change", check);
    };
  }, []);

  if (dismissed || !(slow || force)) return null;

  const close = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <div className="slow-net" role="status" aria-live="polite">
      <span>{MESSAGE}</span>
      <button type="button" onClick={close} aria-label="Dismiss">✕</button>
    </div>
  );
}
