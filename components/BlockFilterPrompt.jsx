"use client";

/**
 * Compact callout anchored above the block overlay on the first transition hold frame.
 */
export default function BlockFilterPrompt({ anchor }) {
  if (!anchor) return null;

  return (
    <div
      className="be-block-filter-prompt"
      style={{ left: `${anchor.leftPct}%`, top: `${anchor.topPct}%` }}
      role="status"
      aria-live="polite"
    >
      <div className="be-block-filter-prompt__copy">
        <strong>Select the block to filter</strong>
        <span>Tap a block to unlock filters</span>
      </div>
    </div>
  );
}
