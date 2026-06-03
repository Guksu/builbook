import { defineConfig, devices } from "@playwright/test";

// 로컬 우선(IndexedDB) 앱이라 실제 브라우저로 E2E. 각 테스트는 깨끗한 컨텍스트
// (빈 IndexedDB)에서 시작하므로 빈 상태·생성·영속성을 독립적으로 검증할 수 있다.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
