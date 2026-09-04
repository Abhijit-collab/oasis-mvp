"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const FRAME_PAD = 1 / 30;
const DRAG_THRESHOLD = 12;
const DATA_TIMEOUT_MS = 12000;
const PAINT_TIMEOUT_MS = 1200;

const waitForData = (el) =>
  new Promise((resolve) => {
    if (!el || el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve(true);
      return;
    }
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      el.removeEventListener("loadeddata", onReady);
      el.removeEventListener("canplay", onReady);
      el.removeEventListener("error", onErr);
      resolve(ok);
    };
    const onReady = () => finish(true);
    const onErr = () => finish(false);
    const timer = setTimeout(() => finish(el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA), DATA_TIMEOUT_MS);
    el.addEventListener("loadeddata", onReady, { once: true });
    el.addEventListener("canplay", onReady, { once: true });
    el.addEventListener("error", onErr, { once: true });
  });

/** iOS often ignores preload=auto — muted play/pause forces bytes to arrive. */
const kickBuffer = (el) => {
  if (!el) return;
  try {
    el.muted = true;
    const p = el.play();
    if (p?.then) {
      p.then(() => {
        try {
          el.pause();
        } catch {
          /* ignore */
        }
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
};

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
        el.requestVideoFrameCallback(() => finish());
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

/**
 * Dual-buffer video stage — always plays clips forward (use *-rev.mp4 for back nav).
 * Call beginPlay() from a click/tap handler so iOS allows playback under user gesture.
 */
const OrbitClipStage = forwardRef(function OrbitClipStage(
  {
    clipSrc,
    playToken = 0,
    mode = "idle",
    holdAt = "end",
    playDirection = "forward",
    landAfterPlay = null,
    prefetchBack = null,
    prefetchNext = null,
    onComplete,
    onPlayingChange,
    onDragForward,
    onDragBack,
    dragDisabled = false,
    onHoldFrameReady,
    holdResetKey = 0,
    prepareHomeClip = null,
    onPrepareHomeReady,
  },
  ref
) {
  const refA = useRef(null);
  const refB = useRef(null);
  const dragRef = useRef(null);
  const draggingRef = useRef(false);
  const firedRef = useRef(false);
  const startXRef = useRef(0);
  const activeIdx = useRef(0);
  const hasFrameRef = useRef(false);
  const playSessionRef = useRef(0);
  const landAfterPlayRef = useRef(landAfterPlay);
  const playDirectionRef = useRef(playDirection);
  const onCompleteRef = useRef(onComplete);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onDragForwardRef = useRef(onDragForward);
  const onDragBackRef = useRef(onDragBack);
  const onHoldFrameReadyRef = useRef(onHoldFrameReady);
  const onPrepareHomeReadyRef = useRef(onPrepareHomeReady);
  const holdFrameReadySentRef = useRef(false);
  const endedHandlerRef = useRef(null);
  const playElRef = useRef(null);

  const [active, setActive] = useState(0);
  const [hasFrame, setHasFrame] = useState(false);
  const [bufReady, setBufReady] = useState([false, false]);

  landAfterPlayRef.current = landAfterPlay;
  playDirectionRef.current = playDirection;
  onCompleteRef.current = onComplete;
  onPlayingChangeRef.current = onPlayingChange;
  onDragForwardRef.current = onDragForward;
  onDragBackRef.current = onDragBack;
  onHoldFrameReadyRef.current = onHoldFrameReady;
  onPrepareHomeReadyRef.current = onPrepareHomeReady;

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

  const revealBuffer = async (el) => {
    if (!el) return;
    await waitForPaint(el);
    const idx = bufIndex(el);
    markBufReady(idx, true);
    if (idx !== activeIdx.current) swapActive();
    markBufReady(1 - idx, false);
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

  const loadClip = async (el, src, { markReady = true } = {}) => {
    if (!el) return false;
    const idx = bufIndex(el);
    const isActive = idx === activeIdx.current;

    if (!sameClip(el.currentSrc || el.src, src)) {
      if (!isActive) markBufReady(idx, false);
      el.src = src;
      kickBuffer(el);
      const ok = await waitForData(el);
      if (!ok) return false;
    } else if (el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      kickBuffer(el);
      const ok = await waitForData(el);
      if (!ok) return false;
    }

    if (markReady) markBufReady(idx, true);
    return true;
  };

  const clearEndedHandler = () => {
    const el = playElRef.current;
    const handler = endedHandlerRef.current;
    if (el && handler) el.removeEventListener("ended", handler);
    endedHandlerRef.current = null;
  };

  const attachEndedHandler = (playEl, session, isBack) => {
    clearEndedHandler();
    playElRef.current = playEl;

    const endedHandler = async () => {
      if (playSessionRef.current !== session) return;
      playEl.pause();

      const land = landAfterPlayRef.current;
      if (isBack && land?.clipSrc) {
        const landAt = land.holdAt ?? "end";
        const playSrc = playEl.currentSrc || playEl.src;

        if (sameClip(playSrc, land.clipSrc)) {
          await freezeAtHold(playEl, landAt);
          if (playSessionRef.current !== session) return;
          onPlayingChangeRef.current?.(false);
          onCompleteRef.current?.("back");
          return;
        }

        const landEl = inactiveEl().current;
        const landReady = landEl
          ? await loadClip(landEl, land.clipSrc, { markReady: false })
          : false;

        if (playSessionRef.current !== session) return;

        if (landReady && landEl) {
          await freezeAtHold(landEl, landAt);
          if (playSessionRef.current !== session) return;
          await revealBuffer(landEl);
        } else {
          await freezeAtHold(playEl, "end");
        }

        onPlayingChangeRef.current?.(false);
        onCompleteRef.current?.("back");
        return;
      }

      await freezeAtHold(playEl, "end");
      onPlayingChangeRef.current?.(false);
      onCompleteRef.current?.("forward");
    };

    endedHandlerRef.current = endedHandler;
    playEl.addEventListener("ended", endedHandler, { once: true });
  };

  /**
   * Must be called directly from a tap/click (user gesture) on iOS.
   * Starts muted playback immediately, then finishes wiring async.
   */
  const beginPlay = useCallback(({ src, direction = "forward", token, landAfterPlay: land }) => {
    if (!src) return false;

    const session = token || Date.now();
    playSessionRef.current = session;
    playDirectionRef.current = direction;
    if (land !== undefined) landAfterPlayRef.current = land;
    clearEndedHandler();

    const isBack = direction === "back";
    const holdEl = hasFrameRef.current ? activeEl().current : null;
    const inactive = inactiveEl().current;

    const activeHas = holdEl && sameClip(holdEl.currentSrc || holdEl.src, src);
    const inactiveHas = inactive && sameClip(inactive.currentSrc || inactive.src, src);

    let playEl;
    if (!isBack && activeHas) {
      playEl = holdEl;
    } else if (inactiveHas) {
      playEl = inactive;
    } else {
      playEl = (hasFrameRef.current ? inactiveEl() : activeEl()).current;
    }
    if (!playEl) return false;

    // Assign src synchronously under the gesture when needed.
    if (!sameClip(playEl.currentSrc || playEl.src, src)) {
      playEl.src = src;
    }

    try {
      playEl.muted = true;
      playEl.playsInline = true;
      playEl.setAttribute("playsinline", "");
      playEl.setAttribute("webkit-playsinline", "");
      if (playEl.currentTime > 0.05) playEl.currentTime = 0;
    } catch {
      /* ignore */
    }

    playEl.playbackRate = 1;
    onPlayingChangeRef.current?.(true);

    // Critical: invoke play() in the same turn as the tap.
    const playPromise = playEl.play();

    (async () => {
      try {
        if (playPromise) await playPromise;
      } catch {
        // Retry once after a short buffer kick (still muted).
        kickBuffer(playEl);
        await waitForData(playEl);
        if (playSessionRef.current !== session) return;
        try {
          if (playEl.currentTime > 0.05) playEl.currentTime = 0;
          await playEl.play();
        } catch {
          onPlayingChangeRef.current?.(false);
          return;
        }
      }

      if (playSessionRef.current !== session) return;
      await revealBuffer(playEl);
      if (playSessionRef.current !== session) return;
      attachEndedHandler(playEl, session, isBack);
    })();

    return true;
  }, []);

  useImperativeHandle(ref, () => ({ beginPlay }), [beginPlay]);

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
        kickBuffer(visible);
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

      const warmSrc = prefetchNext || prefetchBack;
      if (cancelled || !warmSrc) return;
      if (sameClip(warmSrc, clipSrc)) return;
      const warmEl = inactiveEl().current;
      if (!warmEl) return;
      markBufReady(bufIndex(warmEl), false);
      if (sameClip(warmEl.currentSrc || warmEl.src, warmSrc)) {
        await freezeAtHold(warmEl, "start");
        markBufReady(bufIndex(warmEl), false);
        return;
      }
      const warmed = await loadClip(warmEl, warmSrc, { markReady: false });
      if (cancelled || !warmed) return;
      await freezeAtHold(warmEl, "start");
      markBufReady(bufIndex(warmEl), false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, clipSrc, holdAt, holdResetKey, prefetchBack, prefetchNext]);

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

  // Fallback if playToken changes without beginPlay (e.g. programmatic). Prefer beginPlay from taps.
  useEffect(() => {
    if (mode !== "play" || !clipSrc || !playToken) return;
    if (playSessionRef.current === playToken) return;
    beginPlay({ src: clipSrc, direction: playDirection, token: playToken });
  }, [mode, clipSrc, playToken, playDirection, beginPlay]);

  useEffect(() => {
    return () => clearEndedHandler();
  }, []);

  const videoLayer = (videoRef, idx) => {
    const isActive = active === idx;
    const show = bufReady[idx];

    return (
      <video
        ref={videoRef}
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
});

export default OrbitClipStage;
