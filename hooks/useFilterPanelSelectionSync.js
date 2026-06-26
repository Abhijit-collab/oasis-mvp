import { useEffect } from "react";

/** Close filters when a unit is selected; open when a floor is active without a unit. */
export function useFilterPanelSelectionSync({ block, floor, unit, setOpen, enabled = true }) {
  useEffect(() => {
    if (!enabled || !block) return;
    if (unit) {
      setOpen(false);
      return;
    }
    if (floor) {
      setOpen(true);
    }
  }, [block, floor, unit, enabled, setOpen]);
}
