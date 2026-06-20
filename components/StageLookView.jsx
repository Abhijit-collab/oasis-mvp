"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_YAW = 24;
const MAX_PITCH = 14;
const DRAG_SENS = 0.12;

/** Drag to look around — yaw/pitch on the stage media (gate image, video, hold frame). */
export default function StageLookView({ enabled = true, resetKey, children }) {
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setYaw(0);
    setPitch(0);
  }, [resetKey]);

  const onPointerDown = useCallback(
    (e) => {
      if (!enabled || e.button !== 0) return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [enabled]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragging.current || !enabled) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      setYaw((v) => Math.max(-MAX_YAW, Math.min(MAX_YAW, v + dx * DRAG_SENS)));
      setPitch((v) => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, v - dy * DRAG_SENS)));
    },
    [enabled]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      className={"be-look-viewport" + (enabled ? " can-drag" : "")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="be-look-inner"
        style={{
          transform: `perspective(1100px) scale(1.14) rotateX(${pitch}deg) rotateY(${yaw}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
