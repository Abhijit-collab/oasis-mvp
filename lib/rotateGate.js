/** Shared mobile landscape gate — keeps rotate overlay up until landscape is stable. */

export function isMobileTourDevice() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px) and (pointer: coarse)").matches ||
    (window.matchMedia("(max-width: 820px)").matches && navigator.maxTouchPoints > 0) ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
}

/** True landscape: orientation media + width clearly greater than height. */
export function isStableLandscape() {
  if (typeof window === "undefined") return true;
  const oriented = window.matchMedia("(orientation: landscape)").matches;
  const sized = window.innerWidth > window.innerHeight + 24;
  return oriented && sized;
}

export const ROTATE_OK_CLASS = "rotate-ok";
export const ROTATE_SETTLE_MS = 500;

export function setRotateOk(on) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(ROTATE_OK_CLASS, Boolean(on));
  document.body.classList.toggle("rotate-prompt-open", !on && isMobileTourDevice());
  window.dispatchEvent(
    new CustomEvent("oasis-rotate-gate", { detail: { ok: Boolean(on) } })
  );
}

export function isRotateOk() {
  if (typeof document === "undefined") return true;
  if (!isMobileTourDevice()) return true;
  return document.documentElement.classList.contains(ROTATE_OK_CLASS);
}
