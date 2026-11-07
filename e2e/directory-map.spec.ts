/** Map view on /embed?view=map, with the sample snapshot. Tiles are blocked: tests never reach OSM. */
import { expect, type Page, test } from "@playwright/test";

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
  // Desktop map view has no filter column: the Filters link opens the sheet.
  await page.locator("[data-action=open-filters]").click();
  await page.getByRole("checkbox", { name: /^Spanish/ }).check();
  await expect(page).toHaveURL(/lang=spanish/);
  await expect(page).toHaveURL(/view=map/);
  await page.keyboard.press("Escape");
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

test("the Documents note links to the list view", async ({ page }) => {
  await page.goto("/embed?q=yoga&view=map");
  await expect(page.getByRole("heading", { name: /Guides and downloads/ })).toHaveCount(0);
  await page.getByRole("link", { name: /Switch to list view/ }).click();
  await expect(page).not.toHaveURL(/view=map/);
  await expect(page.getByRole("heading", { name: /Guides and downloads/ })).toBeVisible();
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

// Desktop map view (#47): full width, the map row splits into a scrolling card column and the map.
test.describe("desktop-full-width", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  const column = (page: Page) => page.locator("section[aria-labelledby=programs-heading]").locator("xpath=../..");
  const filtersLink = (page: Page) => page.locator("[data-action=open-filters]");

  test("full-width-split: no visible heading or filter column; the map fills the rest of the row", async ({ page }) => {
    await page.goto("/embed?q=yoga&zip=49508&view=map");
    await expect(map(page)).toBeVisible();
    // sr-only: still in the page for screen readers, 1 px on screen.
    expect((await page.getByRole("heading", { level: 1 }).boundingBox())!.width).toBeLessThanOrEqual(1);
    await expect(page.getByRole("group", { name: "Type of support" })).toBeHidden();
    const col = (await column(page).boundingBox())!;
    const box = (await map(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(col.x + col.width);
    expect(box.width).toBeGreaterThan(720);
    expect(Math.abs(box.height - col.height)).toBeLessThanOrEqual(1);
  });

  test("card-focus-highlights-pin: a focused card lights its pin, a clicked pin lights its card", async ({ page }) => {
    await page.goto("/embed?q=yoga&zip=49508&view=map");
    const pin = page.locator(".leaflet-marker-icon").first();
    await expect(pin).toBeVisible();
    await programCards(page).first().getByRole("link", { name: /^View details/ }).focus();
    await expect(page.locator(".leaflet-marker-icon[data-active], .leaflet-marker-icon [data-active]")).toHaveCount(1);
    await pin.click();
    await expect(page.locator("article[data-active]")).toHaveCount(1);
  });

  test("desktop-filters-sheet: Filters opens the sheet; a filter keeps view=map; Escape returns focus", async ({ page }) => {
    await page.goto("/embed?q=yoga&zip=49508&view=map");
    await filtersLink(page).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close filters" })).toBeFocused();
    await page.getByRole("checkbox", { name: /^Spanish/ }).check();
    await expect(page).toHaveURL(/lang=spanish/);
    await expect(page).toHaveURL(/view=map/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeHidden();
    await expect(filtersLink(page)).toBeFocused();
  });

  test("list-view-unchanged: the list view keeps the filter column and hides the Filters link", async ({ page }) => {
    await page.goto("/embed?q=yoga");
    await expect(page.getByRole("group", { name: "Type of support" })).toBeVisible();
    await expect(filtersLink(page)).toBeHidden();
  });

  test("back-to-card-map: Back to results shows the card inside the column", async ({ page }) => {
    await page.goto("/embed?view=map");
    const last = programCards(page).last();
    const id = await last.getAttribute("id");
    await last.getByRole("link", { name: /^View details/ }).click();
    await page.getByRole("link", { name: /^Back to results/ }).click();
    const card = page.locator(`#${id}`);
    await expect(card).toBeInViewport();
    const col = (await column(page).boundingBox())!;
    const box = (await card.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(col.y - 1);
    expect(box.y).toBeLessThan(col.y + col.height);
  });
});

test.describe("desktop-map-no-js", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  test("the Filters link jumps to the filter column below the map row", async ({ page }) => {
    await page.goto("/embed?q=yoga&zip=49508&view=map");
    await page.locator("[data-action=open-filters]").click();
    await expect(page).toHaveURL(/#filters$/);
    const filters = page.getByRole("group", { name: "Type of support" });
    await expect(filters).toBeInViewport();
    const programs = (await page.getByRole("heading", { name: "Places near you" }).boundingBox())!;
    expect((await filters.boundingBox())!.y).toBeGreaterThan(programs.y + 700);
  });
});
