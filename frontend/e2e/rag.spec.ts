import { test, expect } from "@playwright/test";

test.describe("RAG Knowledge Base Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the RAG query API
    await page.route("**/rag/query", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              score: 0.95,
              text: "Luxury 3 marla house in DHA Phase 6 Lahore. Features 2 bedrooms, attach baths, and a modular kitchen.",
              metadata: {
                price: "1.8 Crore",
                location: "DHA Phase 6, Lahore",
                source: "Zameen.com",
              },
            },
          ],
        }),
      });
    });

    // Mock the listings API for the Data Management tab
    await page.route("**/agency/listings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            title: "Modern Apartment",
            location: "Gulberg",
            price: "80 Lakh",
          },
        ]),
      });
    });

    await page.goto("/rag");
  });

  test("shows the RAG Knowledge Base heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /rag knowledge base/i })).toBeVisible();
  });

  test("can search and see results", async ({ page }) => {
    await page.getByPlaceholder(/e.g., '3 marla house/i).fill("house in dha");
    await page.getByRole("button", { name: /search/i }).click();

    await expect(page.getByText("Score: 95.0%")).toBeVisible();
    await expect(page.getByText("1.8 Crore")).toBeVisible();
    await expect(page.getByText("Luxury 3 marla house").first()).toBeVisible();
  });

  test("can switch to Data Management tab and see listings", async ({ page }) => {
    await page.getByRole("button", { name: /data management/i }).click();
    await expect(page.getByText("Agency Listings")).toBeVisible();
    await expect(page.getByText("Modern Apartment")).toBeVisible();
    await expect(page.getByText("80 Lakh")).toBeVisible();
  });

  test("opens Add Listing modal when button is clicked", async ({ page }) => {
    await page.getByRole("button", { name: /data management/i }).click();
    await page.getByRole("button", { name: /add listing/i }).click();
    await expect(page.getByRole("heading", { name: /new listing/i })).toBeVisible();
  });
});
