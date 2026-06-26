"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";

const STATUS_OPTIONS = [  { val: "available", label: "Available", cls: "s-available", dot: "available" },
  { val: "sold", label: "Sold", cls: "s-sold", dot: "sold" },
  { val: "reserved", label: "Reserved", cls: "s-reserved", dot: "reserved" },
];

const BHK_OPTIONS = ["1", "2", "3"];

function Chip({ on, cls = "", dot, children, onClick, disabled = false }) {
  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      className={`fp-chip ${cls} ${on && !disabled ? "on" : ""}${disabled ? " fp-chip--disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
      }
    >
      {dot && <span className={`fp-dot ${dot}`} aria-hidden />}
      <span className="fp-chip-text">{children}</span>
    </span>
  );
}

/**
 * Animated glassmorphic filter panel for the Oasis explorer.
 * `selectedBlocks` reflects map selection (chip highlight only).
 * `userBlocks` holds filter-panel toggles that affect the unit query.
 */
export default function FilterPanel({
  units = [],
  onChange,
  onBlockChange,
  onActiveChange,
  onAllStatusesSelect,
  onAllStatusesDeselect,
  onClearFloors,
  onFloorFilterChange,
  floorSliderRange = null,
  selectedBlocks = [],
  applyMapBlocksToFilter = false,
  interactive = true,
  open: openProp,
  onOpenChange,
  className = "",
}) {
  const bhkOptions = BHK_OPTIONS;
  const blockOptions = useMemo(
    () => [...new Set(units.map((u) => u.block))].filter(Boolean).sort(),
    [units]
  );
  const sqftBounds = useMemo(() => {
    const xs = units.map((u) => u.sqft).filter((n) => typeof n === "number");
    if (!xs.length) return { min: 400, max: 2400 };
    return { min: Math.floor(Math.min(...xs) / 50) * 50, max: Math.ceil(Math.max(...xs) / 50) * 50 };
  }, [units]);
  const floorBounds = useMemo(() => {
    if (floorSliderRange?.min != null && floorSliderRange?.max != null) {
      return { min: floorSliderRange.min, max: floorSliderRange.max };
    }
    const xs = units.map((u) => u.floor).filter((n) => typeof n === "number");
    if (!xs.length) return { min: 1, max: 4 };
    return { min: Math.min(...xs), max: Math.max(...xs) };
  }, [floorSliderRange, units]);

  const blockKey = selectedBlocks.join("\0");
  const mapBlocks = useMemo(
    () => new Set(selectedBlocks.filter(Boolean)),
    [blockKey]
  );

  const [openInternal, setOpenInternal] = useState(true);
  const isOpenControlled = openProp !== undefined;
  const open = isOpenControlled ? openProp : openInternal;
  const setOpen = useCallback(
    (updater) => {
      if (isOpenControlled) {
        onOpenChange?.(updater);
        return;
      }
      setOpenInternal(updater);
    },
    [isOpenControlled, onOpenChange]
  );
  const [bhk, setBhk] = useState(() => new Set());
  const [status, setStatus] = useState(() => new Set());
  const [allStatusesSelected, setAllStatusesSelected] = useState(false);
  const [userBlocks, setUserBlocks] = useState(() => new Set());
  const [minSqft, setMinSqft] = useState(sqftBounds.min);
  const [visibleFloorCount, setVisibleFloorCount] = useState(0);

  const userBlockKey = [...userBlocks].sort().join("\0");
  const queryBlocks = useMemo(() => {
    if (!applyMapBlocksToFilter) return userBlocks;
    const next = new Set(userBlocks);
    mapBlocks.forEach((b) => next.add(b));
    return next;
  }, [applyMapBlocksToFilter, blockKey, userBlockKey, userBlocks, mapBlocks]);

  useEffect(() => setMinSqft(sqftBounds.min), [sqftBounds.min]);
  useEffect(() => {
    setVisibleFloorCount(0);
  }, [floorBounds.max, blockKey]);

  useEffect(() => {
    if (!interactive || blockKey === "") setUserBlocks(new Set());
  }, [blockKey, interactive]);

  const isBlockChipOn = (val) => mapBlocks.has(val) || userBlocks.has(val);

  const toggleBlock = (val) => {
    if (mapBlocks.has(val)) {
      onBlockChange?.(selectedBlocks.filter((b) => b !== val));
      if (userBlocks.has(val)) {
        setUserBlocks((prev) => {
          const next = new Set(prev);
          next.delete(val);
          return next;
        });
      }
      return;
    }

    const next = new Set(userBlocks);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setUserBlocks(next);
    onBlockChange?.([...next]);
  };

  const toggleIn = (setFn) => (val) =>
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });

  const toggleStatus = (val) => {
    setAllStatusesSelected(false);
    setStatus((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const filtered = useMemo(
    () =>
      units.filter(
        (u) =>
          (bhk.size === 0 || bhk.has(String(u.bhk))) &&
          (status.size === 0 || status.has(u.status)) &&
          (queryBlocks.size === 0 || queryBlocks.has(u.block)) &&
          (u.sqft == null || u.sqft >= minSqft)
      ),
    [units, bhk, status, queryBlocks, minSqft]
  );

  const activeCount =
    bhk.size +
    status.size +
    queryBlocks.size +
    (minSqft > sqftBounds.min ? 1 : 0);

  const onChangeRef = useRef(onChange);
  const lastFilteredKeyRef = useRef("");

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!interactive) return;
    const key = filtered.map((u) => u.id).join("\0");
    if (key === lastFilteredKeyRef.current) return;
    lastFilteredKeyRef.current = key;
    onChangeRef.current?.(filtered);
  }, [filtered, interactive]);

  const onActiveChangeRef = useRef(onActiveChange);
  const lastActiveCountRef = useRef(activeCount);

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  });

  useEffect(() => {
    if (!interactive) return;
    if (activeCount === lastActiveCountRef.current) return;
    lastActiveCountRef.current = activeCount;
    onActiveChangeRef.current?.(activeCount);
  }, [activeCount, interactive]);

  useEffect(() => {
    if (!interactive) return;
    onFloorFilterChange?.(visibleFloorCount > 0 ? visibleFloorCount : null);
  }, [visibleFloorCount, interactive, onFloorFilterChange]);

  const [display, setDisplay] = useState(filtered.length);
  const displayRef = useRef(filtered.length);

  useEffect(() => {
    let raf;
    const from = displayRef.current;
    const to = filtered.length;
    if (from === to) return undefined;
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

  const toggleAllStatuses = () => {
    if (allStatusesSelected) {
      setAllStatusesSelected(false);
      onAllStatusesDeselect?.(activeCount);
      return;
    }
    setStatus(new Set());
    setAllStatusesSelected(true);
    setVisibleFloorCount(0);
    onClearFloors?.();
    onAllStatusesSelect?.();
  };

  const reset = () => {
    if (!interactive) return;
    setBhk(new Set());
    setStatus(new Set());
    setAllStatusesSelected(false);
    setUserBlocks(new Set());
    setMinSqft(sqftBounds.min);
    setVisibleFloorCount(0);
    onBlockChange?.([]);
    onClearFloors?.();
  };

  const noop = () => {};

  const sqftPct = ((minSqft - sqftBounds.min) / Math.max(1, sqftBounds.max - sqftBounds.min)) * 100;
  const floorPct = (visibleFloorCount / Math.max(1, floorBounds.max)) * 100;

  const handleFloorSliderChange = (value) => {
    setVisibleFloorCount(value);
    onClearFloors?.();
  };

  return (
    <div className={`fp ${interactive ? "" : "fp--static"} ${className}`.trim()}>
      <button
        type="button"
        className={`fp-toggle ${open ? "open" : ""}`}
        aria-expanded={open}
        aria-label={open ? "Collapse filters" : "Expand filters"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="fp-toggle-ico" viewBox="0 0 24 24" aria-hidden>
          <polyline points="4 6 20 6" />
          <polyline points="7 12 17 12" />
          <polyline points="10 18 14 18" />
        </svg>
        <span>Filters</span>
        <span className={`fp-toggle-count ${interactive && activeCount > 0 ? "show" : ""}`}>
          {activeCount}
        </span>
        <svg className="fp-toggle-chevron" viewBox="0 0 24 24" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <section className={`fp-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="fp-panel-inner">
          <div className="fp-panel-head">
            <div className="fp-panel-head-left">
              <button
                type="button"
                className="fp-panel-back"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                &larr;
              </button>
              <span className="fp-panel-title">Refine your search</span>
            </div>
            <button type="button" className="fp-reset" onClick={reset} disabled={!interactive}>
              Reset all
            </button>
          </div>

          <div className="fp-panel-body">
            <div className="fp-group">
              <label className="fp-lbl">Configuration</label>
              <div className="fp-chips">
                {bhkOptions.map((v) => (
                  <Chip
                    key={v}
                    disabled={!interactive}
                    on={interactive ? bhk.has(v) : false}
                    onClick={interactive ? () => toggleIn(setBhk)(v) : noop}
                  >
                    {v} BHK
                  </Chip>
                ))}
              </div>
            </div>

            <div className="fp-group">
              <label className="fp-lbl">Units</label>
              <div className="fp-chips">
                <Chip
                  disabled={!interactive}
                  on={interactive && allStatusesSelected}
                  onClick={interactive ? toggleAllStatuses : noop}
                >
                  All
                </Chip>
                {STATUS_OPTIONS.map((s) => (
                  <Chip
                    key={s.val}
                    disabled={!interactive}
                    cls={s.cls}
                    dot={s.dot}
                    on={interactive ? status.has(s.val) : false}
                    onClick={interactive ? () => toggleStatus(s.val) : noop}
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
                  <Chip
                    key={v}
                    disabled={!interactive}
                    on={interactive ? isBlockChipOn(v) : false}
                    onClick={interactive ? () => toggleBlock(v) : noop}
                  >
                    Block {v}
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
                  disabled={!interactive}
                  style={{ "--fill": `${sqftPct}%` }}
                  onChange={(e) => interactive && setMinSqft(+e.target.value)}
                />
              </div>
            </div>

            <div className="fp-group fp-group--slider">
              <label className="fp-lbl">Floor</label>
              <div className="fp-slider-row">
                <span className="fp-hint">Up to</span>
                <span className="fp-val">
                  {visibleFloorCount === 0
                    ? "—"
                    : visibleFloorCount === 1
                      ? "Floor 1"
                      : `Floors 1–${visibleFloorCount}`}
                </span>
              </div>
              <div className="fp-slider-track">
                <input
                  type="range"
                  min={0}
                  max={floorBounds.max}
                  step={1}
                  value={visibleFloorCount}
                  disabled={!interactive}
                  style={{ "--fill": `${floorPct}%` }}
                  onChange={(e) => interactive && handleFloorSliderChange(+e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="fp-panel-foot">
            <span className="fp-result">
              <b>{display}</b>
              <span className="fp-cap">homes match</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
