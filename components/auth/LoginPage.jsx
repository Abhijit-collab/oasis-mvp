"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumPerks from "@/components/PremiumPerks";
import AdoptXRLogo from "@/components/AdoptXRLogo";
import ProjectBrandLogo from "@/components/ProjectBrandLogo";
import { isMobileTourDevice, isRotateOk } from "@/lib/rotateGate";
import { useTourSoundtrack } from "@/components/TourSoundtrack";

function clearInline(el, props) {
  if (!el) return;
  props.forEach((p) => el.style.removeProperty(p));
}

/** Match the visible Safari frame exactly (avoids post-360 zoom/crop). */
function pinLoginFrame(root) {
  if (typeof window === "undefined") return;

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const vv = window.visualViewport;
  const top = Math.max(0, Math.round(vv?.offsetTop ?? 0));
  const left = Math.max(0, Math.round(vv?.offsetLeft ?? 0));
  const width = Math.max(1, Math.round(vv?.width ?? window.innerWidth ?? 0));
  const height = Math.max(1, Math.round(vv?.height ?? window.innerHeight ?? 0));

  const html = document.documentElement;
  const body = document.body;
  html.classList.add("login-lock");
  body.classList.add("login-lock");

  html.style.setProperty("overflow", "hidden");
  html.style.setProperty("width", `${width}px`);
  html.style.setProperty("height", `${height}px`);
  body.style.setProperty("overflow", "hidden");
  body.style.setProperty("width", `${width}px`);
  body.style.setProperty("height", `${height}px`);
  body.style.setProperty("margin", "0");
  body.style.setProperty("padding", "0");
  body.style.setProperty("position", "relative");

  if (!root) return;
  root.style.setProperty("position", "fixed");
  root.style.setProperty("top", `${top}px`);
  root.style.setProperty("left", `${left}px`);
  root.style.setProperty("right", "auto");
  root.style.setProperty("bottom", "auto");
  root.style.setProperty("width", `${width}px`);
  root.style.setProperty("height", `${height}px`);
  root.style.setProperty("max-width", `${width}px`);
  root.style.setProperty("max-height", `${height}px`);
  root.style.setProperty("transform", "none");
  root.style.setProperty("zoom", "1");
}

function unpinLoginFrame(root) {
  if (typeof document === "undefined") return;
  const props = [
    "overflow",
    "width",
    "height",
    "margin",
    "padding",
    "position",
    "top",
    "left",
    "right",
    "bottom",
    "max-width",
    "max-height",
    "transform",
    "zoom",
  ];
  clearInline(document.documentElement, props);
  clearInline(document.body, props);
  clearInline(root, props);
  document.documentElement.classList.remove("login-lock");
  document.body.classList.remove("login-lock");
}

export default function LoginPage({
  onSubmit,
  error,
  eyebrow = "Metro Group",
  title = "THE",
  accent = "OASIS",
  codePlaceholder = "e.g. OASIS-VIP",
  backgroundVideo = null,
  /** Desktop-only teaser soundtrack — plays in sync with the muted background video. */
  backgroundAudio = null,
  /** HOK: strip brand, badge, copy, perks, and name field */
  minimal = false,
  projectLogo = null,
  projectLogoAlt = "Brand",
  /** Fired once when the teaser has essentially fully buffered — safe to warm tour clips. */
  onTeaserFullyBuffered = null,
}) {
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");
  /** Minimal mode: form hidden until user taps "Log in" in header */
  const [showForm, setShowForm] = useState(!minimal);
  const [videoReady, setVideoReady] = useState(false);
  /** Desktop: wait until teaser is ~80% buffered before revealing/playing. */
  const [desktopTeaserGate, setDesktopTeaserGate] = useState(false);
  const [teaserProgress, setTeaserProgress] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)").matches &&
        !isMobileTourDevice()
      );
    } catch {
      return false;
    }
  });
  const [introExit, setIntroExit] = useState(false);
  /** Desktop: intro ready but browser blocked unmuted autoplay — wait for one Enter gesture. */
  const [awaitingEnter, setAwaitingEnter] = useState(false);
  const soundtrack = useTourSoundtrack();
  const soundtrackRef = useRef(soundtrack);
  soundtrackRef.current = soundtrack;
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const desktopTeaserGateRef = useRef(false);
  const startTeaserRef = useRef(null);
  desktopTeaserGateRef.current = desktopTeaserGate;
  const hasAudio = Boolean(backgroundAudio && soundtrack?.available);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)");
    const sync = () => setIsDesktop(mq.matches && !isMobileTourDevice());
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("be-ios");
    const root = rootRef.current;
    const update = () => pinLoginFrame(root);

    update();
    const timers = [0, 50, 100, 250, 500].map((ms) => window.setTimeout(update, ms));

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("pageshow", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("pageshow", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      unpinLoginFrame(root);
    };
  }, []);

  // Only mount/play teaser video after rotate gate clears (stable landscape on phones).
  useEffect(() => {
    const sync = () => {
      const allow = !isMobileTourDevice() || isRotateOk();
      setVideoReady(allow);
      if (!allow && videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
    sync();
    window.addEventListener("oasis-rotate-gate", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("oasis-rotate-gate", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // Desktop: short logo intro, then start teaser with shared soundtrack unmuted.
  useEffect(() => {
    if (!backgroundVideo || !isDesktop || !videoReady) return undefined;

    let settled = false;
    let revealTimer = null;
    let poll = null;
    let raf = null;
    let syncTimer = null;
    let cancelled = false;
    let starting = false;
    const t0 = performance.now();
    const MIN_INTRO_MS = 1600;
    const PLAY_NEED = 0.18;
    const listeners = [];

    const detach = (video) => {
      listeners.forEach(([type, fn]) => video.removeEventListener(type, fn));
      listeners.length = 0;
    };

    const videoEl = () => videoRef.current;

    const syncBedToVideo = () => {
      const video = videoEl();
      if (!video || !hasAudio) return;
      soundtrackRef.current?.syncTo?.(video.currentTime || 0);
    };

    const revealChrome = (audible) => {
      setAwaitingEnter(false);
      setIntroExit(true);
      soundtrackRef.current?.setSoundOn?.(Boolean(audible && hasAudio));
      setDesktopTeaserGate(true);
    };

    const startTeaser = async ({ fromGesture = false } = {}) => {
      const video = videoEl();
      if (!video || cancelled || starting) return false;
      starting = true;
      const st = soundtrackRef.current;

      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      if (hasAudio) st?.syncTo?.(0);

      video.muted = true;
      const vp = video.play();
      if (vp?.catch) vp.catch(() => {});

      let audioOk = true;
      if (hasAudio) {
        audioOk = Boolean(await st.playAudible());
        if (!audioOk && fromGesture) {
          audioOk = Boolean(await st.playAudible());
        }
      }

      if (!audioOk && hasAudio && !fromGesture) {
        try {
          video.pause();
        } catch {
          /* ignore */
        }
        await st.playMuted();
        starting = false;
        setAwaitingEnter(true);
        setIntroExit(false);
        return false;
      }

      revealChrome(audioOk || !hasAudio);
      if (!audioOk && hasAudio) {
        await st.playMuted();
      }
      syncBedToVideo();
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = window.setInterval(syncBedToVideo, 500);
      return true;
    };
    startTeaserRef.current = startTeaser;

    const finishIntro = () => {
      if (settled || cancelled) return;
      settled = true;
      setTeaserProgress(100);
      if (hasAudio) {
        startTeaser({ fromGesture: false });
        return;
      }
      setIntroExit(true);
      revealTimer = window.setTimeout(() => {
        startTeaser({ fromGesture: false });
      }, 380);
    };

    const start = () => {
      const video = videoEl();
      if (!video) {
        raf = requestAnimationFrame(start);
        return;
      }

      const coverage = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return 0;
        if (!video.buffered?.length) return 0;
        let maxEnd = 0;
        for (let i = 0; i < video.buffered.length; i += 1) {
          maxEnd = Math.max(maxEnd, video.buffered.end(i));
        }
        return Math.min(1, maxEnd / video.duration);
      };

      const canStart = () => {
        const pct = coverage();
        if (pct >= PLAY_NEED) return true;
        if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) return true;
        if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && pct >= 0.08) return true;
        return false;
      };

      const tick = () => {
        const pct = coverage();
        const shown = Math.min(95, Math.round(Math.max(pct / PLAY_NEED, 0) * 90));
        setTeaserProgress(shown);

        const introDone = performance.now() - t0 >= MIN_INTRO_MS;
        if (introDone && canStart()) finishIntro();
      };

      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.pause();

      if (hasAudio) soundtrackRef.current?.playMuted?.();

      const kick = video.play();
      if (kick?.then) {
        kick
          .then(() => {
            try {
              video.pause();
              if (video.currentTime > 0.05) video.currentTime = 0;
            } catch {
              /* ignore */
            }
          })
          .catch(() => {});
      }

      ["progress", "loadeddata", "canplay", "canplaythrough"].forEach((type) => {
        video.addEventListener(type, tick);
        listeners.push([type, tick]);
      });
      poll = window.setInterval(tick, 200);
      tick();
    };

    start();

    return () => {
      cancelled = true;
      settled = true;
      startTeaserRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      if (poll) clearInterval(poll);
      if (revealTimer) clearTimeout(revealTimer);
      if (syncTimer) clearInterval(syncTimer);
      if (videoEl()) detach(videoEl());
      // Keep shared soundtrack playing into welcome / 360 — do not pause here.
    };
  }, [backgroundVideo, hasAudio, isDesktop, videoReady]);

  // Browser blocked unmuted autoplay — one real gesture starts video + music (sound on).
  useEffect(() => {
    if (!awaitingEnter || !isDesktop) return undefined;

    const onEnter = (e) => {
      if (e.type === "mousemove") return;
      if (e.target?.closest?.(".tour-sound-btn")) return;
      const run = startTeaserRef.current;
      if (!run) return;
      e.preventDefault?.();
      run({ fromGesture: true });
    };

    const types = ["pointerdown", "keydown", "touchstart", "click"];
    types.forEach((type) => window.addEventListener(type, onEnter, { capture: true }));
    return () => {
      types.forEach((type) => window.removeEventListener(type, onEnter, { capture: true }));
    };
  }, [awaitingEnter, isDesktop]);

  // Once teaser is fully buffered, start warming tour clips (does not wait for login).
  useEffect(() => {
    if (!backgroundVideo || !videoReady || !onTeaserFullyBuffered) return undefined;

    let settled = false;
    let poll = null;
    let raf = null;
    const listeners = [];
    const FULL_NEED = 0.96;

    const detach = (video) => {
      listeners.forEach(([type, fn]) => video.removeEventListener(type, fn));
      listeners.length = 0;
    };

    const coverage = (video) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return 0;
      if (!video.buffered?.length) return 0;
      let maxEnd = 0;
      for (let i = 0; i < video.buffered.length; i += 1) {
        maxEnd = Math.max(maxEnd, video.buffered.end(i));
      }
      return Math.min(1, maxEnd / video.duration);
    };

    const isFull = (video) => {
      const pct = coverage(video);
      if (pct >= FULL_NEED) return true;
      // canplaythrough with most of the file already fetched
      if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && pct >= 0.9) return true;
      return false;
    };

    const notify = () => {
      if (settled) return;
      settled = true;
      try {
        onTeaserFullyBuffered();
      } catch {
        /* ignore */
      }
    };

    const attach = () => {
      const video = videoRef.current;
      if (!video) {
        raf = requestAnimationFrame(attach);
        return;
      }

      const tick = () => {
        if (isFull(video)) notify();
      };

      ["progress", "loadeddata", "canplay", "canplaythrough"].forEach((type) => {
        video.addEventListener(type, tick);
        listeners.push([type, tick]);
      });
      poll = window.setInterval(tick, 400);
      tick();
    };

    attach();

    return () => {
      settled = true;
      if (raf) cancelAnimationFrame(raf);
      if (poll) clearInterval(poll);
      if (videoRef.current) detach(videoRef.current);
    };
  }, [backgroundVideo, videoReady, onTeaserFullyBuffered]);

  // Mobile / non-desktop: play as soon as rotate gate allows (unchanged).
  useEffect(() => {
    if (isDesktop || !videoReady || !videoRef.current) return;
    const play = videoRef.current.play();
    if (play?.catch) play.catch(() => {});
  }, [videoReady, isDesktop]);

  const submitLogin = useCallback(() => {
    onSubmit({ name: name.trim(), coupon: coupon.trim() });
  }, [name, coupon, onSubmit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitLogin();
  };

  // Prevent focused inputs from stealing the first tap (iOS / mobile keyboard blur).
  const keepTapOnButton = (e) => e.preventDefault();

  const showBrand = !minimal && (eyebrow || title || accent);
  const showDesktopIntro = Boolean(backgroundVideo && isDesktop && !desktopTeaserGate);
  const revealChrome = !showDesktopIntro;

  return (
    <div
      ref={rootRef}
      className={
        "login-page"
        + (minimal ? " login-page--minimal" : "")
        + (minimal && !showForm ? " login-page--teaser" : "")
        + (showDesktopIntro ? " login-page--intro" : "")
        + (introExit ? " login-page--intro-exit" : "")
        + (awaitingEnter ? " login-page--await-enter" : "")
      }
    >
      <div className={"login-bg" + (backgroundVideo ? " login-bg--video" : "")} aria-hidden>
        {backgroundVideo && videoReady ? (
          <video
            ref={videoRef}
            className={
              "login-bg-video"
              + (isDesktop && !desktopTeaserGate ? " login-bg-video--pending" : "")
            }
            src={backgroundVideo}
            muted
            loop
            playsInline
            preload={isDesktop ? "auto" : "metadata"}
          />
        ) : null}
      </div>

      {showDesktopIntro && (
        <div
          className={"login-teaser-intro" + (awaitingEnter ? " login-teaser-intro--enter" : "")}
          aria-busy={!awaitingEnter}
          aria-live="polite"
          role={awaitingEnter ? "button" : undefined}
          tabIndex={awaitingEnter ? 0 : undefined}
          onClick={
            awaitingEnter
              ? (e) => {
                  e.preventDefault();
                  startTeaserRef.current?.({ fromGesture: true });
                }
              : undefined
          }
          onKeyDown={
            awaitingEnter
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    startTeaserRef.current?.({ fromGesture: true });
                  }
                }
              : undefined
          }
        >
          <div className="login-teaser-intro-glow" aria-hidden />
          {projectLogo ? (
            <ProjectBrandLogo
              src={projectLogo}
              alt={projectLogoAlt}
              className="project-brand-logo--login login-teaser-intro-logo"
            />
          ) : (
            <p className="login-teaser-intro-title">
              {title} {accent ? <span>{accent}</span> : null}
            </p>
          )}
          {!awaitingEnter ? (
            <div className="login-teaser-intro-bar" role="progressbar" aria-valuenow={teaserProgress} aria-valuemin={0} aria-valuemax={100}>
              <div className="login-teaser-intro-fill" style={{ width: `${Math.min(100, Math.max(8, teaserProgress))}%` }} />
            </div>
          ) : null}
          <p className="login-teaser-intro-label">
            {awaitingEnter ? "Click anywhere to enter" : "Preparing your experience…"}
          </p>
        </div>
      )}

      {revealChrome && projectLogo ? (
        <div className="login-brand-stack">
          <ProjectBrandLogo
            src={projectLogo}
            alt={projectLogoAlt}
            className="project-brand-logo--login"
          />
          <div className="login-brand-stack-mid" aria-hidden />
          <AdoptXRLogo variant="white" placement="login" />
        </div>
      ) : revealChrome ? (
        <AdoptXRLogo variant="white" placement="login" />
      ) : null}

      {revealChrome && (minimal || projectLogo) && (
        <header
          className={
            "login-teaser-header"
            + (projectLogo ? " login-teaser-header--btn-only" : "")
          }
        >
          <span aria-hidden />
          {minimal ? (
            <button
              className="login-teaser-btn"
              onClick={() => setShowForm(true)}
              style={{ visibility: showForm ? "hidden" : "visible" }}
            >
              LOG IN
            </button>
          ) : (
            <span aria-hidden />
          )}
        </header>
      )}

      {revealChrome && (
        <div className="login-premium-ribbon" aria-hidden>
          <span>By invitation only</span>
        </div>
      )}

      {minimal && showForm && (
        <div className="login-overlay-dismiss" onClick={() => setShowForm(false)} />
      )}

      <div className={"login-shell" + (minimal && !showForm ? " login-shell--hidden" : "")}>
        {showBrand ? (
          <header className="login-header">
            <span className="login-crown">&#10022;</span>
            <div>
              {eyebrow ? <p className="login-eyebrow">{eyebrow}</p> : null}
              <h1 className="login-brand">
                {title} {accent ? <span>{accent}</span> : null}
              </h1>
            </div>
          </header>
        ) : null}

        <div className="login-card">
          {minimal && (
            <button className="login-card-close" onClick={() => setShowForm(false)} aria-label="Close">
              ✕
            </button>
          )}
          {!minimal ? (
            <>
              <div className="login-card-premium">
                <PremiumBadge label="Premium Preview" />
              </div>
              <h2 className="login-title">Enter your invitation</h2>
              <p className="login-copy">
                This immersive experience is reserved exclusively for our premium customers. Enter your
                personal invitation code to unlock your private tour.
              </p>
              <PremiumPerks compact />
            </>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {!minimal ? (
              <div className="login-field">
                <label htmlFor="login-name">Your name</label>
                <input
                  id="login-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How should we welcome you?"
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="login-field">
              <label htmlFor="login-coupon">
                Invitation code <span className="login-req">*</span>
              </label>
              <input
                id="login-coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder={codePlaceholder}
                autoComplete="off"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="button" className="login-btn" onClick={submitLogin} onMouseDown={keepTapOnButton}>
              Unlock premium access
            </button>
          </form>

          <p className="login-foot">Your access is personal and non-transferable · For premium members only</p>
        </div>
      </div>
    </div>
  );
}
