"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { isSlowNetwork } from "@/hooks/usePreloadVideos";

const END_HOLD_PAD = 0.05;
const END_HOLD_PAD_ANDROID = 0.18;
/** Finish Android forward before true EOS — EOS seek/tear breaks the next → tap. */
const ANDROID_SOFT_END_PAD = 0.25;
const DRAG_THRESHOLD = 12;
const DATA_TIMEOUT_MS = 12000;
const PAINT_TIMEOUT_MS = 1200;
const SEEK_TIMEOUT_MS = 900;

const isAndroidClient = () =>
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

const stallAbortMs = () => (isSlowNetwork() ? 4500 : 12000);
const stallRetryMs = () => (isSlowNetwork() ? 3500 : 6000);
const WARM_COVERAGE = () => (isSlowNetwork() ? 0.28 : 0.4);
const WARM_COVERAGE_TIMEOUT_MS = () => (isSlowNetwork() ? 12000 : 20000);
const WARM_KICK_MS = 1800;

const bufferCoverage = (el) => {
  if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return 0;
  if (!el.buffered?.length) return 0;
  let maxEnd = 0;
  for (let i = 0; i < el.buffered.length; i += 1) {
    maxEnd = Math.max(maxEnd, el.buffered.end(i));
  }
  return Math.min(1, maxEnd / el.duration);
};

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

/** Seek then wait for a decoded frame (Android tears if we paint mid-seek). */
const seekAndWait = (el, time) =>
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
      el.removeEventListener("seeked", finish);
      resolve();
    };
    const timer = setTimeout(finish, SEEK_TIMEOUT_MS);
    el.addEventListener("seeked", finish, { once: true });
    try {
      el.currentTime = time;
    } catch {
      finish();
    }
  });

/**
 * iOS often ignores preload=auto — muted play/pause forces bytes to arrive.
 * Never pause when `keepPlaying` is set (active orbit play session).
 */
const kickBuffer = (el, { keepPlaying = false } = {}) => {
  if (!el) return;
  try {
    el.muted = true;
    const p = el.play();
    if (p?.then) {
      p.then(() => {
        if (keepPlaying) return;
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

/**
 * Keep warming the next clip while on hold. Returns a cancel() so play/tap
 * stops the play→pause kicks (otherwise they pause the same element mid-play).
 */
const startWarmCoverage = (el, { need = WARM_COVERAGE(), timeoutMs = WARM_COVERAGE_TIMEOUT_MS() } = {}) => {
  let settled = false;
  let timer = null;
  let kick = null;
  let poll = null;

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    if (kick) clearInterval(kick);
    if (poll) clearInterval(poll);
    timer = kick = poll = null;
    if (el) {
      el.removeEventListener("progress", onProg);
      el.removeEventListener("canplaythrough", onProg);
    }
  };

  const onProg = () => {
    if (settled || !el) return;
    if (bufferCoverage(el) >= need || el.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      settled = true;
      cleanup();
    }
  };

  if (
    el &&
    (bufferCoverage(el) >= need || el.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA)
  ) {
    settled = true;
    return () => {};
  }

  if (el) {
    kickBuffer(el);
    kick = setInterval(() => {
      if (!settled) kickBuffer(el);
    }, WARM_KICK_MS);
    poll = setInterval(onProg, 400);
    el.addEventListener("progress", onProg);
    el.addEventListener("canplaythrough", onProg);
    timer = setTimeout(() => {
      settled = true;
      cleanup();
    }, timeoutMs);
  }

  return () => {
    settled = true;
    cleanup();
  };
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
    onPlayFailed,
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
  const onPlayFailedRef = useRef(onPlayFailed);
  const onDragForwardRef = useRef(onDragForward);
  const onDragBackRef = useRef(onDragBack);
  const onHoldFrameReadyRef = useRef(onHoldFrameReady);
  const onPrepareHomeReadyRef = useRef(onPrepareHomeReady);
  const holdFrameReadySentRef = useRef(false);
  const endedHandlerRef = useRef(null);
  const softEndHandlerRef = useRef(null);
  const playElRef = useRef(null);
  const stallTimerRef = useRef(null);
  const stallListenersRef = useRef(null);
  const finishingRef = useRef(false);
  const holdCanvasRef = useRef(null);
  const holdStillOnRef = useRef(false);
  const [holdStillOn, setHoldStillOn] = useState(false);
  const [active, setActive] = useState(0);
  const [hasFrame, setHasFrame] = useState(false);
  const [bufReady, setBufReady] = useState([false, false]);

  landAfterPlayRef.current = landAfterPlay;
  playDirectionRef.current = playDirection;
  onCompleteRef.current = onComplete;
  onPlayingChangeRef.current = onPlayingChange;
  onPlayFailedRef.current = onPlayFailed;
  onDragForwardRef.current = onDragForward;
  onDragBackRef.current = onDragBack;
  onHoldFrameReadyRef.current = onHoldFrameReady;
  onPrepareHomeReadyRef.current = onPrepareHomeReady;

  const clearHoldStill = () => {
    holdStillOnRef.current = false;
    const canvas = holdCanvasRef.current;
    if (canvas) {
      canvas.style.opacity = "0";
      canvas.style.visibility = "hidden";
    }
    setHoldStillOn(false);
  };

  const paintHoldStill = (el) => {
    if (!isAndroidClient() || !el) return false;
    const canvas = holdCanvasRef.current;
    if (!canvas) return false;
    const w = el.videoWidth;
    const h = el.videoHeight;
    if (!w || !h) return false;
    try {
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return false;
      ctx.drawImage(el, 0, 0, w, h);
      holdStillOnRef.current = true;
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";
      setHoldStillOn(true);
      return true;
    } catch {
      return false;
    }
  };

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

  const freezeAtHold = async (el, at, { fromPlayEnd = false } = {}) => {
    if (!el) return;
    if (!Number.isFinite(el.duration) || el.duration <= 0) {
      await waitForData(el);
    }
    if (!el || !Number.isFinite(el.duration)) return;
    el.pause();
    el.playbackRate = 1;

    if (at === "start") {
      if (el.currentTime > 0.02) {
        await seekAndWait(el, 0);
      }
    } else if (fromPlayEnd && isAndroidClient()) {
      // After forward play: never seek — EOS/post-ended seek tears and breaks the next →.
      await waitForPaint(el);
      paintHoldStill(el);
      return;
    } else {
      const pad = isAndroidClient() ? END_HOLD_PAD_ANDROID : END_HOLD_PAD;
      const target = Math.max(0, el.duration - pad);
      if (Math.abs((el.currentTime || 0) - target) > 0.03) {
        await seekAndWait(el, target);
      }
    }

    await waitForPaint(el);
    if (isAndroidClient() && at === "end") paintHoldStill(el);
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
    const soft = softEndHandlerRef.current;
    if (el && handler) el.removeEventListener("ended", handler);
    if (el && soft) el.removeEventListener("timeupdate", soft);
    endedHandlerRef.current = null;
    softEndHandlerRef.current = null;
  };

  const clearStallWatch = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    const pair = stallListenersRef.current;
    if (pair?.el) {
      pair.el.removeEventListener("waiting", pair.onWaiting);
      pair.el.removeEventListener("stalled", pair.onWaiting);
      pair.el.removeEventListener("playing", pair.onPlaying);
      pair.el.removeEventListener("timeupdate", pair.onPlaying);
    }
    stallListenersRef.current = null;
  };

  const abortPlaySession = (session) => {
    if (playSessionRef.current !== session) return;
    finishingRef.current = false;
    clearStallWatch();
    clearEndedHandler();
    clearHoldStill();
    const el = playElRef.current;
    try {
      el?.pause();
    } catch {
      /* ignore */
    }
    onPlayingChangeRef.current?.(false);
    onPlayFailedRef.current?.();
  };

  const attachStallWatch = (playEl, session) => {
    clearStallWatch();
    let lastTime = playEl.currentTime || 0;

    const nearEnd = () => {
      const dur = playEl.duration;
      const t = playEl.currentTime || 0;
      return Number.isFinite(dur) && dur > 0 && t / dur >= 0.7;
    };

    const arm = () => {
      // Near the end, Slow 4G often waits for the last bytes — aborting here
      // cancels forward and leaves the step stuck (reverse lands on another clip).
      if (nearEnd()) return;
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      stallTimerRef.current = setTimeout(() => {
        if (playSessionRef.current !== session || nearEnd()) return;
        kickBuffer(playEl, { keepPlaying: true });
        try {
          const p = playEl.play();
          if (p?.catch) p.catch(() => {});
        } catch {
          /* ignore */
        }
        stallTimerRef.current = setTimeout(() => {
          if (nearEnd()) return;
          abortPlaySession(session);
        }, stallRetryMs());
      }, stallAbortMs());
    };

    const onWaiting = () => {
      if (playSessionRef.current !== session) return;
      kickBuffer(playEl, { keepPlaying: true });
      arm();
    };

    const onProgress = () => {
      if (playSessionRef.current !== session) return;
      const t = playEl.currentTime || 0;
      if (t - lastTime < 0.12) return;
      lastTime = t;
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };

    playEl.addEventListener("waiting", onWaiting);
    playEl.addEventListener("stalled", onWaiting);
    playEl.addEventListener("playing", onProgress);
    playEl.addEventListener("timeupdate", onProgress);
    stallListenersRef.current = { el: playEl, onWaiting, onPlaying: onProgress };
  };

  const completePlaySession = async (playEl, session, isBack) => {
    if (playSessionRef.current !== session || finishingRef.current) return;
    finishingRef.current = true;
    clearStallWatch();
    clearEndedHandler();

    try {
      playEl.pause();
    } catch {
      /* ignore */
    }

    const land = landAfterPlayRef.current;
    if (isBack && land?.clipSrc) {
      const landAt = land.holdAt ?? "end";
      const playSrc = playEl.currentSrc || playEl.src;

      if (sameClip(playSrc, land.clipSrc)) {
        await freezeAtHold(playEl, landAt, { fromPlayEnd: true });
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
        await freezeAtHold(playEl, "end", { fromPlayEnd: true });
      }

      onPlayingChangeRef.current?.(false);
      onCompleteRef.current?.("back");
      return;
    }

    await freezeAtHold(playEl, "end", { fromPlayEnd: true });
    onPlayingChangeRef.current?.(false);
    onCompleteRef.current?.("forward");
  };

  const attachEndedHandler = (playEl, session, isBack) => {
    clearEndedHandler();
    playElRef.current = playEl;
    finishingRef.current = false;

    const onEnded = () => {
      completePlaySession(playEl, session, isBack);
    };

    // Android: finish before true EOS so we never hit a torn end frame (breaks next →).
    const onSoftEnd = () => {
      if (playSessionRef.current !== session || finishingRef.current) return;
      if (!isAndroidClient()) return;
      const dur = playEl.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      if (playEl.currentTime < dur - ANDROID_SOFT_END_PAD) return;
      completePlaySession(playEl, session, isBack);
    };

    endedHandlerRef.current = onEnded;
    softEndHandlerRef.current = onSoftEnd;
    playEl.addEventListener("ended", onEnded, { once: true });
    if (isAndroidClient()) {
      playEl.addEventListener("timeupdate", onSoftEnd);
    }
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
    finishingRef.current = false;
    clearHoldStill();
    clearStallWatch();
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
    playElRef.current = playEl;
    onPlayingChangeRef.current?.(true);
    attachStallWatch(playEl, session);

    // Critical: invoke play() in the same turn as the tap.
    const playPromise = playEl.play();

    (async () => {
      try {
        if (playPromise) await playPromise;
      } catch {
        // Retry once after a short buffer kick (still muted) — do not pause.
        kickBuffer(playEl, { keepPlaying: true });
        await waitForData(playEl);
        if (playSessionRef.current !== session) return;
        try {
          if (playEl.currentTime > 0.05) playEl.currentTime = 0;
          await playEl.play();
        } catch {
          abortPlaySession(session);
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
    let stopWarm = null;

    (async () => {
      const visible = activeEl().current;
      const back = inactiveEl().current;
      if (!visible) return;

      const visibleHasClip = sameClip(visible.currentSrc || visible.src, clipSrc);

      if (visibleHasClip) {
        // Android already snapped a still after soft-end — don't kick/seek again (tears + overlap).
        if (isAndroidClient() && holdStillOnRef.current && holdAt === "end") {
          markBufReady(bufIndex(visible), true);
          markHasFrame(true);
        } else {
          kickBuffer(visible);
          await waitForData(visible);
          if (cancelled) return;
          await freezeAtHold(visible, holdAt);
          if (cancelled) return;
          await revealBuffer(visible);
        }
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
      if (!sameClip(warmEl.currentSrc || warmEl.src, warmSrc)) {
        const warmed = await loadClip(warmEl, warmSrc, { markReady: false });
        if (cancelled || !warmed) return;
      }
      await freezeAtHold(warmEl, "start");
      if (cancelled) return;
      markBufReady(bufIndex(warmEl), false);
      // Warm a playable head of Seq4+ before the next tap (abortable on play).
      stopWarm = startWarmCoverage(warmEl);
    })();

    return () => {
      cancelled = true;
      stopWarm?.();
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
    return () => {
      clearStallWatch();
      clearEndedHandler();
    };
  }, []);

  const videoLayer = (videoRef, idx) => {
    const isActive = active === idx;
    // Hide under Android hold canvas; during play always allow the active buffer.
    const show = bufReady[idx] && (mode === "play" || !holdStillOn);

    return (
      <video
        ref={videoRef}
        className="be-stage-video hold"
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        style={{
          zIndex: isActive ? 3 : 1,
          opacity: show ? 1 : 0,
          visibility: show ? "visible" : "hidden",
        }}
      />
    );
  };

  return (
    <>
      {videoLayer(refA, 0)}
      {videoLayer(refB, 1)}
      <canvas
        ref={holdCanvasRef}
        className="be-stage-hold-still"
        aria-hidden
        style={{
          opacity: holdStillOn ? 1 : 0,
          visibility: holdStillOn ? "visible" : "hidden",
        }}
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
});

export default OrbitClipStage;
