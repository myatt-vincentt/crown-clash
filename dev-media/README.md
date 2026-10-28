# dev-media

Optional dev-only preview media. Nothing here ships: only
`src/DevMediaSwitcher.tsx` reads this folder, and it is stripped from
production builds.

You don't need anything here. Without a webcam, `pnpm dev` starts on the SDK's
built-in "Person Shaking Head" video and lists every SDK sample video and
image (pick "Two People Smiling" to play). In development,
`window.__crown.live.powerOverride = [a, b]` stands in for the two players'
expressions (0–1).

To preview with your own clip, add a video of two people at
`dev-media/crown.mp4` (H.264 MP4); it is listed first and used as the start.
Clips here are git-ignored. Restart `pnpm dev` after adding or removing one.
