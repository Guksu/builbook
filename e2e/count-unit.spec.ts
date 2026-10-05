import { test, expect, type Page } from "@playwright/test";

// 분량 단위 — 기본은 공백 제외 글자 수(2026-10). 설정에서 바꾸면 숫자가 따라오고,
// 집필 현황(일별 기록)도 같은 단위로 센다.

async function createProjectAndOpen(page: Page, title: string) {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

test("기본 분량은 공백 제외 글자 수이고, 공백 포함으로 바꾸면 숫자가 따라오며 새로고침 후에도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page, "분량 단위 테스트");
  await page.locator("main .prose-editor").click();
  await page.keyboard.type("가 나 다"); // 공백 제외 3자, 공백 포함 5자

  // 상단 바에도 작품 합계 "N자"가 있으므로 에디터(main) 안의 것만 본다.
  const counter = page.locator("main").getByText(/\d자$/);
  await expect(counter).toContainText("3자");

  // 단축키(Ctrl+Shift+8)는 본문에 커서가 있으면 에디터의 글머리 목록 단축키와 겹쳐서 버튼으로 연다.
  await page.getByRole("button", { name: /^인스펙터/ }).click();
  const unitSelect = page.getByLabel("분량 단위");
  await expect(unitSelect).toHaveValue("charsNoSpace");
  await unitSelect.selectOption("chars");
  await expect(counter).toContainText("5자");

  // 자동저장(debounce 800ms) 후 새로고침 — 고른 단위는 브라우저에 남는다.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.locator("main").getByText(/\d자$/)).toContainText("5자");
});

test("집필 현황의 누적 집필량도 공백 제외 글자 수로 센다", async ({ page }) => {
  await createProjectAndOpen(page, "현황 단위 테스트");
  await page.locator("main .prose-editor").click();
  await page.keyboard.type("가 나 다");
  await page.waitForTimeout(1500); // 자동저장 → 오늘 집필 기록

  await page.keyboard.press("Control+Shift+Digit2"); // 집필 현황(에디터 단축키와 겹치지 않는다)
  await expect(page.getByRole("heading", { name: "집필 현황" })).toBeVisible();
  // 고치기 전에는 기록에 공백 포함 숫자만 있어 "5자"로 보였다.
  await expect(page.getByText("누적 집필량", { exact: true }).locator("..")).toContainText("3자");
});
