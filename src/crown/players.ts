// Who is who. The face model reports up to two faces per frame in slots
// that can swap (a face lost and found again comes back in any slot), so a
// player isn't a slot: each fresh face goes to the player whose head was
// nearest last time. Players start as "left" and "right" of the screen.
// Pure (no React, no three), tested in players.test.ts.

export type Point = { x: number; y: number };

export type Track = {
  /** Where this player's head was last seen (world units), or null. */
  at: Point | null;
  /** When (s). */
  seen: number;
};

/** Seconds a player is remembered after their face goes. */
export const REMEMBER = 1.5;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The player (0 = first seen on the screen's left, 1 = right) for each
 * fresh face (null = no fresh face in that slot): −1 for a slot without
 * one. Never gives two faces the same player.
 */
export const assign = (
  faces: readonly (Point | null)[],
  players: readonly [Track, Track],
  t: number,
): number[] => {
  const out = faces.map(() => -1);
  const fresh = faces
    .map((p, slot) => (p ? { p, slot } : null))
    .filter((f): f is { p: Point; slot: number } => !!f);
  if (!fresh.length) return out;
  const known = players.map((pl) =>
    pl.at && t - pl.seen < REMEMBER ? pl.at : null,
  );

  // By side of the screen, for players not seen lately.
  const bySide = (x: number) => (x < 0 ? 0 : 1);

  if (fresh.length >= 2) {
    const [a, b] = fresh;
    let aFirst: boolean;
    if (known[0] && known[1])
      aFirst =
        dist(a.p, known[0]) + dist(b.p, known[1]) <=
        dist(a.p, known[1]) + dist(b.p, known[0]);
    else if (known[0]) aFirst = dist(a.p, known[0]) <= dist(b.p, known[0]);
    else if (known[1]) aFirst = dist(a.p, known[1]) > dist(b.p, known[1]);
    else aFirst = a.p.x <= b.p.x;
    out[a.slot] = aFirst ? 0 : 1;
    out[b.slot] = aFirst ? 1 : 0;
    return out;
  }

  const [f] = fresh;
  if (known[0] && known[1])
    out[f.slot] = dist(f.p, known[0]) <= dist(f.p, known[1]) ? 0 : 1;
  else if (known[0] || known[1]) {
    // One player around: it's them, unless it's clearly someone new on the
    // other side of the screen.
    const k = known[0] ? 0 : 1;
    const other = 1 - k;
    const kAt = known[k] as Point;
    const newcomer =
      bySide(f.p.x) === other && bySide(kAt.x) === k && dist(f.p, kAt) > 0.6;
    out[f.slot] = newcomer ? other : k;
  } else out[f.slot] = bySide(f.p.x);
  return out;
};
