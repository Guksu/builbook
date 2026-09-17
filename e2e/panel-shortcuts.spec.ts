import { test, expect, type Page } from "@playwright/test";

// 패널 단축키(Ctrl/⌘+Shift+1~8)와 열린 패널 상태 기억.

async function createProjectAndOpen(page: Page, title = "패널 테스트") {
  await page.goto("/dashboard");
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill(title);
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

test("Ctrl+Shift+2로 현황 패널을 열고 닫으며, 열린 상태는 새로고침 후에도 유지된다", async ({ page }) => {
  await createProjectAndOpen(page);
  const heading = page.getByRole("heading", { name: "집필 현황" });
  await expect(heading).toHaveCount(0);

  await page.keyboard.press("Control+Shift+Digit2");
  await expect(heading).toBeVisible();
  await expect(page.getByRole("button", { name: "패널", exact: true })).toContainText("1");

  await page.reload();
  await expect(page.getByRole("heading", { name: "집필 현황" })).toBeVisible();

  await page.keyboard.press("Control+Shift+Digit2");
  await expect(page.getByRole("heading", { name: "집필 현황" })).toHaveCount(0);
});

test("Ctrl+Shift+8은 인스펙터, 메뉴에는 단축키가 표기된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.keyboard.press("Control+Shift+Digit8");
  await expect(page.getByLabel("분량 단위")).toBeVisible();
  await page.getByRole("button", { name: "패널", exact: true }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "연표" })).toContainText("Shift+1");
});
