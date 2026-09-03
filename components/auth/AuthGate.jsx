"use client";

import { useCallback, useEffect, useState } from "react";
import LoginPage from "@/components/auth/LoginPage";
import WelcomeModal from "@/components/auth/WelcomeModal";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthContext } from "@/components/auth/AuthContext";
import { preloadEntranceImage as defaultPreloadEntranceImage, preloadTourAssetsAfterLogin as defaultPreloadTourAssetsAfterLogin, preloadWelcomeBackgroundIdle as defaultPreloadWelcomeBackgroundIdle } from "@/lib/tourAssetPreload";
import { ENTRANCE_IMAGE as DEFAULT_ENTRANCE_IMAGE } from "@/data/assets";

const STORAGE_KEY = "oasis_access";
const IDLE_TIMEOUT_MS = 60 * 1000;

const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function AuthGate({
  children,
  deferUntilWelcome = true,
  preloadTourAfterLogin = false,
  tourPreload = null,
  entranceImage = DEFAULT_ENTRANCE_IMAGE,
  showWhatsApp = true,
  loginBrand = null,
  welcomeProduct = "The Oasis",
  loginBackgroundVideo = null,
  loginMinimal = false,
}) {
  const preloadEntranceImage = tourPreload?.preloadEntranceImage ?? defaultPreloadEntranceImage;
  const preloadTourAssetsAfterLogin =
    tourPreload?.preloadTourAssetsAfterLogin ?? defaultPreloadTourAssetsAfterLogin;
  const preloadWelcomeBackgroundIdle =
    tourPreload?.preloadWelcomeBackgroundIdle ?? defaultPreloadWelcomeBackgroundIdle;
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    try {
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
    if (!preloadTourAfterLogin || session) return;
    preloadWelcomeBackgroundIdle();
  }, [preloadTourAfterLogin, session]);

  useEffect(() => {
    if (!preloadTourAfterLogin || !session) return;
    preloadTourAssetsAfterLogin();
  }, [preloadTourAfterLogin, session]);

  const handleLogin = useCallback(({ name, coupon }) => {
    if (!coupon) {
      setLoginError("Please enter your invitation code to continue.");
      return;
    }
    setLoginError("");
    preloadEntranceImage();
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
    if (!session || showWelcome) return;

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
  }, [session, showWelcome, logout]);

  if (!ready) {
    return (
      <div className="login-page login-page--loading">
        <p className="login-loading">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage
        onSubmit={handleLogin}
        error={loginError}
        eyebrow={loginBrand?.eyebrow}
        title={loginBrand?.title}
        accent={loginBrand?.accent}
        codePlaceholder={loginBrand?.codePlaceholder}
        backgroundVideo={loginBackgroundVideo}
        minimal={loginMinimal}
      />
    );
  }

  const showApp = !deferUntilWelcome || !showWelcome;

  return (
    <AuthContext.Provider value={{ logout, session }}>
      {showApp && children}
      {showWhatsApp && <WhatsAppButton />}
      {showWelcome && (
        <WelcomeModal
          name={session.name}
          onContinue={dismissWelcome}
          entranceImage={entranceImage}
          preloadEntranceImage={preloadEntranceImage}
          productName={welcomeProduct}
        />
      )}
    </AuthContext.Provider>
  );
}
