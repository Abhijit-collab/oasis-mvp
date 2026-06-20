"use client";

import { useEffect, useRef, useState } from "react";

export default function BlockTransitionVideo({ src, onDone, hold = false, atEnd = false }) {
  const ref = useRef(null);
  const onDoneRef = useRef(onDone);
  const [visible, setVisible] = useState(false);

  onDoneRef.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (hold && atEnd) {
      const freeze = () => {
        if (Number.isFinite(el.duration) && el.duration > 0) {
          el.currentTime = Math.max(0, el.duration - 0.04);
        }
        el.pause();
        setVisible(true);
      };
      if (
        el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        Number.isFinite(el.duration) &&
        el.currentTime >= el.duration - 0.15
      ) {
        freeze();
        return;
      }
      setVisible(false);
      el.load();
      if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
        freeze();
      } else {
        el.addEventListener("loadedmetadata", freeze, { once: true });
      }
      return () => el.removeEventListener("loadedmetadata", freeze);
    }

    setVisible(false);
    el.load();

    const start = () => {
      el.currentTime = 0;
      el.play().catch(() => onDoneRef.current?.());
    };

    const onPlaying = () => setVisible(true);

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      start();
    } else {
      el.addEventListener("loadeddata", start, { once: true });
    }
    el.addEventListener("playing", onPlaying);

    return () => {
      el.removeEventListener("loadeddata", start);
      el.removeEventListener("playing", onPlaying);
    };
  }, [src, hold, atEnd]);

  const handleEnded = () => {
    const el = ref.current;
    if (!el) return;
    if (Number.isFinite(el.duration) && el.duration > 0) {
      el.currentTime = Math.max(0, el.duration - 0.04);
    }
    el.pause();
    setVisible(true);
    onDoneRef.current?.();
  };

  return (
    <video
      ref={ref}
      className={"be-stage-video" + (hold ? " hold" : "") + (visible ? " on" : "")}
      src={src}
      muted
      playsInline
      preload="auto"
      onEnded={hold ? undefined : handleEnded}
      onError={hold ? undefined : () => onDoneRef.current?.()}
    />
  );
}
