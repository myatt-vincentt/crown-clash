// The crown and the jester hat: vincentt.studio head accessories
// (public/models/vincentt-*.glb), authored in metres in the "Complete 3D
// Reference - Spark AR" face frame (origin at the front of the face, +Y up,
// +Z out of the face) — see FRAME.

export type Part = {
  /** File name in public/models without `vincentt-` / `.glb`. */
  id: string;
  /**
   * Material swaps by name, to another material in the same file. The
   * default preset's finish is applied first.
   */
  materials?: Record<string, string>;
  /** Tints by material name (on this part's own copy of the material). */
  colors?: Record<string, string>;
  /** Fine placement: `x` / `y` / `z` canonical cm, `scale` about its middle. */
  fit?: { x?: number; y?: number; z?: number; scale?: number };
};

export const CROWN_PART: Part = { id: "royal-crown" };

export const JESTER_PART: Part = {
  id: "jester-hat",
  fit: { y: 1.5, scale: 1.12 },
};

export const modelUrl = (id: string) => `/models/vincentt-${id}.glb`;

/** The SDK's v3 head occluder, hosted here until the SDK CDN serves it. */
export const OCCLUDER_URL = "/models/head-occluder-v3.glb";

/** The SDK's neck-and-shoulders bust occluder (same story). */
export const NECK_OCCLUDER_URL = "/models/neck-occluder-bust-v1.glb";

/**
 * The models' frame → the SDK's canonical head frame (centimetres): ×100,
 * then the same shift the SDK used to move the Spark AR reference into the
 * canonical frame (chins and nose tips aligned; vincentt-xr-sdk
 * assets-src/head-occluder/README.md).
 */
export const FRAME = {
  scale: 100,
  position: [0, -1.03, 7.3] as const,
};
