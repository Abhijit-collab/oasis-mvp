"use client";

import { useEffect, useRef, useState } from "react";

/** Frozen last frame after a transition sequence completes. */
export default function SceneHoldFrame({ src }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;

    setVisible(false);
    el.src = src;
    el.load();

    const freeze = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        el.currentTime = Math.max(0, el.duration - 0.04);
      }
      el.pause();
      setVisible(true);
    };

    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      freeze();
    } else {
      el.addEventListener("loadedmetadata", freeze, { once: true });
    }
  }, [src]);

  if (!src) return null;

  return (
    <video
      ref={ref}
      className={"be-stage-video hold" + (visible ? " on" : "")}
      muted
      playsInline
      preload="auto"
    />
  );
}
