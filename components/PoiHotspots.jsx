"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { getPoiView } from "@/data/pois";
import { isMobileTourDevice } from "@/lib/rotateGate";

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

function frameToScreen(el, fx, fy) {
  const box = mediaBox(el);
  if (!box) return null;
  return {
    x: box.offX + fx * box.vw * box.scaleX,
    y: box.offY + fy * box.vh * box.scaleY,
  };
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

const PoiHotspots = forwardRef(function PoiHotspots({ stageRef }, ref) {
  const [marks, setMarks] = useState([]);
  const [revealed, setRevealed] = useState(0);
  const [activeN, setActiveN] = useState(null);
  const [popPos, setPopPos] = useState(null);
  const layerRef = useRef(null);
  const cardRef = useRef(null);
  const ticket = useRef(0);
  const drawnTicket = useRef(0);
  const timers = useRef([]);
  const stopListen = useRef(null);

  const stopTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const unlisten = () => {
    stopListen.current?.();
    stopListen.current = null;
  };

  useEffect(() => () => {
    stopTimers();
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
      setMarks([]);
      setRevealed(0);
      setActiveN(null);
    },
    showPoisForView(viewId) {
      const my = ++ticket.current;
      drawnTicket.current = 0;
      stopTimers();
      unlisten();
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
        const next = [];
        for (const poi of view.pois) {
          const point = frameToScreen(el, poi.x, poi.y);
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
        setMarks(next);
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
    <div className="poi-layer" ref={layerRef} aria-hidden={false}>
      <svg className="poi-svg" aria-hidden>
        {marks.map((mark, index) => (
          <g key={mark.poi.n} className={index < revealed ? "show" : ""}>
            <line
              className="poi-line"
              x1={mark.bx}
              y1={mark.by}
              x2={mark.x}
              y2={mark.y}
              style={{ "--len": mark.len }}
            />
            <circle className="poi-dot" cx={mark.x} cy={mark.y} r="5" />
          </g>
        ))}
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
          style={{ left: mark.bx, top: mark.by }}
          aria-label={`${mark.poi.n}. ${mark.poi.title}`}
          onClick={(event) => {
            event.stopPropagation();
            setActiveN((current) => (current === mark.poi.n ? null : mark.poi.n));
          }}
        >
          {mark.poi.n}
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
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default PoiHotspots;
