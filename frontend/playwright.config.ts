import { defineConfig, devices } from "@playwright/test";

// Full-stack UI E2E: real FastAPI backend (MOCK_EXTERNAL=true -> deterministic offline Sarvam/Gemini fakes,
// in-memory Qdrant, throwaway SQLite) + production Next.js build.
export const E2E_ADMIN_KEY = "e2e-admin-key-0123456789abcdef";
const chromiumPath = process.env.CHROMIUM_PATH; // optional: system Chromium instead of Playwright's download

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    permissions: ["microphone"],
    launchOptions: {
      executablePath: chromiumPath,
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", ...(chromiumPath ? ["--no-sandbox", "--disable-gpu"] : [])],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "sh -c 'rm -rf .e2e && mkdir -p .e2e && cd ../backend && python -m uvicorn app.main:app_factory --factory --port 8000'",
      url: "http://localhost:8000/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        MOCK_EXTERNAL: "true",
        DATABASE_URL: "sqlite:///../frontend/.e2e/e2e.db",
        UPLOAD_DIR: "../frontend/.e2e/uploads",
        ADMIN_API_KEY: E2E_ADMIN_KEY,
        QDRANT_URL: ":memory:",
        CORS_ORIGINS: '["http://localhost:3000"]',
        EMBEDDING_DIM: "256",
      },
    },
    {
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: 240_000,
      env: { NEXT_PUBLIC_API_URL: "", BACKEND_API_URL: "http://127.0.0.1:8000" },
    },
  ],
});
