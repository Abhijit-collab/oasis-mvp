"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS, FLOORS, UNITS, getUnitBrochureUrl, getUnitImages } from "@/data/building";
import FilterPanel from "@/components/FilterPanel";
import UnitGallery from "@/components/UnitGallery";
import { buildFilterPanelUnits } from "@/lib/filterPanelUnits";
import { mergeLiveUnits } from "@/lib/mergeLiveUnits";
import { getOrbitStepScope } from "@/lib/orbitStepScope";
import { getFloorSliderRange } from "@/lib/floorSliderRange";
import { isUnitSold, unitBadgeClass, unitBadgeLabel } from "@/lib/unitStatus";

/**
 * Premium filter column, unit panel, and enquiry modal — shared with the main explorer.
 */
export default function ExplorerPremiumChrome({
  visible = false,
  block,
  floor,
  unit: controlledUnit = undefined,
  onPickUnit,
  hoverBlock,
  onPickBlock,
  onPickFloor,
  onHoverBlock,
  onClearBlock,
  filtersInteractive = true,
  liveUnits = null,
  orbitStep = null,
  onFilterStateChange,
  onFloorFilterChange,
  floorSliderRange: floorSliderRangeProp = null,
}) {
  const router = useRouter();
  const unitPanelRef = useRef(null);
  const [internalUnit, setInternalUnit] = useState(null);
  const unit = controlledUnit !== undefined ? controlledUnit : internalUnit;
  const setUnit = onPickUnit ?? setInternalUnit;
  const [hoverUnit, setHoverUnit] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [modal, setModal] = useState(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [matchingIds, setMatchingIds] = useState(() => new Set(Object.keys(UNITS)));
  const [filtersActive, setFiltersActive] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const units = useMemo(() => mergeLiveUnits(liveUnits), [liveUnits]);
  const stepScope = useMemo(
    () => (orbitStep != null ? getOrbitStepScope(orbitStep) : null),
    [orbitStep]
  );
  const scopedUnitIds = stepScope?.unitIds ?? Object.keys(units);

  const panelUnits = useMemo(() => {
    const all = buildFilterPanelUnits(units);
    if (!stepScope?.unitIds.length) return all;
    const allowed = new Set(stepScope.unitIds);
    return all.filter((u) => allowed.has(u.id));
  }, [units, stepScope]);

  useEffect(() => {
    if (orbitStep == null) return;
    const next = new Set(stepScope.unitIds);
    setMatchingIds(next);
    setFiltersActive(false);
    onFilterStateChange?.({ matchingIds: next, filtersActive: false });
  }, [orbitStep, stepScope.unitIds.join("\0")]);
  const selectedBlocks = useMemo(
    () => (block ? [block.replace(/^Block\s+/i, "")] : []),
    [block]
  );
  const blockRef = useRef(block);
  blockRef.current = block;

  const curBlock = block ? BLOCKS.find((b) => b.name === block) : null;
  const blockFloors = curBlock ? FLOORS.filter((f) => curBlock.floors.includes(f.name)) : [];
  const curFloor = floor ? FLOORS.find((f) => f.name === floor) : null;
  const curUnit = unit ? units[unit] : null;

  const floorSliderRange = useMemo(() => {
    if (floorSliderRangeProp) return floorSliderRangeProp;
    return getFloorSliderRange({ orbitStep, block });
  }, [floorSliderRangeProp, orbitStep, block]);

  const handleFilterChange = useCallback((filtered) => {
    const ids = filtered.map((u) => u.id);
    setMatchingIds((prev) => {
      const next = new Set(ids);
      if (prev.size === next.size && ids.every((id) => prev.has(id))) return prev;
      return next;
    });
  }, []);

  const handleActiveChange = useCallback((count) => {
    setFiltersActive(count > 0);
  }, []);

  const handleAllStatusesSelect = useCallback(() => {
    setFiltersActive(true);
  }, []);

  const handleAllStatusesDeselect = useCallback((remainingActiveCount = 0) => {
    setFiltersActive(remainingActiveCount > 0);
  }, []);

  useEffect(() => {
    if (!onFilterStateChange) return;
    onFilterStateChange({ matchingIds, filtersActive });
  }, [matchingIds, filtersActive, onFilterStateChange]);

  const handleBlockChange = useCallback(
    (blocks) => {
      if (!filtersInteractive || orbitStep != null) return;
      if (blocks.length === 1) {
        const name = `Block ${blocks[0]}`;
        if (blockRef.current !== name) onPickBlock?.(name);
        return;
      }
      if (blocks.length === 0 && blockRef.current) onClearBlock?.();
    },
    [onPickBlock, onClearBlock, filtersInteractive, orbitStep]
  );

  useEffect(() => {
    if (controlledUnit === undefined) setInternalUnit(null);
  }, [floor, controlledUnit]);

  useEffect(() => {
    if (controlledUnit === undefined && !block) setInternalUnit(null);
  }, [block, controlledUnit]);

  useEffect(() => {
    if (orbitStep == null || !block) return;
    setFiltersActive(false);
  }, [block, orbitStep]);

  useEffect(() => {
    if (orbitStep == null || block) return;
    const next = new Set(stepScope?.unitIds ?? []);
    setFiltersActive(false);
    setMatchingIds(next);
    onFilterStateChange?.({ matchingIds: next, filtersActive: false });
  }, [block, orbitStep, stepScope?.unitIds.join("\0"), onFilterStateChange]);

  const pickUnit = (id) => {
    if (isUnitSold(units[id])) return;
    setUnit(id);
    setFiltersOpen(false);
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
    const allowed = new Set(scopedUnitIds);
    return curFloor.units.filter((id) => allowed.has(id) && matchingIds.has(id));
  }, [curFloor, matchingIds, scopedUnitIds]);

  if (!visible) return null;

  return (
    <>
      <div className="be-filter-column">
        <FilterPanel
          units={panelUnits}
          interactive={filtersInteractive}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onChange={filtersInteractive ? handleFilterChange : undefined}
          onActiveChange={filtersInteractive ? handleActiveChange : undefined}
          onAllStatusesSelect={filtersInteractive ? handleAllStatusesSelect : undefined}
          onAllStatusesDeselect={filtersInteractive ? handleAllStatusesDeselect : undefined}
          onBlockChange={filtersInteractive ? handleBlockChange : undefined}
          onClearFloors={filtersInteractive ? () => onPickFloor?.(null) : undefined}
          onFloorFilterChange={filtersInteractive ? onFloorFilterChange : undefined}
          floorSliderRange={filtersInteractive ? floorSliderRange : null}
          applyMapBlocksToFilter={orbitStep == null}
          selectedBlocks={filtersInteractive ? selectedBlocks : []}
        />
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
              const status = u.status ?? "available";
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
                    <span className={"be-badge " + unitBadgeClass(status)}>
                      {unitBadgeLabel(status)}
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
