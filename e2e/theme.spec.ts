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
