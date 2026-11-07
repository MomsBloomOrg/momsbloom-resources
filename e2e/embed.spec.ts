import { expect, type Page, test } from "@playwright/test";
import { APP, HOST } from "./fixture";

const IFRAME = "iframe[data-momsbloom-embed]";

const iframeHeight = (page: Page) => page.locator(IFRAME).evaluate((el) => el.getBoundingClientRect().height);

/** The height of the measured root element inside the iframe. */
const contentHeight = (page: Page) =>
  page
    .frameLocator(IFRAME)
    .locator("#momsbloom-embed-root")
    .evaluate((el) => Math.ceil(el.getBoundingClientRect().height));

test("the embed script adds an iframe, and the iframe height matches its content", async ({ page }) => {
  await page.goto(HOST);
  await expect(page.locator(IFRAME)).toHaveAttribute("src", `${APP}/embed`);
  const frame = page.frameLocator(IFRAME);
  await expect(frame.getByRole("heading", { level: 1, name: "Postpartum Resources" })).toBeVisible();
  // The start height is 600 px. After the resize message, the iframe is exactly as tall as its content.
  await expect.poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page)))).toBeLessThan(2);
  expect(await iframeHeight(page)).not.toBe(600);
  // The host page's CSS (all links red) does not reach inside the iframe: links keep `primary-text`.
  await expect(frame.getByRole("link", { name: /^View details/ }).first()).toHaveCSS("color", "rgb(193, 77, 0)");
});

test("the iframe grows when its content grows", async ({ page }) => {
  await page.goto(HOST);
  const frame = page.frameLocator(IFRAME);
  await expect.poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page)))).toBeLessThan(2);
  const before = await iframeHeight(page);
  // Add 500 px of content inside the iframe, as a longer result list would.
  await frame.locator("#momsbloom-embed-root").evaluate((root) => {
    const block = document.createElement("div");
    block.style.height = "500px";
    root.appendChild(block);
  });
  await expect.poll(() => iframeHeight(page)).toBeGreaterThan(before + 490);
});

test("only /embed may be framed by other sites", async ({ request }) => {
  const embed = await request.get(`${APP}/embed`);
  expect(embed.headers()["content-security-policy"]).toContain("https://momsbloom.org");
  const home = await request.get(`${APP}/`);
  expect(home.headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
});

test("detail-scrolls-host: opening a Program scrolls the host page to the top of the iframe", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 500 });
  await page.goto(HOST);
  const frame = page.frameLocator(IFRAME);
  const link = frame.getByRole("link", { name: /^View details for/ }).last(); // the last card of the first page: far enough down to need a scroll
  await link.waitFor();
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  await link.click();
  await expect(frame.getByRole("heading", { level: 1 })).toBeVisible();
  const top = () => page.locator(IFRAME).evaluate((el) => Math.round(el.getBoundingClientRect().top));
  await expect.poll(async () => Math.abs(await top())).toBeLessThan(5);
});

// Link sync (ADR 0005). The host URL gets mbr- keys; other host keys stay as they are.
const hostUrl = (page: Page) => new URL(page.url());

test("host-url-gets-mbr-keys: a filter change goes into the host URL with replaceState", async ({ page }) => {
  await page.goto(`${HOST}/?q=host-search`);
  const frame = page.frameLocator(IFRAME);
  const before = await page.evaluate(() => history.length);
  await frame.getByRole("checkbox", { name: /^Spanish/ }).check();
  await expect.poll(() => hostUrl(page).searchParams.get("mbr-lang")).toBe("spanish");
  expect(hostUrl(page).searchParams.get("q")).toBe("host-search");
  expect(page.url()).not.toMatch(/zip|near/);
  expect(await page.evaluate(() => history.length)).toBe(before); // replaceState: no new history entry
});

test("host-keys-open-filtered: mbr- keys reach the iframe; other keys, zip and near do not", async ({ page }) => {
  const url = `${HOST}/?mbr-q=yoga&mbr-zip=49508&mbr-near=42.96,-85.67&q=other`;
  await page.goto(url);
  await expect(page.locator(IFRAME)).toHaveAttribute("src", `${APP}/embed?q=yoga`);
  await expect(page.frameLocator(IFRAME).getByRole("heading", { level: 1 })).toBeVisible();
  expect(page.url()).toBe(url);
});

test("near-never-shared: Use my location does not reach the host URL", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 42.96, longitude: -85.67 });
  await page.goto(HOST);
  await expect(page.locator(IFRAME)).toHaveAttribute("allow", "geolocation");
  const frame = page.frameLocator(IFRAME);
  await frame.getByRole("button", { name: /use my location/i }).click();
  // The iframe URL holds `near` now (the page is the iframe's own, so we read its URL).
  await expect.poll(() => page.frames().some((f) => f.url().includes("near=42.96,-85.67") || f.url().includes("near=42.96%2C-85.67"))).toBe(true);
  await frame.getByRole("checkbox", { name: /^Spanish/ }).check(); // a later change, so a message surely came after
  await expect.poll(() => hostUrl(page).searchParams.get("mbr-lang")).toBe("spanish");
  expect(page.url()).not.toContain("near");
});

test("zip-never-shared: a ZIP search stays out of the host URL", async ({ page }) => {
  await page.goto(HOST);
  const frame = page.frameLocator(IFRAME);
  await frame.getByRole("textbox", { name: /zip/i }).fill("49508");
  await frame.getByRole("checkbox", { name: /^Spanish/ }).check();
  await expect.poll(() => hostUrl(page).searchParams.get("mbr-lang")).toBe("spanish");
  expect(page.url()).not.toMatch(/zip|49508|near/);
});

test("view-map-height-stable: mbr-view=map keeps the iframe height steady and under a cap", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-view=map`);
  // The test host column is 960 px; widen it so the iframe is at lg and shows the fixed-height desktop map row.
  await page.addStyleTag({ content: ".content { max-width: none; }" });
  await expect(page.frameLocator(IFRAME).getByTestId("program-map")).toBeVisible();
  await page.waitForTimeout(1000);
  const first = await iframeHeight(page);
  await page.waitForTimeout(1000);
  expect(await iframeHeight(page)).toBe(first);
  expect(first).toBeLessThan(5000);
});

test("detail-syncs-program: the host URL follows the open Program", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-q=yoga`);
  const frame = page.frameLocator(IFRAME);
  await frame.getByRole("link", { name: "View details for Mom and baby yoga" }).click();
  await expect(frame.getByRole("heading", { level: 1, name: "Mom and baby yoga" })).toBeVisible();
  await expect.poll(() => hostUrl(page).searchParams.get("mbr-program")).toBe("P-001");
  await frame.getByRole("link", { name: /^Back to results/ }).click();
  await expect.poll(() => hostUrl(page).searchParams.get("mbr-program")).toBeNull();
  // A shared link opens the detail view.
  await page.goto(`${HOST}/?mbr-program=P-001&mbr-q=yoga`);
  await expect(page.frameLocator(IFRAME).getByRole("heading", { level: 1, name: "Mom and baby yoga" })).toBeVisible();
});

// Custom field filters (src/custom-fields/README.md). The sample snapshot has a "Parking" filter (field 1).
test("custom-filter-host-sync: a custom filter goes into the host URL and comes back on load", async ({ page }) => {
  await page.goto(HOST);
  const frame = page.frameLocator(IFRAME);
  await frame.getByRole("checkbox", { name: /^Free lot/ }).check();
  await expect.poll(() => hostUrl(page).searchParams.get("mbr-cf1")).toBe("1");
  await expect(frame.getByRole("link", { name: "Remove Parking: Free lot" })).toBeVisible();

  // A copied link opens the iframe with the same filter.
  await page.goto(`${HOST}/?mbr-cf1=1&mbr-cfx=1`);
  await expect(page.locator(IFRAME)).toHaveAttribute("src", `${APP}/embed?cf1=1`);
  await expect(frame.getByRole("checkbox", { name: /^Free lot/ })).toBeChecked();

  // Unchecking removes it from the host URL.
  await frame.getByRole("checkbox", { name: /^Free lot/ }).uncheck();
  await expect.poll(() => hostUrl(page).searchParams.has("mbr-cf1")).toBe(false);
});

test("custom-fields-detail-in-frame: a Program's and its Organization's custom fields show in the iframe", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-program=P-001`);
  const frame = page.frameLocator(IFRAME);
  await expect(frame.getByRole("heading", { level: 1, name: "Mom and baby yoga" })).toBeVisible();
  await expect(frame.getByRole("heading", { name: "More details" })).toBeVisible();
  await expect(frame.getByText("Free lot")).toBeVisible();
  await expect(frame.getByRole("heading", { name: "About Riverbend Health" })).toBeVisible();
  await expect(frame.getByText("Ramp at the side door")).toBeVisible();
  // The iframe grows to fit the extra cards.
  await expect.poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page)))).toBeLessThan(2);
});
