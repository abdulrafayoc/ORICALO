import { test, expect } from "@playwright/test";

test.describe("P1 — dashboard shell", () => {
  test("design-system route renders all primitives", async ({ page }) => {
    await page.goto("/dev/design-system");
    await expect(
      page.getByRole("heading", { name: "ORICALO Design System" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Buttons" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Primary" })).toBeVisible();
    await expect(page.getByText("1 crore 25 lakh")).toBeVisible();
  });

  test("reduced-motion: tickers render final value immediately", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/dev/design-system");
    await expect(page.getByText("247")).toBeVisible();
    await expect(page.getByText("1 crore 25 lakh")).toBeVisible();
    await context.close();
  });
});
