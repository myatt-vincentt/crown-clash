// The two players' heads: the SDK's canonical head fit for up to two faces,
// each player steadied by their own HeadFilter (a speed-adaptive spring,
// headFilter.ts).
//
// The face model's two slots can swap, so a player isn't a slot: every
// frame the fresh fits are handed to the player whose head was nearest
// (players.ts), and only then filtered. Each player's filtered pose drives
// one group drawn straight into the scene (a portal), holding the
// depth-only v3 head occluder and whatever that player wears; children are
// in canonical centimetres. The neck busts are the SDK's NeckOccluder, one
// per slot (an occluder doesn't care who it belongs to).
import { useMemo, useRef, type ReactNode } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Group,
} from "three";
import { defineGltfAsset, useXRAsset } from "@vincentt-xr/sdk";
import {
  NeckOccluder,
  useCanonicalHeadFit,
} from "@vincentt-xr/sdk/face-effects";
import { FaceTracker } from "@vincentt-xr/sdk/tracking";

import { HeadFilter, type HeadPose } from "./headFilter";
import { live, type PlayerLive } from "./live";
import { assign, type Track } from "./players";
import { NECK_OCCLUDER_URL, OCCLUDER_URL } from "./props";

/** Face inference rate: the filter fills the frames between. */
export const FACE_FPS = 20;
/** Faces the model looks for. */
export const FACES = 2;
/** Seconds without a fit before a player's head is hidden. */
const GONE = 0.35;

const occluderAsset = defineGltfAsset(OCCLUDER_URL);

/** The SDK's head-occluder draw order: before every accessory. */
const OCCLUDER_ORDER = -1;

/** Dev only: ?occ draws the occluders, to check the fit. */
export const showOccluders = () =>
  process.env.NODE_ENV !== "production" &&
  new URLSearchParams(window.location.search).has("occ");

/** The v3 head as a depth-only mesh (or a see-through one with ?occ). */
const HeadOccluderMesh = () => {
  const { value } = useXRAsset(occluderAsset);
  const object = useMemo(() => {
    if (!value) return null;
    const root = value.scene.clone();
    const debug = showOccluders();
    const material = new MeshBasicMaterial({
      color: 0xe6e6e6,
      colorWrite: debug,
      depthWrite: true,
      transparent: debug,
      opacity: debug ? 0.45 : 1,
    });
    root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.material = material;
      m.renderOrder = OCCLUDER_ORDER;
      m.frustumCulled = false;
    });
    return root;
  }, [value]);
  return object ? <primitive object={object} /> : null;
};

type Slot = { pose: HeadPose; fresh: boolean; t: number };

/** Reads one slot's raw fit inside its FaceTracker. */
const FitSlot = ({ slot }: { slot: Slot }) => {
  const target = useRef<Group>(null);
  useCanonicalHeadFit(target, {
    smoothing: 1,
    onFit: (fit) => {
      /* eslint-disable no-param-reassign -- the shared slot buffer */
      slot.pose.position.copy(fit.translation);
      slot.pose.quaternion.copy(fit.quaternion);
      slot.pose.scale = fit.scale;
      slot.t = performance.now() / 1000;
      slot.fresh = true;
      /* eslint-enable no-param-reassign */
    },
  });
  // The hook needs an object to drive; this one is never seen.
  return <group ref={target} visible={false} />;
};

const newPose = (): HeadPose => ({
  position: new Vector3(),
  quaternion: new Quaternion(),
  scale: 1,
});

export const PlayerHeads = ({
  children,
}: {
  /** What player 0 / 1 wears (canonical cm). */
  children: (player: number) => ReactNode;
}) => {
  const scene = useThree((s) => s.scene);
  const slots = useMemo<Slot[]>(
    () =>
      Array.from({ length: FACES }, () => ({
        pose: newPose(),
        fresh: false,
        t: 0,
      })),
    [],
  );
  const players = useMemo(
    () =>
      [0, 1].map(() => ({
        filter: new HeadFilter(),
        track: { at: null, seen: -Infinity } as Track,
        out: newPose(),
      })),
    [],
  );
  const groups = useRef<(Group | null)[]>([null, null]);

  // After the fits (their frame callbacks are registered first, inside the
  // trackers) and before drawing.
  useFrame(() => {
    const t = performance.now() / 1000;
    const faces = slots.map((s) =>
      s.fresh ? { x: s.pose.position.x, y: s.pose.position.y } : null,
    );
    const who = assign(faces, [players[0].track, players[1].track], t);
    who.forEach((p, i) => {
      const s = slots[i];
      live.slotPlayer[i] = p >= 0 ? p : live.slotPlayer[i];
      if (p < 0) return;
      s.fresh = false;
      const pl = players[p];
      pl.filter.update(s.t, s.pose);
      pl.track = { at: faces[i], seen: s.t };
    });
    players.forEach((pl, i) => {
      const g = groups.current[i];
      const info: PlayerLive = live.players[i];
      const here = t - pl.track.seen < GONE;
      if (!here) pl.filter.reset();
      const pose = here ? pl.filter.sample(t, pl.out) : null;
      info.present = !!pose;
      info.head = g;
      if (!g) return;
      g.visible = !!pose;
      if (!pose) return;
      g.position.copy(pose.position);
      g.quaternion.copy(pose.quaternion);
      g.scale.setScalar(pose.scale);
    });
  });

  return (
    <>
      {slots.map((slot, i) => (
        <FaceTracker
          // eslint-disable-next-line react/no-array-index-key -- fixed slots
          key={i}
          numFaces={FACES}
          faceIndex={i}
          targetFps={FACE_FPS}
        >
          <FitSlot slot={slot} />
          <NeckOccluder
            url={NECK_OCCLUDER_URL}
            showDebugMaterial={showOccluders()}
            opacity={0.45}
          />
        </FaceTracker>
      ))}
      {createPortal(
        <>
          {[0, 1].map((p) => (
            <group
              key={p}
              name={`player-${p}`}
              ref={(g) => {
                groups.current[p] = g;
              }}
              visible={false}
            >
              <HeadOccluderMesh />
              {children(p)}
            </group>
          ))}
        </>,
        scene,
      )}
    </>
  );
};
