import { test, expect } from "@playwright/test";

test.describe("Price Prediction (AVM) Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the valuation stats API
    await page.route("**/valuation/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total_samples: 5000,
          accuracy: 0.85,
          last_trained: "2024-03-20",
          mae: "50,000",
          mape_pct: 12.5,
          features: [
            { name: "Location", importance: 45 },
            { name: "Area", importance: 30 },
            { name: "Bedrooms", importance: 15 },
            { name: "Baths", importance: 10 },
          ],
        }),
      });
    });

    // Mock the valuation predict API
    await page.route("**/valuation/predict", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          predicted_price_pkr: 25000000,
          min_price_lakh: 230,
          max_price_lakh: 270,
          currency: "PKR",
          confidence: 0.82,
          is_premium_location: true,
        }),
      });
    });

    await page.goto("/avm");
  });

  test("shows the Price Prediction Model heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /price prediction model/i })).toBeVisible();
  });

  test("can submit valuation form and see results", async ({ page }) => {
    await page.selectOption("select >> nth=0", "Lahore"); // City
    await page.getByPlaceholder(/e.g. DHA Phase 2/i).fill("DHA Phase 6");
    await page.getByPlaceholder(/e.g. 10/i).fill("10"); // Marla
    await page.getByRole("button", { name: /estimate price/i }).click();

    await expect(page.getByText("Estimated Market Value")).toBeVisible();
    await expect(page.getByText("₨ 2.50 Crore")).toBeVisible();
    await expect(page.getByText("82%")).toBeVisible();
    await expect(page.getByText("Premium Location")).toBeVisible();
  });

  test("can switch to Data Management tab and see stats", async ({ page }) => {
    await page.getByRole("button", { name: /data management/i }).click();
    await expect(page.getByText("Model Training Data")).toBeVisible();
    await expect(page.getByText("5,000")).toBeVisible();
    await expect(page.getByText("0.85")).toBeVisible();
    await expect(page.getByText("Location")).toBeVisible();
    await expect(page.getByText("45%")).toBeVisible();
  });
});
