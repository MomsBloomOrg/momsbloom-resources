import { expect, type FrameLocator, type Page } from "@playwright/test";

/**
 * Opens the Filters modal, sets one checkbox, and closes the modal (Escape), so the test can go on with
 * the page behind it. `scope` is the page itself, or the iframe on the fake host page.
 */
export async function setFilter(page: Page, scope: Page | FrameLocator, name: RegExp, checked = true) {
  await scope.getByRole("link", { name: /^Filters/ }).click();
  const dialog = scope.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox", { name }).setChecked(checked);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}
