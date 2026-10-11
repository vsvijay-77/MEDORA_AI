import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN_KEY } from "../playwright.config";
import { makePdf, makeWav, REPORT_1, REPORT_2 } from "./fixtures";

const API = "http://localhost:8000";

async function signIn(page: Page, key = E2E_ADMIN_KEY) {
  await page.goto("/");
  await page.getByTestId("api-key").fill(key);
  await page.getByTestId("sign-in").click();
}

async function createPatientAndOpen(page: Page, name: string) {
  await page.getByTestId("patient-name").fill(name);
  await page.getByTestId("patient-dob").fill("1974-05-02");
  await page.getByTestId("add-patient").click();
  await page.getByRole("link", { name }).click();
  await expect(page.getByTestId("patient-title")).toHaveText(name);
}

async function uploadReport(page: Page, lines: string[], name: string) {
  await page.getByTestId("tab-documents").click();
  const before = await page.getByTestId("doc-row").count();
  await page.getByTestId("doc-upload").setInputFiles({ name, mimeType: "application/pdf", buffer: makePdf(lines) });
  await expect(page.getByTestId("doc-row")).toHaveCount(before + 1);
  await expect(page.getByTestId("doc-status").first()).toHaveText("validated", { timeout: 20_000 });
}

test("rejects an invalid API key", async ({ page }) => {
  await signIn(page, "mc_not-a-real-key");
  await expect(page.locator("main").getByRole("alert")).toContainText("not accepted");
});

test("document → verified timeline → review → ask → voice → spoken summary → search → FHIR", async ({ page }) => {
  await signIn(page);
  await createPatientAndOpen(page, "Asha Rao");

  // Upload and process a lab report
  await uploadReport(page, REPORT_1, "cbc-march.pdf");
  await page.getByTestId("tab-records").click();
  await expect(page.getByTestId("record-row")).toHaveCount(12);
  await expect(page.getByTestId("timeline")).toContainText("Hemoglobin");
  await expect(page.getByTestId("timeline")).toContainText("LOINC 718-7");
  await expect(page.getByTestId("review-queue")).toHaveCount(0);

  // A second report with an unknown analyte lands in the review queue; clinician approves it
  await uploadReport(page, REPORT_2, "followup.pdf");
  await page.getByTestId("tab-records").click();
  const queue = page.getByTestId("review-queue");
  await expect(queue).toContainText("Mystery Marker X");
  await expect(queue).toContainText("not in the validated analyte catalogue");
  await page.screenshot({ path: "test-results/screens/review-queue.png", fullPage: true });
  await queue.getByTestId("approve").click();
  await expect(page.getByTestId("review-queue")).toHaveCount(0);
  await expect(page.getByTestId("record-row")).toHaveCount(14);
  await page.screenshot({ path: "test-results/screens/timeline.png", fullPage: true });

  // Text question -> grounded, cited answer
  await page.getByTestId("tab-ask").click();
  await page.getByTestId("question").fill("Which medication am I taking?");
  await page.getByTestId("ask").click();
  const answer = page.getByTestId("answer");
  await expect(answer.locator(".cite").first()).toBeVisible();
  await expect(page.getByTestId("sources")).toContainText("Medication:");
  await expect(answer).toContainText("not medical advice");

  // Voice question via uploaded clip -> STT -> RAG -> TTS audio
  await page.getByTestId("audio-upload").setInputFiles({ name: "q.wav", mimeType: "audio/wav", buffer: makeWav("What is my HbA1c?") });
  await expect(page.getByTestId("transcript")).toContainText("What is my HbA1c?");
  await expect(page.getByTestId("sources")).toContainText("HbA1c");
  await expect(page.getByTestId("answer-audio")).toHaveAttribute("src", /^blob:/);
  await page.screenshot({ path: "test-results/screens/voice-answer.png", fullPage: true });

  // Live microphone recording (Chromium fake device)
  await page.getByTestId("record").click();
  await page.waitForTimeout(1200);
  await page.getByTestId("record").click();
  await expect(page.getByTestId("transcript")).toContainText("hemoglobin", { timeout: 15_000 });

  // Spoken health summary
  await page.getByTestId("tab-summary").click();
  await page.getByTestId("make-summary").click();
  await expect(page.getByTestId("summary-audio")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByTestId("answer")).toContainText("Hemoglobin 12.4");
  const duration = await page.getByTestId("summary-audio").evaluate(async (el: HTMLAudioElement) => {
    if (el.readyState < 1) await new Promise((r) => el.addEventListener("loadedmetadata", r, { once: true }));
    return el.duration;
  });
  expect(duration).toBeGreaterThan(0);

  // Semantic search with type filter
  await page.getByTestId("tab-search").click();
  await page.getByTestId("search-q").fill("metformin");
  await page.getByTestId("search").click();
  await expect(page.getByTestId("search-hit").first()).toContainText("Metformin");

  // FHIR export download
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("fhir-export").click()]);
  const bundle = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
  expect(bundle.resourceType).toBe("Bundle");
  expect(bundle.entry.filter((e: { resource: { resourceType: string } }) => e.resource.resourceType === "Observation").length).toBe(9);
});

test("a patient user only sees their own record and cannot review", async ({ page, request }) => {
  const admin = { Authorization: `Bearer ${E2E_ADMIN_KEY}` };
  const mine = await (await request.post(`${API}/api/patients`, { headers: admin, data: { name: "Ravi Kumar" } })).json();
  await request.post(`${API}/api/patients`, { headers: admin, data: { name: "Someone Else" } });
  const doc = await request.post(`${API}/api/patients/${mine.id}/documents`, { headers: admin,
    multipart: { file: { name: "r.pdf", mimeType: "application/pdf", buffer: makePdf(REPORT_2) } } });
  expect(doc.status()).toBe(202);
  const user = await (await request.post(`${API}/api/users`, { headers: admin, data: { name: "Ravi", role: "patient", patient_ids: [mine.id] } })).json();

  await signIn(page, user.api_key);
  await expect(page.getByTestId("patient-link")).toHaveCount(1);
  await expect(page.getByTestId("patient-link")).toHaveText("Ravi Kumar");
  await expect(page.getByTestId("add-patient")).toHaveCount(0);
  await page.getByTestId("patient-link").click();
  await expect(page.getByTestId("review-queue")).toContainText("Mystery Marker X");
  await expect(page.getByTestId("approve")).toHaveCount(0);
});
