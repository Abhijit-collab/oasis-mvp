"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumPerks from "@/components/PremiumPerks";
import AdoptXRLogo from "@/components/AdoptXRLogo";
import ProjectBrandLogo from "@/components/ProjectBrandLogo";
import { isMobileTourDevice, isRotateOk } from "@/lib/rotateGate";

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
  /** HOK: strip brand, badge, copy, perks, and name field */
  minimal = false,
  projectLogo = null,
  projectLogoAlt = "Brand",
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
  const rootRef = useRef(null);
  const videoRef = useRef(null);

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

  // Desktop: short logo intro, then play as soon as the teaser can start smoothly.
  // (Waiting for 80% of the full file caused ~45–50s delays on large teasers.)
  useEffect(() => {
    if (!backgroundVideo || !isDesktop || !videoReady) return undefined;

    let settled = false;
    let revealTimer = null;
    let poll = null;
    let raf = null;
    const t0 = performance.now();
    const MIN_INTRO_MS = 1600;
    /** Enough ahead-of-play buffer — not 80% of the whole file. */
    const PLAY_NEED = 0.18;
    const listeners = [];

    const detach = (video) => {
      listeners.forEach(([type, fn]) => video.removeEventListener(type, fn));
      listeners.length = 0;
    };

    const start = () => {
      const video = videoRef.current;
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

      const finish = () => {
        if (settled) return;
        settled = true;
        setTeaserProgress(100);
        setIntroExit(true);
        revealTimer = window.setTimeout(() => {
          setDesktopTeaserGate(true);
          try {
            video.currentTime = 0;
          } catch {
            /* ignore */
          }
          const play = video.play();
          if (play?.catch) play.catch(() => {});
        }, 380);
      };

      const tick = () => {
        const pct = coverage();
        // Map early buffer into a smoother 0→95 bar while the logo shows.
        const shown = Math.min(95, Math.round(Math.max(pct / PLAY_NEED, 0) * 90));
        setTeaserProgress(shown);

        const introDone = performance.now() - t0 >= MIN_INTRO_MS;
        if (introDone && canStart()) finish();
      };

      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.pause();

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
      settled = true;
      if (raf) cancelAnimationFrame(raf);
      if (poll) clearInterval(poll);
      if (revealTimer) clearTimeout(revealTimer);
      if (videoRef.current) detach(videoRef.current);
    };
  }, [backgroundVideo, isDesktop, videoReady]);

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
        <div className="login-teaser-intro" aria-busy="true" aria-live="polite">
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
          <div className="login-teaser-intro-bar" role="progressbar" aria-valuenow={teaserProgress} aria-valuemin={0} aria-valuemax={100}>
            <div className="login-teaser-intro-fill" style={{ width: `${Math.min(100, Math.max(8, teaserProgress))}%` }} />
          </div>
          <p className="login-teaser-intro-label">Preparing your experience…</p>
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
              Log in
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
