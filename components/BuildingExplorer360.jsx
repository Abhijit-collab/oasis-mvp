"use client";

import { useRef, useState, useEffect } from "react";
import {
  ORBIT_360_URL,
  ORBIT_STEP_CLIPS,
  ORBIT_STEP_CLIPS_REVERSE,
  ORBIT_STEP_COUNT,
} from "@/data/assets";
import OrbitClipStage from "@/components/OrbitClipStage";
import OrbitZoneOverlay from "@/components/OrbitZoneOverlay";
import ExplorerPremiumChrome from "@/components/ExplorerPremiumChrome";
import DownloadMenu from "@/components/DownloadMenu";
import PremiumBadge from "@/components/PremiumBadge";
import { useAuth } from "@/components/auth/AuthContext";
import usePreloadVideos, { prefetchVideo } from "@/hooks/usePreloadVideos";
import useTourPreloadGate from "@/hooks/useTourPreloadGate";
import TourPreloadScreen from "@/components/TourPreloadScreen";
import { ORBIT_STEP_ZONES } from "@/data/orbit360Zones";

const ORBIT_ALL_CLIPS = [...ORBIT_STEP_CLIPS, ...ORBIT_STEP_CLIPS_REVERSE, ORBIT_360_URL];
const TOUR_REVEAL_MS = 900;
const HOME_FADE_OUT_MS = 480;
const HOME_FADE_IN_MS = 480;
const MAIN_GATE_CLIP = ORBIT_STEP_CLIPS[0];

/**
 * /test — left / right arrows play individual T1–T7 clips.
 * Back uses pre-encoded *-rev.mp4 files played forward.
 * ← from 1/8 wraps to 7/8 (T7-rev → T6 last frame), then 6/8, 5/8, … each at last frame.
 */
export default function BuildingExplorer360() {
  const { logout } = useAuth() || {};
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState("hold");
  const [clipSrc, setClipSrc] = useState(ORBIT_STEP_CLIPS[0]);
  const [playToken, setPlayToken] = useState(0);
  const [playDirection, setPlayDirection] = useState("forward");
  const [landAfterPlay, setLandAfterPlay] = useState(null);
  const [block, setBlock] = useState(null);
  const [floor, setFloor] = useState(null);
  const [hoverBlock, setHoverBlock] = useState(null);
  const [hoverFloor, setHoverFloor] = useState(null);
  const [holdResetKey, setHoldResetKey] = useState(0);
  /** null | "out" (fade current) | "wait" (frame swap) | "in" (fade reveal) */
  const [homePhase, setHomePhase] = useState(null);
  const stepRef = useRef(0);
  const homeOutTimerRef = useRef(null);
  const homeInTimerRef = useRef(null);
  const homeAwaitHoldRef = useRef(false);
  const homeOutDoneRef = useRef(false);
  const homePrepDoneRef = useRef(false);
  const homeSwapDoneRef = useRef(false);
  const homePrepFallbackRef = useRef(null);

  stepRef.current = step;
  const homeResetting = homePhase !== null;

  /** ← from 1/8 wraps to 7/8 (not 8/8); all other steps decrement by 1. */
  const prevStep = (s) => (s === 0 ? ORBIT_STEP_COUNT - 1 : s - 1);
  const reverseClipIndexForBack = (fromStep) =>
    fromStep === 0 ? ORBIT_STEP_COUNT - 1 : fromStep - 1;
  const forwardClipAtStep = (s) => ORBIT_STEP_CLIPS[s >= ORBIT_STEP_COUNT ? 0 : s];
  const backClipAtStep = (s) => ORBIT_STEP_CLIPS_REVERSE[reverseClipIndexForBack(s)];
  const holdClipForStep = (s) => (s === 0 ? ORBIT_STEP_CLIPS[0] : ORBIT_STEP_CLIPS[s - 1]);
  const holdAtForStep = (s) => (s === 0 ? "start" : "end");
  const landHoldAtForBack = (landStep) => (landStep === 0 ? "start" : "end");

  const { ready: assetsReady, progress: loadProgress } = usePreloadVideos(ORBIT_ALL_CLIPS);
  const { gateOpen, displayProgress } = useTourPreloadGate(assetsReady, loadProgress);
  const [tourRevealed, setTourRevealed] = useState(false);
  const [preloadHidden, setPreloadHidden] = useState(false);

  const showPreload = !preloadHidden;
  const mountTour = assetsReady;

  useEffect(() => {
    if (!gateOpen || tourRevealed) return;
    const frame = requestAnimationFrame(() => setTourRevealed(true));
    const timer = setTimeout(() => setPreloadHidden(true), TOUR_REVEAL_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [gateOpen, tourRevealed]);

  useEffect(() => {
    return () => {
      clearTimeout(homeOutTimerRef.current);
      clearTimeout(homeInTimerRef.current);
      clearTimeout(homePrepFallbackRef.current);
    };
  }, []);

  const tryHomeSwap = () => {
    if (!homeOutDoneRef.current || !homePrepDoneRef.current || homeSwapDoneRef.current) return;
    homeSwapDoneRef.current = true;
    clearTimeout(homePrepFallbackRef.current);
    applyMainGateReset();
    setHomePhase("wait");
  };

  const handlePrepareHomeReady = () => {
    homePrepDoneRef.current = true;
    tryHomeSwap();
  };

  const applyMainGateReset = () => {
    pendingRef.current = false;
    stepRef.current = 0;
    setStep(0);
    setMode("hold");
    setClipSrc(MAIN_GATE_CLIP);
    setPlayDirection("forward");
    setLandAfterPlay(null);
    setPlayToken(0);
    setIsPlaying(false);
    setBlock(null);
    setFloor(null);
    setHoverBlock(null);
    setHoverFloor(null);
    setHoldResetKey(Date.now());
    homeAwaitHoldRef.current = true;
  };

  const beginHomeReveal = () => {
    if (!homeAwaitHoldRef.current) return;
    homeAwaitHoldRef.current = false;
    clearTimeout(homeInTimerRef.current);
    setHomePhase("in");
    homeInTimerRef.current = setTimeout(() => setHomePhase(null), HOME_FADE_IN_MS);
  };

  const handleHoldFrameReady = () => {
    if (homeAwaitHoldRef.current) beginHomeReveal();
  };

  const prefetchForward = forwardClipAtStep(step);
  const prefetchBack = backClipAtStep(step);
  const prefetchLandClip = holdClipForStep(prevStep(step));

  useEffect(() => {
    if (!assetsReady || mode !== "hold" || isPlaying) return;
    prefetchVideo(prefetchForward);
    prefetchVideo(prefetchBack);
    if (prefetchLandClip) prefetchVideo(prefetchLandClip);
  }, [assetsReady, mode, isPlaying, step, prefetchForward, prefetchBack, prefetchLandClip]);

  const pendingRef = useRef(false);

  const handlePlayingChange = (playing) => {
    setIsPlaying(playing);
    if (!playing) pendingRef.current = false;
  };

  const canPrev = !isPlaying && !pendingRef.current && !homeResetting;
  const canNext = !isPlaying && !pendingRef.current && !homeResetting;
  const holdAt = holdAtForStep(step);

  const goNext = () => {
    if (!canNext) return;
    pendingRef.current = true;
    setLandAfterPlay(null);
    const clipIndex = step >= ORBIT_STEP_COUNT ? 0 : step;
    setClipSrc(ORBIT_STEP_CLIPS[clipIndex]);
    setPlayDirection("forward");
    setMode("play");
    setPlayToken(Date.now());
  };

  const goPrev = () => {
    if (!canPrev) return;
    pendingRef.current = true;
    const fromStep = stepRef.current;
    const landStep = prevStep(fromStep);
    const reverseClip = ORBIT_STEP_CLIPS_REVERSE[reverseClipIndexForBack(fromStep)];

    setLandAfterPlay({
      clipSrc: holdClipForStep(landStep),
      holdAt: landHoldAtForBack(landStep),
    });
    setClipSrc(reverseClip);
    setPlayDirection("back");
    setMode("play");
    setPlayToken(Date.now());
  };

  const goHome = () => {
    if (homeResetting) return;

    prefetchVideo(MAIN_GATE_CLIP);
    clearTimeout(homeOutTimerRef.current);
    clearTimeout(homeInTimerRef.current);
    clearTimeout(homePrepFallbackRef.current);
    homeAwaitHoldRef.current = false;
    homeOutDoneRef.current = false;
    homePrepDoneRef.current = false;
    homeSwapDoneRef.current = false;

    if (isPlaying || mode === "play") {
      pendingRef.current = false;
      setPlayToken(0);
      setMode("hold");
      setIsPlaying(false);
    }

    setHomePhase("out");
    homeOutTimerRef.current = setTimeout(() => {
      homeOutDoneRef.current = true;
      tryHomeSwap();
    }, HOME_FADE_OUT_MS);
    homePrepFallbackRef.current = setTimeout(() => {
      homePrepDoneRef.current = true;
      tryHomeSwap();
    }, 2500);
  };

  const handleLogout = () => logout?.();

  const pickBlock = (name) => {
    setBlock(name);
    setFloor(null);
    setHoverFloor(null);
  };

  const pickFloor = (name) => {
    setFloor(name || null);
  };

  const clearBlock = () => {
    setBlock(null);
    setFloor(null);
    setHoverBlock(null);
    setHoverFloor(null);
  };

  useEffect(() => {
    if (!ORBIT_STEP_ZONES[step]) {
      setBlock(null);
      setFloor(null);
      setHoverBlock(null);
      setHoverFloor(null);
    }
  }, [step]);

  const onClipDone = (direction = "forward") => {
    pendingRef.current = false;
    let newStep = stepRef.current;

    if (direction === "back") {
      newStep = prevStep(stepRef.current);
      setStep(newStep);
      setClipSrc(holdClipForStep(newStep));
    } else {
      newStep = stepRef.current >= ORBIT_STEP_COUNT ? 1 : stepRef.current + 1;
      setStep(newStep);
      setClipSrc(holdClipForStep(newStep));
    }

    stepRef.current = newStep;

    setLandAfterPlay(null);
    setPlayDirection("forward");
    setMode("hold");
    setIsPlaying(false);
  };

  const zoneConfig = ORBIT_STEP_ZONES[step];
  const showPremiumChrome = tourRevealed && !homeResetting;
  const showZoneOverlay = Boolean(
    zoneConfig && mode === "hold" && !isPlaying && !homeResetting
  );

  const zoneHint = showZoneOverlay
    ? !block
      ? "Select a block to begin"
      : !floor
      ? "Drag floor height, toggle filters, or pick a floor on the building"
      : "Select a residence from the panel"
    : null;

  if (!mountTour) {
    return <TourPreloadScreen progress={displayProgress} />;
  }

  return (
    <div
      className={"be-root" + (isPlaying ? " be-transitioning" : "")}
      style={{
        "--filter-w": showPremiumChrome ? "252px" : "0px",
        "--filter-stack-base": showPremiumChrome && block ? "268px" : "0px",
      }}
    >
      <div className={"be-tour-reveal" + (tourRevealed ? " be-tour-reveal--in" : "")}>
        <div className="be-stage">
          <div
            className={
              "be-stage-media" +
              (homePhase === "out" ? " be-stage-media--home-out" : "") +
              (homePhase === "wait" ? " be-stage-media--home-wait" : "") +
              (homePhase === "in" ? " be-stage-media--home-in" : "")
            }
          >
            <OrbitClipStage
              clipSrc={clipSrc}
              mode={mode}
              holdAt={holdAt}
              playToken={playToken}
              playDirection={playDirection}
              landAfterPlay={landAfterPlay}
              prefetchForward={prefetchForward}
              prefetchBack={prefetchBack}
              prefetchLand={prefetchLandClip}
              onPlayingChange={handlePlayingChange}
              onComplete={onClipDone}
              onDragForward={goNext}
              onDragBack={goPrev}
              dragDisabled={showZoneOverlay || !tourRevealed || homeResetting}
              holdResetKey={holdResetKey}
              prepareHomeClip={homePhase === "out" ? MAIN_GATE_CLIP : null}
              onPrepareHomeReady={handlePrepareHomeReady}
              onHoldFrameReady={handleHoldFrameReady}
            />

            {showZoneOverlay && !homeResetting && (
              <OrbitZoneOverlay
                zones={zoneConfig}
                block={block}
                floor={floor}
                hoverBlock={hoverBlock}
                hoverFloor={hoverFloor}
                onPickBlock={pickBlock}
                onPickFloor={pickFloor}
                onHoverBlock={setHoverBlock}
                onHoverFloor={setHoverFloor}
              />
            )}
          </div>

        <div className="scrim-top" />
        <div className="scrim-bot" />

        <div className="be-top">
          <div
            className="be-brand"
            onClick={goHome}
            style={{ cursor: homeResetting ? "default" : "pointer" }}
            title="Return to Main Gate"
          >
            <span className="be-crown">&#9819;</span>
            <div className="be-bk">
              <span className="be-brand-name">
                THE <b>OASIS</b>
              </span>
              <PremiumBadge label="Premium Experience" size="sm" />
            </div>
          </div>
          <div className="be-links">
            <span
              className="be-link"
              onClick={goHome}
              role="button"
              style={{ cursor: homeResetting ? "default" : "pointer" }}
            >
              Home
            </span>
            <DownloadMenu />
            {["Location Map", "Gallery"].map((l) => (
              <span key={l} className="be-link">
                {l}
              </span>
            ))}
            <span className="be-link" onClick={handleLogout} role="button" style={{ cursor: "pointer" }}>
              Log out
            </span>
          </div>
        </div>

        <div className="be-cta-hint">
          {homeResetting ? (
            <>Returning to Main Gate&hellip;</>
          ) : zoneHint ? (
            <>
              <span className="hand">&#9757;</span> {zoneHint}
            </>
          ) : (
            <>
              <span className="hand">&#9757;</span> Drag left / right or use arrows
            </>
          )}
        </div>

        <button
          type="button"
          className="be-arrow l"
          aria-label="Previous"
          disabled={!canPrev}
          onClick={goPrev}
          style={{ opacity: canPrev ? 1 : 0.35, cursor: canPrev ? "pointer" : "default" }}
        >
          &#8592;
        </button>

        <button
          type="button"
          className="be-arrow r"
          aria-label="Next transition"
          disabled={!canNext}
          onClick={goNext}
          style={{ right: 22, opacity: canNext ? 1 : 0.35, cursor: canNext ? "pointer" : "default" }}
        >
          &#8594;
        </button>

        <div className="be-compass">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="rgba(255,255,255,.25)" />
            <path d="M20 7 L24 21 L20 18 L16 21 Z" fill="#d8b65a" />
            <text x="20" y="34" textAnchor="middle" fill="#f5f1e6" fontSize="9" fontWeight="700">
              N
            </text>
          </svg>
        </div>

        <ExplorerPremiumChrome
          visible={showPremiumChrome}
          block={block}
          floor={floor}
          hoverBlock={hoverBlock}
          onPickBlock={pickBlock}
          onPickFloor={pickFloor}
          onHoverBlock={setHoverBlock}
          onClearBlock={clearBlock}
        />
        </div>
      </div>

      {showPreload && (
        <TourPreloadScreen progress={displayProgress} exiting={gateOpen && tourRevealed} />
      )}
    </div>
  );
}
