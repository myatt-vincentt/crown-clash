// Look check: on a clip with two people, a few crown / jester set-ups, one
// row. Each set-up is "holder,jester" (−1 = nobody), e.g. 0,-1 1,0.
//   PLAYWRIGHT_FROM=<folder with @playwright/test> node audit/looks.cjs <out-dir> <clip.y4m> <x,y,w,h> <setup> …
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require(
  require.resolve("@playwright/test", {
    paths: [process.env.PLAYWRIGHT_FROM || __dirname],
  }),
);

const [out, clip, box, ...setups] = process.argv.slice(2);
const [x, y, width, height] = box.split(",").map(Number);
const BASE = `http://localhost:${process.env.PORT || 5195}`;
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    args: [
      "--use-angle=metal",
      "--enable-gpu",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${clip}`,
    ],
  });
  const page = await (
    await browser.newContext({
      viewport: { width: 540, height: 960 },
      permissions: ["camera"],
    })
  ).newPage();
  await page.goto(`${BASE}/?input=webcam${process.env.Q || ""}`);
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.experience === "ready" && window.__crown,
    null,
    { timeout: 120000 },
  );
  const files = [];
  for (const [k, s] of setups.entries()) {
    const [holder, jester] = s.split(",").map(Number);
    await page.evaluate(
      ([h, j]) => {
        window.__crown.actions.give(h);
        window.__crown.actions.jester(j);
      },
      [holder, jester],
    );
    await page.waitForTimeout(k === 0 ? 5000 : 1500);
    const f = path.join(out, `${k}.png`);
    await page.screenshot({ path: f, clip: { x, y, width, height } });
    files.push(f);
  }
  const players = await page.evaluate(() =>
    window.__crown.live.players.map((p) => p.present),
  );
  console.log("present", JSON.stringify(players));
  await browser.close();
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex",
    files.length > 1 ? `hstack=inputs=${files.length}` : "null",
    path.join(out, "sheet.png"),
  ]);
  console.log("sheet", path.join(out, "sheet.png"));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
