// The crown, in world space (a portal), so it can be on a head, float, or
// fly between heads. On the holder it follows their filtered head exactly;
// loose, it floats above the players (pulsing with the countdown); when it
// changes place it flies there in an arc (strict ease-out). Close to being
// stolen it shakes; on the winner it grows. With one person in, a wordless
// 👥 floats beside it: bring a friend.
import { useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Quaternion,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Group,
} from "three";

import { live } from "./live";
import { Part } from "./Part";
import { CROWN_PART, FRAME } from "./props";
import { useCrown } from "./state";

const FLIGHT = {
  /** Seconds to fly to a new place. */
  time: 0.45,
  /** How high the arc goes (cm). */
  arc: 14,
  /** How far above the heads it floats when loose (cm). */
  hover: 12,
};
/** The winner's crown grows by this much. */
const WIN_GROW = 1.25;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

const UP = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);

const friendSign = () => {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = "rgba(35, 37, 40, 0.64)";
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
  g.fill();
  g.font = `64px system-ui, -apple-system, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("👥", s / 2, s / 2 + 4);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

export const CrownFlight = () => {
  const scene = useThree((s) => s.scene);
  const { holder, phase, winner } = useCrown();
  const group = useRef<Group>(null);
  const pose = useRef({
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: 1,
  });
  const from = useRef({
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: 1,
    t: -Infinity,
  });
  const mode = useRef("hidden");
  const grow = useRef(1);
  const tmp = useMemo(
    () => ({
      target: new Vector3(),
      q: new Quaternion(),
      wobble: new Quaternion(),
      side: new Vector3(),
    }),
    [],
  );
  const sign = useMemo(() => {
    const sp = new Sprite(
      new SpriteMaterial({
        map: friendSign(),
        depthTest: false,
        transparent: true,
      }),
    );
    sp.renderOrder = 20;
    sp.visible = false;
    return sp;
  }, []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() / 1000;
    const [a, b] = live.players;
    const here = [a.present && a.head, b.present && b.head] as const;
    const anyone = here[0] || here[1];

    // Where it should be.
    let m: string;
    let targetScale = 1;
    const q = tmp.q.identity();
    const { target } = tmp;
    const seat = holder >= 0 ? here[holder] : null;
    if (!anyone) m = "hidden";
    else if (seat) {
      m = `seat-${holder}`;
      target.copy(seat.position);
      q.copy(seat.quaternion);
      targetScale = seat.scale.x;
    } else {
      m = "float";
      const heads = here.filter((h): h is Group => !!h);
      target.set(0, 0, 0);
      targetScale = 0;
      heads.forEach((h) => {
        target.add(h.position);
        targetScale += h.scale.x;
      });
      target.divideScalar(heads.length);
      targetScale /= heads.length;
      target.addScaledVector(UP, FLIGHT.hover * targetScale);
      // Floating: upright, turning slowly, bobbing.
      q.setFromAxisAngle(UP, Math.sin(state.clock.elapsedTime * 0.8) * 0.5);
      target.addScaledVector(
        UP,
        Math.sin(state.clock.elapsedTime * 2.2) * 0.8 * targetScale,
      );
    }

    g.visible = m !== "hidden";
    sign.visible = false;
    if (m === "hidden") {
      mode.current = m;
      return;
    }
    const p = pose.current;
    if (m !== mode.current) {
      // A new place: fly there from where it is (straight in if it was gone).
      if (mode.current === "hidden") {
        p.position.copy(target);
        p.quaternion.copy(q);
        p.scale = targetScale;
      }
      from.current.position.copy(p.position);
      from.current.quaternion.copy(p.quaternion);
      from.current.scale = p.scale;
      from.current.t = t;
      mode.current = m;
    }
    const k = Math.min(1, (t - from.current.t) / FLIGHT.time);
    if (k < 1) {
      const e = easeOut(k);
      p.position.lerpVectors(from.current.position, target, e);
      p.position.addScaledVector(
        UP,
        Math.sin(Math.PI * e) * FLIGHT.arc * targetScale,
      );
      p.quaternion.slerpQuaternions(from.current.quaternion, q, e);
      p.scale = from.current.scale + (targetScale - from.current.scale) * e;
    } else {
      p.position.copy(target);
      p.quaternion.copy(q);
      p.scale = targetScale;
    }

    // The winner's crown grows; the countdown makes a loose one pulse.
    const growTo = phase === "won" && winner >= 0 && seat ? WIN_GROW : 1;
    grow.current += (growTo - grow.current) * 0.12;
    let pulse = 1;
    if (phase === "countdown" && m === "float") {
      const s = (t - live.duel.since) % 1;
      pulse = 1 + 0.12 * (1 - easeOut(Math.min(1, s / 0.35)));
    }

    g.position.copy(p.position);
    g.quaternion.copy(p.quaternion);
    // About to be stolen: it shakes, harder the closer it is.
    if (seat && live.charge > 0) {
      tmp.wobble.setFromAxisAngle(Z, Math.sin(t * 26) * 0.14 * live.charge);
      g.quaternion.multiply(tmp.wobble);
    }
    g.scale.setScalar(p.scale * grow.current * pulse);

    // One person in, nobody to play with: 👥 beside the floating crown.
    if (phase === "waiting" && m === "float" && !(here[0] && here[1])) {
      sign.visible = true;
      sign.position
        .copy(p.position)
        .add(tmp.side.set(15 * p.scale, 2 * p.scale, 0));
      sign.scale.setScalar(8 * p.scale);
    }
  });

  return createPortal(
    <>
      <group ref={group} visible={false}>
        <group scale={FRAME.scale} position={FRAME.position}>
          <Part part={CROWN_PART} />
        </group>
      </group>
      <primitive object={sign} />
    </>,
    scene,
  );
};
