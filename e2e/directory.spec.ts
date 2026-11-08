/**
 * The Directory list view on /embed, with the sample snapshot (src/directory/snapshot.ts: 14 Programs).
 * If the sample data changes, the numbers here change too.
 */
import { expect, type Page, test } from "@playwright/test";
import { HOST } from "./fixture";
import { setFilter } from "./filters";

// The mobile filter sheet has its own live count; this is the page's result line.
const resultLine = (page: Page) => page.locator("[aria-live=polite]:not(dialog *)");
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
  await setFilter(page, page, /^Spanish/);
  await expect(page.getByRole("link", { name: "Remove Spanish" })).toBeVisible();
  await expect(page).toHaveURL(/lang=spanish/);
  await expect(resultLine(page)).toHaveText("6 results");
});

test("chip-removes-filter: the chip's x removes the filter and unchecks the box", async ({ page }) => {
  await page.goto("/embed?lang=spanish");
  await expect(page.getByRole("checkbox", { name: /^Spanish/, includeHidden: true })).toBeChecked();
  await page.getByRole("link", { name: "Remove Spanish" }).click();
  await expect(page.getByRole("link", { name: "Remove Spanish" })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /^Spanish/, includeHidden: true })).not.toBeChecked();
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

test("no-location: no Nearest sort, no Distance group, no miles", async ({ page }) => {
  await page.goto("/embed?q=yoga");
  await expect(resultLine(page)).toHaveText('2 results for "yoga"');
  const sort = page.getByRole("combobox", { name: "Sort" });
  await expect(sort.getByRole("option", { name: "Nearest" })).toHaveCount(0);
  await expect(sort).toHaveValue("");
  await expect(sort.locator("option:checked")).toHaveText("A to Z");
  await expect(page.getByRole("group", { name: /Distance/ })).toHaveCount(0);
  await expect(page.getByRole("article")).not.toHaveCount(0);
  await expect(page.getByRole("article").getByText(/^\d+(\.\d)? mi$/)).toHaveCount(0);
});

test("zip-location: Nearest is current, Distance group shows, cards show miles", async ({ page }) => {
  await page.goto("/embed?q=yoga&zip=49508");
  await expect(resultLine(page)).toContainText("near 49508");
  await expect(page.getByRole("combobox", { name: "Sort" }).locator("option:checked")).toHaveText("Nearest");
  await expect(page.getByRole("article").getByText(/^\d+(\.\d)? mi$/).first()).toBeVisible();
  // The Distance group is in the Filters modal.
  await page.getByRole("link", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Filters" }).getByRole("group", { name: /Distance/ })).toBeVisible();
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

test.describe("mobile-filter-sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const filtersLink = (page: Page) => page.getByRole("link", { name: /^Filters/ });

  test("sheet-in-host-viewport: in the iframe, the sheet opens on the visible screen, not at the iframe bottom", async ({ page }) => {
    await page.goto(HOST);
    const frame = page.frameLocator("iframe[data-momsbloom-embed]");
    const link = frame.getByRole("link", { name: /^Filters/ });
    await link.waitFor();
    await expect(frame.getByRole("link", { name: /^View details/ }).first()).toBeVisible();
    await page.mouse.wheel(0, 1000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
    await link.click();
    const dialog = frame.getByRole("dialog", { name: "Filters" });
    await expect(dialog).toBeVisible();
    // Main-page coordinates. Poll: the sheet slides up first.
    const box = () => dialog.boundingBox().then((b) => b!);
    await expect.poll(async () => { const b = await box(); return b.y + b.height; }).toBeLessThanOrEqual(845);
    expect((await box()).y).toBeGreaterThanOrEqual(0);
    expect((await box()).height).toBeGreaterThan(400);
  });

  test("sheet-open-filter-close: the sheet filters, shows the count, and closes", async ({ page }) => {
    await page.goto("/embed");
    await filtersLink(page).click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close filters" })).toBeFocused();
    await dialog.getByRole("checkbox", { name: /^Spanish/ }).check();
    await expect(resultLine(page)).toHaveText("6 results");
    await dialog.getByRole("button", { name: "Show 6 results" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("link", { name: "Remove Spanish" })).toBeVisible();
  });

  test("sheet-focus-return: focus stays in the sheet; Escape returns it to Filters", async ({ page }) => {
    await page.goto("/embed");
    await filtersLink(page).click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      // After the last control, a native modal lets focus go to the browser UI (activeElement is <body>) and then
      // back into the dialog. It never reaches the page behind the sheet.
      const active = await dialog.evaluate((el) => el.contains(document.activeElement) || document.activeElement === document.body);
      expect(active).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(filtersLink(page)).toBeFocused();
  });

  test.describe("sheet-no-js-mobile", () => {
    test.use({ javaScriptEnabled: false });

    test("without JavaScript, Filters jumps to the column", async ({ page }) => {
      await page.goto("/embed");
      await filtersLink(page).click();
      await expect(page).toHaveURL(/#filters$/);
      await expect(page.getByRole("heading", { name: "Filters", exact: true })).toBeInViewport();
      await expect(page.getByRole("checkbox", { name: /^Spanish/ })).toBeVisible();
    });
  });
});

test("filters-modal-desktop: on desktop, Filters opens a centered modal; the results update behind it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/embed");
  // No filter column next to the results: the checkboxes are in the closed modal.
  await expect(page.getByRole("checkbox", { name: /^Spanish/ })).toHaveCount(0);
  await page.getByRole("link", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeLessThan(800);
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThan(20);
  await dialog.getByRole("checkbox", { name: /^Spanish/ }).check();
  await expect(resultLine(page)).toHaveText("6 results");
  await dialog.getByRole("button", { name: "Show 6 results" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: "Remove Spanish" })).toBeVisible();
});

test("results-tabs: Programs & Providers and Guides & Downloads are two tabs with counts; view and sort only on Programs", async ({ page }) => {
  await page.goto("/embed?q=yoga");
  const tabs = page.getByRole("navigation", { name: "Results" });
  const programsTab = tabs.getByRole("link", { name: /^Programs & Providers \(\d+\)$/ });
  const guidesTab = tabs.getByRole("link", { name: /^Guides & Downloads \(\d+\)$/ });
  await expect(programsTab).toHaveAttribute("aria-current", "page");
  await expect(programCards(page).first()).toBeVisible();
  await expect(page.locator('a[data-event="document_download"]')).toHaveCount(0);
  await guidesTab.click();
  await expect(page).toHaveURL(/tab=guides/);
  await expect(guidesTab).toHaveAttribute("aria-current", "page");
  await expect(page.locator('a[data-event="document_download"]').first()).toBeVisible();
  await expect(programCards(page)).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Sort" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "View" })).toHaveCount(0);
});

test.describe("sort-dropdown", () => {
  const sort = (page: Page) => page.getByRole("combobox", { name: "Sort" });

  test("sort-default-sends-nothing: the default option adds no sort to the URL", async ({ page }) => {
    await page.goto("/embed?q=yoga&zip=49508");
    await expect(sort(page).locator("option:checked")).toHaveText("Nearest");
    await sort(page).selectOption({ label: "A to Z" });
    await expect(page).toHaveURL(/sort=az/);
    await expect(sort(page)).toHaveValue("az");
    const names = await programCards(page).getByRole("heading").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    await sort(page).selectOption({ label: "Nearest" });
    await expect(page).not.toHaveURL(/sort=/);
    await expect(sort(page)).toHaveValue("");
  });

  test("sort-select-follows-url: the select keeps the choice after a chip click (the live layer replaces history, so there is no Back step)", async ({ page }) => {
    await page.goto("/embed?q=yoga&zip=49508&lang=spanish");
    await sort(page).selectOption({ label: "A to Z" });
    await expect(page).toHaveURL(/sort=az/);
    await expect(sort(page)).toHaveValue("az");
    await page.getByRole("link", { name: /Clear all/ }).first().click();
    await expect(page).not.toHaveURL(/lang=/);
    await expect(sort(page)).toHaveValue("az");
  });

  test("sort-no-location-options: no Nearest without a location", async ({ page }) => {
    await page.goto("/embed?q=yoga");
    await expect(sort(page).locator("option")).toHaveText(["A to Z", "Recently verified"]);
  });

  test.describe("sort-no-js", () => {
    test.use({ javaScriptEnabled: false });
    test("the Sort button applies the choice", async ({ page }) => {
      await page.goto("/embed?q=yoga");
      await sort(page).selectOption({ label: "Recently verified" });
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      await expect(page).toHaveURL(/sort=verified/);
    });
  });

  test.describe("mobile-one-row", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("the view link and Sort share one row", async ({ page }) => {
      await page.goto("/embed?q=yoga&zip=49508");
      const [view, select] = await Promise.all(
        [page.getByRole("link", { name: "Map", exact: true }), sort(page)].map(async (locator) => (await locator.boundingBox())!.y),
      );
      expect(Math.abs(view - select)).toBeLessThanOrEqual(4);
      await page.goto("/embed?q=yoga&zip=49508&view=map");
      await expect(page.getByRole("link", { name: "List View", exact: true })).toBeVisible();
    });
  });
});
