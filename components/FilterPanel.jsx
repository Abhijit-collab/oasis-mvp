"use client";

import { useMemo, useState, useEffect, useRef } from "react";

const FACING_LABELS = {
  N: "North",
  E: "East",
  S: "South",
  W: "West",
  NE: "North-East",
  NW: "North-West",
  SE: "South-East",
  SW: "South-West",
};

const STATUS_OPTIONS = [
  { val: "available", label: "Available", cls: "s-available", dot: "available" },
  { val: "reserved", label: "Reserved", cls: "s-reserved", dot: "reserved" },
  { val: "sold", label: "Sold", cls: "s-sold", dot: "sold" },
];

function Chip({ on, cls = "", dot, children, onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      className={`fp-chip ${cls} ${on ? "on" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {dot && <span className={`fp-dot ${dot}`} aria-hidden />}
      <span className="fp-chip-text">{children}</span>
    </span>
  );
}

/**
 * Animated glassmorphic filter panel for the Oasis explorer.
 */
export default function FilterPanel({
  units = [],
  onChange,
  onApply,
  onBlockChange,
  onActiveChange,
  selectedBlocks = [],
  className = "",
}) {
  const bhkOptions = useMemo(
    () => [...new Set(units.map((u) => String(u.bhk)))].filter(Boolean).sort(),
    [units]
  );
  const blockOptions = useMemo(
    () => [...new Set(units.map((u) => u.block))].filter(Boolean).sort(),
    [units]
  );
  const facingOptions = useMemo(
    () => [...new Set(units.map((u) => u.facing))].filter(Boolean),
    [units]
  );
  const sqftBounds = useMemo(() => {
    const xs = units.map((u) => u.sqft).filter((n) => typeof n === "number");
    if (!xs.length) return { min: 400, max: 2400 };
    return { min: Math.floor(Math.min(...xs) / 50) * 50, max: Math.ceil(Math.max(...xs) / 50) * 50 };
  }, [units]);
  const floorBounds = useMemo(() => {
    const xs = units.map((u) => u.floor).filter((n) => typeof n === "number");
    if (!xs.length) return { min: 1, max: 36 };
    return { min: Math.min(...xs), max: Math.max(...xs) };
  }, [units]);

  const [open, setOpen] = useState(true);
  const [bhk, setBhk] = useState(() => new Set());
  const [status, setStatus] = useState(() => new Set());
  const [block, setBlock] = useState(() => new Set());
  const [facing, setFacing] = useState(() => new Set());
  const [minSqft, setMinSqft] = useState(sqftBounds.min);
  const [minFloor, setMinFloor] = useState(floorBounds.min);

  useEffect(() => setMinSqft(sqftBounds.min), [sqftBounds.min]);
  useEffect(() => setMinFloor(floorBounds.min), [floorBounds.min]);

  useEffect(() => {
    const next = new Set(selectedBlocks.filter(Boolean));
    setBlock((prev) => {
      if (prev.size === next.size && [...prev].every((b) => next.has(b))) return prev;
      return next;
    });
  }, [selectedBlocks]);

  const toggleIn = (setFn) => (val) =>
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });

  const filtered = useMemo(
    () =>
      units.filter(
        (u) =>
          (bhk.size === 0 || bhk.has(String(u.bhk))) &&
          (status.size === 0 || status.has(u.status)) &&
          (block.size === 0 || block.has(u.block)) &&
          (facing.size === 0 || facing.has(u.facing)) &&
          (u.sqft == null || u.sqft >= minSqft) &&
          (u.floor == null || u.floor >= minFloor)
      ),
    [units, bhk, status, block, facing, minSqft, minFloor]
  );

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onChangeRef.current?.(filtered);
  }, [filtered]);

  useEffect(() => {
    onBlockChange?.([...block]);
  }, [block, onBlockChange]);

  const [display, setDisplay] = useState(filtered.length);
  const displayRef = useRef(filtered.length);
  useEffect(() => {
    let raf;
    const from = displayRef.current;
    const to = filtered.length;
    const start = performance.now();
    const dur = 260;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (to - from) * t);
      displayRef.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [filtered.length]);

  const activeCount =
    bhk.size +
    status.size +
    block.size +
    facing.size +
    (minSqft > sqftBounds.min ? 1 : 0) +
    (minFloor > floorBounds.min ? 1 : 0);

  useEffect(() => {
    onActiveChange?.(activeCount);
  }, [activeCount, onActiveChange]);

  const reset = () => {
    setBhk(new Set());
    setStatus(new Set());
    setBlock(new Set());
    setFacing(new Set());
    setMinSqft(sqftBounds.min);
    setMinFloor(floorBounds.min);
  };

  const sqftPct = ((minSqft - sqftBounds.min) / Math.max(1, sqftBounds.max - sqftBounds.min)) * 100;
  const floorPct = ((minFloor - floorBounds.min) / Math.max(1, floorBounds.max - floorBounds.min)) * 100;

  return (
    <div className={`fp ${className}`.trim()}>
      <button
        type="button"
        className={`fp-toggle ${open ? "open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="fp-toggle-ico" viewBox="0 0 24 24" aria-hidden>
          <polyline points="4 6 20 6" />
          <polyline points="7 12 17 12" />
          <polyline points="10 18 14 18" />
        </svg>
        <span>Filters</span>
        <span className={`fp-toggle-count ${activeCount > 0 ? "show" : ""}`}>{activeCount}</span>
      </button>

      <section className={`fp-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="fp-panel-inner">
          <div className="fp-panel-head">
            <span className="fp-panel-title">Refine your search</span>
            <button type="button" className="fp-reset" onClick={reset}>
              Reset all
            </button>
          </div>

          <div className="fp-panel-body">
          <div className="fp-group">
            <label className="fp-lbl">Configuration</label>
            <div className="fp-chips">
              {bhkOptions.map((v) => (
                <Chip key={v} on={bhk.has(v)} onClick={() => toggleIn(setBhk)(v)}>
                  {v} BHK
                </Chip>
              ))}
            </div>
          </div>

          <div className="fp-group">
            <label className="fp-lbl">Units</label>
            <div className="fp-chips">
              <Chip on={status.size === 0} onClick={() => setStatus(new Set())}>
                All
              </Chip>
              {STATUS_OPTIONS.map((s) => (
                <Chip
                  key={s.val}
                  cls={s.cls}
                  dot={s.dot}
                  on={status.has(s.val)}
                  onClick={() => toggleIn(setStatus)(s.val)}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="fp-group">
            <label className="fp-lbl">Block</label>
            <div className="fp-chips">
              {blockOptions.map((v) => (
                <Chip key={v} on={block.has(v)} onClick={() => toggleIn(setBlock)(v)}>
                  Block {v}
                </Chip>
              ))}
            </div>
          </div>

          <div className="fp-group">
            <label className="fp-lbl">Facing</label>
            <div className="fp-chips">
              {facingOptions.map((v) => (
                <Chip key={v} on={facing.has(v)} onClick={() => toggleIn(setFacing)(v)}>
                  {FACING_LABELS[v] || v}
                </Chip>
              ))}
            </div>
          </div>

          <div className="fp-group fp-group--slider">
            <label className="fp-lbl">Carpet area</label>
            <div className="fp-slider-row">
              <span className="fp-hint">Minimum</span>
              <span className="fp-val">
                {minSqft <= sqftBounds.min ? (
                  "Any"
                ) : (
                  <>
                    {minSqft.toLocaleString("en-IN")}+<small> sq.ft</small>
                  </>
                )}
              </span>
            </div>
            <div className="fp-slider-track">
              <input
                type="range"
                min={sqftBounds.min}
                max={sqftBounds.max}
                step={50}
                value={minSqft}
                style={{ "--fill": `${sqftPct}%` }}
                onChange={(e) => setMinSqft(+e.target.value)}
              />
            </div>
          </div>

          <div className="fp-group fp-group--slider">
            <label className="fp-lbl">Floor</label>
            <div className="fp-slider-row">
              <span className="fp-hint">Minimum</span>
              <span className="fp-val">
                {minFloor <= floorBounds.min ? "Any" : `Floor ${minFloor}+`}
              </span>
            </div>
            <div className="fp-slider-track">
              <input
                type="range"
                min={floorBounds.min}
                max={floorBounds.max}
                step={1}
                value={minFloor}
                style={{ "--fill": `${floorPct}%` }}
                onChange={(e) => setMinFloor(+e.target.value)}
              />
            </div>
          </div>
          </div>

          <div className="fp-panel-foot">
            <span className="fp-result">
              <b>{display}</b>
              <span className="fp-cap">homes match</span>
            </span>
            <button
              type="button"
              className="fp-apply"
              onClick={() => onApply?.(filtered)}
            >
              Show homes
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
