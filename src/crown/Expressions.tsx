// Reads each face slot's blendshapes and keeps its power (rules.powerOf),
// eased so a flicker doesn't count. Which player a slot is comes from
// PlayerHeads (live.slotPlayer).
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useFaceInfo } from "@vincentt-xr/sdk/tracking";

import { live } from "./live";
import { FACE_FPS, FACES } from "./PlayerHeads";
import { powerOf } from "./rules";

/** Per-second easing of the power (higher = snappier, noisier). */
const EASE = 12;

const SlotReader = ({ slot }: { slot: number }) => {
  const face = useFaceInfo({
    active: true,
    numFaces: FACES,
    faceIndex: slot,
    targetFps: FACE_FPS,
  });
  const raw = useRef(0);
  raw.current = face?.blendshapes ? powerOf(face.blendshapes) : 0;
  useFrame((_st, dt) => {
    const k = 1 - Math.exp(-EASE * Math.min(dt, 0.1));
    live.slotPower[slot] += (raw.current - live.slotPower[slot]) * k;
  }, -1);
  return null;
};

export const Expressions = () => (
  <>
    {Array.from({ length: FACES }, (_, i) => (
      <SlotReader key={i} slot={i} />
    ))}
  </>
);
