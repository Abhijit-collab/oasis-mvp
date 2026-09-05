"use client";

import { useCallback, useEffect, useState } from "react";
import LoginPage from "@/components/auth/LoginPage";
import WelcomeModal from "@/components/auth/WelcomeModal";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthContext } from "@/components/auth/AuthContext";
import { preloadEntranceImage as defaultPreloadEntranceImage, preloadTourAssetsAfterLogin as defaultPreloadTourAssetsAfterLogin, preloadWelcomeBackgroundIdle as defaultPreloadWelcomeBackgroundIdle } from "@/lib/tourAssetPreload";
import { ENTRANCE_IMAGE as DEFAULT_ENTRANCE_IMAGE } from "@/data/assets";

const STORAGE_KEY = "oasis_access";
const IDLE_TIMEOUT_MS = 120 * 1000;

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
  loginBackgroundAudio = null,
  loginMinimal = false,
  projectLogo = null,
  projectLogoAlt = "Brand",
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
  const [idleSuspended, setIdleSuspended] = useState(false);

  useEffect(() => {
    // Refresh / hard refresh always starts logged out (session is memory-only).
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSession(null);
    setShowWelcome(false);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!preloadTourAfterLogin || session) return;
    // Login screen: warm welcome still only until teaser is fully buffered.
    preloadWelcomeBackgroundIdle();
  }, [preloadTourAfterLogin, session, preloadWelcomeBackgroundIdle]);

  const handleTeaserFullyBuffered = useCallback(() => {
    if (!preloadTourAfterLogin) return;
    // Teaser done — start Seq/Rev warm while user is still on login.
    preloadTourAssetsAfterLogin();
  }, [preloadTourAfterLogin, preloadTourAssetsAfterLogin]);

  useEffect(() => {
    if (!preloadTourAfterLogin || !session) return;
    // After login: ensure tour warm started (no-op if teaser already kicked it off).
    preloadTourAssetsAfterLogin();
  }, [preloadTourAfterLogin, session, preloadTourAssetsAfterLogin]);

  const handleLogin = useCallback(({ name, coupon }) => {
    if (!coupon) {
      setLoginError("Please enter your invitation code to continue.");
      return;
    }
    setLoginError("");
    preloadEntranceImage();
    const next = { name, coupon, at: Date.now() };
    setSession(next);
    setShowWelcome(true);
  }, [preloadEntranceImage]);

  const dismissWelcome = () => setShowWelcome(false);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("be-ios", "login-lock");
      document.body.classList.remove("rotate-prompt-open", "login-lock");
    }
    if (typeof window !== "undefined") {
      // Fresh navigation resets Safari layout viewport (reload alone can restore zoom).
      const url = new URL(window.location.href);
      url.searchParams.set("loggedout", String(Date.now()));
      window.location.replace(url.pathname + url.search + url.hash);
      return;
    }
    setSession(null);
    setShowWelcome(false);
    setLoginError("");
  }, []);

  useEffect(() => {
    // Welcome + buffering: don't idle-logout while the user is waiting on assets.
    if (!session || showWelcome || idleSuspended) return;

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
  }, [session, showWelcome, idleSuspended, logout]);

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
        backgroundAudio={loginBackgroundAudio}
        minimal={loginMinimal}
        projectLogo={projectLogo}
        projectLogoAlt={projectLogoAlt}
        onTeaserFullyBuffered={handleTeaserFullyBuffered}
      />
    );
  }

  const showApp = !deferUntilWelcome || !showWelcome;

  return (
    <AuthContext.Provider value={{ logout, session, setIdleSuspended }}>
      {showApp && children}
      {showWhatsApp && <WhatsAppButton />}
      {showWelcome && (
        <WelcomeModal
          name={session.name}
          onContinue={dismissWelcome}
          entranceImage={entranceImage}
          preloadEntranceImage={preloadEntranceImage}
          productName={welcomeProduct}
          projectLogo={projectLogo}
          projectLogoAlt={projectLogoAlt}
        />
      )}
    </AuthContext.Provider>
  );
}
