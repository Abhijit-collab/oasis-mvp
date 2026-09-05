"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const TourSoundtrackContext = createContext(null);

export function useTourSoundtrack() {
  return useContext(TourSoundtrackContext);
}

/**
 * Shared looping soundtrack (login → welcome → 360).
 * One hidden <video> bed so a user gesture on login/welcome can keep unlocking sound.
 */
export function TourSoundtrackProvider({ src = null, children }) {
  const bedRef = useRef(null);
  const [soundOn, setSoundOn] = useState(Boolean(src));
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  /** Was the bed actively playing when the tab was hidden? */
  const wasPlayingRef = useRef(false);
  const available = Boolean(src);

  useEffect(() => {
    if (!src) return undefined;
    const bed = bedRef.current;
    if (!bed) return undefined;
    bed.loop = true;
    bed.playsInline = true;
    bed.preload = "auto";
    // Prime muted (always allowed); audible unlock happens via playAudible / toggle.
    bed.muted = true;
    bed.play()?.catch?.(() => {});
    return () => {
      try {
        bed.pause();
      } catch {
        /* ignore */
      }
    };
  }, [src]);

  // Pause soundtrack when the user leaves the tab/window; resume on return.
  useEffect(() => {
    if (!src) return undefined;

    const bedEl = () => bedRef.current;

    const pauseForBackground = () => {
      const bed = bedEl();
      if (!bed) return;
      wasPlayingRef.current = !bed.paused;
      try {
        bed.pause();
      } catch {
        /* ignore */
      }
    };

    const resumeIfNeeded = () => {
      const bed = bedEl();
      if (!bed || !wasPlayingRef.current) return;
      bed.loop = true;
      bed.playsInline = true;
      bed.muted = !soundOnRef.current;
      if (soundOnRef.current) bed.volume = 1;
      bed.play()?.catch?.(() => {
        // Gesture may have expired — leave muted attempt.
        bed.muted = true;
        setSoundOn(false);
        bed.play()?.catch?.(() => {});
      });
    };

    const onVisibility = () => {
      if (document.hidden) pauseForBackground();
      else resumeIfNeeded();
    };

    const onPageHide = () => pauseForBackground();
    const onPageShow = () => resumeIfNeeded();
    // Mobile browsers sometimes freeze the page without a full hide.
    const onFreeze = () => pauseForBackground();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("freeze", onFreeze);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("freeze", onFreeze);
    };
  }, [src]);

  const syncTo = useCallback((time) => {
    const bed = bedRef.current;
    if (!bed || !Number.isFinite(time)) return;
    try {
      if (Math.abs((bed.currentTime || 0) - time) > 0.35) {
        bed.currentTime = time;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const playAudible = useCallback(async () => {
    const bed = bedRef.current;
    if (!bed || !src) return false;
    bed.loop = true;
    bed.playsInline = true;
    bed.muted = false;
    bed.volume = 1;
    try {
      await bed.play();
      const ok = !bed.muted && !bed.paused;
      setSoundOn(ok);
      return ok;
    } catch {
      try {
        bed.muted = true;
        await bed.play();
        bed.muted = false;
        await bed.play();
        const ok = !bed.muted && !bed.paused;
        setSoundOn(ok);
        return ok;
      } catch {
        setSoundOn(false);
        bed.muted = true;
        return false;
      }
    }
  }, [src]);

  const playMuted = useCallback(async () => {
    const bed = bedRef.current;
    if (!bed || !src) return;
    bed.loop = true;
    bed.playsInline = true;
    bed.muted = true;
    setSoundOn(false);
    try {
      await bed.play();
    } catch {
      /* ignore */
    }
  }, [src]);

  const ensurePlaying = useCallback(async ({ audible = true } = {}) => {
    if (!src) return false;
    if (audible) return playAudible();
    await playMuted();
    return true;
  }, [src, playAudible, playMuted]);

  const toggleSound = useCallback(() => {
    const bed = bedRef.current;
    if (!bed || !src) return;

    const next = !soundOn;
    bed.loop = true;
    bed.playsInline = true;
    bed.muted = !next;
    if (next) bed.volume = 1;
    const play = bed.play();
    if (play?.catch) {
      play.catch(() => {
        bed.muted = true;
        setSoundOn(false);
      });
    }
    setSoundOn(next);
  }, [src, soundOn]);

  const pause = useCallback(() => {
    try {
      bedRef.current?.pause();
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      available,
      soundOn,
      setSoundOn,
      syncTo,
      playAudible,
      playMuted,
      ensurePlaying,
      toggleSound,
      pause,
      bedRef,
    }),
    [available, soundOn, syncTo, playAudible, playMuted, ensurePlaying, toggleSound, pause]
  );

  return (
    <TourSoundtrackContext.Provider value={value}>
      {src ? (
        <video
          ref={bedRef}
          className="tour-soundtrack-bed"
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
        />
      ) : null}
      {children}
      {/* Persistent across login, welcome, preload, booking — hidden on 360 (chrome has its own). */}
      {src ? <SoundToggleButton className="tour-sound-btn--shell" /> : null}
    </TourSoundtrackContext.Provider>
  );
}

/** Mute / unmute control — one instance for the whole HOK shell. */
export function SoundToggleButton({ className = "", placement = "global" }) {
  const soundtrack = useTourSoundtrack();
  if (!soundtrack?.available) return null;

  const { soundOn, toggleSound } = soundtrack;
  const cls =
    "tour-sound-btn"
    + (placement !== "global" ? ` tour-sound-btn--${placement}` : "")
    + (soundOn ? " tour-sound-btn--on" : "")
    + (className ? ` ${className}` : "");

  return (
    <button
      type="button"
      className={cls}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSound();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      aria-label={soundOn ? "Mute soundtrack" : "Unmute soundtrack"}
      aria-pressed={soundOn}
      title={soundOn ? "Mute" : "Unmute"}
    >
      {soundOn ? (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.65 21 13.36 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
        </svg>
      )}
    </button>
  );
}
