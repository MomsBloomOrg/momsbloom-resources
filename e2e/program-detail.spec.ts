/** The Program detail view on /embed/programs/[id], with the sample snapshot (src/directory/snapshot.ts). */
import { expect, type Page, test } from "@playwright/test";

const resultLine = (page: Page) => page.locator("[aria-live=polite]:not(dialog *)"); // not the filter sheet's live count

test("detail-opens-from-card: View details opens the Program with its Organization link", async ({ page }) => {
  await page.goto("/embed?q=yoga");
  await page.getByRole("link", { name: "View details for Mom and baby yoga" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mom and baby yoga" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Riverbend Health", exact: true })).toHaveAttribute("href", "/embed?org=O-001");
});

test("back-keeps-query: Back to results returns to the same results and card", async ({ page }) => {
  await page.goto("/embed/programs/P-001?q=yoga");
  const back = page.getByRole("link", { name: "Back to results for “yoga”" });
  await expect(back).toHaveAttribute("href", "/embed?q=yoga#program-P-001");
  await back.click();
  await expect(resultLine(page)).toHaveText('2 results for "yoga"');
  await expect(page.locator("#program-P-001")).toBeVisible();
});

test("actions-links: Call, Directions, and Website; Website is hidden when there is none", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/embed/programs/P-001");
  await expect(page.getByRole("link", { name: /^Call/ })).toHaveAttribute("href", /^tel:\+?\d+$/);
  const directions = page.getByRole("link", { name: /^Directions/ });
  await expect(directions).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/dir\/.*123%20Example%20Ave%20SE/);
  await expect(directions).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /^Website/ })).toHaveAttribute("rel", "noopener");

  // P-004 (Lakeshore Lactation) has no website; it is virtual only, so it has no Directions either.
  await page.goto("/embed/programs/P-004");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Website/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Directions/ })).toHaveCount(0);
});

test("more-from-hidden-single: More from shows only for an Organization with other Programs", async ({ page }) => {
  await page.goto("/embed/programs/P-003");
  await expect(page.getByRole("heading", { level: 1, name: "Baby-and-me yoga" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^More from/ })).toHaveCount(0);

  await page.goto("/embed/programs/P-001");
  await expect(page.getByRole("heading", { name: "More from Riverbend Health" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^See all \d+ programs at Riverbend Health/ })).toHaveAttribute("href", "/embed?org=O-001");
});

test("unknown-program-note: an unknown Program goes to the results with a note", async ({ page }) => {
  await page.goto("/embed/programs/P-999?q=yoga");
  await expect(page).toHaveURL(/\/embed\?q=yoga&unavailable=1$/);
  await expect(page.getByRole("status").filter({ hasText: "That resource isn't available anymore." })).toBeVisible();
  await expect(resultLine(page)).toHaveText('2 results for "yoga"');
});

test("mobile-actions-first: on a phone, the Call button is above About", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/embed/programs/P-001");
  const call = await page.getByRole("link", { name: /^Call/ }).boundingBox();
  const about = await page.getByRole("heading", { name: "About" }).boundingBox();
  expect(call!.y).toBeLessThan(about!.y);
});

test("detail-map: the map shows for a Program with a point and not for a virtual one", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/embed/programs/P-001");
  const map = page.getByTestId("program-map");
  await expect(map).toBeVisible();
  await expect(map.locator(".leaflet-marker-icon")).toHaveCount(1);
  expect((await map.boundingBox())?.height).toBe(200);
  await page.goto("/embed/programs/P-004");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("program-map")).toHaveCount(0);
});
