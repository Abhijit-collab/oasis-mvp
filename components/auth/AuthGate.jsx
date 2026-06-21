"use client";

import { useCallback, useEffect, useState } from "react";
import LoginPage from "@/components/auth/LoginPage";
import WelcomeModal from "@/components/auth/WelcomeModal";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthContext } from "@/components/auth/AuthContext";
import { preloadEntranceImage, prefetchTourVideos } from "@/lib/tourAssetPreload";

const STORAGE_KEY = "oasis_access";
const IDLE_TIMEOUT_MS = 60 * 1000;

const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

function isPageReload() {
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  return nav?.type === "reload" || performance.navigation?.type === 1;
}

export default function AuthGate({ children, deferUntilWelcome = true }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    try {
      if (isPageReload()) {
        sessionStorage.removeItem(STORAGE_KEY);
        setReady(true);
        return;
      }

      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.coupon) setSession(parsed);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    preloadEntranceImage();
  }, []);

  useEffect(() => {
    if (showWelcome) prefetchTourVideos();
  }, [showWelcome]);

  const handleLogin = useCallback(({ name, coupon }) => {
    if (!coupon) {
      setLoginError("Please enter your invitation code to continue.");
      return;
    }
    setLoginError("");
    const next = { name, coupon, at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    setShowWelcome(true);
  }, []);

  const dismissWelcome = () => setShowWelcome(false);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setShowWelcome(false);
    setLoginError("");
  }, []);

  useEffect(() => {
    if (!session) return;

    const timeoutRef = { id: null };

    const resetIdleTimer = () => {
      clearTimeout(timeoutRef.id);
      timeoutRef.id = setTimeout(logout, IDLE_TIMEOUT_MS);
    };

    const onActivity = () => resetIdleTimer();

    IDLE_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    resetIdleTimer();

    return () => {
      clearTimeout(timeoutRef.id);
      IDLE_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [session, logout]);

  if (!ready) {
    return (
      <div className="login-page login-page--loading">
        <p className="login-loading">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage onSubmit={handleLogin} error={loginError} />;
  }

  const showApp = !deferUntilWelcome || !showWelcome;

  return (
    <AuthContext.Provider value={{ logout, session }}>
      {showApp && children}
      <WhatsAppButton />
      {showWelcome && <WelcomeModal name={session.name} onContinue={dismissWelcome} />}
    </AuthContext.Provider>
  );
}
