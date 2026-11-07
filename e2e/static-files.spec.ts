import { expect, test } from "@playwright/test";

for (const [path, text] of [
  ["/humans.txt", "W E S T   M I C H I G A N"],
  ["/llms.txt", "# MomsBloom Resource Directory"],
] as const) {
  test(`${path} is plain text`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    expect(await res.text()).toContain(text);
  });
}

test("the page head links to humans.txt", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="author"]')).toHaveAttribute("href", "/humans.txt");
});
