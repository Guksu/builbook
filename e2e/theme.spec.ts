import { test, expect } from "@playwright/test";

test("다크/라이트 테마 토글이 html 클래스를 전환한다", async ({ page }) => {
  await page.goto("/dashboard");
  const html = page.locator("html");
  const toggle = page.getByRole("button", {
    name: /다크 모드로 전환|라이트 모드로 전환/,
  });

  await toggle.click();
  const first = await html.getAttribute("class");
  expect(first).toMatch(/dark|light/);

  await toggle.click();
  const second = await html.getAttribute("class");
  // 토글로 테마 클래스가 바뀐다
  expect(second).not.toBe(first);
});

test("작업실 '더 보기'에는 테마 전환이 없고, 작품 목록에서 고른 테마가 작업실에도 그대로 이어진다", async ({ page }) => {
  await page.goto("/dashboard");
  const html = page.locator("html");
  await page.getByRole("button", { name: /다크 모드로 전환|라이트 모드로 전환/ }).click();
  const chosen = (await html.getAttribute("class"))?.match(/\b(dark|light)\b/)?.[1];
  expect(chosen).toBeTruthy();

  await page.getByRole("button", { name: "첫 작품 만들기" }).click();
  await page.getByPlaceholder(/회귀한 검사/).fill("테마 테스트");
  await page.getByRole("button", { name: "만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(html).toHaveClass(new RegExp(`\\b${chosen}\\b`));

  await page.getByRole("button", { name: "더 보기" }).click();
  const menu = page.getByRole("menu", { name: "더 보기 메뉴" });
  await expect(menu.getByRole("menuitem")).toHaveText(["미리보기", "내보내기"]);
  await expect(menu.getByRole("menuitem", { name: /모드로 전환/ })).toHaveCount(0);
});
