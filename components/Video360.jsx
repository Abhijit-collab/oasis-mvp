"use client";

import { Manrope } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });

const ENV_SRC = process.env.NEXT_PUBLIC_OASIS_360_URL || "";
const FRICTION = 0.94;
const COAST_EASE = 0.38;
const MIN_SEEK_DIFF = 0.001;
const PROGRESS_THROTTLE_MS = 120;
const LOAD_FALLBACK_MS = 8000;

const wrapTime = (time, duration) => {
  if (!duration || !Number.isFinite(duration)) return 0;
  return ((time % duration) + duration) % duration;
};

/** Drag-to-scrub 360 orbit — paused video driven by currentTime + momentum. */
export default function Video360({
  src = ENV_SRC,
  className = "",
  fullBleed = false,
  seekFraction = null,
  seekToken = 0,
  onProgress,
}) {
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const rafRef = useRef(null);
  const blobUrlRef = useRef(null);

  const displayRef = useRef(0);
  const targetRef = useRef(0);
  const velocityRef = useRef(0);
  const durationRef = useRef(0);
  const lastProgressEmitRef = useRef(0);

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startTargetRef = useRef(0);
  const lastMoveRef = useRef({ x: 0, t: 0 });
  const primedRef = useRef(false);
  const onProgressRef = useRef(onProgress);

  onProgressRef.current = onProgress;

  const [loading, setLoading] = useState(true);
  const [loadLabel, setLoadLabel] = useState("Loading 360…");
  const [hintVisible, setHintVisible] = useState(true);
  const [hintFading, setHintFading] = useState(true);
  const [videoSrc, setVideoSrc] = useState("");

  const timePerPixel = useCallback(() => {
    const duration = durationRef.current;
    const width = stageRef.current?.clientWidth || 1;
    return duration / width;
  }, []);

  const dismissHint = useCallback(() => {
    setHintFading(false);
    window.setTimeout(() => setHintVisible(false), 450);
  }, []);

  const applySeek = useCallback((video, time) => {
    if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    if (Math.abs(video.currentTime - time) <= MIN_SEEK_DIFF) return;

    if (draggingRef.current && typeof video.fastSeek === "function") {
      try {
        video.fastSeek(time);
        return;
      } catch {
        /* fall through */
      }
    }

    if (!video.seeking) {
      video.currentTime = time;
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!draggingRef.current && Math.abs(velocityRef.current) > 0.0004) {
        targetRef.current += velocityRef.current;
        velocityRef.current *= FRICTION;
      }

      const duration = durationRef.current;
      if (duration > 0) {
        if (draggingRef.current) {
          displayRef.current = targetRef.current;
        } else {
          displayRef.current += (targetRef.current - displayRef.current) * COAST_EASE;
        }

        const wrapped = wrapTime(displayRef.current, duration);
        applySeek(videoRef.current, wrapped);

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${Math.min(100, Math.max(0, (wrapped / duration) * 100))}%`;
        }

        const now = performance.now();
        if (now - lastProgressEmitRef.current >= PROGRESS_THROTTLE_MS) {
          lastProgressEmitRef.current = now;
          onProgressRef.current?.(wrapped / duration);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applySeek]);

  useEffect(() => {
    if (!src) return undefined;

    let cancelled = false;
    setLoading(true);
    setLoadLabel("Buffering 360…");
    setVideoSrc("");
    displayRef.current = 0;
    targetRef.current = 0;
    velocityRef.current = 0;
    primedRef.current = false;

    const prefetch = async () => {
      try {
        const res = await fetch(src, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = URL.createObjectURL(blob);
        setVideoSrc(blobUrlRef.current);
      } catch {
        if (cancelled) return;
        setLoadLabel("Loading 360…");
        setVideoSrc(src);
      }
    };

    prefetch();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return undefined;

    const onMeta = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        durationRef.current = video.duration;
      }
      setLoading(false);
    };

    video.addEventListener("loadedmetadata", onMeta, { once: true });
    const fallback = window.setTimeout(onMeta, LOAD_FALLBACK_MS);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      window.clearTimeout(fallback);
    };
  }, [videoSrc]);

  useEffect(() => {
    if (seekFraction == null || !Number.isFinite(seekFraction)) return;
    const duration = durationRef.current;
    if (duration <= 0) return;
    const t = seekFraction * duration;
    targetRef.current = t;
    displayRef.current = t;
    velocityRef.current = 0;
    applySeek(videoRef.current, wrapTime(t, duration));
    onProgressRef.current?.(seekFraction);
  }, [seekFraction, seekToken, applySeek]);

  const onPointerDown = (e) => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage || loading) return;

    if (!primedRef.current) {
      primedRef.current = true;
      video.play().then(() => video.pause()).catch(() => {});
    }

    draggingRef.current = true;
    startXRef.current = e.clientX;
    startTargetRef.current = targetRef.current;
    lastMoveRef.current = { x: e.clientX, t: performance.now() };
    velocityRef.current = 0;
    stage.setPointerCapture(e.pointerId);

    if (hintVisible) dismissHint();
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;

    const dx = e.clientX - startXRef.current;
    const tpp = timePerPixel();
    targetRef.current = startTargetRef.current - dx * tpp;
    displayRef.current = targetRef.current;

    const now = performance.now();
    const dt = now - lastMoveRef.current.t;
    if (dt > 0) {
      const vdx = e.clientX - lastMoveRef.current.x;
      velocityRef.current = (-vdx * tpp) / dt * (1000 / 60);
    }
    lastMoveRef.current = { x: e.clientX, t: now };

    const duration = durationRef.current;
    if (duration > 0) {
      applySeek(videoRef.current, wrapTime(displayRef.current, duration));
    }
  };

  const endDrag = () => {
    draggingRef.current = false;
  };

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center border border-white/15 bg-[#11171a] p-8 text-center ${fullBleed ? "h-full w-full" : "aspect-video rounded-2xl"} ${manrope.className} ${className}`}
      >
        <p className="max-w-md text-sm text-white/60">
          Set <code className="text-[#e6cd84]">NEXT_PUBLIC_OASIS_360_URL</code> in{" "}
          <code className="text-white/80">.env.local</code>.
        </p>
      </div>
    );
  }

  const stageCls = fullBleed
    ? "relative h-full w-full cursor-grab overflow-hidden bg-black active:cursor-grabbing"
    : "relative aspect-video w-full cursor-grab overflow-hidden rounded-2xl border border-white/15 bg-[#11171a] active:cursor-grabbing";

  return (
    <div className={`relative ${fullBleed ? "h-full w-full" : ""} ${manrope.className} ${className}`}>
      <div
        ref={stageRef}
        className={stageCls}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ willChange: "contents" }}
            muted
            playsInline
            preload="auto"
          />
        )}

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#11171a]/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d8b65a]/30 border-t-[#d8b65a]" />
              <span className="text-sm font-medium tracking-wide text-white/70">{loadLabel}</span>
            </div>
          </div>
        )}

        {hintVisible && !loading && (
          <div
            className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center transition-opacity duration-500 ${
              fullBleed ? "bottom-24" : "bottom-5"
            } ${hintFading ? "opacity-100" : "opacity-0"}`}
          >
            <span className="rounded-full border border-white/15 bg-black/50 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-[#e6cd84] uppercase backdrop-blur-md">
              Drag to rotate
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1 bg-white/10">
          <div
            ref={progressBarRef}
            className="h-full bg-gradient-to-r from-[#d8b65a] to-[#e6cd84]"
            style={{ width: "0%" }}
          />
        </div>
      </div>
    </div>
  );
}
