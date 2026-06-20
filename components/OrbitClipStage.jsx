"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FRAME_PAD = 1 / 30;
const DRAG_THRESHOLD = 12;

const waitForData = (el) =>
  new Promise((resolve) => {
    if (!el || el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve();
      return;
    }
    const done = () => resolve();
    el.addEventListener("loadeddata", done, { once: true });
    el.addEventListener("canplay", done, { once: true });
    el.addEventListener("error", done, { once: true });
  });

const PAINT_TIMEOUT_MS = 1200;

/** Wait until the decoder has a frame ready to paint (avoids black flash on swap). */
const waitForPaint = (el) =>
  new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    const timer = setTimeout(finish, PAINT_TIMEOUT_MS);

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !el.seeking) {
      finish();
      return;
    }

    el.addEventListener("seeked", finish, { once: true });
    el.addEventListener("loadeddata", finish, { once: true });

    if (typeof el.requestVideoFrameCallback === "function") {
      try {
        el.requestVideoFrameCallback(() => finish(), { once: true });
      } catch {
        finish();
      }
    }
  });

const srcTail = (url) => {
  if (!url) return "";
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop() || "");
  } catch {
    return url.split("/").pop() || url;
  }
};

const sameClip = (a, b) => {
  if (!a || !b) return false;
  return a === b || srcTail(a) === srcTail(b);
};

const hiddenPrefetchStyle = {
  position: "absolute",
  width: 0,
  height: 0,
  opacity: 0,
  pointerEvents: "none",
  visibility: "hidden",
};

/**
 * Dual-buffer video stage — always plays clips forward (use *-rev.mp4 for back nav).
 * The visible buffer is never hidden until the other buffer has a painted frame.
 */
export default function OrbitClipStage({
  clipSrc,
  playToken = 0,
  mode = "idle",
  holdAt = "end",
  playDirection = "forward",
  landAfterPlay = null,
  prefetchForward = null,
  prefetchBack = null,
  prefetchLand = null,
  onComplete,
  onPlayingChange,
  onDragForward,
  onDragBack,
  dragDisabled = false,
  onHoldFrameReady,
  holdResetKey = 0,
  prepareHomeClip = null,
  onPrepareHomeReady,
}) {
  const refA = useRef(null);
  const refB = useRef(null);
  const prefetchFwdRef = useRef(null);
  const prefetchBackRef = useRef(null);
  const prefetchLandRef = useRef(null);
  const dragRef = useRef(null);
  const draggingRef = useRef(false);
  const firedRef = useRef(false);
  const startXRef = useRef(0);
  const activeIdx = useRef(0);
  const hasFrameRef = useRef(false);
  const playSessionRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onDragForwardRef = useRef(onDragForward);
  const onDragBackRef = useRef(onDragBack);
  const onHoldFrameReadyRef = useRef(onHoldFrameReady);
  const onPrepareHomeReadyRef = useRef(onPrepareHomeReady);
  const holdFrameReadySentRef = useRef(false);

  const [active, setActive] = useState(0);
  const [hasFrame, setHasFrame] = useState(false);
  const [bufReady, setBufReady] = useState([false, false]);

  const markHasFrame = (value) => {
    hasFrameRef.current = value;
    setHasFrame(value);
  };

  const markBufReady = (idx, value = true) => {
    setBufReady((prev) => {
      if (prev[idx] === value) return prev;
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const bufIndex = (el) => (el === refA.current ? 0 : 1);

  onCompleteRef.current = onComplete;
  onPlayingChangeRef.current = onPlayingChange;
  onDragForwardRef.current = onDragForward;
  onDragBackRef.current = onDragBack;
  onHoldFrameReadyRef.current = onHoldFrameReady;
  onPrepareHomeReadyRef.current = onPrepareHomeReady;

  const notifyHoldFrameReady = (el) => {
    if (holdFrameReadySentRef.current || !el) return;
    holdFrameReadySentRef.current = true;
    onHoldFrameReadyRef.current?.();
  };

  const activeEl = () => (activeIdx.current === 0 ? refA : refB);
  const inactiveEl = () => (activeIdx.current === 0 ? refB : refA);

  const swapActive = () => {
    activeIdx.current = 1 - activeIdx.current;
    setActive(activeIdx.current);
  };

  /** Promote a buffer to the top only after it has a painted frame. */
  const revealBuffer = async (el) => {
    if (!el) return;
    await waitForPaint(el);
    const idx = bufIndex(el);
    markBufReady(idx, true);
    if (idx !== activeIdx.current) swapActive();
    markHasFrame(true);
  };

  const freezeAtHold = async (el, at) => {
    if (!el) return;
    if (!Number.isFinite(el.duration) || el.duration <= 0) {
      await waitForData(el);
    }
    if (!el || !Number.isFinite(el.duration)) return;
    el.pause();
    el.playbackRate = 1;
    el.currentTime = at === "start" ? 0 : Math.max(0, el.duration - FRAME_PAD);
    await waitForPaint(el);
  };

  const dragEnabled = mode === "hold" && Boolean(clipSrc) && hasFrame && !dragDisabled;

  const onDragDown = useCallback(
    (e) => {
      if (!dragEnabled || e.button !== 0) return;
      draggingRef.current = true;
      firedRef.current = false;
      startXRef.current = e.clientX;
      dragRef.current?.setPointerCapture(e.pointerId);
    },
    [dragEnabled]
  );

  const onDragMove = useCallback((e) => {
    if (!draggingRef.current || firedRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) < DRAG_THRESHOLD) return;
    firedRef.current = true;
    if (dx > 0) {
      onDragBackRef.current?.();
    } else {
      onDragForwardRef.current?.();
    }
  }, []);

  const onDragUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  /** Load clip on a buffer without hiding the currently visible active buffer. */
  const loadClip = async (el, src, { markReady = true } = {}) => {
    if (!el) return false;
    const idx = bufIndex(el);
    const isActive = idx === activeIdx.current;

    if (!sameClip(el.currentSrc || el.src, src)) {
      if (!isActive) markBufReady(idx, false);
      el.src = src;
      el.load();
      await waitForData(el);
    } else if (el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForData(el);
    }

    if (markReady) markBufReady(idx, true);
    return true;
  };

  useEffect(() => {
    if (mode !== "hold" || !clipSrc) return;
    holdFrameReadySentRef.current = false;
    let cancelled = false;

    (async () => {
      const visible = activeEl().current;
      const back = inactiveEl().current;
      if (!visible) return;

      const visibleHasClip = sameClip(visible.currentSrc || visible.src, clipSrc);

      if (visibleHasClip) {
        await waitForData(visible);
        if (cancelled) return;
        await freezeAtHold(visible, holdAt);
        if (cancelled) return;
        await revealBuffer(visible);
      } else if (back) {
        const ok = await loadClip(back, clipSrc);
        if (cancelled || !ok) return;
        await freezeAtHold(back, holdAt);
        if (cancelled) return;
        await revealBuffer(back);
      }

      if (cancelled) return;
      await notifyHoldFrameReady(activeEl().current);

      // Pre-load the next reverse clip on the hidden buffer so ← starts instantly.
      if (cancelled || !prefetchBack) return;
      const warmEl = inactiveEl().current;
      if (!warmEl || sameClip(warmEl.currentSrc || warmEl.src, prefetchBack)) return;
      const warmed = await loadClip(warmEl, prefetchBack, { markReady: false });
      if (cancelled || !warmed) return;
      await freezeAtHold(warmEl, "start");
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, clipSrc, holdAt, holdResetKey, prefetchBack]);

  /** Warm Main Gate on the hidden buffer while the home fade-out runs. */
  useEffect(() => {
    if (!prepareHomeClip) return;
    let cancelled = false;

    (async () => {
      const el = inactiveEl().current;
      if (!el || cancelled) return;
      const ok = await loadClip(el, prepareHomeClip, { markReady: false });
      if (cancelled || !ok) return;
      await freezeAtHold(el, "start");
      if (cancelled) return;
      markBufReady(bufIndex(el), true);
      onPrepareHomeReadyRef.current?.();
    })();

    return () => {
      cancelled = true;
    };
  }, [prepareHomeClip]);

  useEffect(() => {
    if (mode !== "hold") return;

    const fwdEl = prefetchFwdRef.current;
    if (prefetchForward && fwdEl && !sameClip(fwdEl.currentSrc || fwdEl.src, prefetchForward)) {
      fwdEl.src = prefetchForward;
      fwdEl.load();
    }

    const backEl = prefetchBackRef.current;
    if (prefetchBack && backEl && !sameClip(backEl.currentSrc || backEl.src, prefetchBack)) {
      backEl.src = prefetchBack;
      backEl.load();
    }

    const landEl = prefetchLandRef.current;
    if (prefetchLand && landEl && !sameClip(landEl.currentSrc || landEl.src, prefetchLand)) {
      landEl.src = prefetchLand;
      landEl.load();
    }
  }, [mode, prefetchForward, prefetchBack, prefetchLand]);

  useEffect(() => {
    if (mode !== "play" || !clipSrc || !playToken) return;

    const session = playToken;
    playSessionRef.current = session;
    let cancelled = false;
    let finished = false;
    let endedHandler = null;
    let playElRef = null;

    const isCurrent = () => !cancelled && playSessionRef.current === session;

    const failPlay = () => {
      if (!isCurrent()) return;
      onPlayingChangeRef.current?.(false);
    };

    const finish = (direction) => {
      if (!isCurrent() || finished) return;
      finished = true;
      onPlayingChangeRef.current?.(false);
      onCompleteRef.current?.(direction);
    };

    const startPlayback = async (playEl) => {
      if (!isCurrent() || !playEl) return false;

      playEl.currentTime = 0;
      playEl.playbackRate = 1;
      playElRef = playEl;
      onPlayingChangeRef.current?.(true);

      try {
        await playEl.play();
      } catch {
        return false;
      }

      if (!isCurrent()) return false;
      await revealBuffer(playEl);
      return isCurrent();
    };

    (async () => {
      const isBack = playDirection === "back";
      const holdEl = hasFrameRef.current ? activeEl().current : null;
      const playEl = (hasFrameRef.current ? inactiveEl() : activeEl()).current;
      if (!playEl) return;

      const ok = await loadClip(playEl, clipSrc, { markReady: false });
      if (!ok || !isCurrent()) {
        failPlay();
        return;
      }

      const alreadyWarmed =
        isBack &&
        sameClip(playEl.currentSrc || playEl.src, clipSrc) &&
        playEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

      if (!hasFrameRef.current) {
        playEl.currentTime = 0;
        playEl.playbackRate = 1;
        playElRef = playEl;
        onPlayingChangeRef.current?.(true);
        try {
          await playEl.play();
        } catch {
          finish(isBack ? "back" : "forward");
          return;
        }
        await revealBuffer(playEl);
      } else if (alreadyWarmed && playEl.currentTime < 0.05) {
        playEl.currentTime = 0;
        playEl.playbackRate = 1;
        playElRef = playEl;
        onPlayingChangeRef.current?.(true);
        try {
          await playEl.play();
        } catch {
          finish(isBack ? "back" : "forward");
          return;
        }
        if (!isCurrent()) return;
        await revealBuffer(playEl);
      } else {
        const started = await startPlayback(playEl);
        if (!started) {
          finish(isBack ? "back" : "forward");
          return;
        }
      }

      endedHandler = async () => {
        if (!isCurrent() || finished) return;
        playEl.pause();

        if (isBack && landAfterPlay?.clipSrc) {
          const landAt = landAfterPlay.holdAt ?? "end";
          const playSrc = playEl.currentSrc || playEl.src;

          if (sameClip(playSrc, landAfterPlay.clipSrc)) {
            await freezeAtHold(playEl, landAt);
            if (!isCurrent() || finished) return;
            finish("back");
            return;
          }

          const landEl = inactiveEl().current;
          const landReady = landEl
            ? await loadClip(landEl, landAfterPlay.clipSrc, { markReady: false })
            : false;

          if (!isCurrent() || finished) return;

          if (landReady && landEl) {
            await freezeAtHold(landEl, landAt);
            if (!isCurrent() || finished) return;
            await revealBuffer(landEl);
          } else {
            await freezeAtHold(playEl, "end");
          }

          finish("back");
          return;
        }

        await freezeAtHold(playEl, "end");
        finish("forward");
      };

      playEl.addEventListener("ended", endedHandler, { once: true });
    })();

    return () => {
      cancelled = true;
      if (playElRef && endedHandler) {
        playElRef.removeEventListener("ended", endedHandler);
      }
    };
  }, [mode, clipSrc, playToken, playDirection, landAfterPlay]);

  const videoLayer = (ref, idx) => {
    const isActive = active === idx;
    const show = bufReady[idx];

    return (
      <video
        ref={ref}
        className="be-stage-video hold"
        muted
        playsInline
        preload="auto"
        style={{
          zIndex: isActive ? 3 : 2,
          opacity: show ? 1 : 0,
        }}
      />
    );
  };

  return (
    <>
      {videoLayer(refA, 0)}
      {videoLayer(refB, 1)}
      <video
        ref={prefetchFwdRef}
        muted
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        style={hiddenPrefetchStyle}
      />
      <video
        ref={prefetchBackRef}
        muted
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        style={hiddenPrefetchStyle}
      />
      <video
        ref={prefetchLandRef}
        muted
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        style={hiddenPrefetchStyle}
      />
      {dragEnabled && (
        <div
          ref={dragRef}
          className="absolute inset-0 z-[5] cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
        />
      )}
    </>
  );
};
