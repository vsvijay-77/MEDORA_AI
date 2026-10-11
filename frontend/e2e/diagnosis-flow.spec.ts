import { expect, test } from "@playwright/test";

test("diagnosis prompt with typing and STT", async ({ page }) => {
  await page.goto("/");
  // Wait for client to load and render prompt section
  await expect(page.getByTestId("question")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Ask about Diagnosis & Records")).toBeVisible();
  await expect(page.getByTestId("record")).toBeVisible();
  await expect(page.getByTestId("ask")).toBeVisible();

  // Test prompt chips
  await page.getByText("What is the diagnosis or primary finding?").click();
  await expect(page.getByTestId("question")).toHaveValue("What is the diagnosis or primary finding?");

  // Test submitting the diagnosis question
  await page.getByTestId("ask").click();
  await expect(page.getByTestId("answer")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Diagnosis & Clinical Insights")).toBeVisible();

  // Take screenshot of the live page
  await page.screenshot({ path: "test-results/screens/diagnosis-prompt.png", fullPage: true });
});
