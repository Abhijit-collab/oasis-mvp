"use client";

/**
 * Orbit pill — left / right arrows with an orbiting gold dot around a "360°" label.
 */
export default function RotateButton({
  onLeft,
  onRight,
  className = "",
  inactiveLeft = false,
  inactiveRight = false,
}) {
  const nudge = (e, dir) => {
    const core = e.currentTarget.parentElement?.querySelector(".rb-core");
    if (core?.animate) {
      core.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: `rotate(${dir * 12}deg)` },
          { transform: "rotate(0deg)" },
        ],
        { duration: 360, easing: "ease-out" }
      );
    }
  };

  return (
    <div className={`rb-pill ${className}`.trim()} role="group" aria-label="Rotate building view">
      <button
        type="button"
        className={"rb-arw rb-l" + (inactiveLeft ? " rb-arw--inactive" : "")}
        aria-label="Rotate left"
        aria-disabled={inactiveLeft || undefined}
        onClick={(e) => {
          if (inactiveLeft) return;
          nudge(e, -1);
          onLeft?.();
        }}
      >
        <svg className="rb-chev" viewBox="0 0 24 24" aria-hidden>
          <polyline points="15 5 8 12 15 19" />
        </svg>
      </button>

      <div className="rb-core">
        <span className="rb-ring" aria-hidden />
        <span className="rb-orbit" aria-hidden />
        <span className="rb-label">360°</span>
      </div>

      <button
        type="button"
        className={"rb-arw rb-r" + (inactiveRight ? " rb-arw--inactive" : "")}
        aria-label="Rotate right"
        aria-disabled={inactiveRight || undefined}
        onClick={(e) => {
          if (inactiveRight) return;
          nudge(e, 1);
          onRight?.();
        }}
      >
        <svg className="rb-chev" viewBox="0 0 24 24" aria-hidden>
          <polyline points="9 5 16 12 9 19" />
        </svg>
      </button>
    </div>
  );
}
