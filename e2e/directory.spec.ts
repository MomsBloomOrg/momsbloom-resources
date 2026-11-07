/**
 * The Directory list view on /embed, with the sample snapshot (src/directory/snapshot.ts: 14 Programs).
 * If the sample data changes, the numbers here change too.
 */
import { expect, type Page, test } from "@playwright/test";

const resultLine = (page: Page) => page.locator("[aria-live=polite]");
const programCards = (page: Page) => page.locator("section[aria-labelledby=programs-heading] > ul > li");

test("keyword-narrows: typing a keyword narrows the results (after the debounce)", async ({ page }) => {
  await page.goto("/embed");
  await expect(resultLine(page)).toHaveText("14 results");
  await page.getByRole("searchbox", { name: "Keyword" }).fill("yoga");
  await expect(resultLine(page)).toHaveText('2 results for "yoga"');
  await expect(page).toHaveURL(/\?q=yoga$/);
});

test("checkbox-adds-chip: checking a filter adds a chip", async ({ page }) => {
  await page.goto("/embed");
  await page.getByRole("checkbox", { name: /^Spanish/ }).check();
  await expect(page.getByRole("link", { name: "Remove Spanish" })).toBeVisible();
  await expect(page).toHaveURL(/lang=spanish/);
  await expect(resultLine(page)).toHaveText("6 results");
});

test("chip-removes-filter: the chip's x removes the filter and unchecks the box", async ({ page }) => {
  await page.goto("/embed?lang=spanish");
  await expect(page.getByRole("checkbox", { name: /^Spanish/ })).toBeChecked();
  await page.getByRole("link", { name: "Remove Spanish" }).click();
  await expect(page.getByRole("link", { name: "Remove Spanish" })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /^Spanish/ })).not.toBeChecked();
  await expect(resultLine(page)).toHaveText("14 results");
});

test("clear-all-keeps-keyword-zip: Clear all removes the filters, not the keyword or ZIP", async ({ page }) => {
  await page.goto("/embed?q=yoga&zip=49508&lang=english&cost=free");
  await expect(page.getByRole("link", { name: "Remove Free" })).toBeVisible();
  await page.getByRole("link", { name: "Clear all" }).first().click();
  await expect(page.getByRole("link", { name: /^Remove/ })).toHaveCount(0);
  await expect(page).toHaveURL(/\?q=yoga&zip=49508$/);
  await expect(page.getByRole("searchbox", { name: "Keyword" })).toHaveValue("yoga");
  await expect(page.getByRole("textbox", { name: "ZIP code" })).toHaveValue("49508");
});

test("zip-5mi-keeps-virtual: a 5 mi radius never hides virtual Programs", async ({ page }) => {
  await page.goto("/embed?zip=49508&r=5");
  const virtual = page.locator("section[aria-labelledby=virtual-heading]");
  await expect(virtual.getByRole("heading", { name: "Virtual and phone" })).toBeVisible();
  // Lakeshore is about 22 mi away, but its help line is virtual only.
  await expect(virtual.getByRole("heading", { name: "Lactation help line" })).toBeVisible();
  // A place 5.3 mi away is outside the radius.
  await expect(page.getByRole("heading", { name: "Baby-and-me yoga" })).toHaveCount(0);
});

test("show-more-adds-ten: Show more adds the next page of Programs", async ({ page }) => {
  await page.goto("/embed");
  await expect(programCards(page)).toHaveCount(10);
  await page.getByRole("link", { name: "Show 4 more places" }).click();
  await expect(programCards(page)).toHaveCount(14);
  await expect(page).toHaveURL(/\?n=2$/);
  await expect(page.getByRole("link", { name: /^Show \d+ more/ })).toHaveCount(0);
});

test.describe("works-without-javascript", () => {
  test.use({ javaScriptEnabled: false });

  test("the search form and the filters work with JavaScript off", async ({ page }) => {
    await page.goto("/embed");
    await page.getByRole("searchbox", { name: "Keyword" }).fill("yoga");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(resultLine(page)).toHaveText('2 results for "yoga"');
    await page.getByRole("checkbox", { name: /^Spanish/ }).check();
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(resultLine(page)).toHaveText('1 result for "yoga"');
    await expect(page.getByRole("link", { name: "Remove Spanish" })).toBeVisible();
    await page.getByRole("link", { name: "Remove Spanish" }).click();
    await expect(resultLine(page)).toHaveText('2 results for "yoga"');
  });
});
