// A round on a clip: logs every phase change and steal with its time and
// each player's power, and screenshots every `every` ms.
//   PLAYWRIGHT_FROM=<folder with @playwright/test> node audit/round.cjs <out-dir> <clip.y4m> <seconds> [every-ms]
// POWER="a,b" in the environment stands in for the players' expressions;
// SKIP=<s> starts the screenshots later.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require(
  require.resolve("@playwright/test", {
    paths: [process.env.PLAYWRIGHT_FROM || __dirname],
  }),
);

const [out, clip, seconds, every = "2000"] = process.argv.slice(2);
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
  await page.goto(`${BASE}/?input=webcam`);
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.experience === "ready" && window.__crown,
    null,
    { timeout: 120000 },
  );
  if (process.env.POWER)
    await page.evaluate((p) => {
      window.__crown.live.powerOverride = p;
    }, process.env.POWER.split(",").map(Number));
  // Log phase / holder changes from inside the page.
  await page.evaluate(() => {
    const L = window.__crown.live;
    const log = [];
    window.__log = log;
    const t0 = performance.now();
    let last = "";
    const tick = () => {
      const d = L.duel;
      const key = `${d.phase}/${d.holder}`;
      if (key !== last) {
        const pw = L.slotPower.map((v) => v.toFixed(2)).join(",");
        log.push(
          `${((performance.now() - t0) / 1000).toFixed(1)}s ${d.phase} holder=${d.holder} winner=${d.winner} slotPower=${pw} slots→${L.slotPlayer.join(",")}`,
        );
        last = key;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
  // SKIP=<seconds>: start the screenshots that long after the page is ready.
  await page.waitForTimeout(Number(process.env.SKIP || 0) * 1000);
  const files = [];
  const t0 = Date.now();
  let k = 0;
  while (Date.now() - t0 < Number(seconds) * 1000) {
    const f = path.join(out, `${k}.png`);
    await page.screenshot({ path: f });
    files.push(f);
    k += 1;
    await page.waitForTimeout(Number(every));
  }
  console.log((await page.evaluate(() => window.__log)).join("\n"));
  await browser.close();
  const W = 216;
  const H = 384;
  const cols = Math.min(8, files.length);
  const layout = files
    .map((_, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`)
    .join("|");
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-y",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex",
    `${files.map((_, i) => `[${i}]scale=${W}:${H}[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black`,
    path.join(out, "sheet.png"),
  ]);
  console.log("sheet", path.join(out, "sheet.png"));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
