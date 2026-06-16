"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS, FLOORS, UNITS, PROJECT, getUnitImages, getUnitBrochureUrl } from "@/data/building";
import FloorSlider from "@/components/FloorSlider";
import DownloadMenu from "@/components/DownloadMenu";
import UnitGallery from "@/components/UnitGallery";
import { useAuth } from "@/components/auth/AuthContext";
import PremiumBadge from "@/components/PremiumBadge";

const pts = (a) => a.map((p) => p.join(",")).join(" ");

const isUnitSold = (u) => u.status === "sold";
const defaultUnitFilter = () => ({ all: false, available: false, sold: false });

const matchesUnitFilters = (id, units, filter, sqft) => {
  if (sqft !== null && units[id].area !== sqft) return false;
  if (filter.all) return true;
  const sold = isUnitSold(units[id]);
  const statusFilter = filter.available || filter.sold;
  if (!statusFilter) return true;
  return sold ? filter.sold : filter.available;
};

const isUnitFilterActive = (filter) => filter.all || filter.available || filter.sold;

// Anchor hover cards on the polygon roofline at horizontal center.
const anchorAbove = (points) => {
  const xs = points.map((p) => p[0]);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  let topY = Infinity;

  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const edgeMinX = Math.min(x1, x2);
    const edgeMaxX = Math.max(x1, x2);
    if (centerX < edgeMinX || centerX > edgeMaxX) continue;
    if (x1 === x2) {
      topY = Math.min(topY, y1, y2);
      continue;
    }
    const y = y1 + ((centerX - x1) * (y2 - y1)) / (x2 - x1);
    topY = Math.min(topY, y);
  }

  if (!Number.isFinite(topY)) {
    topY = Math.min(...points.map((p) => p[1]));
  }

  return [centerX, topY];
};

// `liveUnits` is an array from the Lambda/DynamoDB (sourced from the Google Sheet),
// e.g. [{ unitId: "301", status: "sold", price: "₹1.30 Cr" }]. Only the fields present
// override the static geometry/details; everything else stays as defined in building.js.
export default function BuildingExplorer({ src = "/oasis-elevation.jpg", liveUnits = null }) {
  const router = useRouter();
  const { logout } = useAuth() || {};
  const [block, setBlock] = useState(null);
  const [floor, setFloor] = useState(null);
  const [unit, setUnit] = useState(null);
  const [hoverBlock, setHoverBlock] = useState(null);
  const [hoverFloor, setHoverFloor] = useState(null);
  const [hoverUnit, setHoverUnit] = useState(null);
  const [modal, setModal] = useState(null);
  const [sent, setSent] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [sqftSlider, setSqftSlider] = useState([0]);
  const [unitFilter, setUnitFilter] = useState(defaultUnitFilter);
  const unitPanelRef = useRef(null);

  const applySqftSlider = (value) => {
    const statusFilterActive = isUnitFilterActive(unitFilter);
    const changed = value[0] !== sqftSlider[0];
    setSqftSlider(value);
    if (!block) return;
    setFloor(null);
    setUnit(null);
    setHoverUnit(null);
    setHoverFloor(null);
    if (statusFilterActive || changed) setUnitFilter(defaultUnitFilter());
  };

  const onSqftSliderInteract = () => {
    if (sqftSlider[0] === 0 && !isUnitFilterActive(unitFilter)) return;
    if (sqftSlider[0] > 0) return;
    setUnitFilter(defaultUnitFilter());
    setFloor(null);
    setUnit(null);
    setHoverUnit(null);
    setHoverFloor(null);
  };

  const units = useMemo(() => {
    if (!Array.isArray(liveUnits) || liveUnits.length === 0) return UNITS;
    const merged = {};
    for (const id of Object.keys(UNITS)) merged[id] = { ...UNITS[id] };
    for (const row of liveUnits) {
      if (row && row.unitId && merged[row.unitId]) {
        merged[row.unitId] = { ...merged[row.unitId], ...row };
      }
    }
    return merged;
  }, [liveUnits]);

  const curBlock = block ? BLOCKS.find((b) => b.name === block) : null;
  // Floors that belong to the selected block (falls back to all floors).
  const blockFloors = curBlock
    ? FLOORS.filter((f) => curBlock.floors.includes(f.name))
    : FLOORS;
  const curFloor = floor ? FLOORS.find((f) => f.name === floor) : null;
  const curUnit = unit ? units[unit] : null;
  const floorLevel = (name) => parseInt(name.replace(/\D/g, ""), 10) || 0;
  const maxFloorLevel = useMemo(
    () => (blockFloors.length ? Math.max(...blockFloors.map((f) => floorLevel(f.name))) : 4),
    [blockFloors]
  );

  const floorSliderValue = useMemo(() => [floor ? floorLevel(floor) : 0], [floor]);

  const applyFloorSlider = (value) => {
    const level = value[0];
    if (level === 0) {
      setFloor(null);
      setUnit(null);
      setHoverUnit(null);
      setHoverFloor(null);
      return;
    }
    const match = blockFloors.find((f) => floorLevel(f.name) === level);
    if (match) {
      setFloor(match.name);
      setUnit(null);
      setHoverUnit(null);
      setHoverFloor(null);
    }
  };

  const scopedUnitIds = useMemo(() => {
    if (!block) return [];
    if (floor && curFloor) return curFloor.units;
    return blockFloors.flatMap((f) => f.units);
  }, [block, floor, curFloor, blockFloors]);

  const blockSqftOptions = useMemo(() => {
    const ids = block ? blockFloors.flatMap((f) => f.units) : [];
    return [...new Set(ids.map((id) => units[id].area))].sort((a, b) => a - b);
  }, [block, blockFloors, units]);

  const sqftFilter = sqftSlider[0] > 0 ? blockSqftOptions[sqftSlider[0] - 1] : null;
  const sqftSliderMax = blockSqftOptions.length;

  const showFilteredUnits = isUnitFilterActive(unitFilter) || sqftFilter !== null;

  const unitVisible = (id) => matchesUnitFilters(id, units, unitFilter, sqftFilter);

  const visibleUnitIds = useMemo(() => {
    if (!block) return [];
    if (floor && curFloor) return curFloor.units;
    if (!showFilteredUnits) return [];
    return scopedUnitIds.filter((id) => unitVisible(id));
  }, [block, floor, curFloor, showFilteredUnits, scopedUnitIds, unitFilter, units]);

  const canShowUnitTip = (id) => {
    if (floor && curFloor) return curFloor.units.includes(id);
    return unitVisible(id);
  };

  const toggleUnitFilter = (key) => {
    setUnitFilter((prev) => {
      let next;
      if (key === "all") {
        next = prev.all ? defaultUnitFilter() : { all: true, available: false, sold: false };
      } else {
        next = { ...prev, all: false, [key]: !prev[key] };
      }

      if (!floor && !isUnitFilterActive(next) && sqftSlider[0] === 0) {
        setUnit(null);
        setHoverUnit(null);
      } else if (!floor && unit && !matchesUnitFilters(unit, units, next, sqftFilter)) {
        setUnit(null);
        setHoverUnit(null);
      }
      return next;
    });
  };

  const reset = () => {
    setBlock(null);
    setFloor(null);
    setUnit(null);
    setHoverBlock(null);
    setHoverFloor(null);
    setHoverUnit(null);
    setModal(null);
    setSent(false);
    setSqftSlider([0]);
    setUnitFilter(defaultUnitFilter());
  };

  const resetFilters = () => {
    setFloor(null);
    setUnit(null);
    setHoverFloor(null);
    setHoverUnit(null);
    setSqftSlider([0]);
    setUnitFilter(defaultUnitFilter());
  };

  const hasActiveFilters =
    floor !== null || sqftSlider[0] > 0 || isUnitFilterActive(unitFilter);
  const back = () => {
    if (unit) setUnit(null);
    else if (floor) setFloor(null);
    else if (block) {
      setBlock(null);
      setFloor(null);
      setSqftSlider([0]);
      setUnitFilter(defaultUnitFilter());
    }
  };
  const pickBlock = (n) => {
    const b = BLOCKS.find((x) => x.name === n);
    if (!b?.available) return;
    setBlock(n);
    setSqftSlider([0]);
    setFloor(null);
    setUnit(null);
    setHoverFloor(null);
    setHoverUnit(null);
    setUnitFilter(defaultUnitFilter());
  };
  const pickFloor = (n) => {
    setFloor(n);
    setUnit(null);
    setHoverUnit(null);
    setHoverFloor(null);
  };
  const pickUnit = (id) => {
    if (isUnitSold(units[id])) return;
    setUnit(id);
    if (!floor) setFloor(units[id].floor);
  };
  const openModal = (id) => {
    setModal(id);
    setSent(false);
    setForm({ name: "", phone: "", email: "" });
  };
  const goToBooking = () => {
    if (!unit) return;
    const params = new URLSearchParams({ unit, block: block || "Block A" });
    router.push(`/booking?${params}`);
  };

  useEffect(() => {
    if (!unit) return;
    const onPointerDown = (e) => {
      if (unitPanelRef.current?.contains(e.target)) return;
      if (e.target.closest?.(".poly.unit")) return;
      setUnit(null);
      setHoverUnit(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [unit]);

  // Count available (unsold) residences across a set of floors.
  const availIn = (floorNames) =>
    FLOORS.filter((f) => floorNames.includes(f.name)).reduce(
      (n, f) => n + f.units.filter((id) => units[id].status !== "sold").length,
      0
    );

  // Hover tooltip content: block level shows blocks, block level shows floors,
  // floor level shows units.
  let tip = null;
  if (!block && hoverBlock) {
    const b = BLOCKS.find((x) => x.name === hoverBlock);
    const av = availIn(b.floors);
    const total = FLOORS.filter((f) => b.floors.includes(f.name)).reduce(
      (n, f) => n + f.units.length,
      0
    );
    tip = {
      c: anchorAbove(b.points),
      title: b.name.toUpperCase(),
      badge: av ? `${av} available` : "Sold out",
      badgeCls: av ? "b-avail" : "b-sold",
      meta: `${b.floors.length} floors · ${total} residences`,
      sold: false,
    };
  } else if (block && hoverUnit && canShowUnitTip(hoverUnit)) {
    const u = units[hoverUnit];
    const sold = isUnitSold(u);
    tip = {
      c: anchorAbove(u.points),
      title: u.label,
      badge: sold ? "Sold" : "Available",
      badgeCls: sold ? "b-sold" : "b-avail",
      meta: `${u.type} · ${u.area} Sqft`,
      sold,
    };
  } else if (block && hoverFloor && !hoverUnit) {
    const f = FLOORS.find((x) => x.name === hoverFloor);
    tip = {
      c: anchorAbove(f.points),
      title: f.name,
      floorOnly: true,
      sold: false,
    };
  }

  const ctaText = !modal
    ? !block
      ? "Select a block to begin"
      : !floor
      ? "Drag floor height, toggle filters, or click a unit"
      : !unit
      ? "Select a residence to explore"
      : null
    : null;

  return (
    <div className="be-root">
      <div className="be-stage">
        <img id="be-img" src={src} alt={`${PROJECT.name} elevation`} draggable="false" />
        <div className="scrim-top" />
        <div className="scrim-bot" />

        <svg className="be-ovl" viewBox="0 0 100 100" preserveAspectRatio="none">
          {!block &&
            BLOCKS.filter((b) => b.available && b.points.length > 0).map((b) => (
              <polygon
                key={b.name}
                points={pts(b.points)}
                className={"poly block" + (hoverBlock === b.name ? " on" : "")}
                onMouseEnter={() => setHoverBlock(b.name)}
                onMouseLeave={() => setHoverBlock(null)}
                onClick={() => pickBlock(b.name)}
              />
            ))}

          {block && <rect x="0" y="0" width="100" height="100" className="be-scrim-r" />}

          {block &&
            blockFloors.map((f) => {
              const isHover = hoverFloor === f.name;
              let floorCls = "poly floor";
              if (!floor) {
                if (isHover) floorCls += " on";
              } else if (isHover && f.name !== floor) {
                floorCls += " on-switch";
              } else {
                floorCls += " silent";
              }
              return (
              <polygon
                key={f.name}
                points={pts(f.points)}
                className={floorCls}
                onMouseEnter={() => setHoverFloor(f.name)}
                onMouseLeave={() => setHoverFloor(null)}
                onClick={() => pickFloor(f.name)}
              />
              );
            })}

          {block &&
            visibleUnitIds.map((id) => {
              const u = units[id];
              const sold = isUnitSold(u);
              return (
                <polygon
                  key={id}
                  points={pts(u.points)}
                  data-type="flat"
                  data-name={u.label}
                  className={
                    "poly unit " +
                    (sold ? "sold" : "avail") +
                    (unitFilter.all ? " all-on" : "") +
                    (unit === id ? " sel" : "") +
                    (hoverUnit === id ? " hov" : "")
                  }
                  onMouseEnter={() => setHoverUnit(id)}
                  onMouseLeave={() => setHoverUnit(null)}
                  onClick={() => pickUnit(id)}
                />
              );
            })}
        </svg>

        {tip && (
          <div
            className={"be-tip-wrap show" + (!block ? " bounce" : "")}
            style={{ left: tip.c[0] + "%", top: tip.c[1] + "%" }}
          >
            <div
              className={
                "be-tip" +
                (tip.sold ? " sold" : "") +
                (tip.floorOnly ? " floor-only" : "") +
                " sm"
              }
            >
              <div className={"be-tip-title" + (tip.floorOnly ? " be-tip-floor-num" : "")}>
                {tip.title}
              </div>
              {!tip.floorOnly && (
                <>
                  <div className="be-tip-badge-row">
                    <span className={"be-tip-badge " + tip.badgeCls}>{tip.badge}</span>
                  </div>
                  <div className="be-tip-meta">{tip.meta}</div>
                </>
              )}
              <span className="be-tip-arrow" aria-hidden="true" />
            </div>
            <span className="be-tip-marker" aria-hidden="true" />
          </div>
        )}

        <div className="be-top">
          <div className="be-brand" onClick={reset} style={{ cursor: "pointer" }} title="Back to building">
            <span className="be-crown">&#9819;</span>
            <div className="be-bk">
              <span className="be-brand-name">
                THE <b>OASIS</b>
              </span>
              <PremiumBadge label="Premium Experience" size="sm" />
            </div>
          </div>
          <div className="be-links">
            <span className="be-link" onClick={reset} role="button" style={{ cursor: "pointer" }}>
              Home
            </span>
            <DownloadMenu />
            {["Location Map", "Gallery"].map((l) => (
              <span key={l} className="be-link">
                {l}
              </span>
            ))}
            <span className="be-link" onClick={() => logout?.()} role="button" style={{ cursor: "pointer" }}>
              Log out
            </span>
          </div>
        </div>

        {ctaText && (
          <div className="be-cta-hint">
            <span className="hand">&#9757;</span> {ctaText}
          </div>
        )}

        {!block ? (
          <div className="be-block-picker be-block-picker--center">
            <span className="be-block-picker-label">Block</span>
            <div className="be-block-picker-row">
              {BLOCKS.map((b) => {
                const available = b.available !== false;
                const active = block === b.name;
                const hot = hoverBlock === b.name;
                return (
                  <button
                    key={b.name}
                    type="button"
                    className={
                      "be-block-btn" +
                      (active ? " on" : "") +
                      (hot && !active ? " hov" : "") +
                      (!available ? " disabled" : "")
                    }
                    disabled={!available}
                    onMouseEnter={() => available && setHoverBlock(b.name)}
                    onMouseLeave={() => setHoverBlock(null)}
                    onClick={() => pickBlock(b.name)}
                  >
                    {b.name.replace("Block ", "")}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="be-filter-column">
          <div className="be-filter-stack">
            <div className="be-unit-filter">
              <span className="be-unit-filter-label">Show units</span>
              <div className="be-unit-filter-row">
                <button
                  type="button"
                  className={"be-unit-filter-btn all" + (unitFilter.all ? " on" : "")}
                  onClick={() => toggleUnitFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={"be-unit-filter-btn avail" + (unitFilter.available ? " on" : "")}
                  onClick={() => toggleUnitFilter("available")}
                >
                  Available
                </button>
                <button
                  type="button"
                  className={"be-unit-filter-btn sold" + (unitFilter.sold ? " on" : "")}
                  onClick={() => toggleUnitFilter("sold")}
                >
                  Sold
                </button>
              </div>
            </div>

            <div className="be-floor-slider">
              <span className="be-floor-slider-label">
                Floor height{floor ? ` · ${floor}` : ""}
              </span>
              <div className="be-floor-slider-row">
                <span className="be-floor-slider-mark">All</span>
                <FloorSlider
                  value={floorSliderValue}
                  onValueChange={applyFloorSlider}
                  min={0}
                  max={maxFloorLevel}
                  ariaLabel={floor ? floor : "All floors"}
                />
                <span className="be-floor-slider-mark">{maxFloorLevel}</span>
              </div>
            </div>

            {sqftSliderMax > 0 && (
              <div className="be-sqft-slider">
                <span className="be-sqft-slider-label">
                  Sqft{sqftFilter !== null ? ` · ${sqftFilter.toLocaleString("en-IN")}` : ""}
                </span>
                <div className="be-sqft-slider-row">
                  <span className="be-sqft-slider-mark">All</span>
                  <FloorSlider
                    value={sqftSlider}
                    onValueChange={applySqftSlider}
                    onInteractStart={onSqftSliderInteract}
                    min={0}
                    max={sqftSliderMax}
                    ariaLabel="Select sqft"
                  />
                  <span className="be-sqft-slider-mark be-sqft-slider-mark--max">
                    {blockSqftOptions[sqftSliderMax - 1]?.toLocaleString("en-IN") ?? "—"}
                  </span>
                </div>
              </div>
            )}

            <div className="be-block-picker">
              <span className="be-block-picker-label">Block</span>
              <div className="be-block-picker-row">
                {BLOCKS.map((b) => {
                  const available = b.available !== false;
                  const active = block === b.name;
                  const hot = hoverBlock === b.name;
                  return (
                    <button
                      key={b.name}
                      type="button"
                      className={
                        "be-block-btn" +
                        (active ? " on" : "") +
                        (hot && !active ? " hov" : "") +
                        (!available ? " disabled" : "")
                      }
                      disabled={!available}
                      onMouseEnter={() => available && setHoverBlock(b.name)}
                      onMouseLeave={() => setHoverBlock(null)}
                      onClick={() => pickBlock(b.name)}
                    >
                      {b.name.replace("Block ", "")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

            <button
              type="button"
              className={"be-filter-reset-btn" + (hasActiveFilters ? " live" : "")}
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              aria-label="Reset filters"
            >
              <span className="be-filter-reset-icon" aria-hidden="true">&#8635;</span>
              <span className="be-filter-reset-copy">
                <span className="be-filter-reset-title">Clear filters</span>
                <span className="be-filter-reset-sub">Restore default view</span>
              </span>
              <span className="be-filter-reset-glow" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="be-compass">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,.25)" />
            <path d="M20 7 L24 21 L20 18 L16 21 Z" fill="#d8b65a" />
            <text x="20" y="34" textAnchor="middle" fill="#f5f1e6" fontSize="9" fontWeight="700">
              N
            </text>
          </svg>
        </div>
      </div>

      {block && unit && curUnit && (
      <aside
        ref={unitPanelRef}
        className={"be-side" + (panelOpen ? "" : " closed") + (unit && curUnit ? " be-side--unit" : "")}
      >
        <div className="be-tab" onClick={() => setPanelOpen((o) => !o)}>
          {panelOpen ? "\u2212" : "+"}
        </div>

        {/* Block details panel — floors are selected on the building image instead
        {block && !floor && (
          <>
            <div className="be-side-head">
              <span onClick={back} style={{ cursor: "pointer", color: "var(--gold-bright)", marginRight: 1 }}>
                &larr;
              </span>
              <span className="ic">&#127970;</span>
              {PROJECT.name} &middot; <b>{block}</b>
            </div>
            <div className="be-acc">
              <span className="bar" />
              <h3>Select a Floor</h3>
            </div>
            <div className="be-cards">
              {blockFloors.map((f) => {
                const av = f.units.filter((id) => units[id].status !== "sold").length;
                return (
                  <button
                    key={f.name}
                    className="be-card"
                    onMouseEnter={() => setHoverFloor(f.name)}
                    onMouseLeave={() => setHoverFloor(null)}
                    onClick={() => pickFloor(f.name)}
                  >
                    <div className="be-card-top">
                      <span className="be-card-name">{f.name}</span>
                      <span className={"be-badge " + (av ? "b-avail" : "b-sold")}>
                        {av ? av + " available" : "Sold out"}
                      </span>
                    </div>
                    <div className="be-card-sub">{f.units.length} residences</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        */}

        {/* Floor residence list — units are selected on the building image instead
        {floor && !unit && (
          <>
            <div className="be-side-head">
              <span onClick={back} style={{ cursor: "pointer", color: "var(--gold-bright)", marginRight: 1 }}>
                &larr;
              </span>
              <span className="ic">&#127970;</span>
              {block} &middot; <b>{floor}</b>
            </div>
            <div className="be-acc">
              <span className="bar" />
              <h3>Available Residences</h3>
            </div>
            <div className="be-cards">
              {curFloor.units.map((id) => {
                const u = units[id];
                const sold = u.status === "sold";
                return (
                  <button
                    key={id}
                    className={"be-card" + (sold ? " sold" : "")}
                    disabled={sold}
                    onMouseEnter={() => setHoverUnit(id)}
                    onMouseLeave={() => setHoverUnit(null)}
                    onClick={() => pickUnit(id)}
                  >
                    <div className="be-card-top">
                      <span className="be-card-name">{u.label}</span>
                      <span className={"be-badge " + (sold ? "b-sold" : "b-avail")}>
                        {sold ? "Sold" : "Available"}
                      </span>
                    </div>
                    <div className="be-card-sub">
                      {u.type} &middot; {u.area} Sqft &middot; {u.facing} facing
                    </div>
                    <div className="be-card-price">{u.price}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        */}

        {unit && curUnit && (
          <div className="be-unit-panel">
            <div className="be-unit-top">
              <div className="be-unit-head">
                <button type="button" className="be-unit-back" onClick={back} aria-label="Go back">
                  &larr;
                </button>
                <span className="be-unit-head-text">
                  {block} &middot; <strong>{curUnit.floor}</strong>
                </span>
              </div>
              <div className="be-unit-title-row">
                <span className="be-unit-bar" aria-hidden />
                <div>
                  <h3 className="be-unit-title">{curUnit.label}</h3>
                  <p className="be-unit-meta">
                    {curUnit.type} Residence &middot; {curUnit.facing} facing
                  </p>
                </div>
              </div>
              <div className="be-unit-stats-block">
                <div className="be-unit-stats">
                  <div>
                    <span className="be-unit-stat-val">{curUnit.beds}</span>
                    <span className="be-unit-stat-lbl">Beds</span>
                  </div>
                  <div>
                    <span className="be-unit-stat-val">{curUnit.baths}</span>
                    <span className="be-unit-stat-lbl">Baths</span>
                  </div>
                  <div>
                    <span className="be-unit-stat-val">{curUnit.area}</span>
                    <span className="be-unit-stat-lbl">Sqft</span>
                  </div>
                </div>
                <UnitGallery key={curUnit.id} images={getUnitImages(curUnit.id)} unitLabel={curUnit.label} compact />
              </div>
            </div>

            <div className="be-unit-mid">
              <div className="be-unit-price">
                <span className="be-unit-price-lbl">Starting at</span>
                <span className="be-unit-price-val">{curUnit.price}</span>
              </div>
            </div>

            <div className="be-unit-actions">
              {!isUnitSold(curUnit) && (
                <button type="button" className="be-unit-btn be-unit-btn--teal" onClick={goToBooking}>
                  Pay for Reservation
                </button>
              )}
              <button type="button" className="be-unit-btn be-unit-btn--gold" onClick={() => openModal(curUnit.id)}>
                Enquire Now
              </button>
              <button type="button" className="be-unit-btn be-unit-btn--ghost" onClick={() => openModal(curUnit.id)}>
                Step inside &middot; 360&deg;
              </button>
              <a
                href={getUnitBrochureUrl(curUnit.id)}
                className="be-unit-btn be-unit-btn--ghost be-brochure-btn"
                download
              >
                Download brochure
              </a>
            </div>
          </div>
        )}
      </aside>
      )}

      {modal && (
        <div className="be-modal-bg" onClick={() => setModal(null)}>
          <div className="be-modal" onClick={(e) => e.stopPropagation()}>
            <button className="be-modal-x" onClick={() => setModal(null)}>
              &times;
            </button>
            {!sent ? (
              <>
                <div className="be-eyebrow" style={{ color: "var(--gold)" }}>
                  {units[modal].label} &middot; {units[modal].floor}
                </div>
                <h3 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 600, marginTop: 4 }}>
                  Enquire about this residence
                </h3>
                <div className="be-field">
                  <label>Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                  />
                </div>
                <div className="be-field">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 "
                  />
                </div>
                <div className="be-field">
                  <label>Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                  />
                </div>
                <button className="be-cta" onClick={() => setSent(true)}>
                  Submit Enquiry
                </button>
                <p className="be-note" style={{ marginTop: 11 }}>
                  Demo only &mdash; wire to your SES / DynamoDB endpoint
                </p>
              </>
            ) : (
              <div className="be-thanks">
                <div className="be-check">&#10003;</div>
                <h3 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 600 }}>Thank you</h3>
                <p>Our team will reach out about {units[modal].label} shortly.</p>
                <button className="be-cta" style={{ marginTop: 16 }} onClick={() => setModal(null)}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
