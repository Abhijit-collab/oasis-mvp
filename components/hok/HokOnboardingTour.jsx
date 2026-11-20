"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { isMobileTourDevice } from "@/lib/rotateGate";
import PortraitRotateHint from "./PortraitRotateHint";

const TOUR_STORAGE_KEY = "hok_tour_done_v1";
const TOUR_POI_ID = 1;
const EYE_WAIT_MS = 3000;
let tourShownForThisLogin = false;

function isShown(button) {
  if (!button) return false;
  const box = button.getBoundingClientRect();
  return getComputedStyle(button).display !== "none" && box.width >= 8 && box.height >= 8;
}

function fullscreenTourStep() {
  const button = document.querySelector('[data-tour="fullscreen"]');
  if (!isShown(button)) return [];
  return [
    {
      element: '[data-tour="fullscreen"]',
      popover: {
        title: "Full screen",
        description: "Fill the screen for a closer look.",
        side: "top",
        align: "end",
      },
    },
  ];
}

function soundTourStep() {
  const buttons = [...document.querySelectorAll(".tour-sound-btn")];
  const visible = buttons.find(isShown);
  buttons.forEach((button) => button.removeAttribute("data-tour"));
  if (!visible) return [];
  visible.setAttribute("data-tour", "sound");
  return [
    {
      element: '[data-tour="sound"]',
      popover: {
        title: "Sound",
        description: "Turn the soundtrack on or off.",
        side: "top",
        align: "end",
      },
    },
  ];
}

function isPortraitPhone() {
  if (typeof window === "undefined") return false;
  const portrait =
    window.matchMedia("(orientation: portrait)").matches &&
    window.innerHeight > window.innerWidth + 40;
  if (!portrait) return false;
  return isMobileTourDevice() || document.documentElement.classList.contains("be-phone");
}

function writeTourDone() {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
  } catch {
    /* private mode or blocked storage */
  }
}

function fitTourPopover(wrapper) {
  const pop = wrapper || document.querySelector(".hok-tour-popover");
  if (!pop) return;
  const viewport = window.visualViewport?.width || window.innerWidth;
  const width = Math.round(Math.min(320, Math.max(160, viewport - 32)));
  pop.style.boxSizing = "border-box";
  pop.style.width = `${width}px`;
  pop.style.minWidth = `${width}px`;
  pop.style.maxWidth = `${width}px`;
}

function waitForSelector(tokenRef, token, selector, onOpenPoi) {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      if (tokenRef.current !== token) {
        resolve(false);
        return;
      }
      onOpenPoi?.(TOUR_POI_ID);
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }
      if (performance.now() - started >= EYE_WAIT_MS) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function waitForVisible(tokenRef, token, selector) {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      if (tokenRef.current !== token) {
        resolve(false);
        return;
      }
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (rect && rect.width > 20 && rect.height > 20) {
        resolve(true);
        return;
      }
      if (performance.now() - started >= EYE_WAIT_MS) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function delay(ms, tokenRef, token) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(tokenRef.current === token), ms);
  });
}

export default function HokOnboardingTour({ onFirstScreen = true, onEnablePois, onOpenPoi, onClosePoi, onOpenPano }) {
  const driverRef = useRef(null);
  const actionsRef = useRef({ onEnablePois, onOpenPoi, onClosePoi, onOpenPano });
  const waitToken = useRef(0);
  const poiAuto = useRef(0);
  const poiRun = useRef(0);
  const poiPlayed = useRef(false);
  const panoToken = useRef(0);
  const panoListen = useRef(null);
  const onFirstRef = useRef(onFirstScreen);
  const [firstScreenHint, setFirstScreenHint] = useState(false);
  /** wait until orientation is known, hint while the portrait card is up, go once the tutorial may start. */
  const [rotateGate, setRotateGate] = useState("wait");
  const rotateGateRef = useRef("wait");
  rotateGateRef.current = rotateGate;
  onFirstRef.current = onFirstScreen;

  const finishRotateHint = useCallback(() => {
    rotateGateRef.current = "go";
    setRotateGate("go");
  }, []);

  useEffect(() => {
    if (isPortraitPhone()) setRotateGate("hint");
    else finishRotateHint();
  }, [finishRotateHint]);
  actionsRef.current = { onEnablePois, onOpenPoi, onClosePoi, onOpenPano };

  const startTour = () => {
    waitToken.current += 1;
    poiAuto.current += 1;
    poiRun.current += 1;
    poiPlayed.current = false;
    panoToken.current += 1;
    if (panoListen.current) {
      window.removeEventListener("hok-tour-360", panoListen.current);
      panoListen.current = null;
    }
    driverRef.current?.destroy();

    let advancing = false;
    const pressMarker = () => {
      const badge = document.querySelector('[data-tour="poi-marker"]');
      if (!badge) return;
      badge.classList.remove("hok-tour-press");
      void badge.offsetWidth;
      badge.classList.add("hok-tour-press");
      window.setTimeout(() => badge.classList.remove("hok-tour-press"), 600);
    };

    const playPoiClick = (token) => {
      if (token !== poiAuto.current || poiPlayed.current || !driverObj.isActive()) return;
      if (driverObj.getActiveStep()?.element !== '[data-tour="poi-marker"]') return;
      poiPlayed.current = true;
      const run = ++poiRun.current;
      pressMarker();
      window.setTimeout(() => {
        if (run !== poiRun.current || !driverObj.isActive()) return;
        actionsRef.current.onOpenPoi?.(TOUR_POI_ID);
      }, 340);
    };

    const openMarkerThenAdvance = async () => {
      if (advancing || !driverObj.isActive()) return;
      if (driverObj.getActiveStep()?.element !== '[data-tour="poi-marker"]') return;
      const token = ++poiRun.current;
      poiAuto.current += 1;
      if (!poiPlayed.current) {
        poiPlayed.current = true;
        pressMarker();
        const stillPressing = await delay(340, poiRun, token);
        if (!stillPressing || !driverObj.isActive()) return;
      }
      actionsRef.current.onOpenPoi?.(TOUR_POI_ID);
      await waitForSelector(poiRun, token, '[data-tour="eye-360"]', actionsRef.current.onOpenPoi);
      if (poiRun.current !== token || !driverObj.isActive()) return;
      advancing = true;
      driverObj.moveNext();
    };

    const armPoiDemo = (waitMs) => {
      const token = ++poiAuto.current;
      window.setTimeout(() => playPoiClick(token), waitMs);
    };

    const driverObj = driver({
      animate: true,
      duration: 1200,
      showProgress: true,
      popoverClass: "hok-tour-popover",
      overlayOpacity: 0.62,
      overlayColor: "#06070a",
      stagePadding: 6,
      stageRadius: 12,
      popoverOffset: 18,
      smoothScroll: false,
      scrollIntoView: false,
      allowClose: true,
      onPopoverRender: (popover) => {
        fitTourPopover(popover.wrapper);
      },
      onDestroyStarted: (_element, _step, opts) => {
        waitToken.current += 1;
        poiAuto.current += 1;
        poiRun.current += 1;
        panoToken.current += 1;
        if (panoListen.current) {
          window.removeEventListener("hok-tour-360", panoListen.current);
          panoListen.current = null;
        }
        if (opts?.reason === "done") actionsRef.current.onClosePoi?.();
        writeTourDone();
        driverObj.destroy();
      },
      steps: [
        {
          element: '[data-tour="menu"]',
          popover: {
            title: "Menu",
            description: "Explore towers, amenities and more from here.",
            side: "bottom",
            align: "end",
          },
        },
        ...fullscreenTourStep(),
        ...soundTourStep(),
        {
          element: '[data-tour="poi-toggle"]',
          popover: {
            title: "Points of interest",
            description: "Turn the amenity markers on or off.",
            side: "top",
            align: "end",
            onNextClick: () => {
              const token = ++waitToken.current;
              actionsRef.current.onEnablePois?.();
              void (async () => {
                await waitForSelector(waitToken, token, '[data-tour="poi-marker"].show');
                if (waitToken.current !== token || !driverObj.isActive()) return;
                driverObj.moveNext();
              })();
            },
          },
        },
        {
          element: '[data-tour="poi-marker"]',
          popover: {
            title: "Shopping Complex",
            description: "Tap the marker to open it.",
            side: "top",
            align: "center",
            onNextClick: () => {
              void openMarkerThenAdvance();
            },
          },
          onHighlighted: () => {
            if (!poiPlayed.current) armPoiDemo(700);
          },
          onDeselected: () => {
            poiAuto.current += 1;
            poiRun.current += 1;
            poiPlayed.current = false;
          },
        },
        {
          element: '[data-tour="eye-360"]',
          popover: {
            title: "360° view",
            description: "Tap the eye to look around the amenity in 360°.",
            side: "top",
            align: "center",
            onNextClick: () => {
              actionsRef.current.onOpenPano?.();
            },
          },
        },
        {
          element: '[data-tour="pano-stage"]',
          disableActiveInteraction: false,
          popover: {
            title: "Drag to look around",
            description: "Drag inside the view to look around in 360°.",
            side: "bottom",
            align: "center",
          },
        },
      ],
    });

    const on360Opened = () => {
      if (!driverObj.isActive()) return;
      if (driverObj.getActiveStep()?.element !== '[data-tour="eye-360"]') return;
      const token = ++panoToken.current;
      void (async () => {
        await waitForVisible(panoToken, token, ".pano360--open [data-tour=\"pano-stage\"]");
        if (panoToken.current !== token || !driverObj.isActive()) return;
        if (driverObj.getActiveStep()?.element !== '[data-tour="eye-360"]') return;
        driverObj.moveNext();
        requestAnimationFrame(() => {
          if (!driverObj.isActive()) return;
          fitTourPopover();
          driverObj.refresh();
        });
      })();
    };
    panoListen.current = on360Opened;
    window.addEventListener("hok-tour-360", on360Opened);

    driverRef.current = driverObj;
    driverObj.drive();
  };

  const startTourRef = useRef(startTour);
  startTourRef.current = startTour;

  useEffect(() => {
    const timers = [];
    const refreshTour = () => {
      if (!driverRef.current?.isActive()) return;
      fitTourPopover();
      driverRef.current.refresh();
    };
    const onResize = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.length = 0;
      refreshTour();
      requestAnimationFrame(refreshTour);
      timers.push(window.setTimeout(refreshTour, 150));
      timers.push(window.setTimeout(refreshTour, 450));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    let cancel = false;
    let frame = 0;
    let armedAt = 0;
    const tryStart = () => {
      if (cancel || tourShownForThisLogin) return;
      if (rotateGateRef.current !== "go") {
        frame = requestAnimationFrame(tryStart);
        return;
      }
      if (!armedAt) armedAt = performance.now();
      if (!onFirstRef.current) {
        if (performance.now() - armedAt > 10000) return;
        frame = requestAnimationFrame(tryStart);
        return;
      }
      const menu = document.querySelector('[data-tour="menu"]');
      const toggle = document.querySelector('[data-tour="poi-toggle"]');
      if (menu && toggle) {
        tourShownForThisLogin = true;
        startTourRef.current();
        return;
      }
      if (performance.now() - armedAt > 10000) return;
      frame = requestAnimationFrame(tryStart);
    };
    frame = requestAnimationFrame(tryStart);

    return () => {
      cancel = true;
      waitToken.current += 1;
      poiAuto.current += 1;
      poiRun.current += 1;
      panoToken.current += 1;
      if (panoListen.current) {
        window.removeEventListener("hok-tour-360", panoListen.current);
        panoListen.current = null;
      }
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      driverRef.current?.destroy();
      driverRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (onFirstScreen) return;
    if (!driverRef.current?.isActive()) return;
    waitToken.current += 1;
    poiAuto.current += 1;
    poiRun.current += 1;
    panoToken.current += 1;
    actionsRef.current.onClosePoi?.();
    driverRef.current.destroy();
  }, [onFirstScreen]);

  useEffect(() => {
    if (!firstScreenHint) return undefined;
    const id = window.setTimeout(() => setFirstScreenHint(false), 4500);
    return () => window.clearTimeout(id);
  }, [firstScreenHint]);

  const onHelpClick = () => {
    if (!onFirstRef.current) {
      setFirstScreenHint(true);
      return;
    }
    setFirstScreenHint(false);
    startTourRef.current();
  };

  return (
    <>
    {rotateGate === "hint" ? <PortraitRotateHint onDone={finishRotateHint} /> : null}
    <div className="hok-tour-help-slot">
      {firstScreenHint ? (
        <p className="hok-tour-notice" role="status">
          Go to the first screen to view the tutorial.
        </p>
      ) : null}
      <button
        type="button"
        className="hok-tour-help"
        aria-label="Tutorial"
        data-hover="Tutorial"
        onClick={onHelpClick}
      >
        ?
      </button>
    </div>
    </>
  );
}
