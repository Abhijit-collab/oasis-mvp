"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { getPoiView, panoSrc } from "@/data/pois";
import { isMobileTourDevice } from "@/lib/rotateGate";
import Pano360Overlay from "@/components/Pano360Overlay";

const POI_FADE_MS = 1150;
const DESKTOP_ARROW = 90;
const ARROW_AT_1080 = 90;
const STAGGER_MS = 150;

function mediaBox(el) {
  const image = el.tagName === "IMG";
  const vw = (image ? el.naturalWidth : el.videoWidth) || 0;
  const vh = (image ? el.naturalHeight : el.videoHeight) || 0;
  const cw = el.clientWidth;
  const ch = el.clientHeight;
  if (!cw || !ch || !vw || !vh) return null;

  const style = getComputedStyle(el);
  const fit = style.objectFit;
  const pos = (style.objectPosition || "50% 50%").toLowerCase();
  let scaleX = cw / vw;
  let scaleY = ch / vh;
  if (fit === "contain") {
    const scale = Math.min(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
  } else if (fit === "cover") {
    const scale = Math.max(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
  }
  const spareX = cw - vw * scaleX;
  const spareY = ch - vh * scaleY;
  const offX = pos.startsWith("left") ? 0 : pos.startsWith("right") ? spareX : spareX / 2;
  const offY = pos.includes("top") ? 0 : pos.includes("bottom") ? spareY : spareY / 2;
  return { vw, vh, scaleX, scaleY, offX, offY };
}

function paintedRect(el, stage) {
  const box = mediaBox(el);
  if (!box) return null;
  let originX = 0;
  let originY = 0;
  if (stage) {
    const stageRect = stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    originX = elRect.left - stageRect.left;
    originY = elRect.top - stageRect.top;
  }
  const left = originX + box.offX;
  const top = originY + box.offY;
  const width = box.vw * box.scaleX;
  const height = box.vh * box.scaleY;
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function frameToScreen(el, fx, fy, stage) {
  const rect = paintedRect(el, stage);
  if (!rect) return null;
  return {
    x: rect.left + fx * rect.width,
    y: rect.top + fy * rect.height,
    rect,
  };
}

/** Screen box the labels may use. Inset by a small pad so text is not cut off. */
function stageBounds(stage) {
  if (!stage) return null;
  const pad = 8;
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (!width || !height) return null;
  return { left: pad, top: pad, right: width - pad, bottom: height - pad };
}

/** Desktop stays at the previous 90px. Phones scale with the picture height. */
function arrowLength(el) {
  if (!isMobileTourDevice()) return DESKTOP_ARROW;
  const box = mediaBox(el);
  if (!box) return ARROW_AT_1080;
  const paintedH = box.vh * box.scaleY;
  const length = (paintedH / 1080) * ARROW_AT_1080;
  return Math.round(Math.max(44, Math.min(DESKTOP_ARROW, length)));
}

function labelMaxWidth() {
  if (typeof window === "undefined") return 160;
  if (isMobileTourDevice()) return Math.min(148, window.innerWidth * 0.46);
  return Math.min(190, window.innerWidth * 0.28);
}

/** Guess the pill size from the title so the first layout already has room. */
function labelSize(title) {
  const mobile = isMobileTourDevice();
  const font = mobile ? 11 : 13;
  const padX = mobile ? 16 : 20;
  const padY = mobile ? 12 : 14;
  const maxW = labelMaxWidth();
  const textW = Math.max(font * 2, String(title || "").length * font * 0.56);
  const inner = Math.max(48, maxW - padX);
  const lines = Math.min(3, Math.max(1, Math.ceil(textW / inner)));
  return {
    w: Math.min(maxW, textW + padX),
    h: lines * font * 1.2 + padY,
  };
}

function clampLabel(mark, bounds) {
  if (!bounds) return;
  const hx = (mark.lw || 0) / 2;
  const hy = (mark.lh || 0) / 2;
  mark.bx = Math.max(bounds.left + hx, Math.min(bounds.right - hx, mark.bx));
  mark.by = Math.max(bounds.top + hy, Math.min(bounds.bottom - hy, mark.by));
  mark.len = Math.round(Math.hypot(mark.bx - mark.x, mark.by - mark.y));
}

/** Push label pills apart using their real width and height so the words do not cover each other. */
function separateLabels(marks, bounds, measured) {
  const gap = isMobileTourDevice() ? 6 : 8;
  const items = marks.map((mark) => {
    const sized = measured?.[mark.poi.n] || labelSize(mark.poi.title);
    return { ...mark, lw: sized.w, lh: sized.h };
  });
  for (const mark of items) clampLabel(mark, bounds);

  for (let pass = 0; pass < 28; pass += 1) {
    let moved = false;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const overlapX = (a.lw + b.lw) / 2 + gap - Math.abs(a.bx - b.bx);
        const overlapY = (a.lh + b.lh) / 2 + gap - Math.abs(a.by - b.by);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const dx = b.bx - a.bx || 0.5;
        const dy = b.by - a.by || 0.5;
        if (overlapX <= overlapY) {
          const push = overlapX / 2 + 1;
          const sign = dx >= 0 ? 1 : -1;
          a.bx -= sign * push;
          b.bx += sign * push;
        } else {
          const push = overlapY / 2 + 1;
          const sign = dy >= 0 ? 1 : -1;
          a.by -= sign * push;
          b.by += sign * push;
        }
        moved = true;
      }
    }
    for (const mark of items) clampLabel(mark, bounds);
    if (!moved) break;
  }
  return items;
}

/** Where the leader should meet the pill, so the line stops at the words. */
function leaderTip(mark) {
  const w = mark.lw || 0;
  const h = mark.lh || 0;
  const dx = mark.x - mark.bx;
  const dy = mark.y - mark.by;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let reach = 0;
  if (w > 0 && Math.abs(ux) > 0.001) reach = (w / 2) / Math.abs(ux);
  if (h > 0 && Math.abs(uy) > 0.001) {
    const yReach = (h / 2) / Math.abs(uy);
    reach = reach ? Math.min(reach, yReach) : yReach;
  }
  return { x: mark.bx + ux * reach, y: mark.by + uy * reach };
}

function mediaElement(stage, type) {
  if (!stage) return null;
  if (type === "image") return stage.querySelector("img.be-start-still");
  const videos = [...stage.querySelectorAll("video.be-stage-video")];
  return (
    videos.find((video) => video.classList.contains("on") && video.videoWidth > 0) ||
    videos.find((video) => video.videoWidth > 0) ||
    videos[0] ||
    null
  );
}

function mediaReady(el, type) {
  if (!el) return false;
  return type === "image" ? el.complete && el.naturalWidth > 0 : el.videoWidth > 0;
}

/** Upright phone: the POI card should not sit behind the 360 popup. */
function isPortraitPhone() {
  if (typeof window === "undefined") return false;
  if (window.innerHeight <= window.innerWidth) return false;
  return isMobileTourDevice() || window.innerWidth <= 900;
}

const PoiHotspots = forwardRef(function PoiHotspots({ stageRef }, ref) {
  const [marks, setMarks] = useState([]);
  const [revealed, setRevealed] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [activeN, setActiveN] = useState(null);
  const [panoUrl, setPanoUrl] = useState(null);
  const close360 = useCallback(() => setPanoUrl(null), []);
  const [popPos, setPopPos] = useState(null);
  const layerRef = useRef(null);
  const cardRef = useRef(null);
  const ticket = useRef(0);
  const drawnTicket = useRef(0);
  const timers = useRef([]);
  const leaveTimer = useRef(null);
  const stopListen = useRef(null);

  const stopTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const cancelLeave = () => {
    if (leaveTimer.current != null) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setLeaving(false);
  };

  const unlisten = () => {
    stopListen.current?.();
    stopListen.current = null;
  };

  useEffect(() => () => {
    stopTimers();
    if (leaveTimer.current != null) clearTimeout(leaveTimer.current);
    unlisten();
  }, []);

  useEffect(() => {
    if (activeN == null) return undefined;
    const onClick = (event) => {
      if (cardRef.current?.contains(event.target)) return;
      setActiveN(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [activeN]);

  useImperativeHandle(ref, () => ({
    clearPois() {
      ticket.current += 1;
      drawnTicket.current = 0;
      stopTimers();
      unlisten();
      cancelLeave();
      setMarks([]);
      setRevealed(0);
      setActiveN(null);
    },
    fadePois() {
      ticket.current += 1;
      drawnTicket.current = 0;
      stopTimers();
      unlisten();
      setActiveN(null);
      setLeaving(true);
      if (leaveTimer.current != null) clearTimeout(leaveTimer.current);
      leaveTimer.current = window.setTimeout(() => {
        leaveTimer.current = null;
        setMarks([]);
        setRevealed(0);
        setLeaving(false);
      }, POI_FADE_MS);
    },
    showPoisForView(viewId) {
      const my = ++ticket.current;
      drawnTicket.current = 0;
      stopTimers();
      unlisten();
      cancelLeave();
      setMarks([]);
      setRevealed(0);
      setActiveN(null);

      const view = getPoiView(viewId);
      if (!view) return;

      const place = (animate) => {
        if (ticket.current !== my) return false;
        const el = mediaElement(stageRef?.current, view.type);
        if (!mediaReady(el, view.type)) return false;
        const length = arrowLength(el);
        const stage = stageRef?.current;
        const next = [];
        for (const poi of view.pois) {
          const point = frameToScreen(el, poi.x, poi.y, stage);
          if (!point) return false;
          const rad = (poi.angle * Math.PI) / 180;
          next.push({
            poi,
            len: length,
            x: point.x,
            y: point.y,
            bx: point.x + Math.cos(rad) * length,
            by: point.y + Math.sin(rad) * length,
          });
        }
        setMarks(separateLabels(next, stageBounds(stage)));
        if (!animate) return true;
        drawnTicket.current = my;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
          setRevealed(next.length);
          return true;
        }
        setRevealed(0);
        next.forEach((_, index) => {
          const id = window.setTimeout(() => {
            if (ticket.current !== my) return;
            setRevealed((count) => Math.max(count, index + 1));
          }, index * STAGGER_MS + 40);
          timers.current.push(id);
        });
        return true;
      };

      const stage = stageRef?.current;
      const el = mediaElement(stage, view.type);
      const onReady = () => {
        if (ticket.current !== my) return;
        place(drawnTicket.current !== my);
      };
      const placed = place(true);
      el?.addEventListener("load", onReady);
      el?.addEventListener("loadeddata", onReady);
      const ro = new ResizeObserver(onReady);
      if (stage) ro.observe(stage);
      window.addEventListener("resize", onReady);
      stopListen.current = () => {
        el?.removeEventListener("load", onReady);
        el?.removeEventListener("loadeddata", onReady);
        ro.disconnect();
        window.removeEventListener("resize", onReady);
      };

      if (!placed) {
        const retry = window.setInterval(() => {
          if (ticket.current !== my) {
            window.clearInterval(retry);
            return;
          }
          if (place(true)) window.clearInterval(retry);
        }, 120);
        timers.current.push(retry);
      }
    },
  }));

  const active = marks.find((mark) => mark.poi.n === activeN) || null;

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer || marks.length === 0) return;
    const measured = {};
    let dirty = false;
    layer.querySelectorAll(".poi-badge").forEach((button) => {
      const n = Number(button.dataset.n);
      const w = button.offsetWidth;
      const h = button.offsetHeight;
      if (!w || !h) return;
      measured[n] = { w, h };
      const mark = marks.find((item) => item.poi.n === n);
      if (!mark || Math.abs((mark.lw || 0) - w) > 4 || Math.abs((mark.lh || 0) - h) > 4) dirty = true;
    });
    if (!dirty) return;
    setMarks((current) => separateLabels(current, stageBounds(stageRef?.current), measured));
  }, [marks, stageRef]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const card = cardRef.current;
    if (!active || !layer || !card) return undefined;

    const placeCard = () => {
      const pad = 12;
      const gap = 16;
      const badge = 22;
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      const boundsW = layer.clientWidth;
      const boundsH = layer.clientHeight;
      // 1 o'clock: up and slightly right of the number.
      const reach = badge + gap;
      const left = active.bx + Math.sin(Math.PI / 6) * reach;
      const top = active.by - Math.cos(Math.PI / 6) * reach - height;
      setPopPos({
        n: active.poi.n,
        left: Math.max(pad, Math.min(left, boundsW - width - pad)),
        top: Math.max(pad, Math.min(top, boundsH - height - pad)),
      });
    };

    placeCard();
    const observer = new ResizeObserver(placeCard);
    observer.observe(card);
    return () => observer.disconnect();
  }, [active]);

  if (marks.length === 0) return null;

  return (
    <div className={"poi-layer" + (leaving ? " poi-layer--leaving" : "")} ref={layerRef} aria-hidden={false}>
      <svg className="poi-svg" aria-hidden>
        {marks.map((mark, index) => {
          const tip = leaderTip(mark);
          const lineLen = Math.hypot(mark.x - tip.x, mark.y - tip.y);
          return (
          <g key={mark.poi.n} className={index < revealed ? "show" : ""}>
            <line
              className="poi-line"
              x1={tip.x}
              y1={tip.y}
              x2={mark.x}
              y2={mark.y}
              style={{ "--len": lineLen }}
            />
            <circle className="poi-dot" cx={mark.x} cy={mark.y} r="5" />
          </g>
          );
        })}
      </svg>
      {marks.map((mark, index) => (
        <button
          key={mark.poi.n}
          type="button"
          className={
            "poi-badge" +
            (index < revealed ? " show" : "") +
            (activeN === mark.poi.n ? " active" : "")
          }
          data-n={mark.poi.n}
          style={{ left: mark.bx, top: mark.by }}
          aria-label={mark.poi.title}
          onClick={(event) => {
            event.stopPropagation();
            setActiveN((current) => (current === mark.poi.n ? null : mark.poi.n));
          }}
        >
          {mark.poi.title}
        </button>
      ))}
      {active ? (
        <div
          className="poi-pop poi-panel open"
          role="dialog"
          aria-label={active.poi.title}
          style={
            popPos && popPos.n === active.poi.n
              ? { left: popPos.left, top: popPos.top }
              : { left: active.bx, top: active.by, visibility: "hidden" }
          }
        >
          <div
            className="poi-pop-card"
            ref={cardRef}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="poi-panel-close"
              aria-label="Close"
              onClick={() => setActiveN(null)}
            >
              ×
            </button>
            <h2>{active.poi.title}</h2>
            {active.poi.img ? <img src={active.poi.img} alt="" /> : null}
            {active.poi.desc ? <p>{active.poi.desc}</p> : null}
            {active.poi.pano ? (
              <button
                type="button"
                className="poi-pano-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  setPanoUrl(panoSrc(active.poi.pano));
                  if (isPortraitPhone()) setActiveN(null);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"
                  />
                  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                View 360°
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <Pano360Overlay url={panoUrl} onClose={close360} />
    </div>
  );
});

export default PoiHotspots;
