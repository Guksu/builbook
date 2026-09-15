import { test, expect } from "@playwright/test";

// 좁은 화면(휴대폰) — 바인더는 드로어로, 우측 패널은 오버레이로 뜬다.
test.use({ viewport: { width: 390, height: 844 } });

async function createProjectAndOpen(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("모바일 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
}

test("휴대폰 폭: 바인더는 숨겨져 있고, 버튼으로 열어 문서를 고르면 닫힌다", async ({ page }) => {
  await createProjectAndOpen(page);
  const tree = page.getByRole("tree", { name: "문서 트리" });
  await expect(page.locator(".prose-editor")).toBeVisible();
  await expect(tree).toBeHidden();

  await page.getByRole("button", { name: "바인더", exact: true }).click();
  await expect(tree).toBeVisible();

  await page.getByRole("treeitem", { name: "1화" }).click();
  await expect(tree).toBeHidden();
  await expect(page.locator(".prose-editor")).toBeVisible();
});

test("휴대폰 폭: 인스펙터를 열면 오버레이로 뜨고 다시 누르면 닫힌다", async ({ page }) => {
  await createProjectAndOpen(page);
  const chip = page.getByRole("button", { name: "인스펙터" });
  await chip.click();
  await expect(page.getByLabel("분량 단위")).toBeVisible();
  await chip.click();
  await expect(page.getByLabel("분량 단위")).toBeHidden();
});
