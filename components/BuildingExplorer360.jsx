"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
  ORBIT_STEP_CLIPS as DEFAULT_STEP_CLIPS,
  ORBIT_STEP_CLIPS_REVERSE as DEFAULT_STEP_CLIPS_REVERSE,
  ORBIT_STEP_COUNT as DEFAULT_STEP_COUNT,
} from "@/data/assets";
import OrbitClipStage from "@/components/OrbitClipStage";
import OrbitZoneOverlay from "@/components/OrbitZoneOverlay";
import ExplorerPremiumChrome from "@/components/ExplorerPremiumChrome";
import ExplorerNavMenu from "@/components/ExplorerNavMenu";
import FullscreenButton from "@/components/FullscreenButton";
import PremiumBadge from "@/components/PremiumBadge";
import { useAuth } from "@/components/auth/AuthContext";
import usePreloadVideos from "@/hooks/usePreloadVideos";
import useTourPreloadGate from "@/hooks/useTourPreloadGate";
import TourPreloadScreen from "@/components/TourPreloadScreen";
import RotateButton from "@/components/RotateButton";
import { getOrbitStepZones as defaultGetOrbitStepZones } from "@/data/orbit360Zones";
import { ORBIT_STEP_PRELOAD_URLS as DEFAULT_PRELOAD_URLS } from "@/lib/tourAssetPreload";
import { mergeLiveUnits } from "@/lib/mergeLiveUnits";
import useLiveUnitsPoll from "@/hooks/useLiveUnitsPoll";
import { getOrbitStepScope, getVisibleOrbitFlats } from "@/lib/orbitStepScope";
import { getFloorSliderRange } from "@/lib/floorSliderRange";
import BlockFilterPrompt from "@/components/BlockFilterPrompt";
import { anchorAbovePoints, anchorAbovePolygons } from "@/lib/zonePromptAnchor";
import { isUnitSold } from "@/lib/unitStatus";
import { useFilterPanelSelectionSync } from "@/hooks/useFilterPanelSelectionSync";

const TOUR_REVEAL_MS = 900;

function OrbitSideChevron({ dir = "r" }) {
  const id = `be-orbit-grad-${dir}`;
  return (
    <svg className="be-orbit-arw-icon" viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7d56a" />
          <stop offset="55%" stopColor="#ee9a28" />
          <stop offset="100%" stopColor="#e06a12" />
        </linearGradient>
      </defs>
      <g transform={dir === "l" ? "translate(48 0) scale(-1 1)" : undefined}>
        <polyline
          points="13 9 25 24 13 39"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="3.4"
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
        <polyline
          points="25 9 37 24 25 39"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="3.4"
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
      </g>
    </svg>
  );
}
const HOME_FADE_OUT_MS = 480;
const HOME_FADE_IN_MS = 480;
const START_STILL_FADE_MS = 480;
/** Soft dissolve Seq9 end → start still (should feel almost invisible). */
const START_STILL_FADE_IN_MS = 900;

const DEFAULT_TOUR = {
  stepCount: DEFAULT_STEP_COUNT,
  stepClips: DEFAULT_STEP_CLIPS,
  stepClipsReverse: DEFAULT_STEP_CLIPS_REVERSE,
  preloadUrls: DEFAULT_PRELOAD_URLS,
  mainGateClip: DEFAULT_STEP_CLIPS[0],
  getOrbitStepZones: defaultGetOrbitStepZones,
  brand: { prefix: "THE", name: "OASIS", badge: "Premium Experience" },
  booking: { returnTo: "/test", path: "/test/booking" },
  showFilters: true,
  startImage: null,
  mediaFit: "fill",
  mediaPosition: "center center",
  preloadDepth: "metadata",
  showBrand: true,
};

/**
 * Left / right arrows play individual transition clips.
 * Back uses pre-encoded *-rev.mp4 files played forward.
 */
export default function BuildingExplorer360({ liveUnits = null, tour = DEFAULT_TOUR }) {
  const {
    stepCount: ORBIT_STEP_COUNT,
    stepClips: ORBIT_STEP_CLIPS,
    stepClipsReverse: ORBIT_STEP_CLIPS_REVERSE,
    preloadUrls: ORBIT_STEP_PRELOAD_URLS,
    mainGateClip: MAIN_GATE_CLIP,
    getOrbitStepZones,
    brand,
    booking,
    showFilters = true,
    startImage = null,
    mediaFit = "fill",
    mediaPosition = "center center",
    preloadDepth = "metadata",
    showBrand = true,
    preloadVariant = "bar",
  } = tour;
  const { logout } = useAuth() || {};
  /** cover vs contain — always keeps original aspect; picks based on the device viewport. */
  const [adaptiveFit, setAdaptiveFit] = useState(mediaFit === "fill" ? "fill" : "contain");
  const [navOpen, setNavOpen] = useState(false);
  const [viewH, setViewH] = useState(null);
  const [viewW, setViewW] = useState(null);
  const [viewTop, setViewTop] = useState(0);
  const [viewLeft, setViewLeft] = useState(0);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState("hold");
  const [clipSrc, setClipSrc] = useState(ORBIT_STEP_CLIPS[0]);
  const [playToken, setPlayToken] = useState(0);
  const [playDirection, setPlayDirection] = useState("forward");
  const [landAfterPlay, setLandAfterPlay] = useState(null);
  const [block, setBlock] = useState(null);
  const [floor, setFloor] = useState(null);
  const [unit, setUnit] = useState(null);
  const [hoverBlock, setHoverBlock] = useState(null);
  const [hoverFloor, setHoverFloor] = useState(null);
  const [hoverUnit, setHoverUnit] = useState(null);
  const [matchingIds, setMatchingIds] = useState(() => new Set());
  const [filtersActive, setFiltersActive] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [maxVisibleFloor, setMaxVisibleFloor] = useState(null);
  const [holdResetKey, setHoldResetKey] = useState(0);
  const blockRef = useRef(null);
  blockRef.current = block;
  /** null | "out" (fade current) | "wait" (frame swap) | "in" (fade reveal) */
  const [homePhase, setHomePhase] = useState(null);
  /** "enter" | "in" | "out" | "hidden" — crossfade start still ↔ first clip (HOK). */
  const [startStillPhase, setStartStillPhase] = useState(startImage ? "in" : "hidden");
  /** While dissolving back to the gate, keep the last clip's end frame under the still. */
  const [holdAtOverride, setHoldAtOverride] = useState(null);
  const loopFadeTimerRef = useRef(null);
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

  /** ← from 1/8 wraps to 7/8; step 1 is T1 end (no overlay), step 2 is Block A after T2. */
  const prevStep = (s) => (s === 0 ? ORBIT_STEP_COUNT - 1 : s - 1);
  const nextStepForward = (from) => {
    // After the last clip, return to Main Gate (step 0) — one more → plays Seq 1.
    if (from >= ORBIT_STEP_COUNT - 1) return 0;
    return from + 1;
  };
  const reverseClipIndexForBack = (fromStep) =>
    fromStep === 0 ? ORBIT_STEP_COUNT - 1 : fromStep - 1;
  const forwardClipAtStep = (s) => ORBIT_STEP_CLIPS[s >= ORBIT_STEP_COUNT ? 0 : s];
  const backClipAtStep = (s) => ORBIT_STEP_CLIPS_REVERSE[reverseClipIndexForBack(s)] ?? null;
  const holdClipForStep = (s) => (s === 0 ? ORBIT_STEP_CLIPS[0] : ORBIT_STEP_CLIPS[s - 1]);
  const holdAtForStep = (s) => (s === 0 ? "start" : "end");
  const landHoldAtForBack = (landStep) => (landStep === 0 ? "start" : "end");
  const hasReverseClips = ORBIT_STEP_CLIPS_REVERSE.length === ORBIT_STEP_COUNT;

  const { ready: assetsReady, progress: loadProgress, failedCount, total: preloadTotal } =
    usePreloadVideos(ORBIT_STEP_PRELOAD_URLS, { depth: preloadDepth });
  const { gateOpen, displayProgress } = useTourPreloadGate(assetsReady, loadProgress);
  const polledLiveUnits = useLiveUnitsPoll(liveUnits);
  const units = useMemo(() => mergeLiveUnits(polledLiveUnits), [polledLiveUnits]);
  const [tourRevealed, setTourRevealed] = useState(false);
  const [preloadHidden, setPreloadHidden] = useState(false);

  const showPreload = !preloadHidden;
  const mountTour = assetsReady;
  const displayFit = mediaFit === "fill" ? "fill" : adaptiveFit;

  useEffect(() => {
    if (mediaFit === "fill") {
      setAdaptiveFit("fill");
      return undefined;
    }
    if (mediaFit === "contain") {
      setAdaptiveFit("contain");
      return undefined;
    }

    const isIOS = () => {
      const ua = navigator.userAgent || "";
      if (/iPad|iPhone|iPod/i.test(ua)) return true;
      return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    };

    const isSmallDevice = () =>
      isIOS() ||
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      window.matchMedia("(max-width: 900px)").matches;

    const update = () => {
      if (!isSmallDevice()) {
        setAdaptiveFit("cover");
        setViewH(null);
        setViewW(null);
        setViewTop(0);
        setViewLeft(0);
        document.documentElement.classList.remove("be-ios");
        return;
      }
      // Phones / iOS Safari: always contain so top/bottom never crop.
      setAdaptiveFit("contain");
      if (isIOS()) document.documentElement.classList.add("be-ios");
      else document.documentElement.classList.remove("be-ios");

      const vv = window.visualViewport;
      const h = Math.round(vv?.height || window.innerHeight || 0);
      const w = Math.round(vv?.width || window.innerWidth || 0);
      const top = Math.round(vv?.offsetTop || 0);
      const left = Math.round(vv?.offsetLeft || 0);
      setViewH(h || null);
      setViewW(w || null);
      setViewTop(top);
      setViewLeft(left);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      document.documentElement.classList.remove("be-ios");
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [mediaFit]);

  useEffect(() => {
    if (!gateOpen) return undefined;
    if (!tourRevealed) {
      const frame = requestAnimationFrame(() => setTourRevealed(true));
      return () => cancelAnimationFrame(frame);
    }
    if (preloadHidden) return undefined;
    const timer = setTimeout(() => setPreloadHidden(true), TOUR_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [gateOpen, tourRevealed, preloadHidden]);

  useEffect(() => {
    return () => {
      clearTimeout(homeOutTimerRef.current);
      clearTimeout(homeInTimerRef.current);
      clearTimeout(homePrepFallbackRef.current);
      clearTimeout(loopFadeTimerRef.current);
    };
  }, []);

  /** Soft-enter start still when returning to Main Gate (don't snap opaque). */
  useEffect(() => {
    if (!startImage) return;
    if (step === 0 && mode === "hold" && !isPlaying && !homeResetting) {
      setStartStillPhase((prev) => {
        if (prev === "in" || prev === "enter") return prev;
        return "enter";
      });
    }
  }, [startImage, step, mode, isPlaying, homeResetting]);

  /** enter (opacity 0) → in (fade up) on next frame so CSS transition runs. */
  useEffect(() => {
    if (startStillPhase !== "enter") return undefined;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setStartStillPhase("in"));
    });
    return () => cancelAnimationFrame(id);
  }, [startStillPhase]);

  /** After fade-out completes, unmount the still. */
  useEffect(() => {
    if (startStillPhase !== "out") return undefined;
    const timer = setTimeout(() => setStartStillPhase("hidden"), START_STILL_FADE_MS);
    return () => clearTimeout(timer);
  }, [startStillPhase]);

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
    setHoldAtOverride(null);
    clearTimeout(loopFadeTimerRef.current);
    blockRef.current = null;
    setBlock(null);
    setFloor(null);
    setUnit(null);
    setHoverBlock(null);
    setHoverFloor(null);
    setHoverUnit(null);
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

  const pendingRef = useRef(false);

  const handlePlayingChange = (playing) => {
    setIsPlaying(playing);
    if (!playing) pendingRef.current = false;
    // Crossfade still → video once playback has actually started (matches /test gate feel).
    if (playing && startImage && stepRef.current === 0) {
      setStartStillPhase("out");
    }
  };

  const canPrev =
    hasReverseClips && !isPlaying && !pendingRef.current && !homeResetting;
  const canNext = !isPlaying && !pendingRef.current && !homeResetting;
  const holdAt = holdAtOverride ?? holdAtForStep(step);
  const clipsFailed = assetsReady && preloadTotal > 0 && failedCount >= preloadTotal;

  const goNext = () => {
    if (!canNext) return;
    const fromStep = stepRef.current;

    clearTimeout(loopFadeTimerRef.current);
    setHoldAtOverride(null);
    pendingRef.current = true;
    setLandAfterPlay(null);
    setClipSrc(ORBIT_STEP_CLIPS[fromStep >= ORBIT_STEP_COUNT ? 0 : fromStep]);
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
    if (!reverseClip) {
      pendingRef.current = false;
      return;
    }

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

  const pickBlock = useCallback((name) => {
    if (blockRef.current === name) return;
    blockRef.current = name;
    setBlock(name);
    setFloor(null);
    setUnit(null);
    setHoverBlock(null);
    setHoverFloor(null);
    setHoverUnit(null);
    setFiltersActive(false);
    setMaxVisibleFloor(null);
    setFiltersOpen(true);
  }, []);

  const pickFloor = useCallback((name) => {
    setFloor((prev) => (prev === name ? prev : name || null));
    setUnit(null);
    setHoverUnit(null);
  }, []);

  const reopenFilters = useCallback(() => {
    if (blockRef.current) setFiltersOpen(true);
  }, []);

  const pickUnit = useCallback(
    (id) => {
      if (id == null) {
        setUnit(null);
        setHoverUnit(null);
        reopenFilters();
        return;
      }
      const scope = getOrbitStepScope(stepRef.current);
      if (!scope.unitIds.includes(id)) return;
      if (isUnitSold(units[id])) return;
      setUnit(id);
      if (!floor && units[id]?.floor) setFloor(units[id].floor);
    },
    [floor, units, reopenFilters]
  );

  const handleFilterStateChange = useCallback(({ matchingIds: ids, filtersActive: active }) => {
    setMatchingIds(new Set(ids));
    setFiltersActive(active);
  }, []);

  const handleFloorFilterChange = useCallback((maxFloor) => {
    setMaxVisibleFloor(maxFloor);
  }, []);

  const clearBlock = useCallback(() => {
    if (!blockRef.current) return;
    blockRef.current = null;
    setBlock(null);
    setFloor(null);
    setUnit(null);
    setHoverBlock(null);
    setHoverFloor(null);
    setHoverUnit(null);
    setMaxVisibleFloor(null);
  }, []);

  const dismissOverlay = useCallback(() => {
    if (unit) {
      setUnit(null);
      setHoverUnit(null);
      reopenFilters();
      return;
    }
    if (floor) {
      setFloor(null);
      setHoverFloor(null);
      setUnit(null);
      setHoverUnit(null);
      return;
    }
    clearBlock();
  }, [unit, floor, clearBlock, reopenFilters]);

  const floorSliderRange = useMemo(
    () => getFloorSliderRange({ orbitStep: step, block }),
    [step, block]
  );

  useEffect(() => {
    const scope = getOrbitStepScope(step);
    setMatchingIds(new Set(scope.unitIds));
    setFiltersActive(false);
    setMaxVisibleFloor(null);

    if (!getOrbitStepZones(step)) {
      blockRef.current = null;
      setBlock(null);
      setFloor(null);
      setUnit(null);
      setHoverBlock(null);
      setHoverFloor(null);
      setHoverUnit(null);
    }
  }, [step]);

  const onClipDone = (direction = "forward") => {
    pendingRef.current = false;
    let newStep = stepRef.current;

    if (direction === "back") {
      clearTimeout(loopFadeTimerRef.current);
      setHoldAtOverride(null);
      newStep = prevStep(stepRef.current);
      setStep(newStep);
      setClipSrc(holdClipForStep(newStep));
    } else {
      newStep = nextStepForward(stepRef.current);
      setStep(newStep);

      // Full orbit → soft dissolve last frame into start still (no hard cut).
      if (newStep === 0 && startImage) {
        const lastClip = ORBIT_STEP_CLIPS[ORBIT_STEP_COUNT - 1];
        setClipSrc(lastClip);
        setHoldAtOverride("end");
        setStartStillPhase("enter");
        clearTimeout(loopFadeTimerRef.current);
        loopFadeTimerRef.current = setTimeout(() => {
          // Under the opaque still, ready Seq1 at start for the next → click.
          setClipSrc(ORBIT_STEP_CLIPS[0]);
          setHoldAtOverride(null);
          setHoldResetKey(Date.now());
        }, START_STILL_FADE_IN_MS);
      } else {
        clearTimeout(loopFadeTimerRef.current);
        setHoldAtOverride(null);
        setClipSrc(holdClipForStep(newStep));
      }
    }

    stepRef.current = newStep;

    setLandAfterPlay(null);
    setPlayDirection("forward");
    setMode("hold");
    setIsPlaying(false);
  };

  const zoneConfig = getOrbitStepZones(step);
  const stepScope = useMemo(() => getOrbitStepScope(step), [step]);
  const visibleFlats = useMemo(
    () =>
      getVisibleOrbitFlats({
        zones: zoneConfig,
        block,
        floor,
        filtersActive,
        matchingIds,
        scopeUnitIds: stepScope.unitIds,
      }),
    [zoneConfig, block, floor, filtersActive, matchingIds, stepScope.unitIds]
  );
  const overlayFlats = useMemo(
    () => (floor || filtersActive ? visibleFlats : []),
    [floor, filtersActive, visibleFlats]
  );
  const showStartImage =
    Boolean(startImage) && startStillPhase !== "hidden" && !homeResetting;
  const showPremiumChrome = showFilters && tourRevealed && !homeResetting;
  const showZoneOverlay = Boolean(
    zoneConfig && mode === "hold" && !isPlaying && !homeResetting
  );
  const showZonePicker = Boolean(
    zoneConfig && !homeResetting && (showZoneOverlay || block || unit)
  );

  const blockPromptAnchor = useMemo(
    () => anchorAbovePoints(zoneConfig?.blocks?.[0]?.points),
    [zoneConfig]
  );

  const floorPromptAnchor = useMemo(() => {
    if (!zoneConfig || !block) return null;
    const floors = (zoneConfig.floors ?? []).filter((f) => f.block === block);
    return anchorAbovePolygons(floors);
  }, [zoneConfig, block]);

  const unitPromptAnchor = useMemo(
    () => anchorAbovePolygons(overlayFlats),
    [overlayFlats]
  );

  const promptBase = Boolean(showZoneOverlay && tourRevealed && !homeResetting);

  const showBlockFilterPrompt = Boolean(
    zoneConfig?.blocks?.length && promptBase && !block && blockPromptAnchor
  );

  const showFloorPrompt = Boolean(
    promptBase && block && !floor && !unit && floorPromptAnchor
  );

  const showUnitPrompt = Boolean(
    promptBase && block && floor && !unit && unitPromptAnchor
  );
  const filtersReady = Boolean(zoneConfig && block);

  useFilterPanelSelectionSync({
    block,
    floor,
    unit,
    setOpen: setFiltersOpen,
    enabled: filtersReady,
  });

  const zoneHint = showZoneOverlay
    ? !block
      ? showBlockFilterPrompt
        ? "Drag left / right to explore the property"
        : "Select a block or drag to explore"
      : !floor
        ? "Tap a floor on the building"
        : !unit
          ? "Tap a unit on the building"
          : "Tap outside the block to go back — use filters to show available homes"
    : null;

  if (!mountTour) {
    return (
      <TourPreloadScreen
        progress={displayProgress}
        brandPrefix={brand.prefix}
        brandName={brand.name}
        variant={preloadVariant}
      />
    );
  }

  if (clipsFailed) {
    return (
      <div className="be-root be-preload">
        <p className="be-preload-title">Tour videos unavailable</p>
        <p className="be-preload-label">
          Could not load clips from the CDN (often HTTP 403). Check that the
          Sequence files are public on CloudFront, then refresh.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        "be-root" +
        (isPlaying ? " be-transitioning" : "") +
        (displayFit === "cover" || displayFit === "contain" ? ` be-root--${displayFit}` : "")
      }
      style={{
        "--filter-w": showPremiumChrome ? "400px" : "0px",
        ...(viewH
          ? {
              height: `${viewH}px`,
              maxHeight: `${viewH}px`,
              top: `${viewTop}px`,
              bottom: "auto",
            }
          : null),
        ...(viewW
          ? {
              width: `${viewW}px`,
              maxWidth: `${viewW}px`,
              left: `${viewLeft}px`,
              right: "auto",
            }
          : null),
        ...(displayFit === "cover" || displayFit === "contain"
          ? { "--be-media-position": displayFit === "cover" ? mediaPosition : "center center" }
          : null),
      }}
    >
      <div
        className={
          "be-tour-reveal" +
          (tourRevealed ? " be-tour-reveal--in" : "") +
          (displayFit === "cover" || displayFit === "contain" ? " be-tour-reveal--sharp" : "")
        }
      >
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
              prefetchBack={backClipAtStep(step)}
              prefetchNext={forwardClipAtStep(step)}
              onPlayingChange={handlePlayingChange}
              onComplete={onClipDone}
              onDragForward={goNext}
              onDragBack={goPrev}
              dragDisabled={(showZoneOverlay && Boolean(block)) || !tourRevealed || homeResetting}
              holdResetKey={holdResetKey}
              prepareHomeClip={homePhase === "out" ? MAIN_GATE_CLIP : null}
              onPrepareHomeReady={handlePrepareHomeReady}
              onHoldFrameReady={handleHoldFrameReady}
            />

            {showStartImage && (
              <img
                src={startImage}
                alt=""
                className={
                  "be-start-still" +
                  (startStillPhase === "in" ? " be-start-still--in" : "") +
                  (startStillPhase === "out" ? " be-start-still--out" : "")
                }
                aria-hidden
                draggable={false}
              />
            )}

            {showBlockFilterPrompt && <BlockFilterPrompt anchor={blockPromptAnchor} />}

            {showFloorPrompt && (
              <BlockFilterPrompt
                anchor={floorPromptAnchor}
                title="Select a floor"
                subtitle="Tap a floor on the building"
              />
            )}

            {showUnitPrompt && (
              <BlockFilterPrompt
                anchor={unitPromptAnchor}
                title="Select a unit"
                subtitle="Tap an available home"
              />
            )}

            {showZonePicker && (
              <OrbitZoneOverlay
                zones={zoneConfig}
                block={block}
                floor={floor}
                unit={unit}
                visibleFlats={overlayFlats}
                filtersActive={filtersActive}
                maxVisibleFloor={block ? maxVisibleFloor : null}
                hoverBlock={hoverBlock}
                hoverFloor={hoverFloor}
                hoverUnit={hoverUnit}
                unitStatus={(id) => units[id]?.status ?? "available"}
                onPickBlock={pickBlock}
                onPickFloor={pickFloor}
                onPickUnit={pickUnit}
                onHoverBlock={setHoverBlock}
                onHoverFloor={setHoverFloor}
                onHoverUnit={setHoverUnit}
                onDismiss={dismissOverlay}
              />
            )}
          </div>

        <div className="scrim-top" />
        <div className="scrim-bot" />

        <div className="be-top">
          {showBrand ? (
            <div
              className="be-brand"
              onClick={goHome}
              style={{ cursor: homeResetting ? "default" : "pointer" }}
              title="Return to Main Gate"
            >
              <span className="be-crown">&#9819;</span>
              <div className="be-bk">
                <span className="be-brand-name">
                  {brand.prefix ? (
                    <>
                      {brand.prefix} <b>{brand.name}</b>
                    </>
                  ) : (
                    <b>{brand.name}</b>
                  )}
                </span>
                <PremiumBadge label={brand.badge} size="sm" />
              </div>
            </div>
          ) : (
            <div />
          )}
          <div className="be-top-actions">
            <ExplorerNavMenu onHome={goHome} onLogout={handleLogout} onOpenChange={setNavOpen} />
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
              <span className="hand">&#9757;</span> Drag left / right or use the 360 control
            </>
          )}
        </div>

        <div className="be-rotate-wrap">
          <RotateButton
            onLeft={goPrev}
            onRight={goNext}
            inactiveLeft={!canPrev}
            inactiveRight={!canNext}
          />
        </div>

        {showFilters && (
          <ExplorerPremiumChrome
            visible={showPremiumChrome}
            block={block}
            floor={floor}
            unit={unit}
            onPickUnit={pickUnit}
            onPickFloor={pickFloor}
            hoverBlock={hoverBlock}
            onPickBlock={pickBlock}
            onHoverBlock={setHoverBlock}
            onClearBlock={clearBlock}
            filtersInteractive={filtersReady}
            filtersOpen={filtersOpen}
            onFiltersOpenChange={setFiltersOpen}
            liveUnits={polledLiveUnits}
            orbitStep={zoneConfig ? step : null}
            onFilterStateChange={handleFilterStateChange}
            onFloorFilterChange={handleFloorFilterChange}
            floorSliderRange={floorSliderRange}
            bookingReturnTo={booking.returnTo}
            bookingPath={booking.path}
          />
        )}
        </div>
      </div>

      <button
        type="button"
        className={
          "be-orbit-arw be-orbit-arw--l" +
          (!canPrev ? " be-orbit-arw--inactive" : "") +
          (navOpen ? " be-orbit-arw--hidden" : "") +
          (tourRevealed ? " be-orbit-arw--on" : "")
        }
        aria-label="Rotate left"
        onClick={() => {
          if (!canPrev) return;
          goPrev();
        }}
      >
        <OrbitSideChevron dir="l" />
      </button>
      <button
        type="button"
        className={
          "be-orbit-arw be-orbit-arw--r" +
          (!canNext ? " be-orbit-arw--inactive" : "") +
          (navOpen ? " be-orbit-arw--hidden" : "") +
          (tourRevealed ? " be-orbit-arw--on" : "")
        }
        aria-label="Rotate right"
        onClick={() => {
          if (!canNext) return;
          goNext();
        }}
      >
        <OrbitSideChevron dir="r" />
      </button>

      {tourRevealed && <FullscreenButton />}

      {showPreload && (
        <TourPreloadScreen
          progress={displayProgress}
          exiting={gateOpen && tourRevealed}
          brandPrefix={brand.prefix}
          brandName={brand.name}
          variant={preloadVariant}
        />
      )}
    </div>
  );
}
