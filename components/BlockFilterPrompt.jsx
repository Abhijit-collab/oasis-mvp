"use client";

/**
 * Compact callout anchored above an overlay zone (block, floor, or unit).
 */
export default function BlockFilterPrompt({
  anchor,
  title = "Select the block to filter",
  subtitle = "Tap a block to unlock filters",
}) {
  if (!anchor) return null;

  return (
    <div
      className="be-block-filter-prompt"
      style={{ left: `${anchor.leftPct}%`, top: `${anchor.topPct}%` }}
      role="status"
      aria-live="polite"
    >
      <div className="be-block-filter-prompt__copy">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
