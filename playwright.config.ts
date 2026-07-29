import { defineConfig, devices } from "@playwright/test";

// 로컬 우선(IndexedDB) 앱이라 실제 브라우저로 E2E. 각 테스트는 깨끗한 컨텍스트
// (빈 IndexedDB)에서 시작하므로 빈 상태·생성·영속성을 독립적으로 검증할 수 있다.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // dev 서버가 라우트를 처음 컴파일하는 동안 여러 워커가 동시에 접속하면 첫 렌더가 늦다.
  // 기본 5초로는 병렬 실행 초반에 '하이드레이션 전 클릭'으로 오탐이 나서 여유를 둔다.
  expect: { timeout: 10_000 },
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
