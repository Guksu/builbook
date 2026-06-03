import { test, expect } from "@playwright/test";

test("랜딩에서 시작하기 → 대시보드로 이동", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading")).toContainText("5분이면");

  await page.getByText("시작하기").click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "내 작품" })).toBeVisible();
});
