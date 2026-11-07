/** The Organization detail view on /embed/organizations/[id], with the sample snapshot (src/directory/snapshot.ts). */
import { expect, test } from "@playwright/test";

test("org-opens-from-card: the card's Organization name opens the Organization page", async ({ page }) => {
  await page.goto("/embed?q=yoga");
  await page.locator("#program-P-001").getByRole("link", { name: "Riverbend Health", exact: true }).click();
  await expect(page).toHaveURL(/\/embed\/organizations\/O-001\?q=yoga$/);
  await expect(page.getByRole("heading", { level: 1, name: "Riverbend Health" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Programs at Riverbend Health" })).toBeVisible();
});

test("org-back-keeps-query: Back to results returns to the same results", async ({ page }) => {
  await page.goto("/embed/organizations/O-005?q=yoga");
  const back = page.getByRole("link", { name: "Back to results for “yoga”" });
  await expect(back).toHaveAttribute("href", "/embed?q=yoga");
});

test("org-program-row-opens-detail: a Program row opens its Program detail", async ({ page }) => {
  await page.goto("/embed/organizations/O-005");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  await page.getByRole("link", { name: /^Feeding support visits/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Feeding support visits" })).toBeVisible();
  // "Part of" leads back to the Organization page.
  await expect(page.getByRole("link", { name: "Northside Family Center", exact: true })).toHaveAttribute("href", "/embed/organizations/O-005");
});

test("org-more-details: the Organization's public custom answers show in More details", async ({ page }) => {
  await page.goto("/embed/organizations/O-005");
  const details = page.locator("section", { has: page.getByRole("heading", { name: "More details" }) });
  await expect(details).toContainText("Accessible entrance");
  await expect(details).toContainText("Step-free main door");
});

test("org-empty-state: an Organization with no visible Programs shows the help box, not a Programs card", async ({ page }) => {
  await page.goto("/embed/organizations/O-010");
  await expect(page.getByRole("heading", { level: 1, name: "Eastside Doula Collective" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Programs at/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Can't find what you need?" })).toBeVisible();
});

test("org-unknown-id-note: an unknown Organization shows a note and a link back", async ({ page }) => {
  await page.goto("/embed/organizations/O-999?q=yoga");
  await expect(page.getByRole("status").filter({ hasText: "That resource isn't available anymore." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to results" })).toHaveAttribute("href", "/embed?q=yoga");
});
