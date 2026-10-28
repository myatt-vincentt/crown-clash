import { describe, expect, it } from "vitest";

import { assign, REMEMBER, type Track } from "./players";

const none: Track = { at: null, seen: -Infinity };
const at = (x: number, y = 0, seen = 0): Track => ({ at: { x, y }, seen });

describe("who is who", () => {
  it("two new faces: the left one is player 0", () => {
    expect(
      assign(
        [
          { x: 0.5, y: 0 },
          { x: -0.5, y: 0 },
        ],
        [none, none],
        0,
      ),
    ).toEqual([1, 0]);
  });
  it("slots swapping doesn't swap the players", () => {
    const players: [Track, Track] = [at(-0.5), at(0.5)];
    expect(
      assign(
        [
          { x: -0.48, y: 0 },
          { x: 0.52, y: 0 },
        ],
        players,
        0.1,
      ),
    ).toEqual([0, 1]);
    expect(
      assign(
        [
          { x: 0.52, y: 0 },
          { x: -0.48, y: 0 },
        ],
        players,
        0.1,
      ),
    ).toEqual([1, 0]);
  });
  it("players who cross over keep who they are", () => {
    // Close together, mid-cross: nearest last position wins.
    const players: [Track, Track] = [at(0.05), at(-0.05)];
    expect(
      assign(
        [
          { x: 0.07, y: 0 },
          { x: -0.07, y: 0 },
        ],
        players,
        0.1,
      ),
    ).toEqual([0, 1]);
  });
  it("one face, both known: the nearest player", () => {
    expect(assign([null, { x: 0.45, y: 0 }], [at(-0.5), at(0.5)], 0.1)).toEqual(
      [-1, 1],
    );
  });
  it("one player around and a newcomer on the other side", () => {
    expect(assign([{ x: 0.6, y: 0 }], [at(-0.5), none], 0.1)).toEqual([1]);
  });
  it("one player around moving a little stays them", () => {
    expect(assign([{ x: -0.3, y: 0 }], [at(-0.5), none], 0.1)).toEqual([0]);
  });
  it("forgets a player after a while", () => {
    expect(
      assign([{ x: 0.5, y: 0 }], [at(0.5, 0, 0), none], REMEMBER + 0.1),
    ).toEqual([1]);
    expect(
      assign([{ x: -0.5, y: 0 }], [none, at(-0.5, 0, 0)], REMEMBER + 0.1),
    ).toEqual([0]);
  });
  it("never two faces for one player", () => {
    const r = assign(
      [
        { x: 0, y: 0 },
        { x: 0.01, y: 0 },
      ],
      [at(0), none],
      0.1,
    );
    expect(new Set(r).size).toBe(2);
  });
  it("no fresh faces, no one", () => {
    expect(assign([null, null], [at(0), at(1)], 0)).toEqual([-1, -1]);
  });
});
