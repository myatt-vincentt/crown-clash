// Gold confetti over the winner: a burst from above their head that
// flutters down for a few seconds. Instanced paper bits in world space (a
// portal), unlit, drawn over everything.
import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from "three";

import { live } from "./live";
import { useCrown } from "./state";

const CONFETTI = {
  count: 110,
  /** Seconds it lasts. */
  time: 3.6,
  // Royal: gold, white, and the crown's crimson and sapphire for contrast.
  colors: ["#f4d968", "#d4af37", "#ffffff", "#c8102e", "#1b3fa8", "#f4d968"],
  /** cm: how high above the head it bursts. */
  above: 24,
  renderOrder: 20,
};

type Bit = {
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  flutter: number;
  phase: number;
  size: number;
};

export const Confetti = () => {
  const scene = useThree((s) => s.scene);
  const { wins, winner } = useCrown();
  const mesh = useRef<InstancedMesh>(null);
  const start = useRef(-1);
  const origin = useRef({ at: new Vector3(), scale: 1 });

  const parts = useMemo(() => {
    const r = Math.random;
    return {
      geo: new PlaneGeometry(1, 0.55),
      mat: new MeshBasicMaterial({
        side: DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
      bits: Array.from(
        { length: CONFETTI.count },
        (): Bit => ({
          vx: (r() - 0.5) * 110,
          vy: 30 + r() * 60,
          vz: (r() - 0.5) * 20,
          spin: (r() - 0.5) * 14,
          flutter: 2 + r() * 4,
          phase: r() * Math.PI * 2,
          size: 2.2 + r() * 2.2,
        }),
      ),
      palette: CONFETTI.colors.map((c) => new Color(c)),
    };
  }, []);

  // A win with a winner: burst over their head.
  useEffect(() => {
    const head = winner >= 0 ? live.players[winner].head : null;
    if (!wins || !head) return;
    origin.current.at.copy(head.position);
    origin.current.scale = head.scale.x;
    origin.current.at.y += CONFETTI.above * head.scale.x;
    start.current = -2;
    const m = mesh.current;
    if (m)
      parts.bits.forEach((_, i) =>
        m.setColorAt(i, parts.palette[i % parts.palette.length]),
      );
    if (m?.instanceColor) m.instanceColor.needsUpdate = true;
  }, [wins, winner, parts]);

  const dummy = useMemo(() => new Object3D(), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const now = state.clock.elapsedTime;
    if (start.current === -2) start.current = now;
    const age = start.current < 0 ? Infinity : now - start.current;
    m.visible = age < CONFETTI.time;
    if (!m.visible) return;
    const { at, scale } = origin.current;
    const g = 60; // cm/s², gentle: paper drifts
    parts.bits.forEach((b, i) => {
      // Burst out, then drift down with air drag and a sideways flutter.
      const drag = 1 - Math.exp(-age * 2.2);
      const x = (b.vx / 2.2) * drag + Math.sin(age * b.flutter + b.phase) * 3;
      const y = (b.vy / 2.2) * drag - 0.5 * g * age * age * 0.6;
      const z = (b.vz / 2.2) * drag;
      dummy.position.set(at.x + x * scale, at.y + y * scale, at.z + z * scale);
      dummy.rotation.set(age * b.spin, age * b.spin * 0.7, b.phase);
      const fade = age < CONFETTI.time - 0.6 ? 1 : (CONFETTI.time - age) / 0.6;
      dummy.scale.setScalar(Math.max(1e-4, b.size * scale * fade));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return createPortal(
    <instancedMesh
      ref={mesh}
      args={[parts.geo, parts.mat, CONFETTI.count]}
      frustumCulled={false}
      renderOrder={CONFETTI.renderOrder}
      visible={false}
    />,
    scene,
  );
};
