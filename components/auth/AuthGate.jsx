"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "@/components/auth/LoginPage";
import WelcomeModal from "@/components/auth/WelcomeModal";
import WhatsAppButton from "@/components/WhatsAppButton";
import { AuthContext } from "@/components/auth/AuthContext";

const STORAGE_KEY = "oasis_access";

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
        if (parsed?.coupon) setSession(parsed);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  const handleLogin = ({ name, coupon }) => {
    if (!coupon) {
      setLoginError("Please enter your coupon code to continue.");
      return;
    }
    setLoginError("");
    const next = { name, coupon, at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
    setShowWelcome(true);
  };

  const dismissWelcome = () => setShowWelcome(false);

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
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
