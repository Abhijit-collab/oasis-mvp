/** Full-screen tour buffering — shown after "Enter your private tour". */
export default function TourPreloadScreen({ progress = 0, exiting = false, label }) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  const message = label ?? (exiting ? "Opening your private tour\u2026" : "Preparing your private tour\u2026");

  return (
    <div className={"be-root be-preload be-preload-overlay" + (exiting ? " be-preload--exit" : "")}>
      <span className="be-crown be-preload-crown">&#9819;</span>
      <p className="be-preload-title">
        THE <b>OASIS</b>
      </p>
      <p className="be-preload-label">{message}</p>
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
      <p className="be-preload-pct">{pct}%</p>
    </div>
  );
}