"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "@/components/auth/LoginPage";
import WelcomeModal from "@/components/auth/WelcomeModal";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthContext } from "@/components/auth/AuthContext";

const STORAGE_KEY = "oasis_access";
const REFRESH_COUNT_KEY = "oasis_refresh_count";
const MAX_REFRESHES = 3;

function isPageReload() {
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  return nav?.type === "reload" || performance.navigation?.type === 1;
}

export default function AuthGate({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.coupon) {
          if (isPageReload()) {
            const count = parseInt(sessionStorage.getItem(REFRESH_COUNT_KEY) || "0", 10) + 1;
            if (count > MAX_REFRESHES) {
              sessionStorage.removeItem(STORAGE_KEY);
              sessionStorage.removeItem(REFRESH_COUNT_KEY);
              if (window.location.pathname !== "/") router.replace("/");
              setReady(true);
              return;
            }
            sessionStorage.setItem(REFRESH_COUNT_KEY, String(count));
          }
          setSession(parsed);
        }
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_COUNT_KEY);
    }
    setReady(true);
  }, [router]);

  const handleLogin = ({ name, coupon }) => {
    if (!coupon) {
      setLoginError("Please enter your coupon code to continue.");
      return;
    }
    setLoginError("");
    const next = { name, coupon, at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    sessionStorage.setItem(REFRESH_COUNT_KEY, "0");
    setSession(next);
    setShowWelcome(true);
  };

  const dismissWelcome = () => setShowWelcome(false);

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_COUNT_KEY);
    setSession(null);
    setShowWelcome(false);
    setLoginError("");
    router.push("/");
  };

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

  return (
    <AuthContext.Provider value={{ logout, session }}>
      {children}
      <WhatsAppButton />
      {showWelcome && <WelcomeModal name={session.name} onContinue={dismissWelcome} />}
    </AuthContext.Provider>
  );
}
