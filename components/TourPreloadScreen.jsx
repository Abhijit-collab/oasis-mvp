/** Full-screen tour buffering — shown after "Enter your private tour". */
export default function TourPreloadScreen({
  progress = 0,
  exiting = false,
  label,
  brandPrefix = "THE",
  brandName = "OASIS",
  variant = "bar",
}) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const message = label ?? (exiting ? "Opening your private tour\u2026" : "Preparing your private tour\u2026");
  const isFeather = variant === "feather";

  return (
    <div
      className={
        "be-root be-preload be-preload-overlay" +
        (exiting ? " be-preload--exit" : "") +
        (isFeather ? " be-preload--feather" : "")
      }
    >
      {isFeather ? (
        <PeacockFeatherFlight progress={pct} />
      ) : (
        <span className="be-crown be-preload-crown">&#9819;</span>
      )}
      <p className="be-preload-title">
        {brandPrefix ? (
          <>
            {brandPrefix} <b>{brandName}</b>
          </>
        ) : (
          <b>{brandName}</b>
        )}
      </p>
      <p className="be-preload-label">{message}</p>
      {!isFeather && (
        <div
          className="be-preload-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading tour assets"
        >
          <div className="be-preload-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="be-preload-pct">{pct}%</p>
    </div>
  );
}

function PeacockFeatherFlight({ progress }) {
  const t = progress / 100;
  const piece = (start, span = 22) => Math.min(1, Math.max(0, (progress - start) / span));

  return (
    <div
      className="hok-flight"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading tour assets"
    >
      <div className="hok-flight-track" aria-hidden>
        <span className="hok-flight-wake" style={{ width: `${Math.max(8, progress)}%` }} />
        <div
          className="hok-flight-bird"
          style={{
            left: `${4 + t * 84}%`,
            transform: `translate(-50%, -50%) rotate(${-8 + t * 10}deg)`,
          }}
        >
          <svg className="hok-flight-svg" viewBox="0 0 160 280" fill="none">
            <FeatherDefs />
            <g className="hok-flight-spin">
              <g style={{ opacity: 0.18 + piece(0, 12) * 0.82, transform: `translate(${(1 - piece(0, 18)) * -28}px, 0)` }}>
                <FeatherShaft />
              </g>
              <g style={{ opacity: piece(12, 24), transform: `translate(${(1 - piece(12, 24)) * -36}px, ${(1 - piece(12, 24)) * 10}px)` }}>
                <FeatherVanes />
              </g>
              <g style={{ opacity: piece(38, 28), transform: `translate(${(1 - piece(38, 28)) * -22}px, ${(1 - piece(38, 28)) * -8}px) scale(${0.7 + piece(38, 28) * 0.3})` }}>
                <FeatherEye />
              </g>
            </g>
          </svg>
          <span className="hok-flight-glow" />
        </div>
      </div>
    </div>
  );
}

function FeatherDefs() {
  return (
    <defs>
      <linearGradient id="hok-shaft" x1="80" y1="40" x2="80" y2="270">
        <stop offset="0%" stopColor="#f2d27e" />
        <stop offset="100%" stopColor="#8a6a28" />
      </linearGradient>
      <radialGradient id="hok-eye-gold" cx="50%" cy="42%" r="50%">
        <stop offset="0%" stopColor="#fff6c8" />
        <stop offset="35%" stopColor="#f2d27e" />
        <stop offset="100%" stopColor="#c9a44e" />
      </radialGradient>
      <radialGradient id="hok-eye-teal" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor="#7df3e6" />
        <stop offset="55%" stopColor="#0bb8a8" />
        <stop offset="100%" stopColor="#075e58" />
      </radialGradient>
      <radialGradient id="hok-eye-navy" cx="48%" cy="42%" r="55%">
        <stop offset="0%" stopColor="#1a2a4a" />
        <stop offset="100%" stopColor="#061018" />
      </radialGradient>
      <linearGradient id="hok-vane" x1="20" y1="40" x2="140" y2="240">
        <stop offset="0%" stopColor="#2ee6c5" />
        <stop offset="45%" stopColor="#d8b65a" />
        <stop offset="100%" stopColor="#1a8f7a" />
      </linearGradient>
    </defs>
  );
}

function FeatherShaft() {
  return <path d="M80 52 C 80 52 80 250 80 262" stroke="url(#hok-shaft)" strokeWidth="2.2" strokeLinecap="round" />;
}

function FeatherVanes() {
  return (
    <g>
      <ellipse cx="80" cy="148" rx="54" ry="92" stroke="url(#hok-vane)" strokeWidth="1.2" fill="rgba(0,229,204,.08)" />
      {[70, 92, 118, 148, 178, 206, 228].map((y, i) => (
        <g key={i} opacity={0.55 + (i % 3) * 0.12}>
          <path d={`M80 248 Q ${52 - i * 2} ${y - 20} 28 ${y - 40}`} stroke="url(#hok-vane)" strokeWidth="0.9" />
          <path d={`M80 248 Q ${108 + i * 2} ${y - 20} 132 ${y - 40}`} stroke="url(#hok-vane)" strokeWidth="0.9" />
        </g>
      ))}
    </g>
  );
}

function FeatherEye() {
  return (
    <g>
      <ellipse cx="80" cy="78" rx="28" ry="34" fill="url(#hok-eye-gold)" />
      <ellipse cx="80" cy="80" rx="18" ry="22" fill="url(#hok-eye-teal)" />
      <ellipse cx="80" cy="82" rx="9" ry="11" fill="url(#hok-eye-navy)" />
      <ellipse cx="77" cy="78" rx="3.2" ry="4" fill="#fff6c8" opacity="0.9" />
    </g>
  );
}
