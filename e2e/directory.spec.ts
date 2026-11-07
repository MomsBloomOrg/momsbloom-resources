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

test("a half-typed ZIP does not block the keyword search", async ({ page }) => {
  await page.goto("/embed");
  await page.getByRole("textbox", { name: "ZIP code" }).fill("495");
  await page.getByRole("searchbox", { name: "Keyword" }).fill("yoga");
  await expect(resultLine(page)).toHaveText('2 results for "yoga"');
  await expect(page.getByRole("textbox", { name: "ZIP code" })).toHaveValue("495");
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

test("no-results-clear-filters: Clear filters keeps the keyword and brings results back", async ({ page }) => {
  await page.goto("/embed?q=yoga&cost=free&lang=spanish");
  await expect(page.getByText('No matches for "yoga"')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Can't find what you need?" })).toBeVisible();
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page).toHaveURL(/\?q=yoga$/);
  await expect(resultLine(page)).toHaveText('2 results for "yoga"');
});

test("no-results-widen-25: Widen to 25 mi sets the radius and shows results", async ({ page }) => {
  await page.goto("/embed?q=pelvic&zip=49301&r=5");
  await expect(resultLine(page)).toContainText("0 results");
  await page.getByRole("link", { name: "Widen to 25 mi" }).click();
  await expect(page).toHaveURL(/r=25/);
  await expect(resultLine(page)).toContainText("1 result");
});

test("no-results-keyword-only: no buttons when there is nothing to clear or widen", async ({ page }) => {
  await page.goto("/embed?q=zzzz");
  await expect(page.getByText('No matches for "zzzz"')).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear filters", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Widen/ })).toHaveCount(0);
});

test("load-error-try-again: the error screen shows the 211 text and Try again", async ({ page }) => {
  await page.goto("/embed?fail=1");
  const main = page.locator("main");
  await expect(main.getByRole("alert")).toContainText("We couldn't load the directory right now.");
  await expect(main.locator("a[href='tel:211']")).toBeVisible();
  await expect(main.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("zip-not-five-digits: a short ZIP shows the ZIP message on Search and keeps the text", async ({ page }) => {
  await page.goto("/embed");
  const zip = page.getByRole("textbox", { name: "ZIP code" });
  await zip.fill("495");
  await expect(page.locator("#zip-not-found")).toHaveCount(0);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.locator("#zip-not-found")).toHaveText("We don't recognize that ZIP. Try a Michigan ZIP code.");
  await expect(zip).toHaveValue("495");
  await expect(resultLine(page)).toHaveText("14 results");
});

test("zip-not-five-digits-url: /embed?zip=495 shows the ZIP message too", async ({ page }) => {
  await page.goto("/embed?zip=495");
  await expect(page.locator("#zip-not-found")).toContainText("We don't recognize that ZIP");
  await expect(page.getByRole("textbox", { name: "ZIP code" })).toHaveValue("495");
});
