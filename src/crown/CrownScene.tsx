// The two players' heads (PlayerHeads.tsx) with the jester hat on the
// loser; the crown in world space (CrownFlight.tsx); the duel (Game.tsx,
// Expressions.tsx); the timer line (TimerBar.tsx) and the winner's confetti
// (Confetti.tsx). The models are in metres in the Spark AR face frame;
// FRAME turns them into canonical centimetres.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
// eslint-disable-next-line import/extensions
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { Confetti } from "./Confetti";
import { CrownFlight } from "./CrownFlight";
import { Expressions } from "./Expressions";
import { Game } from "./Game";
import { Part } from "./Part";
import { PlayerHeads } from "./PlayerHeads";
import { FRAME, JESTER_PART } from "./props";
import { useCrown } from "./state";
import { TimerBar } from "./TimerBar";

/** Soft studio reflections, so the gold and gems read on camera. */
const useStudioLight = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const before = scene.environment;
    scene.environment = tex;
    return () => {
      scene.environment = before;
      tex.dispose();
    };
  }, [gl, scene]);
};

export const CrownScene = () => {
  const { jester } = useCrown();
  useStudioLight();
  return (
    <>
      <PlayerHeads>
        {(p) => (
          <group scale={FRAME.scale} position={FRAME.position}>
            {jester === p ? <Part key="jester" part={JESTER_PART} /> : null}
          </group>
        )}
      </PlayerHeads>
      <Expressions />
      <Game />
      <CrownFlight />
      <Confetti />
      <TimerBar />
    </>
  );
};
