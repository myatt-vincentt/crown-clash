// The duel, every frame (rules in rules.ts): who's in, each player's power,
// then the store updated on what happened (a countdown, the go, the crown
// taken, the win).
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { live } from "./live";
import { duelState, stepDuel } from "./rules";
import { crownActions } from "./state";

export const Game = () => {
  const duel = useRef(duelState());
  useFrame(() => {
    const t = performance.now() / 1000;
    const present: [boolean, boolean] = [
      live.players[0].present,
      live.players[1].present,
    ];
    const power: [number, number] = [0, 0];
    live.slotPlayer.forEach((p, slot) => {
      if (p >= 0) power[p] = Math.max(power[p], live.slotPower[slot]);
    });
    const {
      duel: d,
      event,
      charge,
    } = stepDuel(duel.current, t, present, live.powerOverride ?? power);
    duel.current = d;
    live.duel = d;
    live.charge = charge;
    if (!event) return;
    if (event === "countdown") {
      crownActions.give(-1);
      crownActions.jester(-1);
      crownActions.phase("countdown");
    } else if (event === "go") crownActions.phase("playing");
    else if (event === "take") crownActions.give(d.holder);
    else if (event === "win") crownActions.win(d.winner);
    else if (event === "wait") {
      crownActions.give(-1);
      crownActions.phase("waiting");
    }
  });
  return null;
};
