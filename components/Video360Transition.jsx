"use client";

import { useEffect, useRef, useState } from "react";

const LOAD_FALLBACK_MS = 8000;
const FRAME_SEC = 1 / 30;

/**
 * Plays one segment of the stitched orbit and stops exactly at the clip boundary
 * (does not bleed into the next transition).
 */
export default function Video360Transition({
  src,
  fromFraction = 0,
  toFraction = 0,
  playToken = 0,
  instant = false,
  reverse = false,
  idleFraction = 0,
  fullBleed = false,
  className = "",
  onComplete,
  onPlayingChange,
}) {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const blobUrlRef = useRef(null);
  const finishedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [loadLabel, setLoadLabel] = useState("Loading 360…");
  const [videoSrc, setVideoSrc] = useState("");

  const seekToFraction = (fraction) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.playbackRate = 1;
    video.pause();
    const t =
      fraction >= 1
        ? Math.max(0, video.duration - FRAME_SEC)
        : Math.max(0, fraction * video.duration);
    video.currentTime = t;
  };

  const hardStop = (video, endTime, reversePlay) => {
    video.playbackRate = 1;
    video.pause();
    video.currentTime = reversePlay
      ? Math.max(0, endTime)
      : Math.max(0, endTime - FRAME_SEC * 0.5);
  };

  useEffect(() => {
    if (!src) return undefined;

    let cancelled = false;
    setLoading(true);
    setLoadLabel("Buffering 360…");
    setVideoSrc("");

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

    const onMeta = () => setLoading(false);
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    const fallback = window.setTimeout(onMeta, LOAD_FALLBACK_MS);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      window.clearTimeout(fallback);
    };
  }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || loading || !playToken) return undefined;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return undefined;

    const endFrac = toFraction >= 1 ? 1 : toFraction;
    const startTime = fromFraction * duration;
    const endTime = endFrac * duration;
    const resultFrac = toFraction >= 1 ? 0 : toFraction;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    finishedRef.current = false;

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      hardStop(video, endTime, reverse);
      onPlayingChange?.(false);
      onComplete?.(resultFrac);
    };

    if (instant || Math.abs(endTime - startTime) < 0.02) {
      hardStop(video, endTime, reverse);
      finish();
      return undefined;
    }

    let cancelled = false;
    onPlayingChange?.(true);

    const clampForward = () => {
      if (finishedRef.current || cancelled) return;
      if (!reverse && video.currentTime >= endTime - FRAME_SEC) {
        finish();
      }
    };

    const onTimeUpdate = () => clampForward();

    video.playbackRate = reverse ? -1 : 1;
    video.currentTime = reverse ? Math.min(duration - FRAME_SEC, startTime) : startTime;

    video.addEventListener("timeupdate", onTimeUpdate);
    video.play().catch(() => {
      if (!cancelled) finish();
    });

    const tick = () => {
      if (cancelled || finishedRef.current) return;
      if (reverse) {
        if (video.currentTime <= endTime + FRAME_SEC) finish();
      } else {
        clampForward();
      }
      if (!finishedRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      video.removeEventListener("timeupdate", onTimeUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.playbackRate = 1;
      video.pause();
    };
  }, [playToken, fromFraction, toFraction, instant, reverse, loading, onComplete, onPlayingChange]);

  useEffect(() => {
    if (loading || playToken) return;
    seekToFraction(idleFraction);
  }, [loading, playToken, idleFraction]);

  const wrapCls = fullBleed ? "relative h-full w-full" : "relative aspect-video w-full";

  return (
    <div className={`${wrapCls} ${className}`}>
      <div className="relative h-full w-full overflow-hidden bg-black">
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
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
      </div>
    </div>
  );
}
