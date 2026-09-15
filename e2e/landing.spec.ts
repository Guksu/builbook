import { test, expect } from "@playwright/test";

test("랜딩에서 시작하기 → 대시보드로 이동", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("5분이면");

  await page.getByRole("link", { name: "시작하기", exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "내 작품" })).toBeVisible();
});
