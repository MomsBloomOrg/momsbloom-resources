import { expect, type Page, test } from "@playwright/test";
import { APP, HOST } from "./fixture";

const IFRAME = "iframe[data-momsbloom-embed]";

const iframeHeight = (page: Page) => page.locator(IFRAME).evaluate((el) => el.getBoundingClientRect().height);

/** The height of the measured root element inside the iframe. */
const contentHeight = (page: Page) =>
  page
    .frameLocator(IFRAME)
    .locator("#momsbloom-embed-root")
    .evaluate((el) => Math.ceil(el.getBoundingClientRect().height));

test("the embed script adds an iframe, and the iframe height matches its content", async ({ page }) => {
  await page.goto(HOST);
  await expect(page.locator(IFRAME)).toHaveAttribute("src", `${APP}/embed`);
  const frame = page.frameLocator(IFRAME);
  await expect(frame.getByRole("heading", { level: 1, name: "Postpartum Resources" })).toBeVisible();
  // The start height is 600 px. After the resize message, the iframe is exactly as tall as its content.
  await expect.poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page)))).toBeLessThan(2);
  expect(await iframeHeight(page)).not.toBe(600);
  // The host page's CSS does not reach inside the iframe (the test button keeps its own color).
  await expect(frame.getByRole("link", { name: "A test button" })).not.toHaveCSS("color", "rgb(192, 57, 43)");
});

test("the iframe grows when its content grows", async ({ page }) => {
  await page.goto(HOST);
  const frame = page.frameLocator(IFRAME);
  await expect.poll(async () => Math.abs((await iframeHeight(page)) - (await contentHeight(page)))).toBeLessThan(2);
  const before = await iframeHeight(page);
  // Add 500 px of content inside the iframe, as a longer result list would.
  await frame.locator("#momsbloom-embed-root").evaluate((root) => {
    const block = document.createElement("div");
    block.style.height = "500px";
    root.appendChild(block);
  });
  await expect.poll(() => iframeHeight(page)).toBeGreaterThan(before + 490);
});

test("only /embed may be framed by other sites", async ({ request }) => {
  const embed = await request.get(`${APP}/embed`);
  expect(embed.headers()["content-security-policy"]).toContain("https://momsbloom.org");
  const home = await request.get(`${APP}/`);
  expect(home.headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
});
