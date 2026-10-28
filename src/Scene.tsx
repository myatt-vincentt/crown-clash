// Scene.tsx — Crown Clash: two players, one crown. Out-smile or out-gape
// whoever wears it to steal it; whoever wears it when time runs out wins,
// and the other gets the jester hat. See PLAN.md.
import { lazy, Suspense } from "react";

import { CrownScene } from "./crown/CrownScene";

// Dev-only helpers for previewing without a camera. Lazy and behind a
// constant esbuild folds to false in production. Two rules:
// `process.env.NODE_ENV`, not `import.meta.env.DEV` (vincentt-xr/v2-template#112);
// and write the check INSIDE the ternary — hoisted into a `const`, esbuild
// keeps the dead branch.
const DevMediaSwitcher =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./DevMediaSwitcher"))
    : null;
const DevKeys =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./crown/DevKeys"))
    : null;

export const Scene = () => (
  <>
    <CrownScene />
    {DevMediaSwitcher && DevKeys ? (
      <Suspense fallback={null}>
        <DevMediaSwitcher />
        <DevKeys />
      </Suspense>
    ) : null}
  </>
);
