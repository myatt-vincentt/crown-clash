// The duel's rules. Pure (no React, no three), so they're tested on their
// own (rules.test.ts).
//
// Waiting → (two faces) countdown → (3 s) playing → (20 s) won → (a few
// seconds) countdown again. While playing, each player's power is their
// bigger reading, smile or open mouth (0–1). The crown starts loose: the
// first to show some power (the bigger, if both do), held a moment, takes
// it. After that the other player steals it by beating the holder's power by
// a margin, held for half a second. The crown gets heavy: the longer you
// wear it, the less your power counts (two players grinning flat out would
// otherwise be stuck), so it keeps moving. Whoever wears it when the time
// runs out wins.

export const RULES = {
  /** Seconds of play. */
  round: 20,
  /** Seconds of countdown before a round. */
  countdown: 3,
  /** Seconds the winner is celebrated before the next countdown. */
  celebrate: 4,
  steal: {
    /** Seconds the challenger must hold the lead. */
    hold: 0.5,
    /** How much bigger than the holder's power (0–1). */
    margin: 0.12,
    /** The least power that counts as trying. */
    min: 0.3,
    /** Seconds after a steal before the crown can move again. */
    cooldown: 0.8,
    /** The crown gets heavy: the holder's power counts this much less per second worn… */
    weight: 0.07,
    /** …up to this much less. */
    maxWeight: 0.35,
  },
};

export type Phase = "waiting" | "countdown" | "playing" | "won";

export type Duel = {
  phase: Phase;
  /** When this phase began (s). */
  since: number;
  /** Who wears the crown (0 / 1), −1 = it's loose. */
  holder: number;
  /** Who is trying to take it and since when (−1 = nobody). */
  challenger: number;
  challengeSince: number;
  /** When the crown last moved (s). */
  lastMove: number;
  /** The last round's winner (−1 = nobody). */
  winner: number;
};

export type DuelEvent = "countdown" | "go" | "take" | "win" | "wait";

export const duelState = (): Duel => ({
  phase: "waiting",
  since: 0,
  holder: -1,
  challenger: -1,
  challengeSince: 0,
  lastMove: -Infinity,
  winner: -1,
});

/** A player's power: the bigger of smile and open mouth (0–1). */
export const powerOf = (b: Readonly<Record<string, number | undefined>>) => {
  const smile = ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2;
  // A wide-open jaw reads lower than a full smile; scale it to match.
  const mouth = Math.min(1, (b.jawOpen ?? 0) * 1.35);
  return Math.max(smile, mouth);
};

/** How much less the holder's power counts after wearing it `worn` s. */
export const heaviness = (worn: number) =>
  Math.min(RULES.steal.maxWeight, RULES.steal.weight * Math.max(0, worn));

/** Who is going for the crown right now (−1 = nobody). */
const challengerOf = (
  d: Duel,
  t: number,
  present: readonly [boolean, boolean],
  power: readonly [number, number],
) => {
  const { margin, min, cooldown } = RULES.steal;
  if (t - d.lastMove < cooldown) return -1;
  const p = [present[0] ? power[0] : 0, present[1] ? power[1] : 0];
  if (d.holder < 0) {
    // Loose: whoever shows power (the bigger, if both do).
    if (p[0] >= min && p[1] >= min) {
      if (p[0] > p[1]) return 0;
      if (p[1] > p[0]) return 1;
      return -1;
    }
    if (p[0] >= min) return 0;
    if (p[1] >= min) return 1;
    return -1;
  }
  const c = 1 - d.holder;
  const held = heaviness(t - d.lastMove);
  return p[c] >= min && p[c] > p[d.holder] * (1 - held) + margin ? c : -1;
};

/**
 * One step. `present` says whose face is in; `power` is each player's
 * power. Returns the new duel, what happened (if anything), and how close
 * the challenger is to taking the crown (0–1).
 */
export const stepDuel = (
  prev: Duel,
  t: number,
  present: readonly [boolean, boolean],
  power: readonly [number, number],
): { duel: Duel; event: DuelEvent | null; charge: number } => {
  const d: Duel = { ...prev };
  const both = present[0] && present[1];

  if (d.phase === "waiting") {
    if (!both) return { duel: d, event: null, charge: 0 };
    return {
      duel: { ...d, phase: "countdown", since: t, holder: -1, challenger: -1 },
      event: "countdown",
      charge: 0,
    };
  }

  if (d.phase === "countdown") {
    if (!both)
      return {
        duel: { ...d, phase: "waiting", since: t },
        event: "wait",
        charge: 0,
      };
    if (t - d.since < RULES.countdown)
      return { duel: d, event: null, charge: 0 };
    return {
      duel: {
        ...d,
        phase: "playing",
        since: t,
        holder: -1,
        challenger: -1,
        lastMove: -Infinity,
      },
      event: "go",
      charge: 0,
    };
  }

  if (d.phase === "won") {
    if (t - d.since < RULES.celebrate)
      return { duel: d, event: null, charge: 0 };
    if (!both)
      return {
        duel: { ...d, phase: "waiting", since: t },
        event: "wait",
        charge: 0,
      };
    return {
      duel: { ...d, phase: "countdown", since: t, holder: -1, challenger: -1 },
      event: "countdown",
      charge: 0,
    };
  }

  // Playing.
  if (t - d.since >= RULES.round) {
    return {
      duel: { ...d, phase: "won", since: t, winner: d.holder, challenger: -1 },
      event: "win",
      charge: 0,
    };
  }
  const c = challengerOf(d, t, present, power);
  if (c !== d.challenger) {
    d.challenger = c;
    d.challengeSince = t;
  }
  if (c < 0) return { duel: d, event: null, charge: 0 };
  const charge = Math.min(1, (t - d.challengeSince) / RULES.steal.hold);
  if (charge < 1) return { duel: d, event: null, charge };
  return {
    duel: { ...d, holder: c, challenger: -1, lastMove: t },
    event: "take",
    charge: 0,
  };
};

/** Seconds left in the round (0 outside play). */
export const timeLeft = (d: Duel, t: number) =>
  d.phase === "playing" ? Math.max(0, RULES.round - (t - d.since)) : 0;
