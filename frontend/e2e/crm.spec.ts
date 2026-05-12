import { test, expect } from "@playwright/test";

/**
 * E2E tests for the CRM Lead Intelligence page.
 *
 * Tests verify:
 * - Page loads with the correct title
 * - Metric cards are rendered
 * - The leads table is visible
 * - The "Add Prospect" button opens the modal
 */

test.describe("CRM Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API to avoid dependency on a running backend
    await page.route("**/crm/leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "Ali Raza",
            phone_number: "+92-300-1234567",
            email: "ali@example.com",
            status: "HOT",
            needs_human: true,
            budget: "2 Crore",
            location_pref: "DHA Phase 5",
            timeline: "3 months",
            lead_score: 85,
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            name: "Sara Khan",
            phone_number: "+92-321-9876543",
            email: null,
            status: "WARM",
            needs_human: false,
            budget: "1.5 Crore",
            location_pref: "Bahria Town",
            timeline: null,
            lead_score: 55,
            updated_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto("/crm");
  });

  test("shows the Lead Intelligence heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /lead intelligence/i })).toBeVisible();
  });

  test("shows total leads metric card", async ({ page }) => {
    await expect(page.getByText("Total Leads")).toBeVisible();
  });

  test("shows hot prospects metric card", async ({ page }) => {
    await expect(page.getByText("Hot Prospects")).toBeVisible();
  });

  test("shows Needs Human Follow-up metric card", async ({ page }) => {
    await expect(page.getByText("Needs Human Follow-up")).toBeVisible();
  });

  test("renders the lead table with mocked data", async ({ page }) => {
    await expect(page.getByText("Ali Raza")).toBeVisible();
    await expect(page.getByText("Sara Khan")).toBeVisible();
  });

  test("shows status badge for HOT lead", async ({ page }) => {
    await expect(page.getByText("HOT", { exact: true })).toBeVisible();
  });

  test("Add Prospect button opens the modal", async ({ page }) => {
    await page.getByRole("button", { name: /add prospect/i }).click();
    // The modal should appear — verify some modal-specific content
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("shows Prospects Roster table heading", async ({ page }) => {
    await expect(page.getByText("Prospects Roster")).toBeVisible();
  });
});
