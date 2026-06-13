"use client";

export default function WelcomeModal({ name, onContinue }) {
  const guest = name || "Guest";

  return (
    <div className="login-welcome-bg">
      <div className="login-welcome-modal">
        <div className="login-welcome-glow" aria-hidden />
        <span className="login-welcome-spark">&#10022;</span>
        <p className="login-welcome-kicker">Welcome, {guest}</p>
        <h2 className="login-welcome-title">Your private tour awaits</h2>
        <p className="login-welcome-copy">
          Thank you for joining this exclusive preview of <strong>The Oasis</strong>. Step onto the terrace,
          glide through every floor, and discover the residence meant for you — before anyone else does.
        </p>
        <p className="login-welcome-tagline">Where the skyline meets your story.</p>
        <button type="button" className="login-btn" onClick={onContinue}>
          Begin exploring
        </button>
      </div>
    </div>
  );
}
