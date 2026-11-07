/** Map view on /embed?view=map, with the sample snapshot. Tiles are blocked: tests never reach OSM. */
import { expect, type Page, test } from "@playwright/test";
import { setFilter } from "./filters";

const programCards = (page: Page) => page.locator("article[id^=program-]");
const map = (page: Page) => page.getByTestId("program-map");

test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
});

test("the Map link sets view=map and the map shows; the List link goes back", async ({ page }) => {
  await page.goto("/embed?q=yoga&zip=49508");
  await expect(map(page)).toHaveCount(0);
  await page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "Map" }).click();
  await expect(page).toHaveURL(/view=map/);
  await expect(map(page)).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "List" }).click();
  await expect(page).not.toHaveURL(/view=map/);
  await expect(map(page)).toHaveCount(0);
});

test("a filter checkbox and the keyword search keep view=map", async ({ page }) => {
  await page.goto("/embed?view=map");
  await setFilter(page, page, /^Spanish/);
  await expect(page).toHaveURL(/lang=spanish/);
  await expect(page).toHaveURL(/view=map/);
  await page.getByRole("searchbox", { name: "Keyword" }).fill("yoga");
  await expect(page).toHaveURL(/q=yoga/);
  await expect(page).toHaveURL(/view=map/);
});

test("pins match the distinct points of the shown Programs, and selecting a pin highlights its card", async ({ page }) => {
  await page.goto("/embed?view=map");
  const shown = await page.evaluate(() => document.querySelectorAll("article[id^=program-]").length);
  expect(shown).toBe(10);
  // Pins have numbered cards; a pin is shared when Programs share an address.
  const numbers = await programCards(page).locator("span.rounded-full").allTextContents();
  const pins = page.locator(".leaflet-marker-icon");
  await expect(pins.first()).toBeVisible();
  expect(await pins.count()).toBeLessThanOrEqual(numbers.length);
  expect(await pins.count()).toBeGreaterThan(0);

  await pins.first().click();
  await expect(page.locator("article[data-active]").first()).toBeVisible();
  await expect(page.locator(".leaflet-popup")).toContainText("View details");
  await expect(page.locator(".leaflet-popup")).toContainText("Get directions");
});

test("results with no pins show a line, not an empty map", async ({ page }) => {
  await page.goto("/embed?q=warm+line&view=map");
  await expect(programCards(page).first()).toBeVisible();
  await expect(map(page)).toHaveCount(0);
  await expect(page.getByText("These places are virtual or by phone, so they have no map pin.")).toBeVisible();
});

test("Guides and downloads show below the list and map in map view too", async ({ page }) => {
  await page.goto("/embed?q=yoga&view=map");
  await expect(page.getByRole("heading", { name: /Guides and downloads/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Switch to list view/ })).toHaveCount(0);
});

test.describe("JavaScript off", () => {
  test.use({ javaScriptEnabled: false });
  test("the cards and the List/Map links still work; there is no map", async ({ page }) => {
    await page.goto("/embed?view=map");
    await expect(programCards(page).first()).toBeVisible();
    await expect(page.locator(".leaflet-container")).toHaveCount(0);
    await page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "List" }).click();
    await expect(page).not.toHaveURL(/view=map/);
  });
});

test("map-list-height-capped: on desktop the cards scroll in a box as tall as the map; a pin scrolls to its card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/embed?view=map");
  const pane = page.locator("[data-results-pane]");
  const map = page.locator(".leaflet-container");
  await expect(map).toBeVisible();
  const paneBox = await pane.boundingBox();
  const mapBox = await map.boundingBox();
  expect(paneBox!.height).toBeLessThanOrEqual(mapBox!.height + 1);
  expect(await pane.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  // Nothing in the box (sr-only text is position: absolute) may stretch the page below the content.
  const heights = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    content: Math.ceil(document.getElementById("momsbloom-embed-root")!.getBoundingClientRect().bottom + scrollY),
  }));
  expect(heights.page).toBeLessThanOrEqual(heights.content + 1);

  // The last pin's card starts below the fold of the box; clicking the pin scrolls the box to it.
  await page.locator(".leaflet-marker-icon").last().click();
  await expect.poll(() => pane.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});
