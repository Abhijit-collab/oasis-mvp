"use client";

/**
 * Project wordmark (e.g. House of Krishna) — top-left, sized to the device.
 */
export default function ProjectBrandLogo({
  src,
  alt = "Brand",
  className = "",
  onClick,
  title,
}) {
  if (!src) return null;

  const classes = ["project-brand-logo", className].filter(Boolean).join(" ");
  const img = (
    <img src={src} alt={alt} draggable={false} decoding="async" />
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} title={title || alt} aria-label={alt}>
        {img}
      </button>
    );
  }

  return (
    <div className={classes} aria-label={alt}>
      {img}
    </div>
  );
}
