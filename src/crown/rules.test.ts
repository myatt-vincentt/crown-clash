import { describe, expect, it } from "vitest";

import {
  RULES,
  duelState,
  heaviness,
  powerOf,
  stepDuel,
  timeLeft,
  type Duel,
  type DuelEvent,
} from "./rules";

type Input = { present?: [boolean, boolean]; power?: [number, number] };

/** Run `input(t)` at 30 fps for `seconds` from `start`; events with times. */
const run = (
  seconds: number,
  input: (t: number) => Input,
  start: Duel = duelState(),
  from = 0,
) => {
  let d = start;
  const events: [number, DuelEvent, number][] = [];
  for (let i = 1; i <= seconds * 30; i += 1) {
    const t = from + i / 30;
    const { present = [true, true], power = [0, 0] } = input(t);
    const r = stepDuel(d, t, present, power);
    d = r.duel;
    if (r.event) events.push([+t.toFixed(2), r.event, d.holder]);
  }
  return { duel: d, events };
};

/** A duel that has just started playing (both in, countdown done). */
const playing = () => run(RULES.countdown + 0.1, () => ({})).duel;
const T0 = RULES.countdown + 0.1;

describe("the round", () => {
  it("waits for two faces, counts down, plays, crowns the holder", () => {
    const { events } = run(30, (t) => ({
      present: t < 1 ? [true, false] : [true, true],
      power: t > 6 && t < 7 ? [0.8, 0] : [0, 0],
    }));
    expect(events.slice(0, 4).map((e) => e[1])).toEqual([
      "countdown",
      "go",
      "take",
      "win",
    ]);
    expect(events[1][0]).toBeCloseTo(1 + RULES.countdown, 1);
    expect(events[3][0]).toBeCloseTo(1 + RULES.countdown + RULES.round, 1);
    expect(events[3][2]).toBe(0);
  });
  it("one face only: it keeps waiting", () => {
    expect(run(10, () => ({ present: [true, false] })).events).toEqual([]);
  });
  it("someone leaving during the countdown stops it", () => {
    const { events } = run(4, (t) => ({
      present: t > 1.5 && t < 2 ? [true, false] : [true, true],
    }));
    expect(events.map((e) => e[1])).toEqual(["countdown", "wait", "countdown"]);
  });
  it("after the celebration, the next countdown", () => {
    const { events } = run(
      RULES.round + RULES.celebrate + 1,
      () => ({}),
      playing(),
      T0,
    );
    expect(events.map((e) => e[1])).toEqual(["win", "countdown"]);
  });
  it("nobody took it: no winner", () => {
    const { duel } = run(RULES.round + 0.1, () => ({}), playing(), T0);
    expect(duel.phase).toBe("won");
    expect(duel.winner).toBe(-1);
  });
  it("time left runs down during play only", () => {
    const d = playing();
    expect(timeLeft(d, d.since + 5)).toBeCloseTo(RULES.round - 5, 5);
    expect(timeLeft(duelState(), 3)).toBe(0);
  });
});

describe("stealing", () => {
  const holding = (p: number) =>
    run(1, () => ({ power: p ? [0, 0.8] : [0.8, 0] }), playing(), T0).duel;
  const from = T0 + 1;

  it("the first to show power takes the loose crown", () => {
    expect(holding(1).holder).toBe(1);
  });
  it("a bigger expression, held, steals it", () => {
    const { events } = run(2, () => ({ power: [0.4, 0.75] }), holding(0), from);
    expect(events.map((e) => [e[1], e[2]])).toEqual([["take", 1]]);
  });
  it("a flash isn't enough", () => {
    const { events } = run(
      2,
      (t) => ({ power: t - from < 0.3 ? [0.4, 0.8] : [0.4, 0.2] }),
      holding(0),
      from,
    );
    expect(events).toEqual([]);
  });
  it("just as big isn't enough at first: it must be clearly bigger", () => {
    const { events } = run(
      0.9,
      () => ({ power: [0.6, 0.65] }),
      holding(0),
      from,
    );
    expect(events).toEqual([]);
  });
  it("the crown gets heavy: two flat-out grins keep it moving", () => {
    const { events } = run(
      15,
      () => ({ power: [0.95, 0.95] }),
      holding(0),
      from,
    );
    const takes = events.filter((e) => e[1] === "take");
    expect(takes.length).toBeGreaterThanOrEqual(3);
    // It alternates.
    takes.forEach((e, i) => expect(e[2]).toBe(i % 2 ? 0 : 1));
  });
  it("heaviness grows with time worn, up to a limit", () => {
    expect(heaviness(0)).toBe(0);
    expect(heaviness(2)).toBeGreaterThan(heaviness(1));
    expect(heaviness(100)).toBe(RULES.steal.maxWeight);
  });
  it("with both showing power, the bigger takes the loose crown", () => {
    const { duel } = run(1, () => ({ power: [0.9, 0.92] }), playing(), T0);
    expect(duel.holder).toBe(1);
  });
  it("too small to count, even against a blank face", () => {
    const { events } = run(2, () => ({ power: [0, 0.2] }), holding(0), from);
    expect(events).toEqual([]);
  });
  it("the crown can't bounce straight back", () => {
    const { events } = run(
      3,
      // Player 1 steals; at once player 0 goes all out to take it back.
      (t) => ({ power: t - from < 1 ? [0.2, 0.9] : [0.9, 0.2] }),
      holding(0),
      from,
    );
    const takes = events.filter((e) => e[1] === "take");
    expect(takes.length).toBe(2);
    expect(takes[1][0] - takes[0][0]).toBeGreaterThanOrEqual(
      RULES.steal.cooldown - 1e-6,
    );
  });
  it("a holder whose face is gone is easy to steal from", () => {
    const { events } = run(
      2,
      () => ({ present: [false, true], power: [0.9, 0.5] }),
      holding(0),
      from,
    );
    expect(events.map((e) => e[2])).toEqual([1]);
  });
});

describe("power", () => {
  it("the bigger of smile and open mouth", () => {
    expect(powerOf({ mouthSmileLeft: 0.8, mouthSmileRight: 0.6 })).toBeCloseTo(
      0.7,
    );
    expect(powerOf({ jawOpen: 0.5, mouthSmileLeft: 0.2 })).toBeCloseTo(0.675);
    expect(powerOf({ jawOpen: 1 })).toBe(1);
  });
});
