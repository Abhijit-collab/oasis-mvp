"use client";

import { useMemo, useState } from "react";
import { BLOCKS, FLOORS, UNITS, PROJECT } from "@/data/building";

const pts = (a) => a.map((p) => p.join(",")).join(" ");

// `liveUnits` is an array from the Lambda/DynamoDB (sourced from the Google Sheet),
// e.g. [{ unitId: "301", status: "sold", price: "₹1.30 Cr" }]. Only the fields present
// override the static geometry/details; everything else stays as defined in building.js.
export default function BuildingExplorer({ src = "/oasis-elevation.jpg", liveUnits = null }) {
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

  const reset = () => {
    setBlock(null);
    setFloor(null);
    setUnit(null);
    setHoverBlock(null);
    setHoverFloor(null);
    setHoverUnit(null);
  };
  const back = () => {
    if (unit) setUnit(null);
    else if (floor) setFloor(null);
    else if (block) setBlock(null);
  };
  const pickBlock = (n) => {
    setBlock(n);
    setFloor(null);
    setUnit(null);
    setHoverFloor(null);
    setHoverUnit(null);
  };
  const pickFloor = (n) => {
    setFloor(n);
    setUnit(null);
    setHoverUnit(null);
  };
  const pickUnit = (id) => {
    if (units[id].status !== "sold") setUnit(id);
  };
  const openModal = (id) => {
    setModal(id);
    setSent(false);
    setForm({ name: "", phone: "", email: "" });
  };

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
    tip = {
      c: b.centroid,
      title: b.name,
      sub: (
        <>
          <b>{availIn(b.floors)} available</b> &middot; {b.floors.length} floors
        </>
      ),
      sold: false,
    };
  } else if (block && !floor && hoverFloor) {
    const f = FLOORS.find((x) => x.name === hoverFloor);
    const av = f.units.filter((id) => units[id].status !== "sold").length;
    tip = {
      c: f.centroid,
      title: f.name,
      sub: (
        <>
          <b>{av} available</b> &middot; {f.units.length} residences
        </>
      ),
      sold: false,
    };
  } else if (floor && hoverUnit) {
    const u = units[hoverUnit];
    const sold = u.status === "sold";
    tip = {
      c: u.centroid,
      title: u.label,
      sub: (
        <>
          {u.type} &middot; {u.area} Sqft &middot; <b>{sold ? "Sold" : u.price}</b>
        </>
      ),
      sold,
    };
  }

  const ctaText = !modal
    ? !block
      ? "Select a block to begin"
      : !floor
      ? "Click on a floor of your interest"
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
            BLOCKS.map((b) => (
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
            !floor &&
            blockFloors.map((f) => (
              <polygon
                key={f.name}
                points={pts(f.points)}
                className={"poly floor" + (hoverFloor === f.name ? " on" : "")}
                onMouseEnter={() => setHoverFloor(f.name)}
                onMouseLeave={() => setHoverFloor(null)}
                onClick={() => pickFloor(f.name)}
              />
            ))}

          {floor &&
            curFloor.units.map((id) => {
              const u = units[id];
              const sold = u.status === "sold";
              return (
                <polygon
                  key={id}
                  points={pts(u.points)}
                  className={
                    "poly unit " +
                    (sold ? "sold" : "avail") +
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
          <div className="be-tip show" style={{ left: tip.c[0] + "%", top: tip.c[1] + "%" }}>
            <div className="t-h">
              <span className="pin">&#9679;</span>
              {tip.title}
            </div>
            <div className="t-d" />
            <div className={"t-s" + (tip.sold ? " sold" : "")}>{tip.sub}</div>
          </div>
        )}

        <div className="be-top">
          <div className="be-brand" onClick={reset} style={{ cursor: "pointer" }} title="Back to building">
            <span className="be-crown">&#9819;</span>
            <div className="be-bk">
              <span className="be-eyebrow">{PROJECT.developer}</span>
              <span className="be-brand-name">
                THE <b>OASIS</b>
              </span>
            </div>
          </div>
          <div className="be-links">
            {["Home", "Site Plan", "Location Map", "Gallery", "Contact", "Share"].map((l) => (
              <span key={l} className="be-link">
                {l}
              </span>
            ))}
          </div>
        </div>

        {ctaText && (
          <div className="be-cta-hint">
            <span className="hand">&#9757;</span> {ctaText}
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

      {block && (
      <aside className={"be-side" + (panelOpen ? "" : " closed")}>
        <div className="be-tab" onClick={() => setPanelOpen((o) => !o)}>
          {panelOpen ? "\u2212" : "+"}
        </div>

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

        {unit && curUnit && (
          <>
            <div className="be-side-head">
              <span onClick={back} style={{ cursor: "pointer", color: "var(--gold-bright)", marginRight: 1 }}>
                &larr;
              </span>
              <span className="ic">&#127970;</span>
              {block} &middot; <b>{curUnit.floor}</b>
            </div>
            <div className="be-acc">
              <span className="bar" />
              <h3>{curUnit.label}</h3>
            </div>
            <div className="be-type-line">
              {curUnit.type} Residence &middot; {curUnit.facing} facing
            </div>
            <div className="be-specs">
              <div>
                <span>{curUnit.beds}</span>Beds
              </div>
              <div>
                <span>{curUnit.baths}</span>Baths
              </div>
              <div>
                <span>{curUnit.area}</span>Sqft
              </div>
            </div>
            <div className="be-price-row">
              <span className="be-price-lbl">Starting at</span>
              <span className="be-price-big">{curUnit.price}</span>
            </div>
            <button className="be-cta" onClick={() => openModal(curUnit.id)}>
              Enquire Now
            </button>
            <button className="be-ghost" onClick={() => openModal(curUnit.id)}>
              Step inside &middot; 360&deg;
            </button>
            <p className="be-note">360&deg; interior walkthrough &mdash; next build</p>
          </>
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
