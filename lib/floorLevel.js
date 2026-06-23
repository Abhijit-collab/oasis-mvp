/** "Floor 3" → 3 */
export function floorLevelFromName(name) {
  return parseInt(String(name).replace(/\D/g, ""), 10) || 0;
}
