/**
 * Mobile-emulation check: count Sequence*.mp4 requests after login.
 * Run: npx playwright test isn't needed — node with playwright.
 */
import { chromium, devices } from "playwright";

const BASE = process.env.CHECK_URL || "http://localhost:3000/HOK";
const WAIT_MS = Number(process.env.CHECK_WAIT_MS || 12000);

function summarize(entries) {
  const byUrl = new Map();
  for (const e of entries) {
    const key = e.url.split("?")[0];
    const name = key.split("/").pop();
    if (!byUrl.has(name)) byUrl.set(name, []);
    byUrl.get(name).push(e);
  }
  return byUrl;
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome", // system Chrome — no Playwright browser download
  });
  const iPhone = devices["iPhone 13"];
  // Landscape phone — clears rotate gate
  const context = await browser.newContext({
    ...iPhone,
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const mp4 = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!/\.mp4(\?|$)/i.test(url)) return;
    let bodyLen = 0;
    try {
      const buf = await res.body();
      bodyLen = buf?.length || 0;
    } catch {
      bodyLen = -1;
    }
    mp4.push({
      url,
      status: res.status(),
      bodyLen,
      fromCache: res.fromServiceWorker(),
      timing: Date.now(),
    });
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  // Force rotate-ok in case orientation media is flaky in headless
  await page.evaluate(() => {
    document.documentElement.classList.add("rotate-ok");
    document.body.classList.remove("rotate-prompt-open");
    window.dispatchEvent(new CustomEvent("oasis-rotate-gate", { detail: { ok: true } }));
  });
  await page.waitForTimeout(800);

  // Open login form if teaser mode
  const loginBtn = page.locator("button.login-teaser-btn");
  if (await loginBtn.count()) {
    await loginBtn.first().click({ force: true });
    await page.waitForTimeout(500);
  }

  const coupon = page.locator("#login-coupon");
  await coupon.waitFor({ state: "visible", timeout: 15000 });
  await coupon.fill("HOK-TEST");
  await page.locator("button.login-btn").click();

  // Welcome screen — clips should start here
  await page.waitForTimeout(WAIT_MS);

  const byUrl = summarize(mp4);
  const sequence = [...byUrl.entries()].filter(([n]) => /Sequence\d+/i.test(n));

  console.log("\n=== Mobile emulation MP4 check ===");
  console.log(`URL: ${BASE}`);
  console.log(`Viewport: 844x390 (iPhone landscape)`);
  console.log(`Total .mp4 responses: ${mp4.length}`);
  console.log(`Unique Sequence files: ${sequence.length}`);
  console.log("");

  let maxHits = 0;
  let heavyRedownloads = 0;
  for (const [name, list] of sequence.sort((a, b) => a[0].localeCompare(b[0]))) {
    maxHits = Math.max(maxHits, list.length);
    const statuses = list.map((e) => e.status).join(",");
    const sizes = list.map((e) => e.bodyLen).join(",");
    const heavy = list.filter((e) => e.bodyLen > 500_000).length;
    heavyRedownloads += heavy;
    console.log(`${name}: ${list.length}x  status=[${statuses}]  bodyBytes=[${sizes}]  fullDownloads>${500000}B: ${heavy}`);
  }

  console.log("\n--- Verdict ---");
  if (sequence.length === 0) {
    console.log("No Sequence*.mp4 seen (login/rotate gate may have blocked).");
  } else if (heavyRedownloads === 0) {
    console.log(
      `OK for speed: max ${maxHits} network lines per clip, but no full multi-MB re-downloads (bodies are tiny / cached).`
    );
  } else {
    console.log(
      `WARN: ${heavyRedownloads} full-sized re-downloads detected — that CAN slow mobile.`
    );
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
