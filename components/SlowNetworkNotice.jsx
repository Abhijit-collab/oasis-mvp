"use client";
import { useEffect, useState } from "react";
import { isConnectionSlow } from "@/hooks/usePreloadVideos";

const DISMISS_KEY = "oasis-slow-notice-dismissed";
const STRUGGLE_MS = 8000;
const MESSAGE =
  "Your connection seems slow. For the smoothest experience, switch to a stronger Wi-Fi or mobile network.";

/**
 * Shown only when the link is slow and media has been loading for a while.
 * A normal Wi-Fi buffer does not qualify.
 */
export default function SlowNetworkNotice({ loading = false }) {
  const [slow, setSlow] = useState(false);
  const [struggling, setStruggling] = useState(false);
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

  useEffect(() => {
    if (!loading) {
      setStruggling(false);
      return undefined;
    }
    const t = setTimeout(() => setStruggling(true), STRUGGLE_MS);
    return () => clearTimeout(t);
  }, [loading]);

  if (dismissed || !slow || !struggling) return null;

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
