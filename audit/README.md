# Look and round checks

Dev tooling, not part of the app. Headless Chrome (GPU on) against the running dev server
(`PORT=5195 pnpm dev`) with a fake webcam fed from a `.y4m` clip; reads the dev-only
`window.__crown` (`src/crown/DevKeys.tsx`). Needs `@playwright/test` and Chrome:
`PLAYWRIGHT_FROM=<folder whose node_modules has it>`.

- `looks.cjs <out-dir> <clip.y4m> <x,y,w,h> <holder,jester> …` — crown / jester set-ups, one row.
- `round.cjs <out-dir> <clip.y4m> <seconds> [every-ms]` — a round: logs every phase change and
  steal with each player's power, and screenshots it. `POWER=a,b` stands in for the players'
  expressions; `SKIP=<s>` starts the screenshots later.

Clips (not committed): `ffmpeg -i in.mp4 -t 10 -r 30 -vf "scale=540:960,format=yuv420p" out.y4m`,
from the SDK's `two_people_smiling.mp4` (`cdn.vincentt.studio/assets/sdk/debug-ui/v1/videos/`).
