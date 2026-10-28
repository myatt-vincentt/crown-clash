// The round as the scene shows it: the phase, who wears the crown, who the
// jester hat, the winner. One small store for the scene, the game loop and
// the dev keys (the per-frame duel is in live.duel).
import { useSyncExternalStore } from "react";

import type { Phase } from "./rules";

export type CrownState = {
  phase: Phase;
  /** The player wearing the crown (0 / 1), −1 = it's loose. */
  holder: number;
  /** The player in the jester hat (after a round), −1 = nobody. */
  jester: number;
  /** The last round's winner (−1 = nobody). */
  winner: number;
  /** Bumps on every win (the confetti plays once per win). */
  wins: number;
};

let current: CrownState = {
  phase: "waiting",
  holder: -1,
  jester: -1,
  winner: -1,
  wins: 0,
};
const listeners = new Set<() => void>();

const set = (next: CrownState) => {
  current = next;
  listeners.forEach((l) => l());
};

export const getCrown = () => current;

export const useCrown = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getCrown,
    getCrown,
  );

export const crownActions = {
  phase(phase: Phase) {
    if (phase !== current.phase) set({ ...current, phase });
  },
  /** The crown goes to player `p` (−1 = loose). */
  give(p: number) {
    if (p !== current.holder) set({ ...current, holder: p });
  },
  /** The jester hat goes to player `p` (−1 = off). */
  jester(p: number) {
    if (p !== current.jester) set({ ...current, jester: p });
  },
  /** The round's over: `p` won (−1 = nobody held it). */
  win(p: number) {
    set({
      ...current,
      phase: "won",
      winner: p,
      jester: p >= 0 ? 1 - p : -1,
      wins: current.wins + 1,
    });
  },
};
