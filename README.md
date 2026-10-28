# Crown Clash

Two players, one crown. Get two faces in the camera and a countdown starts; then out-smile or
out-gape whoever wears the crown to steal it. Whoever wears it when the time runs out wins: their
crown grows and confetti rains on them, and the other player gets the jester hat. A new round
starts by itself. With one face in, the crown floats over them with a 👥 sign: bring a friend.
The only thing on the screen is a thin timer line along the top.

- Your power is the bigger of your smile and your open mouth. To steal, beat the holder clearly
  and hold it for half a second (the crown shakes, then flies over). The crown gets heavy: the
  longer you wear it, the less your expression counts, so it keeps changing hands.
- Each player's head is the SDK's canonical head fit steadied by a speed-adaptive spring, with the
  head occluder in the same group. The face model's two slots can swap, so faces are matched to
  players by where their heads were (`src/crown/players.ts`), and players keep who they are.
- The rules (round, steals, the heavy crown) are in `src/crown/rules.ts`, tested on their own.
- Thumbnail: `public/images/crown-clash-thumbnail.jpg` (a steal and a win; the share image).
- Models: `public/models/vincentt-royal-crown.glb` and `vincentt-jester-hat.glb`; credits in
  `CREDITS.md`.
- Dev preview without a camera: the media switcher starts on `dev-media/crown.mp4` if you add one
  (two people), else the SDK's sample video; `window.__crown.live.powerOverride = [a, b]` stands in
  for the two players' expressions; `?occ` draws the occluders. How it works: `PLAN.md`.

---

# v2-template

The Vincentt starter app: a real React + R3F + Vincentt XR SDK (`@vincentt-xr/sdk`)
WebXR app, bundled by esbuild.

## Shape

```
src/
  main.tsx            mount — never edited
  App.tsx             protected shell: XRProvider + AspectRatioContainer +
                      XRScene + media-source binding, camera, lighting,
                      VideoBackground, PreviewAnchors — never edited
  Scene.tsx           the agent's surface: add SDK components and R3F
                      primitives here
  PreviewAnchors.tsx  editor-preview integration — never edited
```

See `AGENTS.md` and `GROUNDING.md` for the API reference and how to author scenes.

## Develop

```
pnpm install
pnpm dev          # esbuild dev server on localhost:5173 (output in .dev/)
pnpm preview      # on-device preview over a secure tunnel (needs `vincentt login`)
pnpm typecheck
pnpm build        # production bundle to dist/
```

## Release

`vincentt init` scaffolds from the **`latest` tag**, not from `main`. Merging to `main` does
not ship a template to creators — cutting a release does.

```
git tag 1.1.0 <sha>      # bare semver, no `v` prefix
git push origin 1.1.0    # the Release workflow verifies the tag, then moves `latest`
```

The Release workflow (`.github/workflows/release.yml`) installs from the frozen lockfile,
builds, and typechecks **the tagged tree** before force-updating `latest` to it. A tag that
fails leaves `latest` where it was, so a broken release cannot reach a new creator.

The job runs in the `release` environment, which accepts bare-semver tags only. To re-run it by
hand, dispatch it from the tag itself ("Use workflow from: 1.1.0"); a dispatch from `main` is
refused.

**Never move `latest` by hand.** It is force-updated by that workflow and nowhere else; moving
it manually decouples the pointer from the version it claims to be.

Creators can pin a specific version — `vincentt init --template 1.0.0` — which is the escape
hatch when a release turns out to be bad. That is why the version tags are immutable and only
`latest` moves.

### `MIGRATION.md` and the platform release row

Root `MIGRATION.md` carries one entry per released tag, newest first, authored in the same
PR as the change: `required: true|false`, a one-line summary, and optional notes bullets.
`required: false` means no consumer action is needed, never that the entry was skipped. The
Release workflow refuses to move `latest` for a tag with no valid entry, then — once `latest`
has moved — posts that entry as this release's row to the platform (`POST
/platform/releases`, component `template`), via `scripts/release-row.mjs`. Both steps read
`MIGRATION.md` from `main`, not from the tagged tree: the note is reviewed via PR into `main`
and is append-only per version, so `main`'s copy is the reviewed source for any tag, including
one cut before this file existed. That row is what `vincentt outdated` reads back to tell a
creator's agent what changed and what to do about it.
