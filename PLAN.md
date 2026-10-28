# Plan — Crown Clash

Two players fight for one crown. Built on SDK 2.0.0-alpha.9 with the vincentt.studio royal crown
and jester hat; the head pipeline is shared with the other head templates. The Notion brief called
it "Pass the Crown".

## Decisions (from the creator)

- Steal by out-doing the holder: a bigger smile or open mouth, whichever is bigger.
- Whoever wears the crown when the time runs out wins. 20-second rounds.
- Rounds start by themselves when two faces are in (a 3 s countdown); a new round follows each win.
- One face only: the crown floats above them with a wordless 👥.
- The time is a thin line along the top of the screen (no other overlay).
- The winner's crown grows with confetti; the other player gets the jester hat until the next
  round. The jester hat sits 1.5 cm higher and 12 % bigger than authored.

## How it works

- `PlayerHeads.tsx` + `players.ts` (tested): two `FaceTracker`s (`numFaces` 2, `faceIndex` 0 / 1)
  read each slot's raw canonical head fit; each fresh fit goes to the player whose head was nearest
  (the first two are the screen's left and right), and only then through that player's
  `HeadFilter`. Each player's group (a portal) holds the depth-only v3 head occluder and their
  jester hat; the SDK's `NeckOccluder` sits in each tracker.
- `Expressions.tsx`: each slot's blendshapes → power (`rules.powerOf`: the bigger of the smile and
  the open jaw, the jaw scaled ×1.35), eased.
- `rules.ts` (tested): waiting → countdown (3 s) → playing (20 s) → won (4 s) → countdown. Loose,
  the crown goes to the bigger power of at least 0.3 held 0.5 s. A steal needs the challenger above
  the holder's power × (1 − heaviness) + 0.12 for 0.5 s, then 0.8 s before it can move again.
  Heaviness grows 0.07 per second worn, up to 0.35.
- `Game.tsx`: steps the duel each frame and updates the store on what happened.
- `CrownFlight.tsx`: the crown in world space: on the holder's head, floating above the players
  (pulsing with the countdown), flying between places in an arc (0.45 s, strict ease-out), shaking
  as it's about to be stolen, growing on the winner; the 👥 sign beside it when one face is in.
- `TimerBar.tsx`: the thin top line (fills during the countdown, drains during the round, hot in the
  last 5 s). `Confetti.tsx`: the winner's confetti, instanced, in world space.
- Dev only: `DevKeys.tsx` (`window.__crown`, `live.powerOverride`), `DevMediaSwitcher.tsx`, `?occ`.
- Checks: `audit/looks.cjs` (crown / jester set-ups on a clip), `audit/round.cjs` (a round with
  its log and screenshots).

## Known limits

- MediaPipe's smile saturates near 0.9 for big grins; the heavy crown keeps rounds moving, but the
  steal margin and weight need a check with two real players.
- A face turned to full profile drops out; whatever it wears hides until it's back.
