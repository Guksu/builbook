import { test, expect, type Page } from "@playwright/test";

// 목표를 한 곳에(2026-10) — 작품 목표·마감일·하루 목표·회차 목표·분량 단위를 목표 창 하나에서 정한다.
// 상단 목표 바, 인스펙터, 현황 패널의 "목표 바꾸기"가 모두 같은 창을 연다.

async function createProjectAndOpen(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("목표 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator("main .prose-editor")).toBeVisible();
}

test("상단 바에서 목표 창을 열어 네 가지 목표를 정하면 목표 바·현황·인스펙터에 함께 반영된다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "목표 정하기" }).click();
  const dialog = page.getByRole("dialog", { name: "목표" });
  await expect(dialog.getByLabel("분량 단위")).toBeVisible();

  await dialog.getByLabel("작품 목표 분량").fill("1000");
  await dialog.getByLabel("하루 목표 분량").fill("100");
  await dialog.getByLabel("하루 목표 분량").blur();
  await dialog.getByRole("button", { name: "일반 기준 5,000자" }).click();
  await expect(dialog.getByLabel("회차 목표 분량")).toHaveValue("5000");
  await dialog.getByRole("button", { name: "닫기" }).click();
  await expect(dialog).toHaveCount(0);

  // 상단 목표 바
  await expect(page.getByRole("button", { name: /^목표 진행: 작품 0%, 오늘 0%/ })).toBeVisible();

  // 현황 패널: 입력칸 대신 목표 표시 + 링크
  await page.keyboard.press("Control+Shift+Digit2");
  await expect(page.getByText("회차 목표 5,000자")).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "오늘 목표 진행률" })).toBeVisible();
  await expect(page.getByLabel("하루 목표 분량")).toHaveCount(0);
  await page.keyboard.press("Control+Shift+Digit2");

  // 인스펙터: 요약만 보이고, "목표 바꾸기"로 같은 창이 정한 값 그대로 열린다
  await page.getByRole("button", { name: "인스펙터", exact: true }).click();
  const summary = page.getByRole("region", { name: "작품 목표" });
  await expect(summary).toContainText("0 / 1,000자");
  await expect(page.getByLabel("작품 목표 분량")).toHaveCount(0);
  await summary.getByRole("button", { name: "목표 바꾸기" }).click();
  await expect(dialog.getByLabel("작품 목표 분량")).toHaveValue("1000");
  await expect(dialog.getByLabel("하루 목표 분량")).toHaveValue("100");
});

test("목표 바를 누르면 현황 패널이 아니라 목표 창이 열린다", async ({ page }) => {
  await createProjectAndOpen(page);
  await page.getByRole("button", { name: "목표 정하기" }).click();
  const dialog = page.getByRole("dialog", { name: "목표" });
  await dialog.getByLabel("작품 목표 분량").fill("500");
  await dialog.getByLabel("작품 목표 분량").blur();
  await dialog.getByRole("button", { name: "닫기" }).click();

  await page.getByRole("button", { name: /^목표 진행/ }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("heading", { name: "집필 현황" })).toHaveCount(0);
});
