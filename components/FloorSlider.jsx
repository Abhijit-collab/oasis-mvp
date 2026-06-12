"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";

export default function FloorSlider({ value, onValueChange, disabled, onInteractStart, min = 1, max = 4 }) {
  return (
    <SliderPrimitive.Root
      className="be-floor-range"
      orientation="horizontal"
      min={min}
      max={max}
      step={1}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      onPointerDown={() => onInteractStart?.()}
    >
      <SliderPrimitive.Track className="be-floor-range-track">
        <SliderPrimitive.Range className="be-floor-range-fill" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="be-floor-range-thumb" aria-label="Select floor" />
    </SliderPrimitive.Root>
  );
}
