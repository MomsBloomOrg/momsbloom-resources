import { expect, type FrameLocator, type Page } from "@playwright/test";

/**
 * Sets one filter checkbox. Desktop list view: in the filters column (applies at once). Otherwise: opens the
 * Filters modal, sets it, and applies it with "Show results". `scope` is the page, or the iframe on the fake host page.
 */
export async function setFilter(_page: Page, scope: Page | FrameLocator, name: RegExp, checked = true) {
  const link = scope.getByRole("link", { name: /^Filters/ });
  if (!(await link.isVisible())) {
    await scope.getByRole("checkbox", { name }).setChecked(checked);
    return;
  }
  await link.click();
  const dialog = scope.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox", { name }).setChecked(checked);
  await dialog.getByRole("button", { name: "Show results" }).click();
  await expect(dialog).toBeHidden();
}
