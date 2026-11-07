import { appendFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { HOST } from "./fixture";
import { setFilter } from "./filters";

// Analytics events (ADR 0006). The iframe posts each event; embed.js calls the host page's gtag.
// The stub is on the top frame only: the iframe must get no gtag of its own.
type Call = [string, string, Record<string, unknown>];
const IFRAME = "iframe[data-momsbloom-embed]";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window !== window.top) return;
    const w = window as unknown as { gtagCalls: unknown[][]; gtag: (...args: unknown[]) => void };
    w.gtagCalls = [];
    w.gtag = (...args) => void w.gtagCalls.push(args);
  });
});

// Set GTAG_EVIDENCE to a file path to keep a text capture of the calls each test saw.
test.afterEach(async ({ page }, info) => {
  if (!process.env.GTAG_EVIDENCE) return;
  const calls = await calls_(page).catch(() => []);
  appendFileSync(process.env.GTAG_EVIDENCE, `# ${info.title}\n${calls.map((c) => JSON.stringify(c)).join("\n")}\n\n`);
});

const calls_ = (page: Page) => page.evaluate(() => (window as unknown as { gtagCalls: Call[] }).gtagCalls);
const named = async (page: Page, name: string) => (await calls_(page)).filter((c) => c[1] === name).map((c) => c[2]);
/** Wait for the first event with this name, then give back its params. */
const waitFor = async (page: Page, name: string) => {
  await expect.poll(async () => (await named(page, name)).length, { timeout: 10_000 }).toBeGreaterThan(0);
  return (await named(page, name))[0];
};
const frameOf = (page: Page) => page.frameLocator(IFRAME);
const keyword = (page: Page) => frameOf(page).getByRole("searchbox", { name: "Keyword" });
/** Stop a link from leaving the page: the document click listener still runs. */
const stay = (page: Page, link: string) => frameOf(page).locator(link).first().evaluate((el) => el.addEventListener("click", (e) => e.preventDefault()));

test("search-one-event: typing a keyword sends one directory_search after it settles", async ({ page }) => {
  await page.goto(HOST);
  await expect(keyword(page)).toBeVisible();
  await keyword(page).pressSequentially("yoga", { delay: 300 }); // a navigation for each letter
  expect(await waitFor(page, "directory_search")).toEqual({ search_term: "yoga", result_count: expect.any(Number) });
  await page.waitForTimeout(1500);
  expect(await named(page, "directory_search")).toHaveLength(1);
});

test("zero-results-event: a keyword with no match sends directory_zero_results", async ({ page }) => {
  await page.goto(HOST);
  await keyword(page).fill("zzzzqq");
  expect(await waitFor(page, "directory_zero_results")).toEqual({ search_term: "zzzzqq" });
  expect(await waitFor(page, "directory_search")).toEqual({ search_term: "zzzzqq", result_count: 0 });
});

test("filter-event: a checked Facet value sends directory_filter with the Facet name", async ({ page }) => {
  await page.goto(HOST);
  await setFilter(page, frameOf(page), /^Spanish/);
  expect(await waitFor(page, "directory_filter")).toEqual({ filter_group: "language", filter_value: "spanish" });
});

test("detail-events: view, website, and call send events with the Program ID", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-q=yoga`);
  const frame = frameOf(page);
  await frame.getByRole("link", { name: "View details for Mom and baby yoga" }).click();
  await expect(frame.getByRole("heading", { level: 1, name: "Mom and baby yoga" })).toBeVisible();
  expect(await waitFor(page, "program_view")).toEqual({ program_id: "P-001", program_name: expect.any(String) });
  for (const name of ["program_website", "program_call", "program_directions"]) {
    const link = `a[data-event="${name}"]:visible`; // the page holds two action bars; one is hidden
    await stay(page, link);
    await frame.locator(link).first().click();
    expect(await waitFor(page, name)).toEqual({ program_id: "P-001", program_name: expect.any(String) });
  }
});

test("org-view-event: the Organization page sends organization_view with the Organization ID", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-q=yoga`);
  const frame = frameOf(page);
  await frame.locator("#program-P-001").getByRole("link", { name: "Riverbend Health", exact: true }).click();
  await expect(frame.getByRole("heading", { level: 1, name: "Riverbend Health" })).toBeVisible();
  expect(await waitFor(page, "organization_view")).toEqual({ organization_id: "O-001", organization_name: expect.any(String) });
});

test("download-event: Download sends document_download with the Document ID", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-q=yoga`);
  await stay(page, 'a[data-event="document_download"]');
  await frameOf(page).locator('a[data-event="document_download"]').first().click();
  expect(await waitFor(page, "document_download")).toEqual({ document_id: expect.any(String), document_title: expect.any(String) });
});

test("no-zip-no-location: a ZIP search and Use my location stay out of the events", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 42.96, longitude: -85.67 });
  await page.goto(HOST);
  const frame = frameOf(page);
  await frame.getByRole("textbox", { name: /zip/i }).fill("49508");
  await setFilter(page, frame, /^Spanish/);
  await waitFor(page, "directory_filter");
  await frame.getByRole("button", { name: /use my location/i }).click();
  await expect.poll(() => page.frames().some((f) => f.url().includes("near="))).toBe(true);
  await keyword(page).fill("zzzzqq"); // a search after the location is known
  await waitFor(page, "directory_zero_results");
  const text = JSON.stringify(await calls_(page));
  expect(text).not.toContain("49508");
  expect(text).not.toMatch(/42\.9|85\.6/);
});

test("keyword-redacted: a phone number becomes (redacted)", async ({ page }) => {
  await page.goto(HOST);
  await keyword(page).fill("616-555-1234");
  expect(await waitFor(page, "directory_search")).toMatchObject({ search_term: "(redacted)" });
});

test("no-gtag-silent: with no gtag on the host page, nothing breaks", async ({ page }) => {
  await page.addInitScript(() => {
    if (window === window.top) delete (window as unknown as { gtag?: unknown }).gtag;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(HOST);
  await keyword(page).fill("yoga");
  await expect(frameOf(page).getByRole("link", { name: "View details for Mom and baby yoga" })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test("first-load-no-search: a shared link sends no search event", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-q=yoga`);
  await expect(frameOf(page).getByRole("link", { name: "View details for Mom and baby yoga" })).toBeVisible();
  await page.waitForTimeout(2000);
  expect(await named(page, "directory_search")).toHaveLength(0);
});

test("filters-validated: a bad Facet value in the host URL never reaches gtag", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-ins=49508&mbr-q=zzzzqq`);
  await expect(frameOf(page).getByRole("heading", { level: 1 })).toBeVisible();
  await keyword(page).fill("zzzzqqx"); // a real search, so the zero-results event surely fires
  await waitFor(page, "directory_zero_results");
  expect(JSON.stringify(await calls_(page))).not.toContain("49508");
});

test("map-popup-directions-event: Get directions in the map popup sends program_directions", async ({ page }) => {
  await page.goto(`${HOST}/?mbr-view=map`);
  // Click until the popup opens: the pin can show before the map is ready for clicks.
  await expect(async () => {
    await frameOf(page).locator(".leaflet-marker-icon").first().click();
    await expect(frameOf(page).locator(".leaflet-popup")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await stay(page, ".leaflet-popup a[data-event]");
  await frameOf(page).getByRole("link", { name: "Get directions" }).first().click();
  expect(await waitFor(page, "program_directions")).toEqual({ program_id: expect.stringMatching(/^P-/), program_name: expect.any(String) });
});
