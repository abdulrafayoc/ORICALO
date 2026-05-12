import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Oricalo Sidebar navigation.
 *
 * These tests verify that:
 * - The sidebar is always visible
 * - Every nav link navigates to the correct route
 * - The correct item is marked as active on each page
 */

test.describe("Sidebar Navigation", () => {
  test("sidebar is visible on the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("ORICALO").first()).toBeVisible();
    await expect(page.getByText("BETA")).toBeVisible();
  });

  test("clicking Agents navigates to /agents", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /agents/i }).click();
    await expect(page).toHaveURL(/\/agents/);
  });

  test("clicking CRM Leads navigates to /crm", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /crm leads/i }).click();
    await expect(page).toHaveURL(/\/crm/);
  });

  test("clicking Analytics navigates to /analytics", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /analytics/i }).click();
    await expect(page).toHaveURL(/\/analytics/);
  });

  test("active nav item is highlighted on /crm", async ({ page }) => {
    await page.goto("/crm");
    const crmLink = page.getByRole("link", { name: /crm leads/i });
    await expect(crmLink).toHaveClass(/bg-neutral-900/);
  });
});
