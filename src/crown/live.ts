// Live per-frame values shared without re-renders: the players' heads
// (PlayerHeads), each face slot's power (Expressions) and the duel (Game).
import type { Group } from "three";

import { duelState, type Duel } from "./rules";

export type PlayerLive = {
  /** Their face is in. */
  present: boolean;
  /** Their filtered head group (canonical cm inside). */
  head: Group | null;
};

export const live = {
  players: [
    { present: false, head: null },
    { present: false, head: null },
  ] as [PlayerLive, PlayerLive],
  /** Which player each face slot belongs to now (−1 = none yet). */
  slotPlayer: [-1, -1],
  /** Each face slot's power: smile or open mouth, the bigger (0–1). */
  slotPower: [0, 0],
  /** The duel right now (Game). */
  duel: duelState() as Duel,
  /** How close the challenger is to taking the crown (0–1). */
  charge: 0,
  /** Dev only: stands in for the players' power. */
  powerOverride: null as [number, number] | null,
};
