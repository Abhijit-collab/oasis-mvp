"use client";

import { useEffect, useRef, useState } from "react";

const waitCanPlayThrough = (el, url) =>
  new Promise((resolve, reject) => {
    if (!el) {
      reject(new Error("no video element"));
      return;
    }

    const ready = () => el.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA;
    if (el.src === url && ready()) {
      resolve();
      return;
    }

    const cleanup = () => {
      el.removeEventListener("canplaythrough", onReady);
      el.removeEventListener("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("video error"));
    };

    el.addEventListener("canplaythrough", onReady);
    el.addEventListener("error", onError);

    if (el.src !== url) el.src = url;
    el.load();

    if (ready()) onReady();
  });

const playFromStart = (el) =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };

    const onEnded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("playback error"));
    };

    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.currentTime = 0;
    el.play().catch(reject);
  });

const freezeLastFrame = (el) => {
  if (!el) return;
  if (Number.isFinite(el.duration) && el.duration > 0) {
    el.currentTime = Math.max(0, el.duration - 1 / 30);
  }
  el.pause();
};

/**
 * Dual-buffer player: preloads the next clip on a hidden element and swaps
 * instantly at each cut so T1→T7 board stay frame-aligned without black flashes.
 */
export default function SceneTransitionPlayer({ clips, hold = false, onComplete, onPlayingChange }) {
  const refA = useRef(null);
  const refB = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const [front, setFront] = useState(0);
  const [visible, setVisible] = useState(false);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (hold) return;
    if (!clips?.length) return;

    const elA = refA.current;
    const elB = refB.current;
    if (!elA || !elB) return;

    let cancelled = false;
    setVisible(false);
    onPlayingChange?.(true);

    const run = async () => {
      try {
        let current = elA;
        let next = elB;
        let currentIsA = true;

        for (let i = 0; i < clips.length; i++) {
          if (cancelled) return;

          await waitCanPlayThrough(current, clips[i]);
          if (cancelled) return;

          setFront(currentIsA ? 0 : 1);
          setVisible(true);

          const nextLoad =
            i + 1 < clips.length
              ? waitCanPlayThrough(next, clips[i + 1]).catch(() => {})
              : null;

          await playFromStart(current);
          if (cancelled) return;

          if (nextLoad) await nextLoad;

          if (i + 1 < clips.length) {
            [current, next] = [next, current];
            currentIsA = !currentIsA;
            setFront(currentIsA ? 0 : 1);
          } else {
            freezeLastFrame(current);
          }
        }

        if (cancelled) return;
        onPlayingChange?.(false);
        onCompleteRef.current?.(clips[clips.length - 1]);
      } catch {
        if (!cancelled) {
          onPlayingChange?.(false);
          onCompleteRef.current?.(clips[clips.length - 1]);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      onPlayingChange?.(false);
    };
  }, [clips, hold, onPlayingChange]);

  useEffect(() => {
    if (!hold) return;
    const el = front === 0 ? refA.current : refB.current;
    freezeLastFrame(el);
    setVisible(true);
  }, [hold, front]);

  if (!clips?.length && !hold) return null;

  const classFor = (isFront) =>
    "be-stage-video" + (isFront ? " on" : "") + (hold && isFront ? " hold" : "");

  return (
    <>
      <video
        ref={refA}
        className={classFor(front === 0)}
        muted
        playsInline
        preload="auto"
        onPlaying={() => setVisible(true)}
      />
      <video
        ref={refB}
        className={classFor(front === 1)}
        muted
        playsInline
        preload="auto"
        onPlaying={() => setVisible(true)}
      />
    </>
  );
}
