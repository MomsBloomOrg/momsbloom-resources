/** Admin login without a database: the proxy redirect, the login page, and its frame headers. */
import { expect, test } from "@playwright/test";

test("/admin without a session cookie redirects to /login", async ({ request }) => {
  const res = await request.get("/admin", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  // Next.js may send a relative Location.
  expect(new URL(res.headers()["location"], "http://x").pathname).toBe("/login");
});

for (const path of ["/admin/organizations/new", "/admin/organizations/1"]) {
  test(`${path} without a session cookie redirects to /login`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(new URL(res.headers()["location"], "http://x").pathname).toBe("/login");
  });
}

test("/login shows the email form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to the Admin" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Login link" })).toBeVisible();
});

test("/login?error=Verification explains the expired link", async ({ page }) => {
  await page.goto("/login?error=Verification");
  await expect(page.getByRole("alert").filter({ hasText: "Login link" })).toContainText("expired or was already used");
});

for (const path of ["/admin", "/login"]) {
  test(`${path} cannot be shown in an iframe`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
  });
}
