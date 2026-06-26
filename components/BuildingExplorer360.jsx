"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
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
import usePreloadVideos from "@/hooks/usePreloadVideos";
import useTourPreloadGate from "@/hooks/useTourPreloadGate";
import TourPreloadScreen from "@/components/TourPreloadScreen";
import RotateButton from "@/components/RotateButton";
import { getOrbitStepZones } from "@/data/orbit360Zones";
import { ORBIT_STEP_PRELOAD_URLS } from "@/lib/tourAssetPreload";
import { mergeLiveUnits } from "@/lib/mergeLiveUnits";
import useLiveUnitsPoll from "@/hooks/useLiveUnitsPoll";
import { getOrbitStepScope, getVisibleOrbitFlats } from "@/lib/orbitStepScope";
import { getFloorSliderRange } from "@/lib/floorSliderRange";
import BlockFilterPrompt from "@/components/BlockFilterPrompt";
import { anchorAbovePoints, anchorAbovePolygons } from "@/lib/zonePromptAnchor";
import { isUnitSold } from "@/lib/unitStatus";
import { useFilterPanelSelectionSync } from "@/hooks/useFilterPanelSelectionSync";

const TOUR_REVEAL_MS = 900;
const HOME_FADE_OUT_MS = 480;
const HOME_FADE_IN_MS = 480;
const MAIN_GATE_CLIP = ORBIT_STEP_CLIPS[0];

/**
 * /test — left / right arrows play individual T1–T7 clips.
 * Back uses pre-encoded *-rev.mp4 files played forward.
 * ← from 1/8 wraps to 7/8 (T7-rev → T6 last frame), then 6/8, 5/8, … each at last frame.
 */
export default function BuildingExplorer360({ liveUnits = null }) {
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
  const nextStepForward = (from) => (from >= ORBIT_STEP_COUNT ? 0 : from + 1);
  const reverseClipIndexForBack = (fromStep) =>
    fromStep === 0 ? ORBIT_STEP_COUNT - 1 : fromStep - 1;
  const forwardClipAtStep = (s) => ORBIT_STEP_CLIPS[s >= ORBIT_STEP_COUNT ? 0 : s];
  const backClipAtStep = (s) => ORBIT_STEP_CLIPS_REVERSE[reverseClipIndexForBack(s)];
  const holdClipForStep = (s) => (s === 0 ? ORBIT_STEP_CLIPS[0] : ORBIT_STEP_CLIPS[s - 1]);
  const holdAtForStep = (s) => (s === 0 ? "start" : "end");
  const landHoldAtForBack = (landStep) => (landStep === 0 ? "start" : "end");

  const { ready: assetsReady, progress: loadProgress } = usePreloadVideos(ORBIT_STEP_PRELOAD_URLS);
  const { gateOpen, displayProgress } = useTourPreloadGate(assetsReady, loadProgress);
  const polledLiveUnits = useLiveUnitsPoll(liveUnits);
  const units = useMemo(() => mergeLiveUnits(polledLiveUnits), [polledLiveUnits]);
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
  };

  const canPrev = !isPlaying && !pendingRef.current && !homeResetting;
  const canNext = !isPlaying && !pendingRef.current && !homeResetting;
  const holdAt = holdAtForStep(step);

  const goNext = () => {
    if (!canNext) return;
    pendingRef.current = true;
    setLandAfterPlay(null);
    const fromStep = stepRef.current;
    const clipIndex = fromStep >= ORBIT_STEP_COUNT ? 0 : fromStep;
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
      newStep = prevStep(stepRef.current);
      setStep(newStep);
      setClipSrc(holdClipForStep(newStep));
    } else {
      newStep = nextStepForward(stepRef.current);
      setStep(newStep);
      setClipSrc(holdClipForStep(newStep));
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
  const showPremiumChrome = tourRevealed && !homeResetting;
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
    return <TourPreloadScreen progress={displayProgress} />;
  }

  return (
    <div
      className={"be-root" + (isPlaying ? " be-transitioning" : "")}
      style={{
        "--filter-w": showPremiumChrome ? "400px" : "0px",
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
              prefetchBack={backClipAtStep(step)}
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
          bookingReturnTo="/test"
          bookingPath="/test/booking"
        />
        </div>
      </div>

      {showPreload && (
        <TourPreloadScreen progress={displayProgress} exiting={gateOpen && tourRevealed} />
      )}
    </div>
  );
}
