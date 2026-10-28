// The only thing on the screen: a thin glowing line along the top. During
// the countdown it fills up, a beat per second; during the round it shrinks
// toward the middle, and in the last five seconds it turns hot and pulses.
// Hidden while waiting and after a round.
import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

import { live } from "./live";
import { RULES } from "./rules";

const CSS = `
.cc-timer { position: absolute; left: 0; right: 0; top: env(safe-area-inset-top); height: 14px;
  display: flex; justify-content: center; pointer-events: none; }
.cc-bar { height: 4px; margin-top: 6px; border-radius: 2px; width: 0;
  background: #f4d968; box-shadow: 0 0 10px rgba(244, 217, 104, .8), 0 0 2px rgba(0, 0, 0, .35); }
`;

const HOT = 5; // s

export const TimerBar = () => {
  const bar = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const el = bar.current;
    if (!el) return;
    const d = live.duel;
    const t = performance.now() / 1000;
    let share = 0;
    let color = "#f4d968";
    let opacity = 1;
    if (d.phase === "countdown") {
      const s = t - d.since;
      share = Math.min(1, s / RULES.countdown);
      // A beat each second.
      opacity = 0.55 + 0.45 * (1 - (s % 1));
    } else if (d.phase === "playing") {
      const left = Math.max(0, RULES.round - (t - d.since));
      share = left / RULES.round;
      if (left < HOT) {
        color = "#ff8a4c";
        opacity = 0.6 + 0.4 * Math.abs(Math.cos(t * Math.PI * 2));
      }
    }
    el.style.width = `${(share * 100).toFixed(2)}%`;
    el.style.background = color;
    el.style.opacity = share > 0 ? String(opacity) : "0";
  });
  return (
    <Html fullscreen zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <style>{CSS}</style>
      <div className="cc-timer" aria-hidden="true">
        <div ref={bar} className="cc-bar" />
      </div>
    </Html>
  );
};
