import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { makePdf } from "./fixtures";

test("upload a PDF -> verified records -> multilingual summary (no sign-in, no patient)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sign in")).toHaveCount(0);
  const name = `report-${Date.now()}.pdf`;
  await page.getByTestId("doc-upload").setInputFiles({
    name, mimeType: "application/pdf",
    buffer: makePdf(["Report Date: 14/03/2026", `Hemoglobin: 10.${Date.now() % 9} g/dL (12.0-15.5)`, "HbA1c: 7.1 % (4.0-5.6)"]),
  });
  await expect(page.getByTestId("doc-status").first()).toHaveText("validated", { timeout: 20_000 });
  await expect(page.getByTestId("make-summary")).toBeDisabled();
  await expect(page.getByTestId("summary-result")).toHaveCount(0);
  await expect(page.getByLabel("Summary language").locator("option")).toHaveCount(24);
  await page.getByLabel("Summary source").selectOption("health");
  for (const [code, text] of [["hi-IN", "सारांश"], ["ta-IN", "சுருக்கம்"], ["kn-IN", "ಸಾರಾಂಶ"], ["en-IN", "summary"]]) {
    await page.getByLabel("Summary language").selectOption(code);
    await page.getByTestId("make-summary").click();
    await expect(page.getByTestId("answer")).toContainText(text, { timeout: 15_000 });
    await expect(page.getByTestId("summary-audio")).toBeVisible();
  }
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("download-summary").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("summary-en-IN.txt");
  expect(await readFile((await download.path())!, "utf8")).toContain("Hemoglobin");
  await page.getByLabel("Summary language").selectOption("as-IN");
  await expect(page.getByText("Sarvam does not yet provide audio for it.", { exact: false })).toBeVisible();
  await page.getByTestId("make-summary").click();
  await expect(page.getByTestId("summary-result")).toBeVisible();
  await expect(page.getByTestId("summary-audio")).toHaveCount(0);
  await page.screenshot({ path: "test-results/screens/home.png", fullPage: true });
});
