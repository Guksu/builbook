import { test, expect } from "@playwright/test";

test("작품 생성 후 새로고침해도 IndexedDB에 유지된다", async ({ page }) => {
  await page.goto("/dashboard");

  // 깨끗한 컨텍스트 → 빈 상태
  await expect(page.getByText("아직 작품이 없어요")).toBeVisible();

  // 첫 작품 생성 (모달)
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("내 첫 소설");
  await page.getByRole("button", { name: "만들기", exact: true }).click();

  // 작업실로 이동
  await expect(page).toHaveURL(/\/projects\/.+/);

  // 대시보드에 카드로 보임
  await page.goto("/dashboard");
  await expect(page.getByText("내 첫 소설")).toBeVisible();

  // 새로고침 후에도 유지 (로컬 영속성)
  await page.reload();
  await expect(page.getByText("내 첫 소설")).toBeVisible();
});
