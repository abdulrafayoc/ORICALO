import { test, expect } from "@playwright/test";

/**
 * E2E tests for the Agents management page.
 *
 * Tests verify:
 * - Page loads correctly
 * - Agent list is rendered from mocked API
 * - Agent items show expected fields
 */

test.describe("Agents Management Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the agents API endpoint
    await page.route("**/agents", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "Real Estate Agent",
            slug: "real-estate-agent",
            description: "Handles property inquiries for DHA and Bahria",
            system_prompt: "You are an expert real estate assistant for Pakistani properties.",
            is_active: true,
          },
          {
            id: 2,
            name: "Rental Agent",
            slug: "rental-agent",
            description: "Specialises in rental property matching",
            system_prompt: "You help clients find rental properties.",
            is_active: false,
          },
        ]),
      });
    });

    await page.goto("/agents");
  });

  test("page loads without errors", async ({ page }) => {
    await expect(page).toHaveURL(/\/agents/);
  });

  test("shows agent names from the API", async ({ page }) => {
    await expect(page.getByText("Real Estate Agent")).toBeVisible();
    await expect(page.getByText("Rental Agent")).toBeVisible();
  });

  test("shows agent descriptions", async ({ page }) => {
    await expect(page.getByText(/property inquiries/i)).toBeVisible();
  });
});
