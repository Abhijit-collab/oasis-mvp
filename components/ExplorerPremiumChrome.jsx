"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS, FLOORS, UNITS, getUnitBrochureUrl, getUnitImages } from "@/data/building";
import FloorSlider from "@/components/FloorSlider";
import UnitGallery from "@/components/UnitGallery";

const defaultUnitFilter = () => ({ all: false, available: false, sold: false });
const isUnitSold = (u) => u.status === "sold";
const isUnitFilterActive = (filter) => filter.all || filter.available || filter.sold;

/**
 * Premium filter column, unit panel, and enquiry modal — shared with the main explorer.
 */
export default function ExplorerPremiumChrome({
  visible = false,
  block,
  floor,
  hoverBlock,
  onPickBlock,
  onPickFloor,
  onHoverBlock,
  onClearBlock,
}) {
  const router = useRouter();
  const unitPanelRef = useRef(null);
  const [unit, setUnit] = useState(null);
  const [hoverUnit, setHoverUnit] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [modal, setModal] = useState(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [sqftSlider, setSqftSlider] = useState([0]);
  const [unitFilter, setUnitFilter] = useState(defaultUnitFilter);

  const units = UNITS;
  const curBlock = block ? BLOCKS.find((b) => b.name === block) : null;
  const blockFloors = curBlock ? FLOORS.filter((f) => curBlock.floors.includes(f.name)) : [];
  const curFloor = floor ? FLOORS.find((f) => f.name === floor) : null;
  const curUnit = unit ? units[unit] : null;

  const floorLevel = (name) => parseInt(name.replace(/\D/g, ""), 10) || 0;
  const maxFloorLevel = blockFloors.length
    ? Math.max(...blockFloors.map((f) => floorLevel(f.name)))
    : 4;
  const floorSliderValue = [floor ? floorLevel(floor) : 0];

  const blockSqftOptions = useMemo(() => {
    const ids = block ? blockFloors.flatMap((f) => f.units) : [];
    return [...new Set(ids.map((id) => units[id].area))].sort((a, b) => a - b);
  }, [block, blockFloors, units]);

  const sqftFilter = sqftSlider[0] > 0 ? blockSqftOptions[sqftSlider[0] - 1] : null;
  const sqftSliderMax = blockSqftOptions.length;

  const matchesUnitFilters = (id, filter, sqft) => {
    if (sqft !== null && units[id].area !== sqft) return false;
    if (filter.all) return true;
    const sold = isUnitSold(units[id]);
    const statusFilter = filter.available || filter.sold;
    if (!statusFilter) return true;
    return sold ? filter.sold : filter.available;
  };

  const hasActiveFilters =
    floor !== null || sqftSlider[0] > 0 || isUnitFilterActive(unitFilter);

  const applyFloorSlider = (value) => {
    const level = value[0];
    if (level === 0) {
      onPickFloor?.(null);
      setUnit(null);
      setHoverUnit(null);
      return;
    }
    const match = blockFloors.find((f) => floorLevel(f.name) === level);
    if (match) {
      onPickFloor?.(match.name);
      setUnit(null);
      setHoverUnit(null);
    }
  };

  const applySqftSlider = (value) => {
    setSqftSlider(value);
    setUnit(null);
    setHoverUnit(null);
    if (value[0] > 0 || isUnitFilterActive(unitFilter)) {
      setUnitFilter(defaultUnitFilter());
    }
  };

  const onSqftSliderInteract = () => {
    if (sqftSlider[0] === 0 && !isUnitFilterActive(unitFilter)) return;
    if (sqftSlider[0] > 0) return;
    setUnitFilter(defaultUnitFilter());
    setUnit(null);
    setHoverUnit(null);
  };

  const toggleUnitFilter = (key) => {
    setUnitFilter((prev) => {
      if (key === "all") {
        return prev.all ? defaultUnitFilter() : { all: true, available: false, sold: false };
      }
      return { ...prev, all: false, [key]: !prev[key] };
    });
    setUnit(null);
    setHoverUnit(null);
  };

  const resetFilters = () => {
    onPickFloor?.(null);
    setUnit(null);
    setHoverUnit(null);
    setSqftSlider([0]);
    setUnitFilter(defaultUnitFilter());
  };

  const pickBlock = (name) => {
    const b = BLOCKS.find((x) => x.name === name);
    if (!b?.available) return;
    onPickBlock?.(name);
    setSqftSlider([0]);
    setUnit(null);
    setHoverUnit(null);
    setUnitFilter(defaultUnitFilter());
  };

  const pickUnit = (id) => {
    if (isUnitSold(units[id])) return;
    setUnit(id);
    if (!floor) onPickFloor?.(units[id].floor);
  };

  const back = () => {
    if (unit) setUnit(null);
    else if (floor) onPickFloor?.(null);
    else if (block) onClearBlock?.();
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

  const filteredFloorUnits = useMemo(() => {
    if (!curFloor) return [];
    return curFloor.units.filter((id) => matchesUnitFilters(id, unitFilter, sqftFilter));
  }, [curFloor, unitFilter, sqftFilter]);

  if (!visible) return null;

  const blockPicker = (
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
              onMouseEnter={() => available && onHoverBlock?.(b.name)}
              onMouseLeave={() => onHoverBlock?.(null)}
              onClick={() => pickBlock(b.name)}
            >
              {b.name.replace("Block ", "")}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!block) {
    return <div className="be-filter-column be-filter-column--initial">{blockPicker}</div>;
  }

  return (
    <>
      <div className="be-filter-column">
        <div className="be-filter-stack be-filter-stack--expanded">
          <div className="be-filter-extra">
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
              <span className="be-floor-slider-label">Floor height{floor ? ` · ${floor}` : ""}</span>
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
          </div>
        </div>

        <button
          type="button"
          className={"be-filter-reset-btn" + (hasActiveFilters ? " live" : "")}
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          aria-label="Reset filters"
        >
          <span className="be-filter-reset-icon" aria-hidden="true">
            &#8635;
          </span>
          <span className="be-filter-reset-copy">
            <span className="be-filter-reset-title">Clear filters</span>
            <span className="be-filter-reset-sub">Restore default view</span>
          </span>
          <span className="be-filter-reset-glow" aria-hidden="true" />
        </button>
      </div>

      {floor && !unit && curFloor && (
        <aside ref={unitPanelRef} className={"be-side" + (panelOpen ? "" : " closed")}>
          <div className="be-tab" onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? "\u2212" : "+"}
          </div>
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
            {filteredFloorUnits.map((id) => {
              const u = units[id];
              const sold = isUnitSold(u);
              return (
                <button
                  key={id}
                  type="button"
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
        </aside>
      )}

      {unit && curUnit && (
        <aside
          ref={unitPanelRef}
          className={"be-side" + (panelOpen ? "" : " closed") + " be-side--unit"}
        >
          <div className="be-tab" onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? "\u2212" : "+"}
          </div>
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
                <UnitGallery
                  key={curUnit.id}
                  images={getUnitImages(curUnit.id)}
                  unitLabel={curUnit.label}
                  compact
                />
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
              <button
                type="button"
                className="be-unit-btn be-unit-btn--gold"
                onClick={() => openModal(curUnit.id)}
              >
                Enquire Now
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
        </aside>
      )}

      {modal && (
        <div className="be-modal-bg" onClick={() => setModal(null)}>
          <div className="be-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="be-modal-x" onClick={() => setModal(null)}>
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
                <button type="button" className="be-cta" onClick={() => setSent(true)}>
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
                <button type="button" className="be-cta" style={{ marginTop: 16 }} onClick={() => setModal(null)}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
