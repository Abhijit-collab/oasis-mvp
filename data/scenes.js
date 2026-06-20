import { ENTRANCE_IMAGE, TRANSITION_VIDEOS } from "@/data/assets";

/** Viewpoints in the 360 walkthrough */
export const SCENES = {
  entrance: { id: "entrance", label: "Main Gate", poster: ENTRANCE_IMAGE },
  blockA: { id: "blockA", label: "Block A" },
  blockB: { id: "blockB", label: "Block B" },
  blockC: { id: "blockC", label: "Block C" },
};

/**
 * Full sequenced walkthrough — T1 → T2 → T3 → T4 → T5 → T6 → T7.
 * Each clip’s last frame matches the next clip’s first frame.
 *
 *  T1       T2        T3        T4        T5        T6        T7
 * Gate ──► Block A ──► Block B ──► Block C ──► ... ──► ... ──► Gate
 */
export const TRANSITION_SEQUENCE = [
  TRANSITION_VIDEOS.entrance,
  TRANSITION_VIDEOS.blockAIn,
  TRANSITION_VIDEOS.blockBIn,
  TRANSITION_VIDEOS.blockCIn,
  TRANSITION_VIDEOS.blockCOut,
  TRANSITION_VIDEOS.blockBOut,
  TRANSITION_VIDEOS.blockAOut,
];

/** Step index after each clip (0 = main gate before T1). */
export const SCENE_STEP = {
  entrance: 0,
  blockA: 2,
  blockB: 3,
  blockC: 4,
};

export const blockToScene = (blockName) => {
  const map = { "Block A": "blockA", "Block B": "blockB", "Block C": "blockC" };
  return map[blockName] || null;
};

export const stepToScene = (step) => {
  if (step === 0 || step >= TRANSITION_SEQUENCE.length) return "entrance";
  if (step === SCENE_STEP.blockA) return "blockA";
  if (step === SCENE_STEP.blockB) return "blockB";
  if (step === SCENE_STEP.blockC) return "blockC";
  return "entrance";
};

/** Play clips forward along the sequence from `fromStep` toward `toStep`. */
export const getSequencePath = (fromStep, toStep) => {
  if (fromStep === toStep) return [];
  if (toStep > fromStep) return TRANSITION_SEQUENCE.slice(fromStep, toStep);
  return [];
};

/** Clips needed to reach a scene from the current step. */
export const getScenePath = (fromStep, toScene) => {
  if (toScene === "entrance") {
    if (fromStep === 0) return [];
    return TRANSITION_SEQUENCE.slice(fromStep, TRANSITION_SEQUENCE.length);
  }
  const toStep = SCENE_STEP[toScene];
  if (toStep === undefined) return [];
  return getSequencePath(fromStep, toStep);
};

export const ALL_TRANSITION_CLIPS = TRANSITION_SEQUENCE;
